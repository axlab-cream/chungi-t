# Goal

## 1. Project Summary

`chungi_t` (운명상회 / 천명사주)는 생년월일시 기반 사주팔자 계산, 명리학 분석,
사주 코퍼스 RAG 검색, LLM 프롬프트 생성을 묶어 개인화된 사주 리포트와 대화를
제공하는 Node/TypeScript 서비스다.

- 런타임: Node 24, ESM, TypeScript 5.7, tsx
- 로컬 서버: Express (`src/server/app.ts`, 기본 포트 8790)
- 배포: Vercel serverless 단일 엔트리 (`api/index.ts`) + catch-all rewrite
- 데이터/인증: Supabase (REST + Auth, google/kakao/email)
- 결제: KG이니시스 표준결제 (Production 전용)
- 운영 도메인: https://umsh.kr / https://chungi-t.vercel.app

## 1-1. 현재 최우선 목표 — 운영 관리자 구축 (admin-ops)

명세: `admin-ops-execution-pack/` (21문서, MANIFEST SHA-256 전부 일치 검증 완료)

콘텐츠, 20종 서비스, 주문·결제·환불, 회원·CS, 리포트 생성, 코퍼스·프롬프트,
로그·분석을 하나의 운영 관리자(`/admin`)에서 관리한다.
운영(고객 화면)과 관리자가 **필드 단위로 매칭**되도록 설계한다 — 어떤 관리자 필드가
어떤 고객 화면의 콘텐츠·CTA·배너·FAQ·가격·상태·메타데이터를 바꾸는지 명시한다.

- 진행 방식: `admin-ops-execution-pack/15-TASKS.md`의 T01~T38을 의존성 순서로 한 번에 하나씩
- 코드 리뷰: **Codex** (`CreamAI/scripts/run-reviewer.ps1`)
- 검증 순서: 로컬 충분 검증 → Git → Vercel → Supabase 반영
- 디자인 방향: `C:\Users\user\Desktop\preview.html` (SK매직몰 UI 레퍼런스) → `docs/adr/ADR-0002.md`
- 초기 목표 범위: M0(T01~T04) + M1(T05~T13). 전체 요구가 M1만으로 완료되었다고 보고하지 않는다.

원칙 (pack 01-LLM-EXECUTION):
- 목업 데이터만 표시하는 상태를 완료로 처리하지 않는다.
- 권한 검사는 서버에서 하고, 기존 이메일 unlock을 운영 권한으로 재사용하지 않는다.
- 기존 고객 리포트·주소·소유권·구매 권한·완료 본문의 불변성을 유지한다.
- 신규 스키마는 버전 관리 migration과 복구 계획을 동반하고 기존 테이블을 파괴하지 않는다.

## 2. Problem

로컬 개발 환경과 원격(GitHub/Vercel/Supabase) 사이의 연동 상태가 문서로
확정되어 있지 않다. 로컬 `.env`에 서버 전용 키가 빠져 있어 결제·유료 리포트
경로를 로컬에서 재현할 수 없고, Preview 배포에는 서비스 롤 키가 없어 미리보기
검증이 불가능하다. CI 워크플로도 없어 회귀를 push 전에 잡지 못한다.

## 3. Target User

- 1차: 이 저장소를 운영·개발하는 개발자/PM (로컬에서 전체 서비스 흐름을 재현해야 함)
- 2차: umsh.kr 최종 사용자 (사주 리포트/대화 소비자)

## 4. Desired Outcome

Git, Vercel, Supabase 세 서비스가 로컬 한 대에서 모두 조작 가능하고,
로컬에서 실행한 검증 결과가 Preview/Production 결과를 예측할 수 있는 상태.

AIOps 사용 시 `ROADMAP.md`를 단계 승인 게이트로 사용한다.

## 5. Scope

- Git: origin/upstream remote, `gh` 인증, 브랜치 상태 확인 및 CI 파이프라인 구성
- Vercel: 프로젝트 링크 유지, 환경별 변수 정합성 확보, `env pull` 기반 로컬 동기화
- Supabase: CLI 도입, 프로젝트 link, 루트 SQL의 migrations 체계 편입
- 로컬 baseline 검증 루틴 확정 (`typecheck`, `test`, `check:integrations`)

## 6. Non-Scope

- 서비스 기능/프롬프트/디자인 변경
- 브랜치 병합 및 프로덕션 재배포
- 결제 실키(Inicis SignKey) 발급 자체 (사용자 자격 필요)
- Supabase 원격 스키마 파괴적 변경

## 7. Functional Requirements

- Requirement: 세 서비스 연동 상태가 `CreamAI/integrations/state.json`과 문서에 근거와 함께 기록된다.
- Requirement: 로컬 `.env`가 Vercel Development 환경과 이름 기준으로 일치한다.
- Requirement: 루트 SQL 스키마가 Supabase migrations 히스토리로 관리된다.
- Requirement: push 시 typecheck + unit test가 자동 실행된다.
- Roadmap gate: execute one Task at a time and wait for user approval before the next Task.

## 8. Non-Functional Requirements

- Security: 토큰/키 값은 문서·로그·커밋에 저장하지 않고 이름만 기록한다. `.env`, `.env*.local`, `.vercel`는 gitignore 유지.
- Performance: Vercel 함수 `maxDuration` 300s 제약 내에서 리포트 생성이 완료되어야 한다.
- Maintainability: 스키마 변경은 migrations 파일로만 표현한다.
- Usability: `npm install` 이후 문서화된 명령 3개 이내로 로컬 실행이 가능해야 한다.
- Accessibility: 기존 공개 페이지 접근성 기준을 회귀시키지 않는다.

## 9. Acceptance Criteria

- [ ] `remember-integration.ps1 -Action list`에서 github/vercel/supabase가 모두 `configured`
- [ ] `vercel env pull` 기반 로컬 환경 동기화 절차가 문서화되고 재현 가능
- [ ] `supabase/migrations/`에 원격 스키마 baseline이 존재하고 히스토리에 applied로 등록
- [ ] GitHub Actions에서 typecheck + test가 통과
- [ ] `node scripts/check-integrations.mjs`의 실패 항목이 결제 항목 외 0건

## 10. Validation Criteria

- Check: `npm run typecheck` / Success: 오류 0건
- Check: `npm test` / Success: 373개 이상 통과, 실패 0건
- Check: `node scripts/check-integrations.mjs` / Success: 결제 외 전 항목 PASS
- Check: Supabase REST 테이블 조회 / Success: 3개 테이블 모두 도달 가능(RLS 401 포함 정상)

## 11. Final Deliverables

- Deliverable: 연동 진단 리포트 (`CreamAI/reports/task-002_final.md`)
- Deliverable: 로컬 환경 동기화 절차 (`README.md` 또는 `docs/WORKFLOW.md`)
- Deliverable: `supabase/migrations/` baseline
- Deliverable: `.github/workflows/ci.yml`
