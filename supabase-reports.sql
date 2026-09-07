-- cheongi_reports: durable interpretation cache + admin analytics columns
-- Source of truth is per authenticated Supabase user (auth.uid()), not device-local storage.
-- Unique public URL scheme: https://umsh.kr/r/{public_id}
-- report_id = stable cache key (sha256 fingerprint of user + service + normalized inputs)
-- public_id = unique UUID discriminator for URLs + admin joins

create table if not exists public.cheongi_reports (
  report_id text primary key,
  payload jsonb not null,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  auth_provider text,
  admin_status text not null default 'new',
  public_id text,
  service_key text,
  status text,
  progress_complete integer,
  progress_total integer,
  order_id text,
  input_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cheongi_reports
  add column if not exists user_id uuid,
  add column if not exists user_email text,
  add column if not exists auth_provider text,
  add column if not exists admin_status text,
  add column if not exists public_id text,
  add column if not exists service_key text,
  add column if not exists status text,
  add column if not exists progress_complete integer,
  add column if not exists progress_total integer,
  add column if not exists order_id text,
  add column if not exists input_fingerprint text;

alter table public.cheongi_reports enable row level security;

drop policy if exists "reports owner select" on public.cheongi_reports;
create policy "reports owner select" on public.cheongi_reports
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "reports owner insert" on public.cheongi_reports;
create policy "reports owner insert" on public.cheongi_reports
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "reports owner update" on public.cheongi_reports;
create policy "reports owner update" on public.cheongi_reports
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reports owner delete" on public.cheongi_reports;
create policy "reports owner delete" on public.cheongi_reports
  for delete to authenticated using (auth.uid() = user_id);

-- Full snapshots contain internal prompts and generation attempts. Only the
-- server may access this table; the application checks owner/payment access.
-- Deploy the service-role report-store path before revoking legacy user access.
revoke all on table public.cheongi_reports from public, anon, authenticated;
grant select, insert, update, delete on table public.cheongi_reports to service_role;

-- Column grants are independent of table grants; remove any legacy exceptions.
do $$
declare columns_sql text;
begin
  select string_agg(quote_ident(attname), ',') into columns_sql
  from pg_attribute where attrelid = 'public.cheongi_reports'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke all (%s) on table public.cheongi_reports from public, anon, authenticated', columns_sql);
end $$;

create index if not exists cheongi_reports_user_id_idx
  on public.cheongi_reports (user_id);

create unique index if not exists cheongi_reports_public_id_uidx
  on public.cheongi_reports (public_id)
  where public_id is not null;

create index if not exists cheongi_reports_service_created_idx
  on public.cheongi_reports (service_key, created_at desc);

create index if not exists cheongi_reports_status_updated_idx
  on public.cheongi_reports (status, updated_at desc);

create index if not exists cheongi_reports_user_service_idx
  on public.cheongi_reports (user_id, service_key, updated_at desc);

create unique index if not exists cheongi_reports_result_uuid_uidx
  on public.cheongi_reports ((payload->>'resultId'))
  where payload->>'resultId' is not null;

create index if not exists cheongi_reports_user_updated_idx
  on public.cheongi_reports (user_id, updated_at desc);
