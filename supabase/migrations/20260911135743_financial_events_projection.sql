create table if not exists public.financial_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  kind text not null check (kind in ('payment_approved')),
  provider text not null,
  source_ref text not null,
  amount integer not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, source_ref)
);
create index if not exists financial_events_order_occurred_idx on public.financial_events (order_id, occurred_at desc);
alter table public.financial_events enable row level security;
revoke all on table public.financial_events from anon, authenticated;
grant select, insert on table public.financial_events to service_role;
