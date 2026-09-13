# Goal

## 1. Project Summary

Active independent fork (2026-09-12): apply `tone-v2/PRD.md` and `tone-v2/PLAN.md`. Earlier project history remains context. Full behavior/visual acceptance and service attachment are not complete.

Completed slice (2026-09-13): the approved immutable 52-section `pass_angle` corpus-2.1.0 result passed real-reader desktop, exact 390px mobile and complete-print verification. Sanitized evidence is attached; Production and customer state remain unchanged. No next Task is active until a new user gate.

Completed slice (2026-09-13): one isolated `today_fortune` result completed and replayed all seven customer fields through `daily-rules-v3`; all five relation and twelve zodiac branches passed. Persona drift was fixed without changing calculations. Production, customer data and deployment remain unchanged. The next Task is inactive until a new user gate.

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
# Active goal — 2026-09-12

기존 격리 `pass_angle` 레코드의 1번 완료 결과를 보존한 채 2~52번 항목을 순서대로 생성하고, 첫 미해결 실패 시 즉시 중단하여 실제 결정적 검수와 저장 상태를 정직하게 증명한다.
## Current approved slice — comparative nextCriterion recognition (2026-09-13)

- Recognize safe comparison/check `해봐` forms and subject-marked observable target clauses without weakening existing nextCriterion safety boundaries.
- Re-evaluate the immutable saved item-3 attempt without a new provider call or record mutation.
- Status: DONE. Independent closure re-review Approved; provider calls and Production changes remained 0.
- Next inactive slice: `task-tone-v2-p04-pass-angle-item3-recovery` (requires a new `다음`).

## Current approved slice — pass_angle item 3 recovery (2026-09-13)

- Revalidate the last stored failed attempt through the production review path.
- Promote only item 3 when valid, preserving attempt/raw history, items 1–2, items 4–52, and all record identities.
- Status: DONE. Stored-attempt recovery moved only item 3 from failed to complete; the record is now generating at 3/52 with no provider call.
- Verification: 690/690 full regression, production replay PASS for items 1–3, and independent review Approved with comments (Critical/Major 0).
- Next inactive slice: `task-tone-v2-p04-pass-angle-full-outline-resume-from-item4` (requires a new `다음`).

## Current approved slice — pass_angle resume from item 4 (2026-09-13)

- Resume the existing isolated synthetic record at item 4 while preserving completed items 1–3 and every identity.
- Generate strictly in order and stop immediately at the first unresolved production-review failure.
- Status: DONE. The immutable isolated record reached 52/52 complete and all 52 sections pass production-equivalent replay.
- Verification: focused 68/68, serial full 705/705 across 101 suites, typecheck and Vercel build PASS; nine closure review rounds completed and final r9 Approved with Critical/Major/Minor 0.
- Production, customer data, deployment, commit, and push remained unchanged.

## Current approved slice — quit_fortune 48-item outline (2026-09-13)

- Replace the legacy 30-point quit-fortune runtime outline with the exact supplied 10-group/48-item contract.
- Preserve input/RAG grounding and saved paid-body redaction; do not copy source example prose.
- Status: DONE. The exact 48-item outline, direct item readings, and 48-pending saved projection are complete.
- Verification: focused 9/9 and full 708/708 across 101 suites PASS; Vercel build/typecheck PASS; independent review Approved with comments and its sole Minor was fixed and regression-tested.
- Next inactive Task: `task-tone-v2-p04-quit-fortune-full-outline-generate`; it requires a new user `다음` before any provider call.
- Non-scope: provider full generation, operating data, DB/auth/payment/admin, corpus/release, commit/push/deploy/Production.

## Current approved slice — quit_fortune 48-item provider generation (2026-09-13)

