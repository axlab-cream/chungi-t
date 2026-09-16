-- T22: service_config_versions 쓰기 경로.
--
-- 지금까지 이 표는 읽기만 있었다. 운영자가 서비스 문안을 고칠 방법이 없었다.
-- 쓰기를 열면서 지키는 것:
--   1. 정식 키는 경로에서만 온다. 이 함수는 키를 만들지 않는다 — 카탈로그에 없는
--      service_key 는 서버가 먼저 거른다.
--   2. draft 저장과 publish 모두 revision CAS. 두 운영자가 같은 화면에서 고칠 때
--      나중 저장이 앞선 저장을 조용히 덮지 않는다.
--   3. publish 는 호출자가 보낸 checksum 이 저장된 draft 와 같을 때만 된다.
--      검토한 내용과 게시되는 내용이 달라질 수 없다.
--
-- 행은 지우지 않는다. 이전 published 는 archived 로 남는다.

create or replace function public.save_service_config_draft(
  p_service_key text,
  p_payload jsonb,
  p_checksum text,
  p_author_email text,
  p_expected_revision integer
) returns public.service_config_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draft public.service_config_versions%rowtype;
  v_next_version integer;
  v_result public.service_config_versions%rowtype;
begin
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'SERVICE_VERSION_PAYLOAD_INVALID' using errcode = 'P0001'; end if;
  if length(p_checksum) <> 64 then raise exception 'SERVICE_VERSION_PAYLOAD_INVALID' using errcode = 'P0001'; end if;

  select * into v_draft from public.service_config_versions
  where service_key = p_service_key and state = 'draft'
  for update;

  if found then
    if p_expected_revision = -1 then raise exception 'SERVICE_VERSION_DRAFT_EXISTS' using errcode = 'P0001'; end if;
    if v_draft.revision <> p_expected_revision then raise exception 'SERVICE_VERSION_REVISION_CONFLICT' using errcode = 'P0001'; end if;
    update public.service_config_versions
    set payload = p_payload, checksum = p_checksum, author_email = lower(p_author_email),
        revision = revision + 1, updated_at = now()
    where id = v_draft.id
    returning * into v_result;
    return v_result;
  end if;

  if p_expected_revision <> -1 then raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0001'; end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.service_config_versions where service_key = p_service_key;

  insert into public.service_config_versions (service_key, version, payload, checksum, state, author_email)
  values (p_service_key, v_next_version, p_payload, p_checksum, 'draft', lower(p_author_email))
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.publish_service_config_version(
  p_service_key text,
  p_version integer,
  p_checksum text,
  p_author_email text,
  p_expected_revision integer
) returns public.service_config_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.service_config_versions%rowtype;
  v_result public.service_config_versions%rowtype;
begin
  select * into v_target from public.service_config_versions
  where service_key = p_service_key and version = p_version
  for update;
  if not found then raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_target.state <> 'draft' then raise exception 'SERVICE_VERSION_NOT_DRAFT' using errcode = 'P0001'; end if;
  if v_target.revision <> p_expected_revision then raise exception 'SERVICE_VERSION_REVISION_CONFLICT' using errcode = 'P0001'; end if;
  if v_target.checksum <> p_checksum then raise exception 'SERVICE_VERSION_CHECKSUM_MISMATCH' using errcode = 'P0001'; end if;

  -- 서비스당 published 는 하나라는 부분 유니크 인덱스가 있다. 먼저 내린 뒤 올린다.
  update public.service_config_versions
  set state = 'archived', revision = revision + 1, updated_at = now()
  where service_key = p_service_key and state = 'published';

  update public.service_config_versions
  set state = 'published', author_email = lower(p_author_email), published_at = now(),
      revision = revision + 1, updated_at = now()
  where id = v_target.id
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.save_service_config_draft(text, jsonb, text, text, integer) from public, anon, authenticated;
revoke all on function public.publish_service_config_version(text, integer, text, text, integer) from public, anon, authenticated;
grant execute on function public.save_service_config_draft(text, jsonb, text, text, integer) to service_role;
grant execute on function public.publish_service_config_version(text, integer, text, text, integer) to service_role;
