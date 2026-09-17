-- 목록용 경량 행을 더 얇게 만든다.
--
-- 20260917160000 의 `light` 는 본문(interpretation)만 뺐다. 그래도 행마다 목차 40~70개의
-- 훅·이미지·분류와 코퍼스 스냅샷(팩 28개)·오늘운 부속 데이터가 남아, 관리자 계정 36행이
-- 약 1MB 였다. 보관함 목록 조회가 1.1~1.3초로 고정된 이유가 이 전송량이었다
-- (Server-Timing `records`, 2026-09-18 운영 실측 — 주문 조회는 같은 프로젝트에서 0.27초).
--
-- 목록이 실제로 읽는 것은 항목의 id·순서·상태·분류, 그리고 코퍼스 지문 한 줄이다.
-- 그것만 남긴다. 뷰의 열 이름·형태는 그대로라 서버 코드는 바뀌지 않는다.
--
-- 생성 열은 함수 본문을 바꿔도 저장된 값이 다시 계산되지 않으므로 열을 내리고 다시 올린다
-- (행이 수십 개라 즉시 끝난다). 뷰가 열에 의존하므로 먼저 지운다.

drop view if exists public.cheongi_report_list;
alter table public.cheongi_reports drop column if exists light;

create or replace function public.cheongi_report_light(payload jsonb)
returns jsonb
language sql
immutable
parallel safe
as $$
  select jsonb_build_object(
    'meta',
      (payload - 'report' - 'analysis' - 'chatHistory' - 'flags' - 'corpus' - 'auxiliary')
      || case
           when payload ? 'corpus' then jsonb_build_object('corpus', jsonb_build_object(
             'fingerprint', payload -> 'corpus' -> 'fingerprint',
             'registryVersion', payload -> 'corpus' -> 'registryVersion'))
           else '{}'::jsonb
         end,
    'analysis', payload -> 'analysis',
    'report',
      (coalesce(payload -> 'report', '{}'::jsonb) - 'sections' - 'corpus')
      || jsonb_build_object(
        'sections',
        coalesce((
          select jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'id', s.value -> 'id',
              'order', s.value -> 'order',
              'status', s.value -> 'status',
              'category', s.value -> 'category',
              'classification', s.value -> 'classification',
              'generationId', s.value -> 'generationId'))
            order by s.ordinality)
          from jsonb_array_elements(
            case when jsonb_typeof(payload -> 'report' -> 'sections') = 'array'
                 then payload -> 'report' -> 'sections'
                 else '[]'::jsonb end
          ) with ordinality as s
        ), '[]'::jsonb)
      )
  )
$$;

revoke all on function public.cheongi_report_light(jsonb) from public, anon, authenticated;
grant execute on function public.cheongi_report_light(jsonb) to service_role;

alter table public.cheongi_reports
  add column light jsonb
  generated always as (public.cheongi_report_light(payload)) stored;

create view public.cheongi_report_list
with (security_invoker = true) as
select
  r.report_id,
  r.user_id,
  r.user_email,
  r.auth_provider,
  r.created_at,
  r.updated_at,
  r.light -> 'meta' as meta,
  r.light -> 'analysis' as analysis,
  r.light -> 'report' as report
from public.cheongi_reports r;

revoke all on public.cheongi_report_list from public, anon, authenticated;
grant select on public.cheongi_report_list to service_role;