- Generate the exact 48 items with synthetic input and isolated local storage using the previously approved existing OpenAI key.
- Start at item 1, proceed strictly in order, and stop at the first unresolved deterministic-review failure.
- Status: DONE. The isolated record is 48/48 complete and all accepted sections pass production-equivalent replay.
- Evidence: `tone-v2/evaluations/P04-quit-fortune-full-outline-generation-20260913.json`; independent re-review Approved with comments, Critical/Major/Minor 0.
- Non-scope: operating customer data, Supabase/DB/auth/payment/admin, corpus/release, commit/push/deploy/Production.

## Current approved slice — quit_fortune corpus/RAG release candidate (2026-09-13)

- Replace only the quit-fortune active corpus with a versioned, semantically reviewed pack.
- Make report generation and saved-attempt review use the corpus snapshot stored on that report, so an active-registry change affects new reports only.
- Assemble and test a reversible local release candidate without Production deployment or customer-data mutation.
- Status: DONE. The active quit-fortune pack is the reviewed `2.1.0` versioned file; old report snapshots continue using `2.0.0`, including generation and saved-attempt review, with hash verification and current-vector isolation.
- Verification: task-specific 8/8, related RAG 41/41, full 727/727 across 102 suites, typecheck/Vercel build PASS, Codex closure review Approved with comments (Critical/Major/Minor 0).
- Evidence: `tone-v2/evaluations/P05-quit-fortune-corpus-rag-release-candidate-20260913.json` and `tone-v2/releases/quit-fortune-2.1.0.json`.
- Production deployment, customer-data mutation, commit and push remain NOT_RUN.

## Current approved slice — money_save corpus/RAG release candidate (2026-09-13)

- Replace only the active money-save corpus with a versioned, semantically reviewed pack.
- Reuse and prove stored-snapshot RAG isolation for retrieval, prompt construction and saved-attempt review.
- Remove unsupported financial prescriptions and bind a truthful reversible local release candidate.
- Status: DONE. All 12 blocks passed semantic review; new snapshots use 2.1.0 and stored 2.0.0 snapshots remain isolated through retrieval, prompt construction and saved-attempt review.
- Verification: task 8/8, related 74/74, full 735/735 across 103 suites, typecheck/Vercel build and deterministic builder PASS; Codex review Critical/Major/Minor 0.
- Provider output evaluation, Production, customer data, commit and push remain NOT_RUN.
- Next inactive slice: `task-tone-v2-p05-match-couple-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — match_couple corpus/RAG release candidate (2026-09-13)

- Replace the 18-block active match-couple corpus with a separately versioned and semantically reviewed pack.
- Prove stored-snapshot isolation across retrieval, prompt construction and saved-attempt review.
- Remove partner-mind inference, deterministic relationship outcomes and unsupported action counts or periods.
- Status: DONE. All 18 blocks passed relationship evidence and safety review; new snapshots use 2.1.0 and stored 2.0.0 snapshots remain isolated through retrieval, prompt construction and saved-attempt review.
- Verification: task 8/8, related 74/74, full 743/743 across 104 suites, typecheck/Vercel build and deterministic builder PASS; Codex review Critical/Major/Minor 0.
- Provider output evaluation, Production, customer data, commit and push remain NOT_RUN.
- Next inactive slice: `task-tone-v2-p05-marry-match-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — marry_match corpus/RAG release candidate (2026-09-13)

