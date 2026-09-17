-- 목록용 경량 데이터를 **쓸 때** 만들어 둔다.
--
-- 20260917150000 의 뷰는 읽을 때마다 payload 를 풀어(detoast) 본문을 뺐다. 관리자 계정은
-- 행이 46개인데 화면에 남는 건 13개다 — 33개는 헛풀었고, 그 비용이 조회 1.27초로 남았다
-- (Server-Timing 실측, 2026-09-17). 생성 열(stored generated column)로 옮기면 저장할 때
-- 한 번만 계산하고, 목록은 본문이 든 payload 를 건드리지 않는다.
--
-- 뷰의 열 이름·형태는 그대로다. 서버 코드는 바뀌지 않는다.

create or replace function public.cheongi_report_light(payload jsonb)
returns jsonb
language sql
immutable
parallel safe
as $$
  select jsonb_build_object(
    'meta', (payload - 'report' - 'analysis' - 'chatHistory' - 'flags'),
    'analysis', payload -> 'analysis',
    'report',
      (coalesce(payload -> 'report', '{}'::jsonb) - 'sections')
      || jsonb_build_object(
        'sections',
        coalesce((
          select jsonb_agg(
            s.value
              - 'interpretation' - 'storytelling' - 'attempts' - 'generationLease'
              - 'tokenUsage' - 'patternKeys' - 'ragTopics' - 'imageSrc'
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
  add column if not exists light jsonb
  generated always as (public.cheongi_report_light(payload)) stored;

create or replace view public.cheongi_report_list
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
