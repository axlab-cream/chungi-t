-- Operations-admin accounts are server-only. This migration is deliberately
-- idempotent because the initial table was created in production before its
-- schema was brought under migration history.
create table if not exists public.umsh_admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  is_active boolean not null default true,
  role text not null default 'super_admin' check (role in ('super_admin')),
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.umsh_admin_accounts enable row level security;

-- Browser roles must never read hashes or discover the administrator list.
revoke all on table public.umsh_admin_accounts from public, anon, authenticated;
revoke all on table public.umsh_admin_accounts from service_role;
grant select, insert, update on table public.umsh_admin_accounts to service_role;

-- The initial manually-created table did not constrain role values. Keep the
-- current single-role contract explicit until audited role management exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'umsh_admin_accounts_role_check'
      and conrelid = 'public.umsh_admin_accounts'::regclass
  ) then
    alter table public.umsh_admin_accounts
      add constraint umsh_admin_accounts_role_check
      check (role in ('super_admin'));
  end if;
end $$;
