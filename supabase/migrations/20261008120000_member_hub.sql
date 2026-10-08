-- 마이페이지 회원 기능(2026-10): 알림 설정, 1:1 문의, 광고성 푸시 표시.
-- Prepared only: 운영 적용은 Supabase SQL Editor 에서 실행한다. 여러 번 실행해도 같은 결과다.
BEGIN;

-- 1) 알림 설정. 행이 없으면 기본값(이용 알림 켜짐, 광고성 알림 꺼짐)으로 본다.
--    광고성 알림 동의·철회 시각은 정보통신망법상 처리 결과를 회원에게 알리고 기록으로 남기기 위해 둔다.
CREATE TABLE IF NOT EXISTS public.umsh_notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  service_push boolean NOT NULL DEFAULT true,
  marketing_push boolean NOT NULL DEFAULT false,
  marketing_consented_at timestamptz,
  marketing_withdrawn_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS umsh_notification_prefs_service_off_idx
  ON public.umsh_notification_prefs (user_id) WHERE service_push = false;
ALTER TABLE public.umsh_notification_prefs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.umsh_notification_prefs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.umsh_notification_prefs TO service_role;

-- 2) 1:1 문의. 기존 고객 지원 기록에 회원 글(customer_message)과 회원에게 보이는 답변(customer_reply)을 더한다.
ALTER TABLE public.support_notes DROP CONSTRAINT IF EXISTS support_notes_kind_check;
ALTER TABLE public.support_notes ADD CONSTRAINT support_notes_kind_check
  CHECK (kind IN ('internal', 'customer_reply_draft', 'customer_message', 'customer_reply'));
CREATE INDEX IF NOT EXISTS support_cases_member_updated_at_idx
  ON public.support_cases (member_id, updated_at DESC) WHERE member_id IS NOT NULL;

-- 3) 광고성 푸시 표시. 켜진 발송은 이벤트·혜택 알림 동의 회원에게만, 한국 시간 8시~21시에만,
--    제목 앞 "(광고)"와 수신 거부 안내를 붙여 보낸다(src/push/contracts.ts).
ALTER TABLE public.push_notifications ADD COLUMN IF NOT EXISTS is_marketing boolean NOT NULL DEFAULT false;

COMMIT;
