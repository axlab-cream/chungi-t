# 운명상회 관리자 통합 검색 — 2026-09-11

## Observation

운영자는 주문·회원·리포트·지원 케이스를 확인할 공통 진입점이 필요하지만, 부분 이름·이메일 검색은 불필요한 개인정보 노출 범위를 넓힌다.

## Decision

검색은 정확 식별자와 대상 종류를 필수로 하고, 대상마다 해당 read scope를 서버에서 검사한다. 원천 조회는 service role 전용이며, 응답은 기존 마스킹 DTO로 제한한다. UI는 고객 원문을 표시하거나 브라우저에서 DB를 조회하지 않는다.

## Artifact

- API: `/api/admin/v1/search?kind=&exactId=`
- UI: `/admin/search`
- Exact lookup: 회원·리포트·지원 케이스 및 기존 주문 저장소

## QA Result

- typecheck PASS
- focused admin tests 49/49 PASS
- Production `dpl_3SGaRp1LXYKCpPycHhJhJujXn4nu` Ready, 로그인된 검색 입력 UI 확인

## Lesson

운영 검색은 편의를 위해 전역 부분 검색부터 열지 말고, object scope와 마스킹 DTO가 확정된 정확 ID 검색으로 시작한다.
