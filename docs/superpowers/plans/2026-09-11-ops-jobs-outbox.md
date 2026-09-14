# T14 영속 작업·outbox

## TASK Brief

- TASK ID: T14
- 사용자 결과: 실제 운영 데이터를 바꾸는 후속 작업이 프로세스 중단 뒤에도 회수·재시도되며, 처리되지 않은 작업이 성공으로 보이지 않는다.
- 기준: `admin-ops-execution-pack/15-TASKS.md` T14, `docs/admin-ops/T03-storage-schema.md` U20.
- 범위: `ops_jobs`, `ops_outbox`, lease 기반 claim RPC, 재시도·dead-letter 상태, cron 진입점, 읽기 전용 관리자 작업 큐.
- 범위 제외: 환불·PG·콘텐츠·미디어·알림 전송의 실제 처리기. 각각 T15~T24에서 해당 도메인 계약과 함께 추가한다.
- 데이터/API: `ops_jobs`, `ops_outbox`, `claim_ops_jobs`, `GET /api/cron/ops`, `GET /api/admin/v1/jobs`.
- 상태: queued, running, retry, dead, succeeded. 처리기가 없는 작업은 성공 처리 금지이며 retry 후 dead로만 이동한다.
- 권한: RLS 활성화, `anon`/`authenticated` 권한 제거, service role만 DB 접근. cron은 `CRON_SECRET` Bearer 확인.
- 수용 조건: 만료 lease 재회수, `SKIP LOCKED` 동시 claim 방지, 지수 backoff, dead-letter, 실제 처리기 전 성공 표기 금지, 서버 전용 키 비노출.

## LNB 데이터 원천 감사 (2026-09-11)

| 상태 | 메뉴 | 실제 원천/계획 |
| --- | --- | --- |
| 연결됨 | 개요, 회원·리포트, 서비스, 고객 지원, 감사 기록 | 기존 운영 테이블/API |
| 기반 진행 중 | 작업 큐 | T14 `ops_jobs`; 실제 처리기는 후속 도메인 Task에서 연결 |
| 선행 의존 | 주문, 환불, 정산 | T15~T19 금융 이벤트·PG·환불·대사 |
| 선행 의존 | 콘텐츠, 미디어 | T22 콘텐츠 버전 → T23 미디어 → T24 편집 UI |
| 선행 의존 | 코퍼스, 프롬프트, 평가, 릴리스 | T25~T30 지식·평가·release 계약 |
| 선행 의존 | 통계, 로그, 장애 | T21 및 T31~T33 관측·행동 이벤트·집계 |

목업 행이나 임의 수치는 추가하지 않는다. 원천이 없는 화면은 원천 미생성 상태를 명확히 표시하고, 해당 선행 Task가 완료되면 실제 API로 대체한다.
