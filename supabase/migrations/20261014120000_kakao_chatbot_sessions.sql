-- Prepared only: production application requires the approved migration workflow (rules.md §6.3 H2).
--
-- 카카오톡 채널 챗봇 "상주 천명" AI 대화 상태.
--
-- 스킬 서버(/api/kakao/skill)가 service role 로만 읽고 쓴다. 손님 식별자는 카카오 botUserKey 를
-- 그대로 두지 않고 sha256 hex 로만 보관한다. 회원 계정과 연결하지 않는다.
-- - quota_day/used: 하루 무료 AI 답변 횟수(KST 날짜). kakao_chat_claim 만 올린다.
-- - history_day/history: 그날의 최근 대화(최대 12턴). 날짜가 바뀌면 서버가 비운다.
-- - flow: 우리궁합 입력 단계(본인/상대 생년월일). 궁합 답변 후 비운다.
-- 같은 표에 전체 하루 상한 카운터 한 행(서버가 정한 고정 해시 키)도 둔다.
BEGIN;

CREATE TABLE IF NOT EXISTS public.kakao_chat_sessions (
  user_key text PRIMARY KEY CHECK (user_key ~ '^[0-9a-f]{64}$'),
  quota_day date,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  history_day date,
  history jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(history) = 'array'),
  flow jsonb CHECK (flow IS NULL OR jsonb_typeof(flow) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- 오래된 대화 정리(보관 기한 정책) 시 사용.
CREATE INDEX IF NOT EXISTS kakao_chat_sessions_updated_idx ON public.kakao_chat_sessions (updated_at);

-- 하루 무료 횟수 1회 차감. 남아 있으면 차감 후 횟수를, 다 썼으면 NULL 을 돌려준다(원자적).
CREATE OR REPLACE FUNCTION public.kakao_chat_claim(p_user_key text, p_day date, p_limit integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.kakao_chat_sessions AS s (user_key, quota_day, used)
  VALUES (p_user_key, p_day, 1)
  ON CONFLICT (user_key) DO UPDATE
    SET used = CASE WHEN s.quota_day = p_day THEN s.used + 1 ELSE 1 END,
        quota_day = p_day,
        updated_at = now()
    WHERE s.quota_day IS DISTINCT FROM p_day OR s.used < p_limit
  RETURNING used;
$$;

-- AI 호출이 실패하면 차감한 1회를 돌려준다.
CREATE OR REPLACE FUNCTION public.kakao_chat_refund(p_user_key text, p_day date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.kakao_chat_sessions
     SET used = greatest(used - 1, 0), updated_at = now()
   WHERE user_key = p_user_key AND quota_day = p_day;
$$;

ALTER TABLE public.kakao_chat_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kakao_chat_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kakao_chat_sessions TO service_role;
REVOKE ALL ON FUNCTION public.kakao_chat_claim(text, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kakao_chat_refund(text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kakao_chat_claim(text, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.kakao_chat_refund(text, date) TO service_role;
COMMIT;
