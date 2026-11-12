-- The runner supplies one normalized snapshot in pg_temp.cp_history_input.
create temp table cp_history_owners on commit drop as
select batch->>'email' as email, min(account.id::text)::uuid as owner_id
from cp_history_input as source
cross join lateral jsonb_array_elements(source.payload->'owners') as batch
join auth.users as account on lower(btrim(account.email)) = batch->>'email'
  and account.email_confirmed_at is not null and account.is_anonymous is not true
group by batch->>'email'
having count(*) = 1;

create temp table cp_history_rows on commit drop as
select mapped.owner_id, batch->'tables' as rows
from cp_history_input as source
cross join lateral jsonb_array_elements(source.payload->'owners') as batch
join cp_history_owners as mapped on mapped.email = batch->>'email';

insert into public.products (id, title)
select r.id, r.title from cp_history_input h
cross join lateral jsonb_populate_recordset(null::public.products, h.payload->'products') r
on conflict (id) do nothing;

insert into public.scenarios
  (id, owner_id, name, product_id, reference_price, unit_cost, discount, units, stock,
   period_days, comparison_group, notes, source, status, created_at)
select r.id, h.owner_id, r.name, r.product_id, r.reference_price, r.unit_cost, r.discount, r.units, r.stock,
  r.period_days, r.comparison_group, r.notes, r.source, r.status, r.created_at
from cp_history_rows h cross join lateral jsonb_populate_recordset(null::public.scenarios, h.rows->'scenarios') r
on conflict (id) do nothing;

insert into public.decisions (id, owner_id, name, scenario_id, reason, status, decided_at, snapshot, created_at)
select r.id, h.owner_id, r.name, r.scenario_id, r.reason, r.status, r.decided_at, r.snapshot, r.created_at
from cp_history_rows h cross join lateral jsonb_populate_recordset(null::public.decisions, h.rows->'decisions') r
on conflict (id) do nothing;

create temp table cp_history_datasets on commit drop as
select r.id, h.owner_id, r.name, r.source, r.csv, r.row_count, r.as_of, r.window_days, r.created_at
from cp_history_rows h cross join lateral jsonb_populate_recordset(null::public.datasets, h.rows->'datasets') r;

-- Try the original marker first. A concurrent app insert may claim the canonical demo.
insert into public.datasets (id, owner_id, name, source, csv, row_count, as_of, window_days, created_at)
select id, owner_id, name, source, csv, row_count, as_of, window_days, created_at
from cp_history_datasets
on conflict do nothing;

-- A conflicting demo is still a separate historical record. This marker decodes to
-- the same sample transactions, with the historical row's own analysis settings.
insert into public.datasets (id, owner_id, name, source, csv, row_count, as_of, window_days, created_at)
select r.id, r.owner_id, r.name, r.source, 'demo:207:softr', r.row_count, r.as_of, r.window_days, r.created_at
from cp_history_datasets r
where r.csv = 'demo:207'
  and not exists (select from public.datasets saved where saved.id = r.id)
  and exists (
    select from public.datasets canonical
    where canonical.owner_id = r.owner_id and canonical.csv = 'demo:207' and canonical.id <> r.id
  )
on conflict (id) do nothing;

insert into public.ai_requests
  (id, owner_id, name, source_id, context, fingerprint, request_status, answer, error_message, answered_at, created_at)
select r.id, h.owner_id, r.name, r.source_id, r.context, r.fingerprint, r.request_status, r.answer, r.error_message, r.answered_at, r.created_at
from cp_history_rows h cross join lateral jsonb_populate_recordset(null::public.ai_requests, h.rows->'ai_requests') r
on conflict (id) do nothing;

insert into public.test_feedback (id, owner_id, name, completed, tasks_json, clarity, usefulness, trust, comment, app_version, created_at)
select r.id, h.owner_id, r.name, r.completed, r.tasks_json, r.clarity, r.usefulness, r.trust, r.comment, r.app_version, r.created_at
from cp_history_rows h cross join lateral jsonb_populate_recordset(null::public.test_feedback, h.rows->'test_feedback') r
on conflict (id) do nothing;

insert into public.advisor_votes (id, owner_id, name, surface, vote, segment_id, request_id, ai_answered, app_version, created_at)
select r.id, h.owner_id, r.name, r.surface, r.vote, r.segment_id, r.request_id, r.ai_answered, r.app_version, r.created_at
from cp_history_rows h cross join lateral jsonb_populate_recordset(null::public.advisor_votes, h.rows->'advisor_votes') r
on conflict (id) do nothing;

-- Verify the owner even when a repeated import reused an existing row.
do $$
declare
  relation text;
  missing_or_wrong_owner boolean;
begin
  foreach relation in array array['scenarios', 'decisions', 'datasets', 'ai_requests', 'test_feedback', 'advisor_votes'] loop
    execute format(
      'select exists (
         select from pg_temp.cp_history_rows h
         cross join lateral jsonb_array_elements(h.rows->%L) as incoming
         left join public.%I saved on saved.id = incoming->>''id'' and saved.owner_id = h.owner_id
         where saved.id is null
       )', relation, relation
    ) into missing_or_wrong_owner;
    if missing_or_wrong_owner then raise exception 'A historical ID is missing or has another owner.'; end if;
  end loop;
end;
$$;

select json_build_object(
  'verifiedOwners', (select count(*) from cp_history_owners),
  'sourceOwners', (select jsonb_array_length(payload->'owners') from cp_history_input),
  'eligibleRecords', (select coalesce(sum(jsonb_array_length(records)), 0)
    from cp_history_rows cross join lateral jsonb_each(rows) as record_sets (relation, records)),
  'preservedDemoConflicts', (
    select count(*) from cp_history_datasets incoming
    join public.datasets saved using (id, owner_id)
    where incoming.csv = 'demo:207' and saved.csv = 'demo:207:softr'
  )
);
