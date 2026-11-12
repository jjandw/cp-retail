-- Run against a test database with the workspace migrations applied.
begin;

insert into auth.users (id, email) values
  ('2e61472a-776e-4ac1-b60e-000000000001', 'retail-a@example.invalid'),
  ('2e61472a-776e-4ac1-b60e-000000000002', 'retail-b@example.invalid');

set local role authenticated;

do $$
declare
  alice uuid := '2e61472a-776e-4ac1-b60e-000000000001';
  bob uuid := '2e61472a-776e-4ac1-b60e-000000000002';
  alice_scenario text;
  alice_decision text;
  numbers record;
begin
  perform set_config('request.jwt.claim.sub', alice::text, true);

  insert into public.scenarios (owner_id, name, product_id, reference_price, unit_cost, discount, units, stock, period_days)
    values (alice, 'Alice offer', 'demo-snack-drink', 95, 62.51, 5, 1250, 1350, 30)
    returning id, owner_id, discounted_price, revenue, gross_profit, remaining_stock into numbers;
  alice_scenario := numbers.id;
  if numbers.owner_id <> alice or numbers.discounted_price <> 90.25 or numbers.revenue <> 112812.50
    or numbers.gross_profit <> 34675 or numbers.remaining_stock <> 100 then
    raise exception 'Scenario formula or owner changed: %', numbers;
  end if;

  insert into public.scenarios (name, product_id, reference_price, discount, units, stock, period_days)
    values ('Cost unknown', 'demo-coffee', 10, 0, 50, 40, 7) returning gross_profit into numbers;
  if numbers.gross_profit is not null then raise exception 'Missing cost must keep profit unknown'; end if;

  insert into public.decisions (owner_id, name, scenario_id, reason, snapshot)
    values (alice, 'Alice decision', alice_scenario, 'Check demand', '{}') returning id into alice_decision;
  if (select status from public.decisions where id = alice_decision) <> 'Pending' then
    raise exception 'New decision must be Pending';
  end if;
  update public.decisions set status = 'Approved', decided_at = '2026-11-10T00:00:00Z' where id = alice_decision;
  if not found then raise exception 'Owner could not update the decision'; end if;
  begin
    insert into public.decisions (name, scenario_id, reason, snapshot) values ('Duplicate', alice_scenario, 'Reason', '{}');
    raise exception 'Duplicate decision was allowed';
  exception when unique_violation then
    null;
  end;

  insert into public.datasets (owner_id, name, source, csv, row_count, as_of, window_days)
    values (alice, 'Demo store', 'demo', 'demo:207', 1561, '2026-11-05', 30);
  begin
    insert into public.datasets (name, source, csv, row_count, as_of, window_days)
      values ('Duplicate demo', 'demo', 'demo:207', 1561, '2026-11-05', 30);
    raise exception 'Duplicate demo dataset was allowed';
  exception when unique_violation then
    null;
  end;
  insert into public.test_feedback (name, completed, tasks_json, clarity, usefulness, trust, app_version)
    values ('Alice feedback', 3, '[]', 4, 5, 4, 'test');
  insert into public.advisor_votes (name, surface, vote, app_version) values ('Alice vote', 'home', 'up', 'test');

  begin
    insert into public.scenarios (owner_id, name, product_id, reference_price, discount, units, stock, period_days)
      values (bob, 'Wrong owner', 'demo-coffee', 10, 0, 50, 40, 7);
    raise exception 'Forged owner was accepted';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.decisions set owner_id = bob where id = alice_decision;
    raise exception 'Changing the owner was allowed';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.ai_requests (name, source_id, context, fingerprint, request_status, answer)
      values ('Forged AI answer', alice_scenario, '{}', 'test', 'Completed', 'fake');
    raise exception 'A browser created an AI answer';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', bob::text, true);
  if exists (select from public.scenarios) or exists (select from public.decisions)
    or exists (select from public.datasets) or exists (select from public.test_feedback)
    or exists (select from public.advisor_votes) then
    raise exception 'Bob can read Alice data';
  end if;
  update public.decisions set reason = 'Cross-account write' where id = alice_decision;
  if found then raise exception 'Bob updated Alice decision'; end if;
  begin
    insert into public.decisions (owner_id, name, scenario_id, reason, snapshot)
      values (bob, 'Wrong scenario', alice_scenario, 'Reason', '{}');
    raise exception 'Cross-account scenario link was allowed';
  exception when foreign_key_violation then
    null;
  end;
  insert into public.datasets (name, source, csv, row_count, as_of, window_days)
    values ('Bob demo', 'demo', 'demo:207', 1561, '2026-11-05', 30);
  if (select count(*) from public.datasets) <> 1 then raise exception 'Bob demo did not save privately'; end if;

  perform set_config('request.jwt.claim.sub', alice::text, true);
  if (select count(*) from public.datasets) <> 1 then raise exception 'Alice sees Bob data'; end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.scenarios;
    raise exception 'Anonymous account queried the workspace';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

rollback;
