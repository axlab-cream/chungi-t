-- T22 Slice 3: atomically archive the previous live row and promote one
-- reviewed draft. Only the server-side service role may execute this command.
create or replace function public.publish_service_config_draft(
  p_service_key text,
  p_draft_id uuid,
  p_expected_revision integer,
  p_actor_email text
)
returns setof public.service_config_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_draft public.service_config_versions%rowtype;
begin
  if p_service_key !~ '^[a-z0-9_]{2,80}$'
     or p_draft_id is null
     or p_expected_revision < 0
     or length(btrim(p_actor_email)) not between 3 and 320 then
    raise exception using errcode = '22023', message = 'SERVICE_DRAFT_PUBLISH_INVALID';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_service_key, 0));
  select * into v_draft
  from public.service_config_versions
  where id = p_draft_id
    and service_key = p_service_key
    and state = 'draft'
    and revision = p_expected_revision
  for update;

  if not found then
    raise exception using errcode = '23505', message = 'SERVICE_DRAFT_REVISION_CONFLICT';
  end if;

  update public.service_config_versions
  set state = 'archived', revision = revision + 1, updated_at = now()
  where service_key = p_service_key and state = 'published';

  return query
  update public.service_config_versions
  set state = 'published', revision = revision + 1,
      published_at = now(), updated_at = now()
  where id = p_draft_id
  returning *;
end;
$$;

revoke all on function public.publish_service_config_draft(text, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.publish_service_config_draft(text, uuid, integer, text)
  to service_role;