- Replace the 20-block active marriage-match corpus with a separately versioned, reviewed pack.
- Remove unsupported marriage timing, partner/family reaction and deterministic relationship claims.
- Prove stored-snapshot isolation and a registry-only rollback candidate.
- Status: DONE. All 20 blocks passed marriage evidence, autonomy and safety review; new snapshots use 2.1.0 and stored 2.0.0 snapshots remain isolated through retrieval, prompt construction and saved-attempt review.
- Verification: task 8/8, related 74/74, full 751/751 across 105 suites, typecheck/Vercel build and deterministic builder PASS; Codex review Critical/Major/Minor 0.
- Provider output evaluation, Production, customer data, commit and push remain NOT_RUN.
- Next inactive slice: `task-tone-v2-p05-today-fortune-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — today_fortune corpus/RAG release candidate (2026-09-13)

- Replace the single active today-fortune corpus block with a separately versioned, reviewed pack.
- Remove unlabeled scenarios, duplicated migration boilerplate and deterministic event implications.
- Prove stored-snapshot isolation and a registry-only rollback candidate without changing the deterministic daily renderer.
- Status: DONE. The one block passed daily evidence and symbolic-boundary review; new RAG snapshots use 2.1.0 and stored 2.0.0 snapshots remain isolated through retrieval, prompt construction and saved-attempt review.
- Verification: task 8/8, related 82/82, full 759/759 across 106 suites, typecheck/Vercel build and deterministic builder PASS; Codex review Critical/Major/Minor 0.
- The deterministic daily renderer was unchanged. Provider output evaluation, Production, customer data, commit and push remain NOT_RUN.
- Next inactive slice: `task-tone-v2-p05-saju-master-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — saju_master corpus/RAG release candidate (2026-09-13)

- Replace the single active saju-master corpus block with a separately versioned, reviewed pack.
- Separate user facts, server-calculated values, symbolic interpretation and hypothetical examples.
- Prove stored-snapshot isolation and a registry-only rollback candidate.
- Status: DONE. The one block passed evidence-boundary review; new snapshots use 2.1.0 and stored 2.0.0 snapshots remain pinned.
- Provider output evaluation, Production, customer data, commit, push and deployment remain out of scope.
- Verification: focused 8/8, related 98/98, full 767/767 across 107 suites, typecheck/build/determinism/review/KMS PASS.
- Next inactive slice: `task-tone-v2-p05-work-job-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — work_job corpus/RAG release candidate (2026-09-13)

- Review and version the single work-job corpus block.
- Separate observed work facts from chart calculations and symbolic interpretation.
- Prove stored-snapshot isolation and registry-only rollback.
- Status: DONE. The one block passed career evidence review; new snapshots use 2.1.0 and stored 2.0.0 snapshots remain pinned.
- Provider, Production, customer data, commit, push and deployment remain out of scope.
- Verification: focused 8/8, related 100/100, full 775/775 across 108 suites, typecheck/build/determinism/review/KMS PASS.
- Next inactive slice: `task-tone-v2-p05-love-mind-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — love_mind corpus/RAG release candidate (2026-09-13)

- Separate observed behavior from inferred feelings and symbolic interpretation.
- Enforce refusal and relationship-safety boundaries.
- Preserve stored snapshots and registry-only rollback.
- Status: DONE. Relationship evidence, refusal and safety boundaries passed; new snapshots use 2.1.0 and old snapshots remain pinned.
- Provider, Production and customer data remain out of scope.
- Verification: focused 8/8, related 88/88, full 783/783 across 109 suites, typecheck/build/determinism/review/KMS PASS.
- Next inactive slice: `task-tone-v2-p05-love-again-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — love_again corpus/RAG release candidate (2026-09-13)

- Separate confirmed breakup/contact facts from longing, intent and reunion speculation.
- Make refusal, contact-stop and danger signals authoritative.
- Preserve stored snapshots and registry-only rollback.
- Status: DONE. Reunion evidence, consent/refusal and safety boundaries passed; new snapshots use 2.1.0 and old snapshots remain pinned.
- Verification: focused 8/8, related 88/88, full 791/791 across 110 suites, typecheck/build/determinism/review/KMS PASS.
- Provider, Production and customer data remain out of scope.
- Next inactive slice: `task-tone-v2-p05-love-spouse-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — love_spouse corpus/RAG release candidate (2026-09-13)

