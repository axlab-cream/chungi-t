create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid,
  order_id text,
  report_id text,
  category text not null check (category in ('payment', 'generation', 'interpretation', 'access', 'privacy', 'other')),
  status text not null default 'received' check (status in ('received', 'triaged', 'assigned', 'investigating', 'awaiting_customer', 'resolved', 'closed', 'reopened')),
  assignee_email text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  resolution_code text check (resolution_code is null or resolution_code in ('guidance', 'access_restored', 'generation_recovered', 'refund_processed', 'content_corrected', 'duplicate', 'other')),
  created_by_email text not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete restrict,
  author_email text not null,
  kind text not null default 'internal' check (kind in ('internal', 'customer_reply_draft')),
  text text not null check (char_length(btrim(text)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists support_cases_status_created_at_idx on public.support_cases (status, created_at desc);
create index if not exists support_cases_assignee_updated_at_idx on public.support_cases (assignee_email, updated_at desc);
create index if not exists support_notes_case_created_at_idx on public.support_notes (case_id, created_at asc);

alter table public.support_cases enable row level security;
alter table public.support_notes enable row level security;

revoke all on table public.support_cases from anon, authenticated;
revoke all on table public.support_notes from anon, authenticated;
grant select, insert, update on table public.support_cases to service_role;
grant select, insert on table public.support_notes to service_role;
