-- Prepared only: production application requires the approved migration workflow (rules.md §6.3 H2).
--
-- 카카오톡 채널 챗봇 손님 ↔ 운명상회 회원 연결(2026-10-16, docs/admin-ops/kakao-chatbot-ai-skill-20261014.md).
--
-- 스킬 서버(/api/kakao/skill)와 연결 API(/api/kakao/link)가 service role 로만 읽고 쓴다.
-- 손님은 kakao_chat_sessions 와 같은 user_key(카카오 botUserKey 의 sha256)로만 가리킨다.
-- 원본 botUserKey·appUserId 는 어디에도 저장하지 않는다.
-- - kakao_member_links: 손님 한 명 = 회원 한 명. 회원 탈퇴(auth.users 삭제) 시 같이 지운다.
-- - kakao_link_tokens: [보관함에 저장하기] 버튼의 일회용 토큰. 원문은 URL 에만 있고 여기에는 sha256 만 둔다. 10분 만료.
-- - kakao_chat_sessions 추가 열: 자동 연결 질문·거절 시각, 마지막으로 보여 준 결과(연결 직후 보관함에 저장할 것).
BEGIN;

CREATE TABLE IF NOT EXISTS public.kakao_member_links (
  user_key text PRIMARY KEY CHECK (user_key ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  linked_via text NOT NULL CHECK (linked_via IN ('link', 'kakao_auto')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kakao_member_links_user_idx ON public.kakao_member_links (user_id);

CREATE TABLE IF NOT EXISTS public.kakao_link_tokens (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_key text NOT NULL CHECK (user_key ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 만료 토큰 정리용.
CREATE INDEX IF NOT EXISTS kakao_link_tokens_expires_idx ON public.kakao_link_tokens (expires_at);

ALTER TABLE public.kakao_chat_sessions
  ADD COLUMN IF NOT EXISTS auto_link_asked_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_link_declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_result jsonb CHECK (last_result IS NULL OR jsonb_typeof(last_result) = 'object');

-- 일회용 토큰 사용 + 연결을 한 번에 한다. 만료됐거나 이미 썼으면 NULL, 아니면 손님 user_key.
-- 같은 손님이 다른 회원과 이어져 있었으면 새 회원으로 바꾼다(본인이 방금 로그인해 누른 버튼이다).
CREATE OR REPLACE FUNCTION public.kakao_link_consume(p_token_hash text, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_key text;
BEGIN
  UPDATE public.kakao_link_tokens
     SET used_at = now()
   WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now()
  RETURNING user_key INTO v_user_key;
  IF v_user_key IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.kakao_member_links (user_key, user_id, linked_via)
  VALUES (v_user_key, p_user_id, 'link')
  ON CONFLICT (user_key) DO UPDATE SET user_id = EXCLUDED.user_id, linked_via = EXCLUDED.linked_via, created_at = now();
  RETURN v_user_key;
END;
$$;

-- 카카오 챗봇이 보낸 appUserId(카카오 로그인 회원 번호)로 운명상회 회원을 찾는다. 회원 id 만 돌려준다.
-- 익명(비회원)·삭제된 계정은 찾지 않는다.
CREATE OR REPLACE FUNCTION public.kakao_member_by_app_user(p_provider text, p_app_user_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id
    FROM auth.identities i
    JOIN auth.users u ON u.id = i.user_id
   WHERE i.provider = p_provider
     AND i.provider_id = p_app_user_id
     AND coalesce(u.is_anonymous, false) = false
     AND u.deleted_at IS NULL
   LIMIT 1;
$$;

ALTER TABLE public.kakao_member_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kakao_link_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kakao_member_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.kakao_link_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kakao_member_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kakao_link_tokens TO service_role;
REVOKE ALL ON FUNCTION public.kakao_link_consume(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kakao_member_by_app_user(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kakao_link_consume(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.kakao_member_by_app_user(text, text) TO service_role;
COMMIT;
