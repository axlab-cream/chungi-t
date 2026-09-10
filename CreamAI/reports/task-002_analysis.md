# task-002 — 프로젝트 분석 및 Git/Vercel/Supabase 연동 진단

date: 2026-09-10
task_id: task-002
privacy_level: internal (비밀값 미포함, 변수 이름만 기록)

## 1. 프로젝트 구조 요약

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 이름/설명 | `chungi_t` — 천명사주 개인 사주 기반 LLM 대화 엔진 | `package.json` |
| 런타임 | Node 24.13.1, ESM (`"type": "module"`), TypeScript 5.7, tsx 4.19 | `package.json`, `node -v` |
| 로컬 서버 | Express 4.21 — `src/server/app.ts` (`npm start`), 포트 8790 | `package.json`, `README.md` |
| 배포 엔트리 | `api/index.ts` 단일 함수, `maxDuration` 300s, `includeFiles: {data,prompts,사주}/**` | `vercel.json` |
| 라우팅 | 전체 경로를 `/api/index?__umsh_path=$1`로 rewrite | `vercel.json` |
| 도메인 | https://umsh.kr (운영), https://chungi-t.vercel.app | `check-integrations.mjs`, `README.md` |
| 소스 도메인 모듈 | `src/` 하위 23개 (saju, rag, report, payment, auth, love, work, money, day, pet, body, match, pungsu, flow, prompt, llm 등) | `ls src` |
| 외부 의존성 | openai 4.77, pg 8.23, lunar-typescript, korean-lunar-calendar, cors, dotenv | `package.json` |
| 테스트 | node:test 기반 `tests/unit/*.test.ts` (29 suites / 373 tests) | `npm test` |
| 품질 스크립트 | `check:*` 17종 + `qa:all-services` + `check:service-contracts` | `package.json` |
| Claude 훅 | `.claude/hooks/` 4개 (validate-bash, pre-edit-check, post-edit-format, pre-commit-check) | `.claude/settings.json` |
| MCP | figma, comfy-cloud (HTTP) | `.mcp.json` |

빈 placeholder 디렉터리: `scripts/ci`, `scripts/deploy`, `scripts/dev`, `scripts/hooks` (전부 비어 있음).

## 2. 로컬 baseline 검증 결과

| 검증 | 명령 | 결과 |
| --- | --- | --- |
| 타입체크 | `npm run typecheck` | PASS — 오류 0건 |
| 유닛 테스트 | `npm test` | PASS — 373/373, 29 suites, 78.1s |
| 운영 통합 점검 | `node scripts/check-integrations.mjs` | PARTIAL — 8 PASS / 2 FAIL |

