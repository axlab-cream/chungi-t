-- 장애(운영 이슈) 추적. 고객 지원 케이스(support_cases)와 같은 형태 —
-- 표 하나(사건) + 표 하나(처리 기록), RLS 는 service_role 만 접근하게 잠근다.
create table if not exists public.admin_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'mitigated', 'resolved', 'closed')),
  summary text not null check (char_length(btrim(summary)) between 1 and 2000),
  affected_area text,
  owner_email text,
  created_by_email text not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.admin_incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.admin_incidents(id) on delete restrict,
  author_email text not null,
  text text not null check (char_length(btrim(text)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists admin_incidents_status_created_at_idx on public.admin_incidents (status, created_at desc);
create index if not exists admin_incident_updates_incident_created_at_idx on public.admin_incident_updates (incident_id, created_at asc);

alter table public.admin_incidents enable row level security;
alter table public.admin_incident_updates enable row level security;

revoke all on table public.admin_incidents from anon, authenticated;
revoke all on table public.admin_incident_updates from anon, authenticated;
grant select, insert, update on table public.admin_incidents to service_role;
grant select, insert on table public.admin_incident_updates to service_role;
