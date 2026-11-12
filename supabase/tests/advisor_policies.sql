-- Run against a test database with the workspace and Advisor migrations applied.
begin;

insert into auth.users (id, email) values
  ('2e61472a-776e-4ac1-b60e-000000000001', 'advisor-a@example.invalid'),
  ('2e61472a-776e-4ac1-b60e-000000000002', 'advisor-b@example.invalid');

do $$
begin
  if has_function_privilege('anon', 'public.queue_advisor_review(text,text,text,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.claim_advisor_review(text,uuid)', 'EXECUTE')
    or has_table_privilege('authenticated', 'public.advisor_budget', 'SELECT')
    or has_table_privilege('authenticated', 'public.ai_requests', 'UPDATE') then
    raise exception 'An untrusted client can bypass the Advisor queue';
  end if;
end;
$$;

set local role authenticated;
do $$
declare
  alice uuid := '2e61472a-776e-4ac1-b60e-000000000001';
  bob uuid := '2e61472a-776e-4ac1-b60e-000000000002';
  alice_request text;
  bob_request text;
begin
  perform set_config('request.jwt.claim.sub', alice::text, true);
  alice_request := public.queue_advisor_review('Decision review', 'sample', '{"cost":10}', 'qa');
  if public.queue_advisor_review('Same inputs', 'sample', '{"cost":10}', 'qa') <> alice_request then
    raise exception 'Same review was queued more than once';
  end if;
  if public.queue_advisor_review('Hash collision', 'sample', '{"cost":11}', 'qa') = alice_request then
    raise exception 'A fingerprint collision reused a different context';
  end if;
  for n in 3..20 loop
    perform public.queue_advisor_review('Queue limit', 'sample', n::text, 'qa');
  end loop;
  begin
    perform public.queue_advisor_review('Over queue limit', 'sample', '21', 'qa');
    raise exception using errcode = '22023', message = 'Queue rate limit failed';
  exception when raise_exception then
    null;
  end;

  perform set_config('request.jwt.claim.sub', bob::text, true);
  if exists (select from public.ai_requests where id = alice_request) then
    raise exception 'Another account can read the queue';
  end if;
  bob_request := public.queue_advisor_review('Different owner', 'sample', '{"cost":10}', 'qa');
  if alice_request = bob_request then raise exception 'Different accounts share a review'; end if;
  perform set_config('cp.qa.alice_request', alice_request, true);
  perform set_config('cp.qa.bob_request', bob_request, true);
end;
$$;

reset role;
insert into public.advisor_budget values ((now() at time zone 'UTC')::date, 63);

set local role service_role;
do $$
declare
  alice uuid := '2e61472a-776e-4ac1-b60e-000000000001';
  bob uuid := '2e61472a-776e-4ac1-b60e-000000000002';
  alice_request text := current_setting('cp.qa.alice_request');
  bob_request text := current_setting('cp.qa.bob_request');
begin
  if public.claim_advisor_review(alice_request, bob) then raise exception 'Wrong owner claimed a request'; end if;
  if not public.claim_advisor_review(alice_request, alice) then raise exception 'The 64th claim failed'; end if;
  if public.claim_advisor_review(alice_request, alice) then raise exception 'The same request was claimed twice'; end if;
  if public.claim_advisor_review(bob_request, bob) then raise exception 'Daily model limit exceeded'; end if;
  if (select request_status from public.ai_requests where id = bob_request) <> 'Failed' then
    raise exception 'Request at the daily limit did not reach a terminal status';
  end if;
  update public.ai_requests set processing_at = now() - interval '3 minutes' where id = alice_request;
  if public.claim_advisor_review(alice_request, alice) then raise exception 'An uncertain model call was replayed'; end if;
  if (select request_status from public.ai_requests where id = alice_request) <> 'Failed' then
    raise exception 'An uncertain claim never expires';
  end if;
  if (select attempts from public.advisor_budget) <> 64 then raise exception 'Daily budget count changed unexpectedly'; end if;
end;
$$;

rollback;
