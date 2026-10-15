-- 비회원 관리·약관 동의 기록(2026-10-15, docs/auth/guest-member-plan.md).
-- Prepared only: 운영 적용은 Supabase SQL Editor 에서 실행한다. 여러 번 실행해도 같은 결과다.
BEGIN;

-- 1) 비회원 한 사람 = 한 줄. 같은 기기(브라우저 기기 번호) + 같은 사주면 같은 비회원으로 보고 방문 수만 올린다.
--    다른 기기면 이름·생일이 같아도 합치지 않는다. SNS 로그인하면 converted_to 로 회원에 잇는다.
--    마지막 방문 30일이 지나면 운영자가 정리한다: 이름·생일(일)·태어난 시를 비우고 통계(출생 연도·성별·서비스·방문 수)만 남긴다.
CREATE TABLE IF NOT EXISTS public.umsh_guest_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  saju_key text NOT NULL DEFAULT '',
  guest_user_ids uuid[] NOT NULL DEFAULT '{}',
  name text,
  birth_year integer,
  birth_month integer,
  birth_day integer,
  birth_hour integer,
  birth_minute integer,
  gender text,
  calendar text,
  is_leap_month boolean,
  birth_time_known boolean,
  services text[] NOT NULL DEFAULT '{}',
  visits integer NOT NULL DEFAULT 1,
  consented_at timestamptz,
  marketing_consented boolean NOT NULL DEFAULT false,
  converted_to uuid,
  converted_at timestamptz,
  anonymized_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, saju_key)
);
CREATE INDEX IF NOT EXISTS umsh_guest_people_guest_user_ids_idx ON public.umsh_guest_people USING gin (guest_user_ids);
CREATE INDEX IF NOT EXISTS umsh_guest_people_last_seen_idx ON public.umsh_guest_people (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS umsh_guest_people_first_seen_idx ON public.umsh_guest_people (first_seen_at);
CREATE INDEX IF NOT EXISTS umsh_guest_people_converted_idx ON public.umsh_guest_people (converted_at) WHERE converted_at IS NOT NULL;
ALTER TABLE public.umsh_guest_people ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.umsh_guest_people FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.umsh_guest_people TO service_role;

-- 2) 약관 동의 기록. 고치지 않고 쌓기만 한다(증빙). 필수: 이용약관·개인정보 수집·이용·만 14세 이상. 선택: 마케팅 수신.
--    계정을 지우면(탈퇴·비회원 정리) 함께 지워진다.
CREATE TABLE IF NOT EXISTS public.umsh_consents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_guest boolean NOT NULL DEFAULT false,
  version text NOT NULL,
  terms boolean NOT NULL,
  privacy boolean NOT NULL,
  age_over_14 boolean NOT NULL,
  marketing boolean NOT NULL DEFAULT false,
  source text NOT NULL,
  device_id text,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (terms AND privacy AND age_over_14)
);
CREATE INDEX IF NOT EXISTS umsh_consents_user_idx ON public.umsh_consents (user_id, agreed_at DESC);
ALTER TABLE public.umsh_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.umsh_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.umsh_consents TO service_role;

COMMIT;
