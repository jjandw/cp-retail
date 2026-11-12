create table public.landing_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'reviewer'))
);

create table public.landing_versions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'published')),
  base_generation bigint not null,
  edit_revision integer not null default 0,
  title text not null check (char_length(title) between 1 and 180),
  summary text not null check (char_length(summary) between 1 and 600),
  image_path text,
  image_alt text not null check (char_length(image_alt) between 1 and 180),
  demo_label text not null check (char_length(demo_label) between 1 and 80),
  demo_url text not null check (
    char_length(demo_url) between 1 and 2048
    and demo_url !~ '[[:space:][:cntrl:]]'
    and position(chr(92) in demo_url) = 0
    and (
      (left(demo_url, 1) = '/' and left(demo_url, 2) <> '//')
      or demo_url ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#].*)?$'
    )
  ),
  updated_at timestamptz not null default now()
);

create table public.landing_publication (
  singleton boolean primary key default true check (singleton),
  generation bigint not null default 0,
  version_id uuid references public.landing_versions(id)
);
insert into public.landing_publication default values;

create table public.landing_publication_log (
  generation bigint primary key,
  action text not null check (action in ('publish', 'rollback')),
  version_id uuid references public.landing_versions(id),
  previous_version_id uuid references public.landing_versions(id),
  reviewer_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.landing_members enable row level security;
alter table public.landing_versions enable row level security;
alter table public.landing_publication enable row level security;
alter table public.landing_publication_log enable row level security;
revoke all on public.landing_members, public.landing_versions, public.landing_publication,
  public.landing_publication_log from public, anon, authenticated;
grant select on public.landing_versions, public.landing_publication_log to authenticated;
grant select, insert, update, delete on public.landing_members to service_role;

create function public.landing_member_role() returns text
language sql stable security definer set search_path = ''
as $$
  select m.role
  from public.landing_members m
  join auth.users u on u.id = m.user_id
  where m.user_id = auth.uid() and u.email_confirmed_at is not null and not u.is_anonymous;
$$;

create policy "members read their drafts and reviewers read submissions"
on public.landing_versions for select to authenticated
using (
  (author_id = auth.uid() and public.landing_member_role() is not null)
  or (status <> 'draft' and public.landing_member_role() = 'reviewer')
);

create policy "reviewers read publication history"
on public.landing_publication_log for select to authenticated
using (public.landing_member_role() = 'reviewer');

create function public.get_published_landing()
returns table (
  generation bigint, version_id uuid, title text, summary text,
  image_path text, image_alt text, demo_label text, demo_url text
)
language sql stable security definer set search_path = ''
as $$
  select p.generation, p.version_id, v.title, v.summary, v.image_path, v.image_alt, v.demo_label, v.demo_url
  from public.landing_publication p left join public.landing_versions v on v.id = p.version_id
  where p.singleton;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cp-retail-landing', 'cp-retail-landing', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create function public.can_read_landing_image(p_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.landing_publication p join public.landing_versions v on v.id = p.version_id
    where v.image_path = p_name
  ) or (
    public.landing_member_role() is not null and (
      split_part(p_name, '/', 1) = auth.uid()::text
      or exists (
        select 1 from public.landing_versions v where v.image_path = p_name and (
          v.author_id = auth.uid()
          or (v.status <> 'draft' and public.landing_member_role() = 'reviewer')
        )
      )
    )
  );
$$;

create policy "read authorized landing images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'cp-retail-landing' and public.can_read_landing_image(name));

create policy "members upload immutable landing images in their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'cp-retail-landing'
  and public.landing_member_role() is not null
  and name ~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}[.](jpeg|png|webp)$')
);

create function public.save_landing_draft(
  p_id uuid, p_edit_revision integer, p_base_generation bigint,
  p_title text, p_summary text, p_image_path text, p_image_alt text, p_demo_label text, p_demo_url text
) returns public.landing_versions
language plpgsql security definer set search_path = ''
as $$
declare
  draft public.landing_versions;
begin
  if public.landing_member_role() is null then
    raise exception 'A verified content member is required.' using errcode = '42501';
  end if;
  if p_image_path is not null and (
    public.can_read_landing_image(p_image_path) is not true
    or not exists (
      select 1 from storage.objects where bucket_id = 'cp-retail-landing' and name = p_image_path
    )
  ) then
    raise exception 'Choose an image available to your account.' using errcode = '42501';
  end if;
  if p_id is null then
    if p_base_generation is distinct from (select generation from public.landing_publication where singleton) then
      raise exception 'The homepage changed. Start from the latest published version.' using errcode = '40001';
    end if;
    insert into public.landing_versions (
      author_id, base_generation, title, summary, image_path, image_alt, demo_label, demo_url
    ) values (
      auth.uid(), p_base_generation, btrim(p_title), btrim(p_summary), p_image_path,
      btrim(p_image_alt), btrim(p_demo_label), btrim(p_demo_url)
    ) returning * into draft;
  else
    update public.landing_versions set
      title = btrim(p_title), summary = btrim(p_summary), image_path = p_image_path,
      image_alt = btrim(p_image_alt), demo_label = btrim(p_demo_label), demo_url = btrim(p_demo_url),
      updated_at = now(), edit_revision = edit_revision + 1
    where id = p_id and author_id = auth.uid() and status = 'draft' and edit_revision = p_edit_revision
    returning * into draft;
    if not found then
      raise exception 'This draft changed or is unavailable. Reopen the draft.' using errcode = '40001';
    end if;
  end if;
  return draft;
