---
task_id: task-t01
pack_task: T01
status: done
active: false
owner: claude-pm
created: 2026-09-10
milestone: M0
priority: P0
depends_on: []
requirement: R01
---
# task-t01 — 기준 소스·운영 차이 기록 (admin-ops T01)

## Purpose
`admin-ops-execution-pack`의 첫 ready 작업. 운명상회 운영 관리자를 구현하기 전에
로컬 기준 소스와 운영 사이의 차이를 증거와 함께 확정하고, 패키지가 "확인됨"으로
기재한 근거(E01~E16)를 실제 코드로 재검증한다.

## Scope
- Implement:
  - 패키지 무결성 검증 (MANIFEST.json SHA-256)
  - git HEAD / dirty / origin-main 분기 기록
  - `src/server/app.ts` 라우트 전수 실측 및 패키지 기재와의 차이표
  - 환경별(로컬 / Development / Preview / Production) 차이표
  - E01~E16 재검증 결과표
  - 관리자 UI 배치 제약 조사
  - 미확인 항목(U1~U8)과 해제 조건
- Do not implement:
  - 관리자 라우터·UI·스키마 (T05 이후)
  - 20종 키 매핑 상세 (T02)
  - 저장소 스키마 조사 상세 (T03)
  - 운영 DB 조회, PG 거래, 운영 배포
  - git 커밋/푸시

## Success Criteria
- [x] 로컬/운영 확인 범위가 문서에 명시됨
- [x] 비밀값 없이 기준표 작성 (변수 이름·존재 여부만)
- [x] HEAD·dirty·라우트·환경별 차이표 산출
- [x] 패키지 기재와 실제 코드의 충돌이 명시적으로 기록됨
- [x] 미확인 항목이 해제 조건과 함께 기록됨

## Deliverables
- `docs/admin-ops/T01-baseline.md`
- `docs/admin-ops/HANDOFF.md` (패키지 20-HANDOFF 양식을 따르는 living 인계 기록.
  패키지 파일을 직접 수정하면 `MANIFEST.json` SHA-256 검증이 깨지므로 패키지는 불변 보존)
- `docs/adr/ADR-0002.md` (관리자 UI 배치·디자인 방향)

## Key Findings
1. `fix/umsh-qa-ux`는 `origin/main` 대비 -20/+10 커밋. **로컬 HEAD는 운영 배포 코드가 아니다.**
2. 패키지 "현재 확인된 API" 15개는 **전부 실재한다**. `GET /api/report/:reportId`는 app.ts:2398에 배열 등록(별칭 `/api/reports/:reportId`)되어 있고 `verifySupabaseUser`로 소유자 검증을 한다. (초판 오판 — Codex 리뷰로 정정)
3. 패키지 02-EVIDENCE에 없는 실제 API 23건 (health, auth/config, payment/config, payment/test/approve, user/destiny, report/chat-history, today/fortune, analyze 계열 16건).
4. `src/auth/admin.ts`의 `DEFAULT_ADMIN_EMAILS`가 하드코딩이라 환경변수로 회수 불가 → 이 경로를 운영 권한으로 재사용하면 A03 충족 불가. T05에서 RBAC와 완전 격리 필요.
5. 로컬 주문 저장 모드 **memory** 실측. Development·Preview는 코드 경로상 memory여야 하나 런타임 미검증 → A17 대응 필요.
6. `express.static`(683~684행)은 마지막 등록문이 아니고 fall-through한다. 실제 위험은 "경로에 실제 파일이 있으면 인증 없이 서빙"이며, 그래서 관리자 UI는 정적 루트 밖(`admin-ui/`)에 두기로 했다 (ADR-0002 D1).
7. `/admin`, `/api/admin` 경로 충돌 없음.

## Risks
- U1(기준 브랜치 미확정)을 방치하면 T05 이후 산출물이 병합 충돌·중복 구현으로 낭비될 수 있다.
- U2(개발용 영속 저장소 부재)를 방치하면 관리자 쓰기 기능을 로컬에서 검증할 수 없다.
- 하드코딩된 관리자 이메일을 그대로 재사용하면 13-SECURITY 위반이 구현에 전파된다.

## Verification Steps
- `MANIFEST.json` SHA-256 대조 (실행: ALL OK, 21 files)
- `git rev-list --left-right --count origin/main...HEAD`
- `grep`으로 app.ts 라우트 전수 추출
- `GET /api/payment/config` 로컬 실측
- `npm run typecheck`, `npm test`, `check-integrations` (로컬·운영)

## Collaboration Logs
- research: CreamAI/logs/research/
- review: CreamAI/logs/review/
- harness: CreamAI/logs/harness/

## Review Outcome (2026-09-10)
- Codex review: `CreamAI/logs/review/task-t01_admin-ops-t01-review.md` — Critical 0 / Major 5 / Minor 4
- 전부 수용, 반려 0건. 반영 내역은 `docs/admin-ops/T01-baseline.md` §10 표 참조.
- 가장 중대한 수정: `GET /api/report/:reportId` 부재 판정 오류(배열 형태 라우트 등록을 놓친 grep).
  라우트 추출 방식을 배열 지원으로 교체하고 총계를 등록문 145 / 경로엔트리 286 / `/api` 39로 정정.
- ADR-0002 D1을 `사주/admin/` → `admin-ui/`(정적 루트 밖)로 변경. 정적 미들웨어의 인증 우회 위험 제거.
- ADR-0002 D3을 "레퍼런스 hex 값 채택" → "원칙만 차용, 의미 기반 토큰 독립 정의"로 변경.
- 미해결(사용자 결정 필요): 패키지 `20-HANDOFF.md` 갱신 여부 (T01-baseline §11 선택지 A/B).