`check-integrations` 상세 (대상 https://umsh.kr):

- PASS: `/api/health` HTTP 200, OpenAI 키 구성, Supabase auth config, Supabase publishable key,
  `cheongi_reports` / `cheongi_user_profiles` / `cheongi_payment_orders` 테이블 존재, payment order storage = supabase
- FAIL: `Inicis MID/SignKey` — `INICIS_MID` / `INICIS_SIGNKEY` missing
- FAIL: `checkout enabled` — 결제 모듈 연결 전, 남은 설정은 이니시스 MID·SignKey

## 3. 서비스별 연동 판정

### 3.1 Git / GitHub — configured

| 항목 | 상태 |
| --- | --- |
| origin | `https://github.com/axlab-cream/chungi-t.git` (fetch/push) |
| upstream | `https://github.com/jaeyong-planner/chungi-t.git` (fetch only, push DISABLED) |
| `gh` CLI | 설치됨, `jaeyong-planner` 로그인, keyring 저장 |
| 토큰 스코프 | `gist`, `read:org`, `repo` |
| 현재 브랜치 | `fix/umsh-qa-ux` |
| 로컬 브랜치 | 10개 (codex/* 7종, main, wip/wedding-day, fix/umsh-qa-ux) |
| CI | 없음 — `.github/` 디렉터리에 파일 0건 |
| 미추적 파일 | 25건 (CreamAI/, docs/*.md, goal.md, plan.md, rules.md, status.md, AGENTS.md, CLAUDE.md, .mcp.json, admin-ops-execution-pack/ 등) |

판정: configured (`remember-integration.ps1 -Service github` 결과 `configured`).
갭: (a) CI 워크플로 부재, (b) 미추적 산출물 25건이 커밋 전략 없이 방치,
(c) `gh` 토큰에 `workflow` 스코프가 없어 워크플로 파일 push가 거부될 수 있음.

### 3.2 Vercel — configured

| 항목 | 상태 |
| --- | --- |
| CLI | Vercel CLI 50.19.1, `jaeyong-planner` 로그인 |
| 프로젝트 링크 | `.vercel/project.json` — org `ax-lab-cream`, project `chungi-t` |
| Node 버전 설정 | 24.x (로컬 24.13.1과 일치) |
| 배포 트리거 | GitHub `main` push → Production (Git 연동 활성) |
| 환경변수 | Production 17개 / Preview 11개 / Development 10개 |

환경별 변수 공백 (이름 기준):

| 변수 | Production | Preview | Development |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | O | X | X |
| `INICIS_MID` | O | X | X |
| `INICIS_SIGNKEY` | X | X | X |
| `PUNGSU_DATASET_API_BASE` / `PUNGSU_API_KEY` | O | X | X |
| `SUPABASE_URL` / `ANON_KEY` / `PUBLISHABLE_KEY` / `PROJECT_REF` | O | O | O |
| `OPENAI_API_KEY`, `PUBLIC_BASE_URL`, `UMSH_ADMIN_EMAILS` | O | O | O |

판정: configured (`remember-integration.ps1 -Service vercel` 결과 `configured`).
갭: (a) `SUPABASE_SERVICE_ROLE_KEY`가 Production 전용이라 Preview 및 `vercel dev`에서
RLS 우회 경로(결제 주문 저장, 유료 리포트)가 미정의 키로 진입,
(b) `INICIS_SIGNKEY`가 어떤 환경에도 없음 — 운영 checkout 비활성의 직접 원인,
(c) `PUNGSU_*`가 Production 전용이라 Preview에서 홈핏 리포트 검증 불가.

`vercel env pull` 동작은 로컬 CLI로 직접 확인했다 (`vercel env pull --help`):
기본 파일명 `.env.local`, 기본 대상 Development, `--environment <TARGET>` 및 `--git-branch <NAME>` 지원.
프로젝트의 로컬 파일명은 `.env`이므로 파일명을 명시해야 한다.
`.gitignore`가 `.env`, `.env.local`, `.env*.local`, `.env.production`, `.vercel`을 모두 무시하므로 유출 위험은 없다.

### 3.3 Supabase — partial

| 항목 | 상태 |
| --- | --- |
| 프로젝트 | `axlab-os/chungi-t` — ref `wdyzollywccgaepjeynu`, `ap-northeast-2` |
| REST 도달성 | 3개 테이블 모두 HTTP 401 코드 `42501` (권한/RLS 거부) — 프로젝트·테이블 존재 확인 |
| Auth 설정 | `GET /auth/v1/settings` HTTP 200, 활성 provider: google, kakao, email |
| 로컬 키 | `SUPABASE_URL`, `ANON_KEY`, `PUBLISHABLE_KEY`, `PROJECT_REF`, `GOOGLE_CLIENT_ID`, `GOOGLE/KAKAO/NAVER_PROVIDER` 존재 |
| CLI | 미설치 — `supabase` 명령 없음 |
| 스키마 관리 | 루트 평문 SQL 2개 (`supabase-payment-orders.sql`, `supabase-reports.sql`), `supabase/` 디렉터리·migrations 없음 |
| 검증 SQL | `scripts/verify-payment-db.sql`, `scripts/verify-report-db.sql` |

판정: partial (`remember-integration.ps1 -Service supabase` 결과 `missing_cli`, exit 3).
갭: (a) CLI 미설치로 migration/link/push 불가, (b) 원격 스키마가 이미 라이브인데 마이그레이션 히스토리가 없음,
(c) 로컬 `.env`에 `SUPABASE_SERVICE_ROLE_KEY`/`DATABASE_URL` 없음,
(d) `SUPABASE_NAVER_PROVIDER`가 env에 있으나 Supabase Auth에서 naver는 비활성 — 설정 불일치.

## 4. 로컬 `.env` 누락 항목 (이름만)

`.env.example`에는 있으나 로컬 `.env`에 없는 키:

- `SUPABASE_SERVICE_ROLE_KEY` — 없으면 결제 주문 저장이 메모리로 폴백하고 checkout 비활성
- `DATABASE_URL` — 직접 Postgres 저장 및 Supabase CLI `db push`/`db pull`의 전제
- `INICIS_MID`, `INICIS_SIGNKEY` — 결제 흐름 로컬 재현 불가
- `PUNGSU_DATASET_API_BASE`, `PUNGSU_API_KEY` — 홈핏(풍수) 리포트 경로 로컬 재현 불가
- `UMSH_ADMIN_EMAILS` — 관리자 무료 열람 경로 검증 불가
- `REPORT_OPENAI_MODEL` — 유료 리포트 모델 분기 검증 불가
- `PAYMENT_TEST_MODE` — 로컬 결제 시뮬레이션 불가

결론: 현재 로컬 환경은 무료·조회 경로만 재현 가능하고, 결제·유료 리포트·홈핏 경로는 재현 불가다.

## 5. 리서치 반영 (Antigravity 폴백 → Claude)

보고서: `CreamAI/logs/research/task-002_integration-env-research.md`
(`role-fallback: claude substituted for antigravity`. 해당 세션에서 WebSearch/WebFetch가 거부되어
대부분의 명령 문자열이 UNVERIFIED로 표기됨.)

채택한 findings:

- F5/F6 (핵심): 원격 스키마가 이미 라이브이므로 migrations 진입은 반드시 `supabase db pull` 기반
  baseline 스냅샷 후 applied 등록 순서여야 한다. `supabase init` + `migration new`에 루트 SQL을 붙여
  `db push`하면 기존 객체에 `CREATE TABLE`을 재실행해 실패하거나 부분 변경을 일으킨다.
  TASK-004의 순서 제약으로 확정.
- F1: 전역 `npm i -g supabase`는 비권장. devDependency + npm script 경로를 채택 예정(버전 고정·CI 재현성).
- F2: `db pull`/`db diff`는 Docker 기반 shadow DB를 요구할 수 있다.
  Docker Desktop 설치 여부가 TASK-004의 선행 확인 항목. 미설치 시 대시보드 SQL 내보내기 또는 `pg_dump` 경로로 대체.
- F7: `vercel env pull` 기본값 `.env.local` / Development — 로컬 CLI로 직접 검증해 UNVERIFIED 해소.
- F8: 서비스 롤 키를 Preview에 복사하는 것은 비권장(Preview는 기본적으로 공개 접근 가능).
  비운영용 별도 Supabase 프로젝트 분리를 TASK-006 권고안으로 채택.
- F9: Vercel Git 연동이 활성이므로 Actions는 CI 전용으로 두고 배포는 넣지 않는다(중복 배포 회피).
  TASK-005 범위로 확정.
- F10: Supabase 신 키 모델(`sb_publishable_*` / `sb_secret_*`) 전환 여부는 미확인.
  현재 키 접두어 확인 후 ADR 기록 권고. task-002의 차단 사유는 아님.

## 6. 발견된 도구 결함

`CreamAI/scripts/run-projectops-harness.ps1`은 `$ProjectRoot`를 `CreamAI/` 자신으로 설정한다.
그 결과 `-Mode test`가 저장소 루트의 `package.json`을 찾지 못하고
`WARN | npm test script | package.json has no test script`로 종료된다.
즉 하네스의 test 모드는 실제 테스트를 실행하지 않는다.
task-002에서는 `npm run typecheck`와 `npm test`를 PM이 직접 실행해 결과를 확보했다.
또한 이 스크립트는 실행 시 작업 디렉터리를 `CreamAI/`로 변경한다.
후속 조치 대상(하네스 수정)으로 기록한다.

## 7. 리스크

| 리스크 | 영향 | 완화 |
| --- | --- | --- |
| 라이브 스키마에 잘못된 `db push` 또는 `db reset --linked` | 운영 데이터 손실 | `plan.md`의 안전 게이트 G1~G5(백업/PITR 확인, 대상 ref 확인, baseline diff 사람 검토, dry-run 무변경, 명시적 승인) 전부 통과 전 원격 쓰기 금지. `db reset` 금지 |
| `vercel env pull .env`가 기존 `.env`를 덮어씀 | Vercel에 없는 로컬 전용 값 소실 | pull 전 `.env` 백업, `.env.local`로 받아 수동 병합 |
| Production 서비스 롤 키를 Preview에 복사 | RLS 우회 키가 공개 Preview에 노출 | 비운영 Supabase 프로젝트 분리 |
| `gh` 토큰에 `workflow` 스코프 없음 | CI 워크플로 파일 push 거부 가능 | TASK-005 전 스코프 확인 또는 재인증 |
| 미추적 파일 25건 | 의도치 않은 커밋 또는 산출물 유실 | TASK-008에서 분류 |
| 로컬 브랜치 10개 분기 상태 | 병합 충돌·중복 배포 | 별도 Task로 정리 |

## 8. 후속 Task 큐

`plan.md` Task Board 참조: TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-008.
TASK-007(결제 SignKey)은 사용자 자격이 필요해 BLOCKED.
