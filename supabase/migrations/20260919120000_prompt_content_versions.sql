-- T30: Tone V2 프롬프트(공통 규칙·서비스별 페르소나 문서)의 실시간 편집.
--
-- service_config_versions(T22)와 같은 계약이다: 행은 지우지 않고, published 는 서비스·
-- content_key 당 하나만 부분 유니크 인덱스로 강제한다. draft 유일성은 RPC 가
-- `for update` 로 잠그고 애플리케이션 로직으로 확인한다(T22 와 동일 — DB 제약이 아니다).
--
-- content_key 는 'common'(공통 규칙 한 개) 또는 20개 서비스 키 중 하나다. 실제 생성
-- 파이프라인에 연결되므로, 여기 값이 곧 유료 고객에게 나가는 시스템 프롬프트가 된다.
create table if not exists public.prompt_content_versions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('common', 'service')),
  content_key text not null check (content_key ~ '^[a-z][a-z0-9_]{1,80}$'),
  version integer not null check (version > 0),
  body text not null check (length(body) between 1 and 20000),
  checksum text not null check (length(checksum) = 64),
  state text not null default 'draft' check (state in ('draft', 'published', 'archived')),
  author_email text not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (content_type, content_key, version)
);
create unique index if not exists prompt_content_versions_one_published
  on public.prompt_content_versions (content_type, content_key) where state = 'published';

alter table public.prompt_content_versions enable row level security;
revoke all on public.prompt_content_versions from anon, authenticated;
grant select, insert, update on public.prompt_content_versions to service_role;

create or replace function public.save_prompt_content_draft(
  p_content_type text,
  p_content_key text,
  p_body text,
  p_checksum text,
  p_author_email text,
  p_expected_revision integer
) returns public.prompt_content_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draft public.prompt_content_versions%rowtype;
  v_next_version integer;
  v_result public.prompt_content_versions%rowtype;
begin
  if length(p_checksum) <> 64 then raise exception 'PROMPT_CONTENT_PAYLOAD_INVALID' using errcode = 'P0001'; end if;
  if length(p_body) < 1 or length(p_body) > 20000 then raise exception 'PROMPT_CONTENT_PAYLOAD_INVALID' using errcode = 'P0001'; end if;

  select * into v_draft from public.prompt_content_versions
  where content_type = p_content_type and content_key = p_content_key and state = 'draft'
  for update;

  if found then
    if p_expected_revision = -1 then raise exception 'PROMPT_CONTENT_DRAFT_EXISTS' using errcode = 'P0001'; end if;
    if v_draft.revision <> p_expected_revision then raise exception 'PROMPT_CONTENT_REVISION_CONFLICT' using errcode = 'P0001'; end if;
    update public.prompt_content_versions
    set body = p_body, checksum = p_checksum, author_email = lower(p_author_email),
        revision = revision + 1, updated_at = now()
    where id = v_draft.id
    returning * into v_result;
    return v_result;
  end if;

  if p_expected_revision <> -1 then raise exception 'PROMPT_CONTENT_NOT_FOUND' using errcode = 'P0001'; end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.prompt_content_versions where content_type = p_content_type and content_key = p_content_key;

  insert into public.prompt_content_versions (content_type, content_key, version, body, checksum, state, author_email)
  values (p_content_type, p_content_key, v_next_version, p_body, p_checksum, 'draft', lower(p_author_email))
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.publish_prompt_content_version(
  p_content_type text,
  p_content_key text,
  p_version integer,
  p_checksum text,
  p_author_email text,
  p_expected_revision integer
) returns public.prompt_content_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.prompt_content_versions%rowtype;
  v_result public.prompt_content_versions%rowtype;
begin
  select * into v_target from public.prompt_content_versions
  where content_type = p_content_type and content_key = p_content_key and version = p_version
  for update;
  if not found then raise exception 'PROMPT_CONTENT_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_target.state <> 'draft' then raise exception 'PROMPT_CONTENT_NOT_DRAFT' using errcode = 'P0001'; end if;
  if v_target.revision <> p_expected_revision then raise exception 'PROMPT_CONTENT_REVISION_CONFLICT' using errcode = 'P0001'; end if;
  if v_target.checksum <> p_checksum then raise exception 'PROMPT_CONTENT_CHECKSUM_MISMATCH' using errcode = 'P0001'; end if;

  -- content_key 당 published 는 하나라는 부분 유니크 인덱스가 있다. 먼저 내린 뒤 올린다.
  update public.prompt_content_versions
  set state = 'archived', revision = revision + 1, updated_at = now()
  where content_type = p_content_type and content_key = p_content_key and state = 'published';

  update public.prompt_content_versions
  set state = 'published', author_email = lower(p_author_email), published_at = now(),
      revision = revision + 1, updated_at = now()
  where id = v_target.id
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.save_prompt_content_draft(text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.publish_prompt_content_version(text, text, integer, text, text, integer) from public, anon, authenticated;
grant execute on function public.save_prompt_content_draft(text, text, text, text, text, integer) to service_role;
grant execute on function public.publish_prompt_content_version(text, text, integer, text, text, integer) to service_role;