end;
$$;

create function public.submit_landing_draft(p_id uuid, p_edit_revision integer) returns public.landing_versions
language plpgsql security definer set search_path = ''
as $$
declare
  draft public.landing_versions;
begin
  if public.landing_member_role() is null then
    raise exception 'A verified content member is required.' using errcode = '42501';
  end if;
  update public.landing_versions set status = 'submitted', updated_at = now(), edit_revision = edit_revision + 1
  where id = p_id and author_id = auth.uid() and status = 'draft' and edit_revision = p_edit_revision
    and base_generation = (select generation from public.landing_publication where singleton)
  returning * into draft;
  if not found then
    raise exception 'The draft or published homepage changed. Reopen the latest version.' using errcode = '40001';
  end if;
  return draft;
end;
$$;

create function public.return_landing_draft(p_id uuid, p_edit_revision integer) returns public.landing_versions
language plpgsql security definer set search_path = ''
as $$
declare
  draft public.landing_versions;
  member_role text := public.landing_member_role();
begin
  if member_role is null then
    raise exception 'A verified content member is required.' using errcode = '42501';
  end if;
  update public.landing_versions set status = 'draft', updated_at = now(), edit_revision = edit_revision + 1
  where id = p_id and status = 'submitted' and edit_revision = p_edit_revision
    and (author_id = auth.uid() or member_role = 'reviewer')
  returning * into draft;
  if not found then
    raise exception 'The submission changed or is unavailable.' using errcode = '40001';
  end if;
  return draft;
end;
$$;

create function public.publish_landing_version(
  p_id uuid, p_edit_revision integer, p_expected_generation bigint
) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  current_release public.landing_publication;
  next_generation bigint;
begin
  if public.landing_member_role() is distinct from 'reviewer' then
    raise exception 'A content reviewer is required.' using errcode = '42501';
  end if;
  select * into current_release from public.landing_publication where singleton for update;
  if current_release.generation is distinct from p_expected_generation then
    raise exception 'The published homepage changed. Refresh before publishing.' using errcode = '40001';
  end if;
  update public.landing_versions set status = 'published', updated_at = now(), edit_revision = edit_revision + 1
  where id = p_id and author_id <> auth.uid() and status = 'submitted' and edit_revision = p_edit_revision
    and base_generation = current_release.generation;
  if not found then
    raise exception 'A current submission from another member is required.' using errcode = '40001';
  end if;
  next_generation := current_release.generation + 1;
  update public.landing_publication set generation = next_generation, version_id = p_id where singleton;
  insert into public.landing_publication_log (generation, action, version_id, previous_version_id, reviewer_id)
  values (next_generation, 'publish', p_id, current_release.version_id, auth.uid());
  return next_generation;
end;
$$;

create function public.rollback_landing_version(p_expected_generation bigint) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  current_release public.landing_publication;
  restore_id uuid;
  next_generation bigint;
begin
  if public.landing_member_role() is distinct from 'reviewer' then
    raise exception 'A content reviewer is required.' using errcode = '42501';
  end if;
  select * into current_release from public.landing_publication where singleton for update;
  if current_release.generation is distinct from p_expected_generation or current_release.generation = 0 then
    raise exception 'Refresh the current release before restoring its previous version.' using errcode = '40001';
  end if;
  select previous_version_id into restore_id from public.landing_publication_log
  where generation = current_release.generation;
  if not found then
    raise exception 'The previous homepage version is unavailable.' using errcode = '40001';
  end if;
  next_generation := current_release.generation + 1;
  update public.landing_publication set generation = next_generation, version_id = restore_id where singleton;
  insert into public.landing_publication_log (generation, action, version_id, previous_version_id, reviewer_id)
  values (next_generation, 'rollback', restore_id, current_release.version_id, auth.uid());
  return next_generation;
end;
$$;

revoke execute on function public.landing_member_role(), public.get_published_landing(),
  public.can_read_landing_image(text),
  public.save_landing_draft(uuid, integer, bigint, text, text, text, text, text, text),
  public.submit_landing_draft(uuid, integer), public.return_landing_draft(uuid, integer),
  public.publish_landing_version(uuid, integer, bigint), public.rollback_landing_version(bigint)
from public, anon, authenticated;
grant execute on function public.get_published_landing(), public.can_read_landing_image(text) to anon, authenticated;
grant execute on function public.landing_member_role(),
  public.save_landing_draft(uuid, integer, bigint, text, text, text, text, text, text),
  public.submit_landing_draft(uuid, integer), public.return_landing_draft(uuid, integer),
  public.publish_landing_version(uuid, integer, bigint), public.rollback_landing_version(bigint)
to authenticated;
