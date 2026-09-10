# 관리자 API 계약
모두 신규 제안. base /api/admin/v1. JSON UTF-8. 직원 인증·서버 RBAC·no-store 적용.

## 공통 계약
조회: limit 기본 25 최대 100, cursor, sort allowlist, from/to(UTC), serviceKey, status. 응답 {data, page:{nextCursor}, meta:{requestId,asOf}}.
오류: {error:{code,message,fieldErrors},requestId}. 401 미인증, 403 권한 없음, 404 대상 없음, 409 revision/상태 충돌, 422 입력 오류, 429 제한, 503 의존 서비스 불가.
쓰기: Idempotency-Key와 expectedRevision(수정 시), reason(민감 조치). 같은 key·같은 body는 같은 결과, 다른 body는 409. actorId는 서버 인증값으로 결정.
비동기: 202 {data:{jobId,state:"queued"}} 후 jobs/:id 조회. 금융 idempotency 기록은 일반 HTTP 캐시 만료로 삭제하지 않는다.

## 엔드포인트
| 메서드 | 경로 | 입력/출력 핵심 | 필요 권한 |
|---|---|---|---|
| GET | /me | 역할·scope·환경 | 로그인 |
| GET | /dashboard | 기간별 집계·기준시각 | dashboard.read |
| GET | /search | kind, exactId | search.read + 객체 scope |
| GET | /services | 상태·버전 목록 | services.read |
| POST | /services/:key/drafts | 필드·expectedRevision | content.write |
| GET | /orders, /orders/:id | 제한 DTO·관련 ID | orders.read |
| POST | /orders/:id/reconcile | reason | payments.reconcile |
| POST | /orders/:id/refund-requests | amount,reason,expectedRevision | refunds.request |
| GET | /refunds, /refunds/:id | 상태·근거 | refunds.read |
| POST | /refunds/:id/approve | expectedRevision,reason | refunds.approve |
| POST | /refunds/:id/reject | reason | refunds.approve |
| GET | /members, /members/:id | 마스킹 DTO | members.read |
| POST | /members/:id/reveal | fields,reason | members.sensitive.read |
| POST | /members/:id/privacy-requests | kind,verifiedEvidenceId | privacy.manage |
| GET/POST | /support | 필터 또는 문의 생성 | support.read/write |
| PATCH | /support/:id | assignee,status,revision | support.write |
| POST | /support/:id/notes | text | support.write |
| GET | /reports, /reports/:id | 상태·항목·버전 | reports.read |
| POST | /reports/:id/sections/:sectionId/retry | reason,expectedRevision | reports.retry |
| POST | /reports/:id/reveal | reason,fields | reports.sensitive.read |
| GET | /jobs, /jobs/:id | 진척·실패코드 | jobs.read |
| GET/POST | /content | 목록 / 구조화 초안 | content.read/write |
| PATCH | /content/:id | payload,revision | content.write |
| POST | /media/uploads | mime,size,checksum | media.write |
| POST | /media/:id/finalize | checksum | media.write |
| GET | /corpus | pack,kind,state | corpus.read |
| POST | /corpus/imports | 업로드 assetId, schemaVersion | corpus.write |
| POST | /corpus/:id/versions | 블록·출처·revision | corpus.write |
| GET/POST | /prompts | 목록/후보 버전 | prompts.read/write |
| POST | /evaluations | setVersion,candidateHash,baselineHash | evaluations.run |
| POST | /releases | versionIds,evaluationRunId | releases.request |
| POST | /releases/:id/approve | expectedChecksum,reason | releases.approve |
| POST | /releases/:id/activate | scheduleAt,expectedRevision | releases.activate |
| POST | /releases/:id/rollback | previousReleaseId,reason | releases.activate |
| GET | /analytics/:metric, /logs, /audit | 허용 필터 | 해당 read |
| GET/POST/PATCH | /incidents[/:id] | 규칙·담당·상태 | incidents.manage |
| POST | /exports | kind,filters,fields,reason | exports.create |
| GET | /exports/:id | 상태·권한 제한 다운로드 | exports.read |
| PATCH | /memberships/:id | role,scope,status,revision | roles.manage |

## 예시: 환불 요청
POST /orders/order-example/refund-requests
Idempotency-Key: synthetic-refund-001
body: {"amount":9900,"reason":"duplicate_payment","expectedRevision":3}
202: {"data":{"refundId":"refund-example","jobId":"job-example","state":"requested"}}
승인 전 PG 호출 없음. 승인 작업이 이미 반영됐으면 같은 request 결과를 반환한다. PG 지원 미확인 상태에서는 adapter 미구현 오류를 반환하고 실제 환불 성공으로 모의 처리하지 않는다.

## 검증과 외부 입력
ID는 타입·길이 검증, HTML과 파일은 정제·검사, 정렬은 enum, 날짜 범위 제한. 고객 URL 임의 fetch 기능을 넣지 않는다. 외부 출처를 가져오는 기능 추가 시 도메인·크기·리다이렉트·내부 네트워크 접근 제한을 설계한다.
