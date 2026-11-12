create table public.products (
  id text primary key,
  title text not null check (length(trim(title)) > 0)
);

insert into public.products (id, title) values
  ('demo-snack-drink', 'Snack + drink meal deal'),
  ('demo-coffee', 'Ready-to-drink coffee'),
  ('demo-grocery', 'Everyday essentials');

create table public.scenarios (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 1024),
  product_id text not null references public.products(id),
  reference_price numeric(12,2) not null check (reference_price between 0 and 1000000000),
  unit_cost numeric(12,2) check (unit_cost between 0 and 1000000000),
  discount integer not null check (discount between 0 and 100),
  units integer not null check (units between 0 and 1000000),
  stock integer not null check (stock between 0 and 1000000),
  period_days integer not null check (period_days between 1 and 3650),
  comparison_group text,
  notes text,
  source text,
  status text,
  created_at timestamptz not null default now(),
  discounted_price numeric generated always as (round(reference_price * (100 - discount)) / 100) stored,
  revenue numeric generated always as (round(reference_price * (100 - discount)) * units / 100) stored,
  gross_profit numeric generated always as (
    (round(reference_price * (100 - discount)) - unit_cost * 100) * units / 100
  ) stored,
  remaining_stock integer generated always as (stock - units) stored,
  unique (owner_id, id)
);

create table public.decisions (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 1024),
  scenario_id text not null,
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  decided_at timestamptz,
  snapshot text not null,
  created_at timestamptz not null default now(),
  check ((status = 'Pending') = (decided_at is null)),
  unique (owner_id, scenario_id),
  foreign key (owner_id, scenario_id) references public.scenarios(owner_id, id)
);

create table public.datasets (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 1024),
  source text not null check (source in ('demo', 'upload')),
  csv text not null check (length(csv) between 1 and 100000),
  row_count integer not null check (row_count between 1 and 2000),
  as_of date not null,
  window_days integer not null check (window_days in (30, 60, 90)),
  created_at timestamptz not null default now()
);

create unique index datasets_one_demo_per_owner on public.datasets (owner_id) where csv = 'demo:207';

create table public.test_feedback (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  completed integer not null check (completed between 0 and 5),
  tasks_json text not null,
  clarity integer not null check (clarity between 1 and 5),
  usefulness integer not null check (usefulness between 1 and 5),
  trust integer not null check (trust between 1 and 5),
  comment text check (length(comment) <= 500),
  app_version text not null,
  created_at timestamptz not null default now()
);

create table public.ai_requests (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  source_id text not null,
  context text not null check (octet_length(context) between 1 and 65536),
  fingerprint text not null check (length(fingerprint) between 1 and 128),
  request_status text not null default 'Queued' check (request_status in ('Queued', 'Processing', 'Completed', 'Failed')),
  answer text,
  error_message text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.advisor_votes (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  surface text not null,
  vote text not null check (vote in ('up', 'down')),
  segment_id text,
  request_id text,
  ai_answered boolean not null default false,
  app_version text not null,
  created_at timestamptz not null default now()
);

create index scenarios_owner_created on public.scenarios (owner_id, created_at desc);
create index decisions_owner_created on public.decisions (owner_id, created_at desc);
create index datasets_owner_created on public.datasets (owner_id, created_at desc);
create index ai_requests_owner_fingerprint on public.ai_requests (owner_id, fingerprint, created_at desc);

revoke all on table public.products from public, anon, authenticated;
grant select on table public.products to authenticated;
grant all on table public.products to service_role;
alter table public.products enable row level security;
create policy products_read_authenticated on public.products for select to authenticated using (true);

do $$
declare
  relation text;
begin
  foreach relation in array array['scenarios', 'decisions', 'datasets', 'test_feedback', 'ai_requests', 'advisor_votes'] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', relation);
    execute format('grant select on table public.%I to authenticated', relation);
    execute format('grant all on table public.%I to service_role', relation);
    execute format('alter table public.%I enable row level security', relation);
    execute format('create policy read_own on public.%I for select to authenticated using (owner_id = (select auth.uid()))', relation);
  end loop;

  foreach relation in array array['scenarios', 'decisions', 'datasets', 'test_feedback', 'advisor_votes'] loop
    execute format('create policy create_own on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', relation);
  end loop;
end;
$$;

grant insert (owner_id, name, product_id, reference_price, unit_cost, discount, units, stock, period_days, comparison_group, notes, source)
  on public.scenarios to authenticated;
grant insert (owner_id, name, scenario_id, reason, snapshot), update (status, reason, decided_at)
  on public.decisions to authenticated;
grant insert (owner_id, name, source, csv, row_count, as_of, window_days) on public.datasets to authenticated;
grant insert (owner_id, name, completed, tasks_json, clarity, usefulness, trust, comment, app_version)
  on public.test_feedback to authenticated;
grant insert (owner_id, name, surface, vote, segment_id, request_id, ai_answered, app_version)
  on public.advisor_votes to authenticated;

create policy update_own on public.decisions for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