- Separate user-stated partner preferences and observed relationship behavior from calculated symbols and future-spouse prediction.
- Prohibit identity, attribute, meeting/marriage timing, private-mind and deterministic outcome claims.
- Enforce autonomy/safety boundaries and preserve stored snapshots with registry-only rollback.
- Status: DONE. Future-person identity/timing, autonomy and safety boundaries passed; new snapshots use 2.1.0 and old snapshots remain pinned.
- Verification: focused 8/8, related 88/88, full 799/799 across 111 suites, typecheck/build/determinism/review/KMS PASS.
- Provider, Production and customer data remain out of scope.
- Next inactive slice: `task-tone-v2-p05-home-fit-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — home_fit corpus/RAG release candidate (2026-09-13)

- Review and version all 12 home-environment blocks.
- Separate user observations, server measurements, missing values and symbolic readings.
- Prevent deterministic safety, health, wealth, relationship, property and move/contract claims.
- Preserve stored snapshots and registry-only rollback.
- Status: DONE. All 12 blocks passed evidence-boundary review; new snapshots use 2.1.0, stored 2.0.0 reports stay pinned, and the dedicated home-reader snapshot bypass is fixed.
- Verification: focused 8/8, related 107/107, full 807/807 across 112 suites, typecheck/build/determinism/review/KMS PASS.
- Provider, Production and customer data remain out of scope.
- Next inactive slice: `task-tone-v2-p05-work-move-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — work_move corpus/RAG release candidate (2026-09-13)

