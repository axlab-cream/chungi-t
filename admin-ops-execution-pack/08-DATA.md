# 데이터 모델 및 불변조건
기존 테이블은 확인된 이름이며 신규 항목은 논리 설계다. 실제 타입·제약·인덱스는 M0에서 DB 대조 후 migration으로 확정한다.

## 기존 보존
cheongi_payment_orders: order_id(TEXT), owner_id(TEXT), product_key, amount(INTEGER>0), status, report_id, tid 등.
cheongi_reports: report_id 및 payload/revision 기반 저장. 완료 payload 재기록 금지.
cheongi_user_profiles: user_id(UUID), 생년월일·시간·성별·달력·profile_payload.
인증 identity와 기존 owner_id 문자열의 매핑을 검증한다. owner_id를 일괄 UUID cast하거나 이메일로 조인하지 않는다.

## 신규 논리 테이블
| 테이블 | 주요 필드 | 제약·접근 |
|---|---|---|
| admin_memberships | id, auth_user_id, role, scope, status, revision | active 권한 서버 조회, 상태 변경 감사 |
| admin_audit_events | id, actor_id, action, target_type/id, reason, redacted_diff, request_id, result, created_at | append-only, 일반 직원 수정·삭제 불가 |
| service_config_versions | id, service_key, version, content, checksum, state, author | (service_key,version) unique |
| content_versions | id, type, service_key, schema_version, payload, revision, state | 승인 시 hash 고정 |
| media_assets | id, object_key, mime, bytes, width, height, checksum, rights, state | 동일 blob 재사용, 참조 삭제 차단 |
| release_manifests | id, type, versions, checksum, state, activated_at | 승인된 immutable version만 참조 |
| active_releases | scope, release_id, revision | scope unique, CAS 활성화 |
| refund_requests | id, order_id, amount, status, requester, approver, reason, revision | 양수, 주문 잠금 후 환불가능액 검사 |
| payment_operations | id, order_id, kind, idempotency_key, provider_ref, state, response_digest | (kind,idempotency_key) unique |
| financial_events | id, order_id, kind, amount, occurred_at, source_ref | provider/source_ref 중복 방지, append-only |
| reconciliation_runs/items | id, period, source_checksum, internal_total, provider_total, difference, state | import checksum 중복 방지 |
| support_cases | id, member_id, order_id, report_id, category, status, assignee, priority | 관련 객체 권한 확인 |
| support_notes | id, case_id, author, text, created_at | 내부 노트, HTML 정제 |
| corpus_sources | id, title, locator, rights, review_state | 고객 원문·비밀 포함 금지 |
| corpus_versions | id, pack_id, version, kind, schema_version, checksum, source_ids, blocks | (pack_id,version) unique |
| prompt_versions | id, service_key, kind, version, text, checksum | 공통·서비스·문체 버전 분리 |
| evaluation_sets/cases/runs | id, version, synthetic_input, baseline, candidate, scores, reviewer | 실행 입력·hash 불변 |
| ops_jobs | id, kind, target_id, state, lease_until, attempts, next_run_at, idempotency_key | job key unique, lease CAS |
| ops_outbox | id, event_type, target_id, payload, delivered_at | 업무 변경과 동일 transaction |
| analytics_events | event_id, name, at, session_id, pseudonymous_user_id, service_key, schema_version | event_id unique, allowlist 필드 |
| analytics_daily | date_kst, service_key, environment, metrics, watermark | 지연 데이터 재집계 |
| privacy_requests | id, member_id, kind, verified_at, scope, state, exceptions | 정책 확정 후 실행 |
| export_jobs | id, actor_id, scope, state, object_key, expires_at | 제한 열람·기한 만료 |

## 금전·권한 불변조건
환불 누적 성공액 + 진행 중 예약액 <= 승인액. 주문 row lock 또는 동등한 직렬화로 검사한다.
관리자 unlock·test 승인·실제 PG 승인은 source를 달리하고 매출은 실제 승인 원장만 집계한다.
viewed는 소비 이벤트이지 새 결제가 아니다. 전액 환불 성공 시 권한 철회는 기존 고객 API에서도 즉시 반영한다. 부분 환불의 권한 정책은 별도 정의 전 비활성.
PG 성공·내부 저장 실패는 unknown/reconcile 상태로 보존하고 성공을 다시 호출하지 않는다.

## 인덱스 및 시간
orders(created_at,order_id), orders(owner_id,created_at), orders(product_key,created_at), jobs(state,next_run_at), audit(target_type,target_id,created_at), events(name,at), refunds(order_id,status).
UTC timestamptz 저장, KST 날짜 필터는 [시작 포함, 종료 미포함) UTC 구간으로 변환한다. cursor는 정렬값+id로 안정화한다.

## 마이그레이션
기존 스키마 스냅샷 → additive 테이블·열 → backfill dry-run 건수·검증 → dual read 필요성 판단 → 제한 rollout → 구버전 호환 검증. legacy 값은 unknown으로 보존한다. 롤백은 관리자 기능 플래그를 닫고 기존 읽기 경로로 복귀하며 이미 실행된 금융 이벤트를 지우지 않는다.
