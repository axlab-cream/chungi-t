# Goal

## Completed slice — 관계 신호 무료 티저 운영 전환 (2026-09-29)

- 저장된 `couple_signal` 리포트의 실제 1·2번을 이미지·개인화 본문·표·순서도·사주 차트와 함께 공개한다.
- 서버의 실제 3~21번 목차는 기본 닫힘·잠김으로 한 번만 표시하고, 미결제자는 결제·구매자는 05 목차로 보낸다.
- 저장 사주, 상대 생년 정보, 관계 상태, 마음에 걸린 변화와 직접 적은 고민만 사용하며 외도 여부나 상대의 마음을 만들어 내지 않는다.
- 무료 조회 5회, 입력 재확인, 공통 GNB, 보관함·결제·05·06 권한 경계를 유지하고 운영 배포까지 검증한다.

## Completed slice — 관계 신호 STEP2 입력 경험 보강 (2026-09-29)

- 세로형 대표 이미지의 머리 잘림을 없애고 모바일 첫 화면에서 얼굴과 문구가 함께 읽히게 한다.
- 내부 단계명·티저 구현 설명을 제거하고 사용자의 실제 관계 고민이 첫 무료 해석으로 이어진다는 문장으로 바꾼다.
- 연·월·일 및 포인트 선택 목록이 운영체제의 흰 목록에서도 충분한 대비로 읽히게 한다.
- 기존 저장 사주, 입력 검증, 리포트 생성 및 STEP2 → STEP4 흐름은 유지한다.

## Completed slice — 고양이 궁합 무료 티저 운영 전환 (2026-09-29)

- `cat_compatibility`의 저장 리포트에서 실제 1·2번 해석만 상세 공개하고 서버의 3~N 목차는 잠긴 상태로 접어 둔다.
- 저장 사주 또는 이번 리포트용 새 사주와 관찰한 고양이 행동·생활 답변을 본문·표·차트에 연결한다.
- 보호자 사주는 보호자의 돌봄 속도에만 사용하고, 고양이 상태는 사용자가 직접 알려 준 행동에서만 읽는다.
- STEP2 → 공통 로딩 → STEP4 티저 → 미결제 결제/결제 완료 STEP5 권한 분기와 5회 조회를 보존한다.
- 회귀/전체 테스트, 타입 검사, 빌드, 리뷰, main 반영, 운영 배포와 모바일 운영 검증까지 완료한다.
- 구현 `d8d4a70a`, Production `dpl_MrDDXj5QYBvTArk2nh1XVQmGC8WK`로 실제 회원 리포트의 1·2번, 닫힌 03~20 목차, 단일 CTA와 권한 분기를 운영 확인했다.

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
- 코드 리뷰: **Grok** (`CreamAI/scripts/run-reviewer.ps1 -Cli grok`) — Codex rate limit으로 2026-09-17 전환
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

# Active Task — task-tone-v2-all-service-final-pdf-20260913

- Export one privacy-safe final PDF containing the current interpreted output for all 20 services.
- Keep provider-verified, deterministic-verified and production-template QA evidence visibly distinct.
- Save the rendered and verified artifact under `C:\Users\user\Desktop\운명상회-최종`.

# Active Task — task-tone-v2-all-service-teaser-release-20260914

- Audit every paid-service teaser against the saved teaser trust gate and the full report outline.
- Ensure the middle teaser page contains a grounded verdict, representative evidence, an everyday scene and an exact full-report scope without exposing paid body copy.
- Verify the shared teaser UI on desktop and mobile, then commit, push and deploy the verified change to `umsh.kr`.
- Status: DONE for this teaser slice. Complete Tone V2 release remains `NO_GO` until the independent provider/full-outline/visual aggregate gates are complete.

## 2026-09-26 — 20개 서비스 해석 토글 위치 고정

- 공용 저장 리포트의 해석 토글을 누르면 클릭한 목록 행 바로 아래에서 본문이 열려야 한다.
- 서비스별 구형 클릭 처리기가 공용 `<details>`를 화면 전환으로 오인해 상단으로 이동시키지 않아야 한다.
- 20개 서비스의 저장 원문·계산값·이미지·표·그래프와 native 펼침/접힘·키보드 의미는 그대로 유지한다.
- 공용 렌더러 한 곳에서 재발을 막고, 캐시 버전을 모든 참조 화면에 동기화한다.

## Active slice — money_save 실제 데이터 무료 티저 운영 적용 (2026-09-28)

