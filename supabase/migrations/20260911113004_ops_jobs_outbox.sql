create table if not exists public.ops_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target_id text not null,
  state text not null default 'queued' check (state in ('queued','running','retry','dead','succeeded')),
  idempotency_key text not null unique,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  lease_until timestamptz,
  next_run_at timestamptz not null default now(),
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ops_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  target_id text not null,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ops_jobs_runnable_idx on public.ops_jobs (state, next_run_at) where state in ('queued','retry');
alter table public.ops_jobs enable row level security;
alter table public.ops_outbox enable row level security;
revoke all on table public.ops_jobs, public.ops_outbox from anon, authenticated;
grant select, insert, update on table public.ops_jobs to service_role;
grant select, insert, update on table public.ops_outbox to service_role;

create or replace function public.claim_ops_jobs(p_limit integer default 10, p_lease_seconds integer default 240)
returns setof public.ops_jobs
language sql
security invoker
set search_path = public
as $$
  with candidates as (
    select id from public.ops_jobs
    where (state in ('queued','retry') and next_run_at <= now())
       or (state = 'running' and lease_until < now())
    order by next_run_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(p_limit, 25))
  )
  update public.ops_jobs j
  set state = 'running', lease_until = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 600))), attempts = j.attempts + 1, updated_at = now()
  from candidates c where j.id = c.id
  returning j.*;
$$;
revoke all on function public.claim_ops_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_ops_jobs(integer, integer) to service_role;
