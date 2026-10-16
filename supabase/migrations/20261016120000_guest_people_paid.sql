-- 비회원 결제(2026-10-16, docs/auth/guest-member-plan.md 8절).
-- Prepared only: 운영 적용은 Supabase SQL Editor 에서 실행한다. 여러 번 실행해도 같은 결과다.
-- 결제한 비회원은 30일 정리에서 빼고(거래 기록 5년 보관), 어드민 비회원 관리의 "결제함" 필터로 본다.
ALTER TABLE public.umsh_guest_people ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE INDEX IF NOT EXISTS umsh_guest_people_paid_idx ON public.umsh_guest_people (paid_at) WHERE paid_at IS NOT NULL;
