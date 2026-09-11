-- T22 Slice 2: draft creation is serialized per immutable service key.
-- Public/browser roles never execute this function or touch the table directly.

create unique index if not exists service_config_versions_one_draft
  on public.service_config_versions (service_key) where state = 'draft';

create or replace function public.create_service_config_draft(
  p_service_key text,
  p_payload jsonb,
  p_checksum text,
  p_author_email text
)
returns setof public.service_config_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version integer;
begin
  if p_service_key !~ '^[a-z0-9_]{2,80}$' then
    raise exception using errcode = '22023', message = 'SERVICE_KEY_INVALID';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
     or not (p_payload ?& array['title', 'tagline', 'summary', 'category', 'discoveryVisible', 'landingPath'])
     or (select count(*) from jsonb_object_keys(p_payload)) <> 6
     or jsonb_typeof(p_payload -> 'discoveryVisible') <> 'boolean'
     or length(btrim(p_payload ->> 'title')) not between 1 and 100
     or length(btrim(p_payload ->> 'tagline')) not between 1 and 180
     or length(btrim(p_payload ->> 'summary')) not between 1 and 1000
     or length(btrim(p_payload ->> 'category')) not between 1 and 40
     or length(btrim(p_payload ->> 'landingPath')) not between 1 and 240 then
    raise exception using errcode = '22023', message = 'SERVICE_DRAFT_FIELDS_INVALID';
  end if;
  if p_checksum !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'SERVICE_CHECKSUM_INVALID';
  end if;
  if length(btrim(p_author_email)) not between 3 and 320 then
    raise exception using errcode = '22023', message = 'SERVICE_AUTHOR_INVALID';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_service_key, 0));
  if exists (
    select 1 from public.service_config_versions
    where service_key = p_service_key and state = 'draft'
  ) then
    raise exception using errcode = '23505', message = 'SERVICE_DRAFT_EXISTS';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.service_config_versions
  where service_key = p_service_key;

  return query
  insert into public.service_config_versions (
    service_key, version, payload, checksum, state, author_email, revision
  ) values (
    p_service_key, v_version, p_payload, p_checksum, 'draft', lower(btrim(p_author_email)), 0
  )
  returning *;
end;
$$;

revoke all on function public.create_service_config_draft(text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.create_service_config_draft(text, jsonb, text, text)
  to service_role;
