# T14 영속 작업·outbox 운영 검증

## observation

처리기 구현 이전의 outbox 작업을 성공으로 완료하면 운영 화면이 실제 전달 성공으로 오인한다. 이는 목업을 표시하지 않는 관리자 원칙과 충돌한다.

## decision

처리기가 없는 작업은 `NO_OPS_HANDLER`를 기록하고 지수 backoff로 재시도하며, 최대 시도 뒤 dead-letter로 이동한다. 성공 상태는 실제 도메인 처리기가 확정 결과를 반환할 때만 쓴다.

## artifact

- `src/admin/ops-worker.ts`
- `tests/unit/ops-worker.test.ts`
- `docs/superpowers/plans/2026-09-11-ops-jobs-outbox.md`

## QA result

- worker 회귀 테스트 2/2 PASS
- `npm run typecheck` PASS
- `npm run vercel-build` PASS
- Production `/admin/jobs`에서 실제 큐의 빈 상태 확인

## lesson

관리자 빈 상태는 데이터 부재를 정확히 알리는 상태여야 한다. 후속 도메인(Task T15~T24)의 실제 저장소·처리기 없이 성공 행이나 예시 행을 추가하지 않는다.

## relation

- T14 → T15/T20/T21 (도메인 처리기)
- T22 → T23 (콘텐츠 버전 → 미디어 관리)

## next_patch

첫 Vercel cron 실행 뒤 worker 로그를 확인하고, T15에서 금융 이벤트 처리기를 명시적으로 등록한다.