- 저장 사주와 저축운 입력으로 실제 1·2번을 상세 공개하고 3~N 실제 목차는 잠근다.
- 입력 표·서버 계산 오행 차트·서로 다른 이미지·단일 CTA·5회 영속 조회를 운영 패턴으로 통합한다.
- 전체 회귀, 리뷰, main 반영, 운영 배포, 모바일 실제 화면과 KMS 기록까지 완료한다.

## 2026-09-29 — 커플궁합 무료 티저 실제 데이터 전환

- 로그인 회원의 저장 사주 또는 사용자가 고른 새 사주와 상대 사주, 관계 단계, 현재 온도, 반복 갈등, 직접 적은 고민을 실제 1·2번 무료 해석에 연결한다.
- 03번부터 실제 서버 목차는 본문 없이 잠금 상태로 두고, 미결제자는 결제, 구매자는 05 목차로 이어지는 권한 흐름을 유지한다.
- 입력 → 03 준비 표시 → reportId 포함 04 티저 → 결제 → 05 목차 → 06 상세 흐름과 새 사주의 별도 리포트·보관함 계보를 검증한다.

## 2026-09-29 — 올해 연애운 스토리 구매 전환 보강

- 설명형 전문 용어보다 사용자의 애매한 관계·반복되는 연애 고민을 먼저 보여 준다.
- 고민 공감 → 놓친 신호 → 올해 달라질 장면 → 실제 리포트 범위 → 무료 2개 해석 시작으로 서사를 연결한다.
- 이미지와 브랜드 톤은 유지하면서 화면 높이와 CTA 문구를 모바일 구매 여정에 맞게 정리한다.

## 2026-09-29 — 관계 신호 STEP1 스토리·CTA 보강

- 하단 본문 CTA와 고정 CTA가 겹쳐 같은 버튼이 두 개로 보이는 문제를 제거한다.
- 연락 변화에서 시작해 반복 패턴, 두 사람의 확인 방식, 실제 리포트 질문, 무료 해석 진입으로 자연스럽게 이어지는 이야기로 재구성한다.
- 가격과 내부 분석 용어를 앞세우지 않고 사용자가 겪는 장면과 얻을 답을 먼저 보여 준다.

2026-09-29: LOVE-SPEED-01 /play/love-speed/ mobile game. User authorized implementation and available deployment; PRD backlog/love-speed-20260929.md.

## 2026-09-29 — GA-INTEGRITY-01
- 운영 GA 개발유입 혼입 및 캠페인 소실 수정. 광고 성과·미분류 전체 원인은 별도로 검증한다. 기록: personal/carrotcap/notes/umsh-ga-integrity-20260929.md.

## 2026-09-29 — 결혼궁합 무료 티저 실제 데이터 전환

- 결혼궁합 04에서 저장 리포트 1·2번, 두 사람의 사주 계산값과 실제 관계 입력을 고객 중심 이야기로 공개한다.
- 03~24번 실제 목차 22개는 잠금 상태로 기본 펼치고 CTA는 미결제 결제·구매자 05 목차로 분기한다.
- 저장 사주와 이번 리포트용 새 사주를 구분하고, 새 사주는 계정 기본 프로필을 덮지 않은 별도 보관함 결과로 남긴다.
## 2026-09-30 — CMDG 개인화 서사·추가 질문·인연 스케치
- 공통 네 단계 서사, 실제 개인 계산/질문 근거, 안전한 마크다운/밑줄/모바일 표, 본인 구매 리포트의 추가 답변 저장 및 비공개 이미지 API를 구현했다.
- 상세 근거·검증·운영 설정과 미실행 범위: docs/cmdg-personal-reading-20260930.md. 과거 완료 본문은 보존한다. 운영 반영은 아직 아님.


### 2026-09-30 천명사주 후속: 자미두수·개인 대운·주의 강조
사용자 운영 배포 승인 후 ec1d0f4f 운영 반영 완료. 실제 개인 명반의 독립 장, 실제 대운의 5개 생애 구간, 주의 조건 강조 및 구형 저장본 호환성 수정 진행. 근거/검증/복구 이력: docs/cmdg-personal-reading-20260930.md. 기존 원문·결제 권한 보존.

- 2026-09-30 후속: 장별 추가 상담 2회·이력/보관함·5.6 Luna·한국인 성인 스케치 구현 및 최종 검증. 요구/근거: docs/cmdg-personal-reading-20260930.md.

GA-SIGNUP-04: 신규 Google/Kakao 가입 완료를 GA4 sign_up(method)로 측정. 기존 로그인/개인정보/QA 제외.
