begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('61110000-0000-4000-8000-000000000001', 'editor@example.invalid', now()),
  ('61110000-0000-4000-8000-000000000002', 'reviewer@example.invalid', now()),
  ('61110000-0000-4000-8000-000000000003', 'visitor@example.invalid', now()),
  ('61110000-0000-4000-8000-000000000004', 'unverified@example.invalid', null);
insert into public.landing_members (user_id, role) values
  ('61110000-0000-4000-8000-000000000001', 'editor'),
  ('61110000-0000-4000-8000-000000000002', 'reviewer'),
  ('61110000-0000-4000-8000-000000000004', 'editor');

set local role authenticated;
select set_config('request.jwt.claim.sub', '61110000-0000-4000-8000-000000000001', true);
insert into storage.objects (bucket_id, name) values
  ('cp-retail-landing', '61110000-0000-4000-8000-000000000001/61110000-0000-4000-8000-000000000010.png');

do $$
begin
  assert public.landing_member_role() = 'editor';
  begin
    insert into storage.objects (bucket_id, name) values
      ('cp-retail-landing', '61110000-0000-4000-8000-000000000002/61110000-0000-4000-8000-000000000010.png');
    raise exception 'Editor uploaded to another member’s folder';
  exception when insufficient_privilege then null;
  end;
  update storage.objects set name = name || '.png' where bucket_id = 'cp-retail-landing';
  assert not found, 'Editor could overwrite a saved asset';
  begin
    perform public.save_landing_draft(null, 0, 0, 'Unsafe', 'Preview', null, 'Store', 'Demo', '//example.invalid');
    raise exception 'An unsafe demo link was accepted';
  exception when check_violation then null;
  end;
end;
$$;

select set_config('cp_retail.landing_test_draft', (public.save_landing_draft(
  null, 0, 0, 'Member draft', 'Member introduction',
  '61110000-0000-4000-8000-000000000001/61110000-0000-4000-8000-000000000010.png',
  'Demo promotion', 'Watch demo', 'https://example.invalid/demo'
)).id::text, true);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert (select version_id is null and generation = 0 from public.get_published_landing());
  assert not exists (select from storage.objects where bucket_id = 'cp-retail-landing');
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61110000-0000-4000-8000-000000000002', true);
do $$
begin
  assert not exists (select from public.landing_versions);
  assert not exists (select from storage.objects where bucket_id = 'cp-retail-landing');
end;
$$;

select set_config('request.jwt.claim.sub', '61110000-0000-4000-8000-000000000003', true);
do $$
begin
  assert public.landing_member_role() is null;
  assert not exists (select from public.landing_versions);
  begin
    perform public.save_landing_draft(null, 0, 0, 'Visitor draft', 'Copy', null, 'Store', 'Demo', '/sign-up');
    raise exception 'Ordinary visitor saved a draft';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '61110000-0000-4000-8000-000000000004', true);
do $$ begin assert public.landing_member_role() is null; end $$;

select set_config('request.jwt.claim.sub', '61110000-0000-4000-8000-000000000001', true);
select id from public.submit_landing_draft(current_setting('cp_retail.landing_test_draft')::uuid, 0);
do $$
begin
  begin
    perform public.publish_landing_version(current_setting('cp_retail.landing_test_draft')::uuid, 1, 0);
    raise exception 'Editor could publish without review';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_landing_draft(
      current_setting('cp_retail.landing_test_draft')::uuid, 0, 0, 'Changed', 'Copy', null, 'Store', 'Demo', '/sign-up'
    );
    raise exception 'Editor changed a submitted version';
  exception when serialization_failure then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '61110000-0000-4000-8000-000000000002', true);
do $$
declare
  own_draft uuid;
begin
  assert exists (select from public.landing_versions where status = 'submitted' and title = 'Member draft');
  assert exists (select from storage.objects where bucket_id = 'cp-retail-landing');
  own_draft := (public.save_landing_draft(null, 0, 0, 'Reviewer draft', 'Copy', null, 'Store', 'Demo', '/sign-up')).id;
  perform public.submit_landing_draft(own_draft, 0);
  begin
    perform public.publish_landing_version(own_draft, 1, 0);
    raise exception 'Reviewer approved their own submission';
  exception when serialization_failure then null;
  end;
  assert public.publish_landing_version(current_setting('cp_retail.landing_test_draft')::uuid, 1, 0) = 1;
  begin
    perform public.rollback_landing_version(0);
    raise exception 'A stale rollback changed the current release';
  exception when serialization_failure then null;
  end;
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert (select title = 'Member draft' and demo_url = 'https://example.invalid/demo' from public.get_published_landing());
  assert exists (select from storage.objects where bucket_id = 'cp-retail-landing');
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '61110000-0000-4000-8000-000000000002', true);
select public.rollback_landing_version(1);
do $$
begin
  assert (select count(*) = 2 from public.landing_publication_log);
  assert exists (select from public.landing_publication_log where generation = 2 and action = 'rollback' and version_id is null);
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert (select version_id is null and generation = 2 from public.get_published_landing());
  assert not exists (select from storage.objects where bucket_id = 'cp-retail-landing');
end;
$$;

rollback;