- Review and version all 10 work-move blocks.
- Separate user-confirmed work facts, actual documents, server calculations, unknown company conditions and symbolic readings.
- Prevent deterministic hiring, salary, timing, other-person intent, health, contract and financial claims.
- Preserve stored snapshots and registry-only rollback.
- Status: DONE. All 10 blocks passed evidence and professional-boundary review; new snapshots use 2.1.0 and stored 2.0.0 reports stay pinned.
- Verification: focused 8/8, related 153/153, full 815/815 across 113 suites, typecheck/build/determinism/review/KMS PASS.
- Provider, Production and customer data remain out of scope.
- Next inactive slice: `task-tone-v2-p05-pass-angle-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — pass_angle corpus/RAG release candidate (2026-09-13)

- Review and version all 8 pass-angle blocks.
- Separate confirmed exam facts, official documents, actual study records, server calculations and symbolic readings.
- Prevent intelligence/ability labels, pass/fail predictions, unsupported study prescriptions and medical conclusions.
- Preserve stored snapshots and the completed 52-item record with registry-only rollback.
- Status: DONE. All 8 blocks passed exam-evidence, numeric and health review; new snapshots use 2.1.0 while stored 2.0.0 reports and the completed 52-item record remain pinned.
- Verification: focused 8/8, related 143/143, full 823/823 across 114 suites, typecheck/build/determinism/review/KMS PASS.
- Provider output for 2.1.0, Production and customer data remain out of scope.
- Next inactive slice: `task-tone-v2-p05-cat-compatibility-corpus-rag-release-candidate` (requires a new `다음`).

## Current approved slice — cat_compatibility corpus/RAG release candidate (2026-09-13)

- Review and version all 38 cat compatibility blocks.
- Separate user-observed animal facts from guardian chart calculations, symbolic questions and unknown cat state.
- Prevent personality, private-mind, health, future, adaptation-speed and deterministic compatibility claims; preserve veterinary and animal-welfare priority.
- Status: DONE. New snapshots use reviewed 2.1.0 while stored 2.0.0 snapshots and rollback remain intact.
- Verification: focused 8/8, related 139/139, full 831/831 across 115 suites, typecheck/build/determinism/review PASS.
- Provider, Production, customer data, commit, push and deploy remain NOT_RUN.
- Next inactive slice: `task-tone-v2-p05-couple-signal-corpus-rag-release-candidate` (requires a new `다음`).
# Latest completed slice — job_choice corpus/RAG release candidate (2026-09-13)

- All 12 job-choice blocks now separate confirmed offer documents, server calculations, user reality, unknown company conditions, employer intent and symbolic viewpoints.
- New snapshots use reviewed 2.1.0; stored 2.0.0 snapshots remain hash-pinned through retrieval, prompt construction and saved-prose review.
- Evidence: `tone-v2/evaluations/P05-job-choice-corpus-rag-release-candidate-20260913.json` and `tone-v2/releases/job-choice-2.1.0.json`.
- Next inactive slice: `task-tone-v2-p05-love-this-year-corpus-rag-release-candidate`; it requires a new user `다음`.
# Latest completed slice — love_this_year corpus/RAG release candidate (2026-09-13)

- All 10 yearly-love blocks now separate confirmed relationship facts, server calculations, symbolic questions, unknown partner/future reality, privacy, consent and safety.
- New snapshots use reviewed 2.1.0; stored 2.0.0 snapshots remain hash-pinned through retrieval, prompt construction and saved-prose review.
- The dedicated analyze route remains intact and the generic analyze fallback remains blocked.
- All 20 service-specific registry packs now resolve to 2.1.0; aggregate release readiness is not yet claimed.
- Next inactive slice: `task-tone-v2-p05-all-service-corpus-release-evaluation`; it requires a new user `다음`.

## Latest completed slice — all-service corpus release evaluation (2026-09-13)

- Deterministic aggregate integrity is complete for all 20 service corpus 2.1.0 candidates, reviews, prompt/persona sources and rollback files.
- Corpus layer readiness is 20/20, but complete Tone V2 release readiness is `NO_GO`: verified provider prose is 0/20, attached full-outline independent human review is 1/20, and visual/render/mobile/print evidence is 0/20.
- No Production attachment, deployment or customer record mutation occurred.
- Next inactive slice: `task-tone-v2-p04-lucky-color-full-outline-evidence`; it requires a new user `다음`.

## Current approved slice — lucky_color full-outline provider evidence (2026-09-13)

- Status: DONE. The exact 24-item outline completed in one fresh isolated synthetic result and every accepted section passed production-equivalent replay.
- Provider/model provenance, attempts, token totals and immutable hashes are attached without storing raw provider prose, credentials or personal data.
- The all-service aggregate now counts 2/20 full-outline independent reviews and remains `NO_GO`; Production and customer data were untouched.
- Next inactive slice: `task-tone-v2-p04-newyear-flow-full-outline-evidence`; it requires a new user `다음`.
# Active slice — newyear_flow full-outline evidence (2026-09-13)

Prove the immutable 36-item source contract and one fresh isolated provider-generated `newyear_flow` report, then attach sanitized replay evidence without Production or customer mutation.

# Active slice — wedding_day full-outline evidence (2026-09-13)

Freeze the three supplied source hashes and exact 20-item order, repair the current 21-item runtime drift, then complete one fresh isolated synthetic provider report and production-equivalent replay without Production or customer mutation.

- Status: DONE. Runtime/source 20/20, provider generation 20/20 and stored-snapshot replay 20/20 passed.
- Next inactive slice: `task-tone-v2-p04-wedding-day-visual-render-evidence`; it requires a new `다음`.

## Active slice — wedding_day visual/render evidence (2026-09-13)

Render the completed isolated 20-section Wedding Day result through the real saved-result reader, fix visible source-count drift, and verify desktop, mobile and print presentation without tracking provider prose or touching Production/customer data.

## Latest completed slice — newyear_flow visual/render evidence (2026-09-13)

- The real saved-result reader exposes all 10 categories and 36 complete sections at desktop and exact 390px mobile widths.
- Print expands all disclosures before rendering, restores prior screen state afterward, hides fixed controls, and contains all 36 section bodies without blank pages.
- Sanitized evidence is attached to the New Year 2.1.0 candidate; aggregate visual coverage is 2/20 and release status remains `NO_GO`.
- No provider generation, Production, customer data, Supabase, deployment, commit or push occurred.
- Next inactive slice: `task-tone-v2-p04-lucky-color-visual-render-evidence`; it requires a new user `다음`.
# Active Task — task-tone-v2-production-commit-deploy-20260913

- Commit the accumulated verified Tone V2 implementation and ProjectOps evidence.
- Push the `codex/tone-v2` branch to the canonical GitHub repository.
- Deploy the linked `ax-lab-cream/chungi-t` Vercel project to Production and verify `umsh.kr`.
