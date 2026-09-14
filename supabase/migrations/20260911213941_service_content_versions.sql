-- T22: versioned operator content. Public/browser roles never read these rows
-- directly; a server adapter selects the published revision after validation.
create table if not exists public.service_config_versions (
  id uuid primary key default gen_random_uuid(),
  service_key text not null check (service_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  version integer not null check (version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  checksum text not null check (length(checksum) = 64),
  state text not null default 'draft' check (state in ('draft', 'published', 'archived')),
  author_email text not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (service_key, version)
);
create unique index if not exists service_config_versions_one_published
  on public.service_config_versions (service_key) where state = 'published';

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('service_card', 'landing_copy', 'faq', 'notice', 'banner', 'legal_link')),
  service_key text,
  placement text not null check (length(placement) between 1 and 120),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  checksum text not null check (length(checksum) = 64),
  state text not null default 'draft' check (state in ('draft', 'published', 'archived')),
  author_email text not null,
  review_note text,
  revision integer not null default 0 check (revision >= 0),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists content_versions_one_published_placement
  on public.content_versions (content_type, coalesce(service_key, ''), placement)
  where state = 'published';

alter table public.service_config_versions enable row level security;
alter table public.content_versions enable row level security;
revoke all on public.service_config_versions, public.content_versions from anon, authenticated;
grant select, insert, update on public.service_config_versions, public.content_versions to service_role;
