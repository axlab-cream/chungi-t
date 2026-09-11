# 운명상회 CS 케이스 관리 — 2026-09-11

## Observation

운영 관리자에 고객 지원 메뉴는 있었지만 실제 원천 테이블이나 변경 API가 없었다. 고객 답변을 저장하는 기능은 외부 연락 채널과 혼동되면 안 된다.

## Decision

`support_cases`와 `support_notes`를 additive migration으로 만들고 RLS를 활성화했다. 공개 역할 권한을 제거하고 서버 service role만 사용한다. 모든 변경은 전용 `support:write`, Idempotency-Key, revision 비교, 관리자 감사 원장을 통과한다. 기록 종류는 `internal`과 `customer_reply_draft`로 나누며, 후자는 발송이 아닌 초안이다.

## Artifact

- Migration: `20260911105511_support_case_management.sql`
- API: `/api/admin/v1/support` 및 케이스 메모 경로
- UI: `/admin/support`

## QA Result

- DB RLS=true, anon/authenticated grant=0
- typecheck PASS, focused tests 29/29 PASS
- Production `dpl_7ndiRAtb48aAaUyY4QdcCmFZdkhm` Ready, 실제 빈 상태 및 접수 폼 확인

## Lesson

고객 커뮤니케이션 채널이 준비되지 않은 운영 도구에서는 답변을 반드시 초안으로 표시하고 자동 발송을 구현 완료로 주장하지 않는다.

## Next Patch

실제 고객 문의 채널이 생기면 고객 발송 권한·동의·전송 결과·재시도 정책을 별도 Task로 설계한다.
