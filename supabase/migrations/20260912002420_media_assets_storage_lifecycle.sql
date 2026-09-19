-- T23 Slice 2: private Storage object lifecycle metadata.
-- The storage schema itself remains API-owned and read-only. This migration
-- stores application metadata and reference locks in public tables hidden from
-- browser roles.
begin

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null check (bucket_id = 'umsh-media'),
  object_path text not null unique check (object_path ~ '^uploads/[0-9a-f-]{36}/[^/]+$'),
  original_name text not null check (length(original_name) between 1 and 180),
  kind text not null check (kind in ('image', 'video')),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4')),
  declared_bytes bigint not null check (declared_bytes > 0 and declared_bytes <= 104857600),
  byte_size bigint check (byte_size > 0 and byte_size <= 104857600),
  width integer check (width > 0),
  height integer check (height > 0),
  duration_seconds numeric(12,3) check (duration_seconds > 0),
  checksum text check (checksum ~ '^[0-9a-f]{64}$'),
  alt_text text not null check (length(alt_text) between 1 and 300),
  rights_basis text not null check (rights_basis in ('owned', 'licensed', 'public_domain', 'user_provided')),
  rights_evidence text not null check (length(rights_evidence) between 1 and 1000),
  poster_asset_id uuid references public.media_assets(id) on delete restrict,
  state text not null default 'uploading' check (state in ('uploading', 'inspecting', 'approved', 'rejected', 'deleting', 'deleted')),
  rejection_code text,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  deleted_at timestamptz,
  check ((kind = 'video' and poster_asset_id is not null) or (kind = 'image' and poster_asset_id is null)),
  check ((state = 'approved' and checksum is not null and byte_size is not null and width is not null and height is not null and approved_at is not null) or state <> 'approved')
)

create index media_assets_state_created_idx on public.media_assets (state, created_at desc)

create index media_assets_poster_idx on public.media_assets (poster_asset_id) where poster_asset_id is not null

create table public.media_asset_references (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  reference_type text not null check (reference_type in ('service', 'content', 'release')),
  reference_key text not null check (length(reference_key) between 1 and 240),
  created_at timestamptz not null default now(),
  unique (media_asset_id, reference_type, reference_key)
)

create index media_asset_references_asset_idx on public.media_asset_references (media_asset_id)

alter table public.media_assets enable row level security

alter table public.media_asset_references enable row level security

revoke all on public.media_assets, public.media_asset_references from anon, authenticated

grant select, insert, update on public.media_assets to service_role

grant select, insert, delete on public.media_asset_references to service_role

create or replace function public.begin_media_asset_delete(p_asset_id uuid)
returns setof public.media_assets
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_asset public.media_assets%rowtype;
begin
  select * into v_asset
  from public.media_assets
  where id = p_asset_id and deleted_at is null
  for update;

  if not found then
    raise exception 'MEDIA_ASSET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_asset.state <> 'approved' then
    raise exception 'MEDIA_ASSET_NOT_DELETABLE' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.media_asset_references where media_asset_id = p_asset_id)
     or exists (select 1 from public.media_assets where poster_asset_id = p_asset_id and deleted_at is null) then
    raise exception 'MEDIA_ASSET_REFERENCED' using errcode = 'P0001';
  end if;

  return query
  update public.media_assets
  set state = 'deleting', updated_at = now()
  where id = p_asset_id
  returning *;
end;
$$

revoke all on function public.begin_media_asset_delete(uuid) from public, anon, authenticated

grant execute on function public.begin_media_asset_delete(uuid) to service_role

commit
