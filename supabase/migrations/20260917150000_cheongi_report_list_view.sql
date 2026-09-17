-- 보관함 목록용 경량 뷰.
--
-- 목록 API 는 소유자의 리포트를 payload 통째로 읽어 왔다. payload 에는 항목마다 해석 전문·
-- 스토리·시도 이력(attempts)이 들어 있어 100건이면 수 MB 다. 2026-09-17 운영 실측:
-- 목록 2.7~4초, 따뜻한 함수 기준선 0.25초. 응답 크기를 줄여도 시간이 그대로였던 이유다.
--
-- 이 뷰는 목록이 쓰는 것만 남긴다 —
--   meta     : payload 에서 report·analysis·chatHistory·flags 를 뺀 것(생년월일·맥락·상태·미리보기·소유자)
--   analysis : 사주 분석. 천명사주 화면의 보관함 동기화가 읽는다. 목록 화면은 선택하지 않는다
--   report   : 리포트에서 섹션 본문을 뺀 것. 섹션은 id·분류·상태·hook 등 메타만 남긴다
-- 진행률·단계·현재 항목·결제 판정은 이 셋으로 계산된다. 본문을 읽는 곳은 표를 그대로 쓴다.
--
-- security_invoker: 호출자 권한으로 표를 읽는다. 서버(service_role)만 select 를 가지며 anon·
-- authenticated 는 막는다 — 표 자체가 서버 전용이기 때문이다.

create index if not exists cheongi_reports_user_updated_idx
  on public.cheongi_reports (user_id, updated_at desc);

create or replace view public.cheongi_report_list
with (security_invoker = true) as
select
  r.report_id,
  r.user_id,
  r.user_email,
  r.auth_provider,
  r.created_at,
  r.updated_at,
  (r.payload - 'report' - 'analysis' - 'chatHistory' - 'flags') as meta,
  r.payload -> 'analysis' as analysis,
  (coalesce(r.payload -> 'report', '{}'::jsonb) - 'sections')
    || jsonb_build_object(
      'sections',
      coalesce((
        select jsonb_agg(
          s.value
            - 'interpretation' - 'storytelling' - 'attempts' - 'generationLease'
            - 'tokenUsage' - 'patternKeys' - 'ragTopics' - 'imageSrc'
          order by s.ordinality)
        from jsonb_array_elements(
          case when jsonb_typeof(r.payload -> 'report' -> 'sections') = 'array'
               then r.payload -> 'report' -> 'sections'
               else '[]'::jsonb end
        ) with ordinality as s
      ), '[]'::jsonb)
    ) as report
from public.cheongi_reports r;

revoke all on public.cheongi_report_list from public, anon, authenticated;
grant select on public.cheongi_report_list to service_role;

comment on view public.cheongi_report_list is
  '보관함 목록용 경량 뷰. 섹션 본문을 뺀 리포트 메타만 돌려준다. 서버(service_role) 전용.';
