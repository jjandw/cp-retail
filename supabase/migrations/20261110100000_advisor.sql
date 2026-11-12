alter table public.ai_requests add column processing_at timestamptz;
create index ai_requests_owner_created on public.ai_requests (owner_id, created_at desc);

create table public.advisor_budget (
  day date primary key,
  attempts integer not null check (attempts between 1 and 64)
);
alter table public.advisor_budget enable row level security;
revoke all on table public.advisor_budget from public, anon, authenticated;
grant select, insert, update on table public.advisor_budget to service_role;

create function public.queue_advisor_review(
  p_name text, p_source_id text, p_context text, p_fingerprint text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  request_id text;
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'Sign in to request an AI review.';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 200
    or p_source_id is null or char_length(btrim(p_source_id)) not between 1 and 100
    or p_context is null or octet_length(p_context) not between 1 and 65536
    or p_fingerprint is null or char_length(p_fingerprint) not between 1 and 128 then
    raise exception using errcode = '22023', message = 'Invalid review inputs.';
  end if;

  -- Concurrent submissions for this account reuse the same saved request.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 207));
  select id into request_id from public.ai_requests
  where owner_id = actor and fingerprint = p_fingerprint and context = p_context
    and (request_status in ('Queued', 'Processing')
      or (request_status = 'Completed' and nullif(btrim(answer), '') is not null))
  order by (request_status = 'Completed') desc, created_at desc, id
  limit 1;
  if found then return request_id; end if;

  if (select count(*) from public.ai_requests
      where owner_id = actor and created_at >= statement_timestamp() - interval '1 minute') >= 20 then
    raise exception using errcode = 'P0001', message = 'Too many review requests. Wait a minute and try again.';
  end if;

  insert into public.ai_requests (owner_id, name, source_id, context, fingerprint)
  values (actor, btrim(p_name), btrim(p_source_id), p_context, p_fingerprint)
  returning id into request_id;
  return request_id;
end;
$$;
revoke all on function public.queue_advisor_review(text, text, text, text) from public, anon, authenticated;
grant execute on function public.queue_advisor_review(text, text, text, text) to authenticated;

create function public.claim_advisor_review(p_request_id text, p_owner_id uuid)
returns boolean language plpgsql set search_path = '' as $$
declare
  status text;
  started_at timestamptz;
  today date := (statement_timestamp() at time zone 'UTC')::date;
begin
  select request_status, processing_at into status, started_at from public.ai_requests
  where id = p_request_id and owner_id = p_owner_id for update;
  if not found then return false; end if;

  if status = 'Processing' and (started_at is null or started_at <= statement_timestamp() - interval '2 minutes') then
    update public.ai_requests set request_status = 'Failed',
      error_message = 'The previous cloud call could not be confirmed. It may have used the review allowance.'
    where id = p_request_id and owner_id = p_owner_id;
    return false;
  end if;
  if status <> 'Queued' then return false; end if;

  insert into public.advisor_budget as budget (day, attempts) values (today, 1)
  on conflict (day) do update set attempts = budget.attempts + 1 where budget.attempts < 64;
  if not found then
    update public.ai_requests set request_status = 'Failed',
      error_message = 'The daily review limit has been reached. Try again tomorrow.'
    where id = p_request_id and owner_id = p_owner_id;
    return false;
  end if;

  update public.ai_requests set request_status = 'Processing', processing_at = statement_timestamp(), error_message = null
  where id = p_request_id and owner_id = p_owner_id;
  return true;
end;
$$;
revoke all on function public.claim_advisor_review(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_advisor_review(text, uuid) to service_role;
