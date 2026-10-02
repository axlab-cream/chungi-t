-- Prepared only: production application requires the approved migration workflow (rules.md §6.3 H2).
--
-- 앱 푸시(FCM) 기기 등록, 발송, 발송 결과.
--
-- 브라우저·앱은 이 표에 직접 쓰지 않는다. 기기 등록은 /api/push/devices, 클릭 기록은
-- /api/push/open, 작성·발송은 /api/admin/v1/push 만 거친다(src/push/). 그래서 anon·
-- authenticated 권한을 전부 거두고 service_role 에만 연다.
--
-- 개인정보: 기기 토큰과 user_id 만 둔다. 이름·이메일은 회원 표에서 그때그때 읽는다.
BEGIN;

-- 1 user : N device. 비로그인 기기도 받는다(user_id null). 로그인하면 같은 행에 user_id 를
-- 붙이고, 로그아웃 상태로 다시 등록하면 비운다 — 로그아웃한 기기로 개인 알림이 가지 않게.
CREATE TABLE IF NOT EXISTS public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FCM 등록 토큰. 같은 토큰은 한 행만 둔다(upsert 기준).
  device_token text NOT NULL UNIQUE CHECK (char_length(device_token) BETWEEN 20 AND 4096),
  user_id uuid,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  app_version text CHECK (app_version IS NULL OR char_length(app_version) <= 40),
  device_name text CHECK (device_name IS NULL OR char_length(device_name) <= 80),
  -- FCM 이 UNREGISTERED 로 답하거나 앱이 권한을 잃으면 false. 지우지 않고 남겨 이력을 본다.
  is_active boolean NOT NULL DEFAULT true,
  deactivated_reason text CHECK (deactivated_reason IS NULL OR char_length(deactivated_reason) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- 앱이 열릴 때마다 갱신한다. "최근 활동 사용자" 발송 조건의 기준이다.
  last_active_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_devices_user_idx ON public.push_devices (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS push_devices_active_idx ON public.push_devices (last_active_at DESC) WHERE is_active;

-- 발송 한 건. channel 은 지금 app_push 하나지만, 같은 작성 화면에서 카카오 채널 등으로
-- 넓힐 때 표를 나누지 않으려고 둔다.
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'app_push' CHECK (channel IN ('app_push')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  -- 앱 안의 경로만. 외부 주소는 넣을 수 없다.
  deep_link text NOT NULL DEFAULT '/' CHECK (deep_link ~ '^/' AND deep_link !~ '^//' AND char_length(deep_link) <= 500),
  target_type text NOT NULL CHECK (target_type IN ('all', 'logged_in', 'guests', 'active_days', 'signup_days', 'users')),
  target_filter jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(target_filter) = 'object'),
  -- 화면 표시용 대상 설명(예: "최근 7일 활동"). 발송 판정에는 쓰지 않는다.
  target_label text CHECK (target_label IS NULL OR char_length(target_label) <= 200),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  sent_at timestamptz,
  -- 대상 기기를 발송 목록(push_delivery_logs)에 다 옮긴 시각. 이후에는 다시 고르지 않는다.
  prepared_at timestamptz,
  -- 발송기가 잡고 있는 동안. 매분 cron 이 겹쳐 돌아도 한 건을 두 실행이 함께 보내지 않는다.
  lease_until timestamptz,
  total_count integer NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  success_count integer NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  click_count integer NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  last_error text CHECK (last_error IS NULL OR char_length(last_error) <= 300),
  created_by text NOT NULL CHECK (char_length(created_by) BETWEEN 3 AND 254),
  cancelled_by text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS push_notifications_created_idx ON public.push_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS push_notifications_due_idx ON public.push_notifications (scheduled_at) WHERE status IN ('scheduled', 'sending');

-- 기기별 발송 결과. 지금 규모(수천 대 이하)에서는 기기마다 한 행이 집계·재시도·클릭 기록에
-- 가장 단순하다. 90일이 지난 행은 발송기가 지운다(집계는 push_notifications 에 남는다).
-- 토큰은 여기 복사하지 않는다 — 기기 행을 가리키면 충분하고, 토큰이 한 곳에만 있어야 한다.
CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  push_notification_id uuid NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.push_devices(id) ON DELETE SET NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_code text CHECK (error_code IS NULL OR char_length(error_code) <= 80),
  error_message text CHECK (error_message IS NULL OR char_length(error_message) <= 300),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  -- FCM 이 접수한 시각. 기기에 도착했다는 뜻은 아니다.
  sent_at timestamptz,
  -- 사용자가 알림을 눌러 앱이 /api/push/open 을 부른 시각.
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (push_notification_id, device_id)
);
CREATE INDEX IF NOT EXISTS push_delivery_logs_pending_idx ON public.push_delivery_logs (push_notification_id, id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS push_delivery_logs_created_idx ON public.push_delivery_logs (created_at);

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_devices, public.push_notifications, public.push_delivery_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_devices TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.push_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_delivery_logs TO service_role;

-- 보낼 때가 된 발송 한 건을 잡는다. 예약 시각이 지난 scheduled, 또는 잡던 실행이 죽어
-- lease 가 풀린 sending. SKIP LOCKED 로 동시에 부른 두 실행이 같은 건을 잡지 않는다.
CREATE OR REPLACE FUNCTION public.push_claim_notification(p_lease_seconds integer)
RETURNS SETOF public.push_notifications
LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$
  WITH candidate AS (
    SELECT id FROM public.push_notifications
    WHERE (status = 'scheduled' AND scheduled_at <= now())
       OR (status = 'sending' AND (lease_until IS NULL OR lease_until < now()))
    ORDER BY scheduled_at NULLS FIRST, created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.push_notifications n
  SET status = 'sending',
      started_at = coalesce(n.started_at, now()),
      lease_until = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 600))),
      updated_at = now()
  FROM candidate
  WHERE n.id = candidate.id
  RETURNING n.*;
$$;

-- 발송 목록에서 집계를 다시 센다. 발송기가 한 묶음을 끝낼 때마다 부른다.
CREATE OR REPLACE FUNCTION public.push_refresh_counts(p_notification uuid)
RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$
  UPDATE public.push_notifications n SET
    total_count = c.total, success_count = c.sent, failure_count = c.failed, click_count = c.clicked, updated_at = now()
  FROM (
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status = 'sent')::int AS sent,
           count(*) FILTER (WHERE status = 'failed')::int AS failed,
           count(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked
    FROM public.push_delivery_logs WHERE push_notification_id = p_notification
  ) c
  WHERE n.id = p_notification;
$$;

-- 알림 클릭 한 번을 기록한다. 같은 알림을 두 번 눌러도 한 번만 센다. 기록했으면 true.
CREATE OR REPLACE FUNCTION public.push_record_open(p_notification uuid, p_delivery bigint)
RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$
  WITH opened AS (
    UPDATE public.push_delivery_logs SET clicked_at = now()
    WHERE id = p_delivery AND push_notification_id = p_notification AND clicked_at IS NULL
    RETURNING push_notification_id
  ), counted AS (
    UPDATE public.push_notifications SET click_count = click_count + 1
    WHERE id IN (SELECT push_notification_id FROM opened)
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM counted);
$$;

REVOKE ALL ON FUNCTION public.push_claim_notification(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.push_refresh_counts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.push_record_open(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_claim_notification(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.push_refresh_counts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.push_record_open(uuid, bigint) TO service_role;
COMMIT;
