-- 고객이 어디를 누르고 어디서 나가는지 보기 위한 이벤트 적재.
--
-- 목적은 두 가지다.
--   1) CTA 별 클릭 수로 무엇에 관심이 있는지 본다
--   2) 단계별 진입 수로 어디서 이탈하는지 본다(일·주·월)
--
-- 개인정보는 담지 않는다. 경로는 정규화한 라우트만 남기고 질의문자열은 버린다
-- (reportId·orderId 가 그 안에 들어 있다). 로그인 사용자는 user_id 만, 비로그인은
-- 기기별 익명 session_id 만 남는다. 이름·생년월일·해석 본문은 어떤 칼럼에도 넣지 않는다.
create table if not exists public.umsh_funnel_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- 'step_view' 는 단계 진입, 'cta_click' 은 버튼 누름.
  event text not null check (event in ('step_view', 'cta_click')),
  -- 결제 카탈로그의 서비스 키. 공용 화면(홈·검색·보관함)은 null 이다.
  service_key text,
  -- 퍼널 단계. '01-story' '02-input' '03-service-input' '04-report' '05-toc' '06-detail' 등.
  step text,
  -- 눌린 대상의 안정적인 식별자. 화면 문구가 아니라 data-action 값을 쓴다.
  -- 문구는 바뀌지만 행동은 그대로여서, 문구로 세면 개편할 때마다 통계가 끊긴다.
  target text,
  -- 기기·세션 단위 익명 식별자. 이탈률의 분모를 세는 데만 쓴다.
  session_id text not null,
  -- 로그인한 경우에만 채운다. 비로그인 흐름도 그대로 세야 하므로 null 을 허용한다.
  user_id uuid,
  -- 질의문자열을 떼고 id 를 ':id' 로 바꾼 라우트.
  route text,
  created_at timestamptz not null default now()
);

-- 기간 집계가 기본 질의다.
create index if not exists umsh_funnel_events_occurred_idx
  on public.umsh_funnel_events (occurred_at desc);
-- 서비스별 단계 퍼널.
create index if not exists umsh_funnel_events_service_step_idx
  on public.umsh_funnel_events (service_key, step, occurred_at desc);
-- 한 세션이 어디까지 갔는지 훑을 때.
create index if not exists umsh_funnel_events_session_idx
  on public.umsh_funnel_events (session_id, occurred_at);

alter table public.umsh_funnel_events enable row level security;
-- 브라우저가 이 표에 직접 쓰지 못하게 한다. 수집은 서버의 /api/events 만 거친다 —
-- 그래야 검증·정규화·한도가 한 곳에서 걸린다.
revoke all on table public.umsh_funnel_events from anon, authenticated;
grant select, insert on table public.umsh_funnel_events to service_role;
