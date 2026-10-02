-- Prepared only: production application requires the approved migration workflow (rules.md §6.3 H2).
--
-- 카카오톡 채널 메시지 문구 보관함.
--
-- 채널 메시지(파트너센터 > 채널 > 메시지)는 공개 발송 API가 없어 운영자가 파트너센터에서
-- 직접 보낸다. 어드민은 문구를 쓰고 미리 보고, 발송 버튼으로 문구를 복사한 뒤 파트너센터를
-- 연다. 운영자가 보낸 뒤 "발송 완료"로 표시하면 이력이 남는다.
-- 딜러사 API(브랜드 메시지)를 붙이게 되면 send_mode 'api' 로 같은 표를 쓴다.
BEGIN;

CREATE TABLE IF NOT EXISTS public.kakao_channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 어드민 목록에서 구분하는 이름. 카카오로 나가지 않는다.
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  -- 채널 메시지 본문(기본 텍스트형 최대 1,000자).
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  -- 광고성 메시지면 파트너센터에서도 광고로 표시해야 한다(정보통신망법·KISA 가이드).
  is_ad boolean NOT NULL DEFAULT true,
  image_url text CHECK (image_url IS NULL OR (image_url ~ '^https://' AND char_length(image_url) <= 500)),
  button_label text CHECK (button_label IS NULL OR char_length(button_label) BETWEEN 1 AND 14),
  button_url text CHECK (button_url IS NULL OR (button_url ~ '^https://' AND char_length(button_url) <= 500)),
  -- draft: 작성만. opened: 문구를 복사하고 파트너센터를 열었다. sent: 운영자가 발송을 마쳤다고 표시.
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'opened', 'sent', 'archived')),
  send_mode text NOT NULL DEFAULT 'manual' CHECK (send_mode IN ('manual', 'api')),
  -- 파트너센터 결과 화면에서 옮겨 적는 발송 수. 모르면 비운다.
  sent_count integer CHECK (sent_count IS NULL OR sent_count >= 0),
  opened_at timestamptz,
  sent_at timestamptz,
  created_by text NOT NULL CHECK (char_length(created_by) BETWEEN 3 AND 254),
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kakao_channel_messages_created_idx ON public.kakao_channel_messages (created_at DESC);

-- 채널 설정 한 행. 파트너센터 메시지 작성 화면 주소는 채널마다 다르다(채널 ID 가 들어간다).
CREATE TABLE IF NOT EXISTS public.kakao_channel_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  channel_name text CHECK (channel_name IS NULL OR char_length(channel_name) <= 40),
  partner_center_url text CHECK (partner_center_url IS NULL OR (partner_center_url ~ '^https://([a-z0-9-]+\.)*kakao\.com/' AND char_length(partner_center_url) <= 500)),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.kakao_channel_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.kakao_channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kakao_channel_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kakao_channel_messages, public.kakao_channel_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kakao_channel_messages TO service_role;
GRANT SELECT, UPDATE ON public.kakao_channel_settings TO service_role;
COMMIT;
