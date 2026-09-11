create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null check (actor_email = lower(actor_email)),
  action text not null check (char_length(action) between 3 and 120),
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id text not null check (char_length(target_id) between 1 and 160),
  reason text,
  redacted_diff jsonb not null default '{}'::jsonb check (jsonb_typeof(redacted_diff) = 'object'),
  request_id text,
  result text not null check (result in ('started', 'succeeded', 'rejected', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_target_created_idx
  on public.admin_audit_events (target_type, target_id, created_at desc);

create index if not exists admin_audit_events_created_idx
  on public.admin_audit_events (created_at desc);

create table if not exists public.admin_command_receipts (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null check (actor_email = lower(actor_email)),
  action text not null check (char_length(action) between 3 and 120),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
  state text not null default 'processing' check (state in ('processing', 'completed')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_email, action, idempotency_key)
);

alter table public.admin_audit_events enable row level security;
alter table public.admin_command_receipts enable row level security;

revoke all on table public.admin_audit_events from public, anon, authenticated, service_role;
revoke all on table public.admin_command_receipts from public, anon, authenticated, service_role;
grant select, insert on table public.admin_audit_events to service_role;
grant select, insert, update on table public.admin_command_receipts to service_role;
