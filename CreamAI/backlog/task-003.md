---
task_id: task-003
status: active
active: true
owner: claude-pm
created: 2026-09-10
depends_on: task-002
---
# task-003 — 로컬 `.env` 완결화 및 Vercel 환경변수 동기화 절차 확정

## Purpose
로컬 개발 환경이 Vercel Development 환경과 이름 기준으로 일치하게 만들고,
현재 로컬에서 재현 불가한 경로(결제, 유료 리포트, 홈핏)의 원인을 키 단위로 해소하거나
사용자 제공이 필요한 항목으로 명확히 분리한다.

## Context (task-002 근거)
- `src/env/load.ts`는 `.env`를 먼저 로드하고 `.env.local`을 `override: true`로 덮어쓴다.
  즉 `vercel env pull .env.local`이 앱 설계와 정확히 맞물린다.
- 로컬 `.env`에 없는 키: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `INICIS_MID`,
  `INICIS_SIGNKEY`, `PUNGSU_DATASET_API_BASE`, `PUNGSU_API_KEY`, `UMSH_ADMIN_EMAILS`,
  `REPORT_OPENAI_MODEL`, `PAYMENT_TEST_MODE`
- `src/env/load.ts`의 `configuredEnv()`는 `your-`로 시작하는 예시값을 미설정으로 취급한다.
  따라서 `.env.example` 값을 그대로 복사해도 기능이 켜지지 않는다.
- 결제 활성 조건(`src/payment/inicis.ts:53`, `src/server/app.ts:1204`):
  `INICIS_MID` + `INICIS_SIGNKEY` 둘 다 존재 **그리고** 주문 저장소가 memory가 아님
  (`SUPABASE_SERVICE_ROLE_KEY` 또는 `DATABASE_URL` 필요).

## Scope
- Implement:
  - `.env` 안전 백업 (프로젝트 밖 스크래치패드)
  - `vercel env pull`로 Vercel Development 값을 내려받아 로컬과 이름/값 차이 진단
  - `.env` / `.env.local` 역할 분리 확정 및 실제 적용
  - `.env.example`이 코드에서 실제로 읽는 변수와 일치하는지 검증 및 보정
  - 로컬 동기화 절차를 `README.md`에 문서화
  - 로컬 서버 기동 후 통합 점검 실행
- Do not implement:
  - Vercel 환경변수 추가/수정/삭제 (TASK-006)
  - Supabase CLI 설치 및 마이그레이션 (TASK-004, 안전 게이트 대기)
  - 실제 비밀값 생성/발급 (사용자 자격 필요)
  - git 커밋/푸시

## Success Criteria
- [ ] `.env` 백업이 프로젝트 밖에 존재하고 원본이 손상되지 않았다
- [ ] Vercel Development 변수와 로컬 변수의 차이가 이름 단위로 표로 정리되었다
- [ ] `.env` / `.env.local` 역할이 문서화되고 `README.md`에 재현 절차가 있다
- [ ] `.env.example`에 코드가 읽는 변수가 모두 존재한다
- [ ] 로컬 서버가 기동되고 `/api/health`가 200을 반환한다
- [ ] 사용자 제공이 필요한 키가 출처(대시보드 경로)와 함께 명시되었다
- [ ] 비밀값이 문서·로그·커밋에 저장되지 않았다

## Risks
- `vercel env pull`이 기존 파일을 덮어쓸 수 있음 → 스크래치패드로 먼저 받고 비교 후 적용
- Vercel Development의 `PUBLIC_BASE_URL`이 운영 도메인일 경우 `.env.local` override가
  로컬 콜백 URL을 깨뜨릴 수 있음 → 값 확인 후 선택적 적용
- `.env.backup*` 같은 파일명은 `.gitignore`에 걸리지 않음 → 프로젝트 밖에 백업
- Sensitive 표시된 Vercel 변수는 pull에서 빈 값으로 내려올 수 있음
  (`.vercel/.env.production.local`에 `SUPABASE_SERVICE_ROLE_KEY`가 없는 것이 그 증거)

## Verification Steps
- `node -e` 기반 변수 이름 비교 (값 출력 금지)
- `npm start` 기동 후 `curl http://localhost:8790/api/health`
- `node scripts/check-integrations.mjs --base http://localhost:8790`
- `npm run typecheck`, `npm test` (회귀 확인)

## Collaboration Logs
- research: CreamAI/logs/research/
- review: CreamAI/logs/review/
- harness: CreamAI/logs/harness/
