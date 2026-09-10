# ProjectOps Memory Candidate

task_id: task-t03
date: 2026-09-10
case_type: success (quality_gate)
failure_type: null
success_pattern: quality_gate
problem: |
  조사 작업은 "확인했다"와 "코드에서 그렇게 보인다"를 구분하지 않으면 신뢰할 수 없는
  근거를 후속 구현에 넘긴다. T03은 운영 DB 접근 권한이 없는 상태에서 스키마를 조사했는데,
  초판이 여러 결론을 실측처럼 적었다. Codex 리뷰가 Major 5건 중 4건을 **증거 경계 초과**로
  지적했다: (1) 테이블 3개 전부 service_role 전용이라 단정, (2) 열이 "비어 있다"고 단정,
  (3) 환경변수 이름만 보고 런타임 결과를 단정, (4) 실행하지 않은 SQL 스크립트를 "성공"으로 표기.
solution: |
  조사 산출물은 근거 등급을 **표의 열로** 만든다. 최소 4등급:

  | 등급 | 표기 | 의미 |
  | --- | --- | --- |
  | 실행 실측 | "실측" + 명령/응답 | 이 Task에서 직접 실행 |
  | 선행 Task 실측 | "task-00X 실측" + 문서 경로 | 다른 Task가 실행, 출처 링크 |
  | 소스 사실 | "코드/SQL 기준" + 파일:행 | 파일에 그렇게 쓰여 있음 |
  | 코드 경로 분석 | "코드 경로 분석" | 실행 없이 논리로 도출 |
  | 미확인 | "미확인" + 해제 조건 | 확인 수단이 없음 |

  특히 부정 주장("없다", "비어 있다", "기록되지 않는다")은 범위를 명시한다.
  "저장소 코드가 기록하지 않는다"(소스 사실)와 "운영 DB에 값이 없다"(미확인)는 다르다.
  전자만으로도 후속 작업에 필요한 안전한 결론은 나온다:
  **"그 열에 의존하려면 먼저 측정해야 한다."**
root_cause: |
  조사 결과를 읽는 쪽이 원하는 것은 "확정된 사실"이므로, 조사자는 결론을 단정형으로 쓰려는
  압력을 받는다. 그러나 단정이 틀리면 후속 Task가 잘못된 전제로 구현을 시작한다.
  T01에서도 같은 패턴이 있었다(README 서술을 검증 없이 전제로 사용).
why_it_worked: |
  리뷰 프롬프트에 "각 주장을 PASS/WRONG으로 판정하라"와 별도로
  **"운영 상태를 코드 읽기만으로 단정한 항목을 지목하고, 약화가 필요한 문장을 이름으로 말하라"**
  는 항목을 넣었다. 그래서 리뷰가 단순 사실 검증을 넘어 **주장 강도**를 감사했다.
  결과적으로 결론 자체는 거의 유지되고 표현만 정확해졌다 — 즉 조사 가치는 잃지 않았다.
reuse_condition: |
  접근 권한이 제한된 대상(운영 DB, 외부 시스템, 타 팀 소유 리소스)을 조사할 때.
  또는 조사 산출물이 후속 구현의 전제가 될 때.
do_not_use_when: |
  전 구간을 직접 실행·측정할 수 있는 조사. 그때는 등급 구분이 불필요한 오버헤드다.
related_files:
  - docs/admin-ops/T03-storage-schema.md
  - CreamAI/logs/review/task-t03_admin-ops-t03-review.md
  - supabase-payment-orders.sql
  - supabase-reports.sql
  - src/payment/order-store.ts
  - src/report/report-store.ts
  - src/user/profile-store.ts
recommended_prompt: |
  리뷰 요청 시 추가할 항목:
  "이 문서가 운영 상태를 코드 읽기만으로 단정한 항목을 모두 지목하고,
   어느 문장을 어떻게 약화해야 하는지 문장 단위로 말하라.
   실행하지 않은 검증을 '성공'으로 표기한 곳도 찾아라."
recommended_command: |
  (조사 대상별) 정본 스키마 파일 ↔ 코드 ensureDb() ↔ 실제 쓰기 경로(INSERT/select 목록) 3중 대조.
  쓰기 경로에 없는 열은 "앱이 기록하지 않음"으로만 결론하고, 운영 값은 별도 측정 항목으로 남긴다.
revalidation_command: |
  grep으로 `service_key|public_id|progress_complete|input_fingerprint`를 src/·scripts/에서 재검색.
  결과가 여전히 0건이면 U18의 소스 측 사실은 유효하다.
expires_at: 관리자 read model이 구현되는 시점 (또는 2026-12-31)
privacy_level: internal
should_promote_to_rag: true

## 재사용 가능한 도메인 지식 (이 프로젝트 전용)

- **정본 스키마는 루트 `.sql` 파일, 코드 `ensureDb()`는 더 약한 fallback이다.**
  같은 테이블명에 대해 `owner_id`/`user_id`가 정본은 `uuid + FK`, 코드는 `TEXT`다.
  `CREATE TABLE IF NOT EXISTS`이므로 기존 DB는 안전하지만 **새 DB는 약한 스키마가 생긴다.**
  개발·스테이징 DB를 코드 경로로 만들면 운영 제약을 재현하지 못한다.
- **`cheongi_user_profiles`는 정본 SQL이 없다.** 코드가 유일한 정의다.
- **스토어 3개의 접근 모델이 다르다.** orders·reports는 service_role(RLS 우회),
  **profiles는 고객 accessToken + publishable 키(RLS 통과)**.
  → 관리자가 프로필을 읽으려면 별도 adapter가 필요하고, 13-SECURITY는
  "사용자 profile 저장 경로를 일괄 서버권한으로 전환하지 않는다"고 못 박았다.
- **reports는 `revision`이 열이 아니라 `payload` jsonb 안에 있다.**
  4개 저장 모드(file/memory/REST/postgres) 전부 CAS 구현. 불변 필드 강제도 코드에 있다.
- **orders에는 CAS가 없다.** `updatePaymentOrder`는 read-then-write.
  있는 것은 PG 리턴 핸들러의 **상태 가드**(`paid`/`viewed`면 재승인 안 함)뿐이므로
  순차 중복은 막고 동시 중복은 막지 못한다.
- **`status` enum에 불확정 상태가 없다** (`ready/approving/paid/viewed/cancelled/failed`).
  PG 승인 성공 + 내부 저장 실패를 표현할 값이 없어 대사 복구 설계가 불가능하다.
  결제를 켜기 전에 반드시 해소해야 한다.
- **`cheongi_reports`의 관리자 분석 열 8개를 앱이 쓰지 않는다.**
  실제 공개 URL 판별자는 `public_id` 열이 아니라 `payload->>'resultId'`다.
- 구형 payload 폴백 3종: `generationId` → `legacy_<sha256>`,
  `resultId` → `publicId` → `reportId`, `revision` 없으면 REST CAS가 `is.null`.
  회귀 fixture는 `tests/unit/report-persistence.test.ts:102`.

## Evidence
- review: `CreamAI/logs/review/task-t03_admin-ops-t03-review.md` — Critical 0 / Major 5 / Minor 3, 전부 수용
- 소스 근거: 두 정본 `.sql`, 세 스토어, `app.ts:927/1550/1583`, `verify-*.sql`
- 실행 검증: `npm test` 373/373 (T01에서 실행, 구형 레코드 케이스 포함)
- 미실행: 운영 DB 쿼리, `verify-*.sql` — 문서에 명시

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- 비고: 키 형식 판별 로직(`sb_secret_` 접두어, JWT 형태 정규식)만 기록. Codex가 안전 판정.
