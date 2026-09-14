# Tone V2 status

## Latest: cat_compatibility corpus 2.1.0 candidate (2026-09-13)

- All 38 blocks separate user observations, guardian calculations, symbolic questions, unknown cat state and labeled hypothetical scenes.
- Guardian astrology cannot establish cat personality, feelings, health, future behavior, adaptation speed or compatibility; welfare and veterinary escalation are authoritative.
- New snapshots use 2.1.0 while stored 2.0.0 snapshots remain pinned and hash-checked.
- Focused 8/8, related 139/139, full 831/831, typecheck/build/determinism/review PASS.
- Provider output evaluation, Production and customer-data mutation are NOT_RUN.

## Previous: pass_angle corpus 2.1.0 candidate (2026-09-13)

- Exam fact, official-document, study-record, calculated-symbol, numeric and health review 8/8 PASS.
- New reports use 2.1.0; stored reports and the completed 52-item record retain their prior snapshots and identities.
- Focused 8/8, related 143/143, full 823/823 across 114 suites, typecheck/build/determinism/review/KMS PASS.
- Existing provider output predates 2.1.0; new provider evaluation and Production remain NOT_RUN.

## Latest: work_move corpus 2.1.0 candidate (2026-09-13)

- Career fact, document, unknown-company, symbolic and professional boundary review 10/10 PASS.
- New reports use 2.1.0; stored reports retain 2.0.0 snapshots and hash mismatch fails closed.
- Focused 8/8, related 153/153, full 815/815 across 113 suites, typecheck/build/determinism/review/KMS PASS.
- Provider output and Production remain NOT_RUN.

## Latest: home_fit corpus 2.1.0 candidate (2026-09-13)

- Environment evidence and symbolic/professional boundary review 12/12 PASS.
- Dedicated home prompt and saved-review consumers now use stored corpus snapshots; hash mismatch fails closed.
- Focused 8/8, related 107/107, full 807/807 across 112 suites, typecheck/build/determinism/review/KMS PASS.
- Provider output and Production remain NOT_RUN.

## Latest: love_mind corpus 2.1.0 candidate (2026-09-13)

- Relationship observation, mind-inference, refusal and safety review 1/1 PASS.
- Focused 8/8, related 88/88, full 783/783 across 109 suites, typecheck/build/determinism/review PASS.
- Provider output and Production remain NOT_RUN.

## Latest: work_job corpus 2.1.0 candidate (2026-09-13)

- Semantic review 1/1, snapshot-pinned retrieval/prompt/saved-review and hash fail-closed PASS.
- Focused 8/8, related 100/100, full 775/775 across 108 suites, typecheck/build/deterministic builder/review PASS.
- Provider output, Production, customer data, commit, push and deploy remain NOT_RUN.

## Latest: saju_master corpus 2.1.0 candidate (2026-09-13)

- Semantic review 1/1, snapshot-pinned retrieval/prompt/saved-review and hash fail-closed PASS.
- Focused 8/8, related 98/98, full 767/767 across 107 suites, typecheck/build/deterministic builder/review/KMS PASS.
- Provider output, Production, customer data, commit, push and deploy remain NOT_RUN.

## Latest: pass_angle 다음 판단 기준 판별 (2026-09-12)

- 실제 원고의 `다음 시험 전날 오답 루틴으로 다시 세워봐`를 놓치던 원인은 모델이 아니라 `nextCriterion` 동사 목록이었다. 미래·순서 표지와 조사로 표시된 대상을 동반한 `고정·세워·정해·매겨` 계열만 좁게 추가했다.
- 독립 리뷰에서 발견한 `시험을 버려`, `공부를 끊어` 오탐은 새 분기에서 폐기·중단 동사를 제거하고 반례 테스트로 차단했다. 원본 퍼소나의 `버릴 공부를 정해`, `남길 공부 순서를 매겨`는 정상 사례로 고정했다.
- 이전 저장 원문을 그대로 재평가하면 직접 답·근거·장면·다음 기준 4요소가 모두 PASS한다. 신규 합성 실제 모델 출력의 두 번째 시도도 nextCriterion PASS이며, 실제 인식 문장은 `오늘 비교할 건 새 문제 양과 틀린 유형 반복이야.`다.
- 신규 항목 전체는 별도 grounding 판별에서 실패했으므로 완료로 주장하지 않는다. ZIP-003-041도 20개 서비스 전량 의미 검수 전까지 IN_PROGRESS다.
- 검증: RED 재현, focused 56/56, compiler/task 7/7, 전체 회귀 671/671, raw+prose SHA-256 6/6, typecheck, Vercel build, diff check PASS.
- 운영 고객 데이터·DB·Production·배포 변경 없음. 독립 수정 후 재리뷰는 NOT_RUN이다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-next-criterion-20260912.md` put/get/search PASS. 서버 reindex는 NOT_RUN이다.

## Latest: P01 실제 재시도 교정 안내 (2026-09-12)

- 거부 사유를 한 문장으로 합치던 재시도 프롬프트를 중복 제거된 번호 목록과 구체적인 재작성 규칙으로 바꿨다. 매 재시도마다 문장당 한자 설명 하나, 빈 줄 문단당 완성 문장 2~4개를 다시 명시하며 거부 원문은 프롬프트에 복사하지 않는다.
- 사용자 수동 재시도의 첫 모델 호출도 최신 실패 사유를 이어받는다. 독립 리뷰에서 발견한 누락 경로를 수정하고 회귀 테스트로 고정했다.
- 합성 입력 기반 실제 `gpt-5.5-2026-04-23` 최종 재시도에서 전문용어 형식 3/3, 복수 한자 설명 방지 3/3, 문단 문장 수 3/3 PASS다. 전체 항목 완료는 2/3이며 `pass_angle`은 별도 다음 판단 기준 게이트에서 실패했다.
- 최종 검증: focused 55/55, compiler/task 7/7, 전체 회귀 670/670, 추적 raw+prose SHA-256 12/12, typecheck, Vercel build, diff check PASS.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-live-repair-guidance-20260912.md` put/get/search PASS. 서버 reindex와 수정 후 독립 재리뷰는 NOT_RUN이다.
- 운영 고객 데이터·DB·Production은 사용하거나 변경하지 않았다. 20개 서비스 전량 실제 출력 승인, 커밋·push·배포는 NOT_RUN이다.

## Latest: P01 첫머리·내부 필드 실제 출력 평가 (2026-09-12)

- 합성 입력 전용 격리 생성으로 격식체 `saju_master`, 해요체 `love_mind`, 반말체 `pass_angle`을 각 2회, 총 6개 `gpt-5.5-2026-04-23` 응답으로 판독했다.
- ZIP-003-008 직접 답변은 6/6, ZIP-003-009 제작 안내형 첫머리 미발생은 6/6, ZIP-003-032 내부 필드 미노출은 6/6 PASS다. 다만 20개 서비스 전량 실제 출력 승인이 남아 있어 세 review unit 상태는 `IN_PROGRESS`를 유지한다.
- 전체 생성은 0/6 완료다. 한자 설명, 문단 밀도, 안전 경계 등 다른 검수에서 거부됐으므로 전체 출력·P01·releaseReady는 계속 IN_PROGRESS다.
- 실제 응답 전문은 ignored 격리 캐시에만 둔다. 추적 산출물에는 원문·prose SHA-256, 첫 3개 가시 문장, 모델·토큰·종료 사유, 규칙별 결정적 스캔과 범위 밖 실패를 남겼다: `evaluations/P01-opening-internal-live-20260912.json`. 저장 해시 재계산은 6/6 PASS다.
- 운영 DB·고객 데이터·결제·인증·Production은 사용하거나 변경하지 않았다. 20개 서비스 전량 실제 출력 평가는 NOT_RUN이다.
- 독립 리뷰의 Critical은 0건, Major 1건은 위의 지속 가능한 추적 증거로 반영했다. Antigravity 조사와 Claude fallback은 결과를 만들지 못해 `NOT_RUN (degraded)`이다.
- 최종 검증: focused 29/29 및 37/37, compiler/task 7/7, regenerated task-index 3/3, 전체 회귀 668/668, typecheck, Vercel build, diff check PASS.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-opening-live-evaluation-20260912.md` put/get/search PASS. 서버 reindex는 NOT_RUN이다.

## Latest: P01 readability and mobile report-card gate (2026-09-12)

- ZIP-003-100~102 revision-note audit complete: the note marker and ambiguity explanation are REFERENCE/PASS; the binding punctuation discriminator is ACTIVE/PASS with hook and rendered-label counterexamples. No new runtime code was needed. Focused generation/frontend 73/73, regenerated task-index 3/3, and diff check PASS; CreamWIKI put/get/exact-title search PASS.
- ZIP-003-092 is REFERENCE/PASS. ZIP-003-093~099 now have prompt/review/shared-reader lower-bound implementations and remain IN_PROGRESS pending live Korean proofreading, all-service CTA inventory, and specialized-renderer visual acceptance.
- New interpretation prose requires 2–4 complete sentences per semantic paragraph and rejects four-or-more slash-packed terms; Markdown headings and table-only blocks remain labels/data. Generated hooks require terminal punctuation.
- The shared saved-report reader renders `한 줄 답`, `근거`, and `행동`; one-paragraph legacy records use truthful `근거와 행동`, and exact duplicated hook prefixes are removed. Generic preview/pager labels now name the result.
- RED 5 failures reproduced. Focused frontend 44/44 and persistence 8/8 PASS; compiler/task 7/7 PASS; full regression 667/667 PASS; typecheck, Vercel build, and diff check PASS. The first full run exposed only an old five-sentence test fixture, which was updated to the new contract without weakening production validation.
- Local reader shell loaded with meaningful content. Styled synthetic private-result inspection was blocked by browser URL policy and remains NOT_RUN; no workaround was attempted.
- CreamWIKI put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-readable-report-cards-20260912.md`. The first short-path get returned 404; retry with the returned full personal path passed. Server-side reindex remains NOT_RUN because this client has no reindex command.
- Not done: live provider/human semantic review, semantic-block visual acceptance, all specialized renderers/CTAs, corpus/RAG replacement, release attachment, commit/push/deployment, database writes, or Production mutation.

## Latest: P01 teaser trust gate (2026-09-12)

- ZIP-003-077~084 now have a saved-teaser review: a one-line verdict must come from the deterministic report/context source, representative grounds are limited to one or two, a recognizable scene is required, and paid scope must identify concrete comparison or judgment content.
- The free preview is assembled from `params.templateReport` before paid sections are redacted. The stored pending report still clears hooks, interpretations, and storytelling, so the fix restores evidence-based teasers without unlocking paid paragraphs.
- Unsafe operations copy, fake locked-content quotations, fear/loss pressure, and certain-event sales claims now fail closed during new preview assembly and saved-preview reads. New-year timing is expressed through an everyday scheduling scene; wedding keeps its non-fortune boundary while showing at most two grounds.
- Verification: multiple RED cycles reproduced missing export, a scene-fixture error, the 15-flow pending-report failure, the wedding boundary regression, and the old-preview read-path gap. Final §9 prompt 1/1, teaser review 3/3, related integration 69/69, compiler/task 7/7, regenerated task index 3/3, full regression 657/657, typecheck, Vercel build, and diff check PASS.
- CreamWIKI search-first found only general evidence-gate guidance, not a specific teaser implementation. Put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-teaser-trust-gate-20260912.md`; server-side reindex remains NOT_RUN because this client has no reindex command.
- Not done: semantic/live review across all 20 services, old-record structural migration, corpus/RAG replacement, release attachment, commit/push/deployment, database writes, or Production mutation.

## Latest: P01 score and visual evidence gate (2026-09-12)

- ZIP-003-071~076 now have a generated-copy gate for server-evidenced scores, dates, and graph values. It reuses the existing `numericEvidence` set instead of introducing another calculator.
- Interpretation scores are limited to fit/attention/priority framing and require a calculation axis plus explicit high/low meaning. Event-probability wording, comparison scores without a real comparison target, decorative charts, unsupported sparkline shapes, and table/chart numeric duplication fail review.
- ZIP-003-071 is REFERENCE/PASS. ZIP-003-072~076 remain IN_PROGRESS because regex checks cannot prove editorial usefulness, axis correctness, or semantic visual duplication in live structured output.
- Verification: initial RED failed on the missing `reviewScoreVisuals` export; a first GREEN attempt exposed and fixed a test-fixture wiring error; final §8 focused 3/3, generation/persistence/persona 32/32, compiler/task 7/7, regenerated task index 3/3, full regression 653/653, typecheck, Vercel build, and diff check PASS.
- CreamWIKI search-first found related evidence/numeric guidance but no specific implementation. Put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-score-visual-evidence-gate-20260912.md`; server-side reindex remains NOT_RUN because this client has no reindex command.
- Not done: live provider and structured visual evaluation across 20 services, corpus/RAG replacement, release attachment, commit/push/deployment, database writes, or Production mutation.

## Latest: P01 technical-term boundary gate (2026-09-12)

- ZIP-003-066~070 now have a report-ordered terminology review: completed prior sections → current hook → current body. First use of the six §7 terms requires `한글(한자, 쉬운 뜻)`; later Korean-only use is allowed.
- A sentence with multiple Hanja groups or nested parentheses fails. Count-only 오행→용신 reasoning, 신강·신약→human-trait grading, and 합·충→certain reunion/separation events fail.
- A review-found false positive was reproduced and fixed: the single-syllable terms 합/충 no longer match ordinary words such as 합격/충분.
- Verification: two RED cycles (missing export, then 합격/충분 false positive); focused §7 3/3 and generation/persistence/persona 29/29; compiler/task 7/7; regenerated task index 3/3; full regression 650/650; typecheck, Vercel build, and diff check PASS.
- CreamWIKI put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-technical-terms-gate-20260912.md`; server-side reindex is unavailable from this client and remains NOT_RUN. Search-first found only general language/QA guidance, not a specific prior implementation.
- Not done: live provider output evaluation, easy-definition factual grading across all 20 services, corpus/RAG replacement, release attachment, commit/push/deployment, or Production mutation.

## Latest: P01 voice and character gate (2026-09-12)

- ZIP-003-054~055 and 058~061 now have executable service-voice, ending-rhythm, nominal-verdict, invented-character-lore, and hostile-theatrical-fun review contracts.
- Latest persona decisions take precedence over older source history: 하게체 is rejected everywhere; formal voice belongs to `saju_master` and `job_choice`; `today_fortune` and `pass_angle` use informal voice; the other 16 use 해요체. ZIP-003-056~057 and 064 are recorded `SUPERSEDED`, not silently deleted.
- Three or more spoken sentences with one identical ending fail; two-sentence copy remains allowed. A nominal verdict has no spoken ending and does not create a false voice failure.
- Invented narrator age/origin/career/qualification/superpower/past and degradation, baby talk, shaman staging, or mind-reading fail. An observable small life metaphor remains allowed.
- Verification: focused RED exposed two missing gates; GREEN generation 16/16 and persistence/persona 10/10; compiler/task 7/7; regenerated task index 3/3; full regression 647/647; typecheck, Vercel build, and diff check PASS.
- CreamWIKI put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-voice-character-gate-20260912.md`; server-side reindex is unavailable from this client and remains NOT_RUN.
- Not done: live provider output evaluation, all-20-service semantic voice review, corpus/RAG replacement, release attachment, commit/push/deployment, or Production mutation.

## Latest: P01 section uniqueness gate (2026-09-12)

- ZIP-003-048~052 now have a post-generation uniqueness gate. It rejects a reused completed-sibling hook, two or more near-duplicate long paragraphs, named production headings, and question-anchor-free copy containing multiple generic prose signals.
- Near-duplicate paragraphs use normalized character 3-gram Dice similarity at 0.86. One shared long paragraph is deliberately allowed to avoid rejecting unavoidable common background evidence.
- ZIP-003-047 is REFERENCE/PASS. ACTIVE tasks remain IN_PROGRESS because lexical similarity cannot prove semantic uniqueness or natural scene-heading quality.
- Verification: initial RED failed on the missing export; GREEN generation 13/13 and persistence 8/8; compiler/task 7/7; regenerated task index 3/3; full regression 644/644; typecheck, Vercel build, and diff check PASS.
- CreamWIKI put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-section-uniqueness-gate-20260912.md`; server-side reindex commands are unavailable from this client and remain NOT_RUN.
- Not done: live provider output evaluation, unlabeled semantic-duplicate grading across complete 70-section reports, corpus/RAG replacement, release attachment, deployment, or Production mutation.

## Latest: P01 paid interpretation density gate (2026-09-12)

- ZIP-003-037~042 and 044~045 now have a post-generation minimum-density gate: standalone direct-answer hook, personal evidence or decision condition, recognizable daily-life scene, and a next maintain/compare/talk/act criterion are all required before a section can complete.
- Repeated explicit editorial frames are compared with completed sibling sections. Calm or satisfied input rejects fabricated hidden-crisis reversals. The generation instruction carries the same constraints.
- ZIP-003-036, 043 and 046 are REFERENCE/PASS. ACTIVE tasks remain IN_PROGRESS because regex signals do not prove semantic correctness, usefulness, or unlabeled whole-report diversity.
- Verification: initial focused RED failed on the missing export; GREEN generation 11/11 and persistence integration PASS; compiler/task 7/7; regenerated task index 3/3; full regression 642/642; typecheck, Vercel build, and diff check PASS.
- Not done: live provider output evaluation, 70-section whole-report semantic diversity review, corpus/RAG replacement, release attachment, deployment, or Production mutation.

## Latest: P01 service RAG and corpus-copy boundary (2026-09-12)

- Fixed a real routing defect: `wedding_day` had an active dedicated corpus pack but was absent from the separate hard-coded service-domain map. All 20 service packs now declare `serviceKey` in the registry, which is the runtime routing source of truth.
- All 20 services now place their dedicated corpus domain within the first two retrieved chunks in the deterministic test fixture.
- Generated hook/body review now receives the actual retrieved chunks and rejects normalized verbatim source sentences of 18+ characters. Semantic rewrites remain allowed.
- Bare targetless actions such as `확인해요.` fail review; the prompt requires an explicit object. Missing material must produce current observable decision conditions instead of fictional facts.
- Verification: RED 39/42 with three expected failures; GREEN focused 93/93; compiler/task 7/7; full regression 640/640; typecheck, Vercel build, and diff check PASS.
- Not done: live provider output evaluation, semantic similarity grading, corpus content replacement, release attachment, deployment, or Production mutation.

## Latest: P01 evidence-layer boundary (2026-09-12)

- ZIP-003-011 and ZIP-003-013~017 now have an executable prompt contract: user-stated facts, verified server calculations, traditional interpretation candidates, and fictional-example policy are separate `evidenceLayers` instead of ambiguous root `birth/context/featureJson/rag` fields.
- The generator passes section order and only completed prior sections, while instructing the model not to repeat birth data, address, concern, or choices in every section. Unknown partner birth time and partner privacy sanitization remain intact.
- Traditional symbols cannot be presented as observed facts or calculations. Fictional scenes must be introduced with `예를 들어` or `만약`. Internal evidence-layer names are rejected from customer copy.
- ZIP-003-012 is a heading-only REFERENCE and is PASS. All ACTIVE tasks remain IN_PROGRESS until actual model output receives sentence-level provenance review.
- Verification: initial RED 6/7 with the legacy prompt shape failing; final focused 58/58; compiler/task coverage 7/7; regenerated task index 3/3; full regression 637/637; typecheck, Vercel build, and diff check PASS.
- Not done: live OpenAI generation/evaluation, semantic corpus replacement, complete RAG routing/replacement, UI/print QA, commit/push/deployment/Production attachment.

## Latest: P01 persona contract and opening/internal-field gate (2026-09-12)

- Root cause: the supplied persona guide describes the old empty-field failure and then specifies all 20 services, but runtime exposed the name only inside `fields['이름(초안)']`; no explicit display-name or definition-state contract existed. The isolated fork also remains `releaseReady:false`, so none of this is attached to Production yet.
- Compiler/runtime: all 20 personas now expose `displayName`, `definitionStatus=specified`, and `displayNameStatus=draft`. Runtime fails closed unless the registry has exactly 20 entries, all 13 required fields, lexicon data, and an explicit rhythm value or null. The three Yeonseo services intentionally share one character ID while keeping service-local modes.
- ZIP-003-008 remains IN_PROGRESS: the visible hook is now required to be a standalone direct answer and the first 2–3 visible sentences must answer the section question. Semantic live-output grading is still required.
- ZIP-003-009/032 remain IN_PROGRESS: expanded deterministic rejection covers report/based-on/provided-info authoring openings and reportFeatures/scoring/debug/metadata/payload/outputShape/tokenUsage/ragTopK/internal prompt vocabulary.
- Verification: RED 6/8 PASS and 2 FAIL before implementation; GREEN 8/8; focused persistence/generation/persona 16/16; compiler+task coverage 7/7; regenerated task index 3/3; full regression 636/636; typecheck and Vercel build PASS.
- Not done: live OpenAI output grading, final naming approval, corpus semantic replacement, full prompt/evaluation/release work, UI/print QA, commit/push/deployment/production attachment.

## Latest: P01 certainty and private-fact gate (2026-09-12)

- Implemented first deterministic gates for ZIP common §1 and §2: generated prose now fails review when it states future events, another person's mind, or private facts about company, family, home, region, disease, or cat behavior as confirmed facts without an input basis or conditional framing.
- Connected tasks: ZIP-003-010 and ZIP-003-018. Status remains IN_PROGRESS because live semantic output review is not complete.
- Code: `src/report/tone-v2-review.ts` now applies `certaintyIssues` inside `reviewToneCopy()` and adds the same prohibition to `toneWritingInstruction()`.
- Counterexamples covered: `상대는 이미 마음이 떠났어요.`, `올해 결혼해요.`, `회사는 곧 구조조정해요.`, and `고양이가 외로워서 문제 행동을 해요.` fail; conditional or observation-based alternatives pass.
- Verification: `tests/unit/tone-v2-generation.test.ts` 6/6 PASS, focused generation+persistence 14/14 PASS, compiler/task coverage 7/7 PASS, `node --test tone-v2/task-index.test.mjs` 3/3 PASS after regeneration, `npm run typecheck` PASS, `npm run vercel-build` PASS, `git diff --check` PASS with CRLF warnings only, full regression 636/636 PASS in `latest-regression.log`.
- Not done: live OpenAI output grading, full 1,500 review-unit acceptance, UI/print visual QA, production attachment.

## Latest: P01 numeric prescription and arithmetic gate (2026-09-12)

- Implemented first deterministic gates for ZIP common §2-1: unsupported prescription numbers in generated hook/interpretation now fail review when the same number+unit is not present in the birth input, public context, server calculation features, or current section title/question. Add/subtract equations now require grounded operands, matching units, and a correct result.
- Connected tasks: ZIP-003-022, ZIP-003-023, ZIP-003-024, ZIP-003-025, ZIP-003-028. Status remains IN_PROGRESS because live semantic output review is not complete.
- Code: `src/report/tone-v2-review.ts` now exports `numericEvidenceFrom`, checks add/subtract arithmetic, and checks unsupported prescription numbers. `src/report/report-generator.ts` passes numeric evidence into post-generation review.
- Counterexamples covered: unsupported `30cm`/`15분` prescriptions fail; entered `58점` and measured `30cm` can pass when present in evidence; fabricated `60점` fails; `320만원 - 210만원 = 110만원` passes, while wrong result, missing operand, and mixed-unit equations fail.
- Verification: `tests/unit/tone-v2-generation.test.ts` 5/5 PASS, focused generation+persistence 13/13 PASS, compiler/task coverage 7/7 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS, `git diff --check` PASS with CRLF warnings only, full regression 635/635 PASS in `latest-regression.log`.
- Not done: live OpenAI output grading, full 1,500 review-unit acceptance, UI/print visual QA, production attachment.

## Latest: ZIP-first task audit (2026-09-12)

- User authorized missing-material supplementation based on ZIP patterns, existing outline baseline, and existing API credential reuse. No live API call or deployment performed in this task slice.
- Archive/extracted SHA-256 comparison: 82/82 PASS, unexpected files 0. `source-verification.json`.
- File backlog: 82 tasks (8 policy/readme, 13 tools, 20 prompts, 20 short samples, 21 long sample parts). All nonblank policy/readme lines preserved in 1,500 review units. These are NOT 1,500 binding rules or accepted implementations.
- P00 source/task coverage: 3 tests PASS. P01 precedence decisions recorded in `decisions.md`; remaining clause review pending.
- Compiler: multiline persona continuation preserved; service-specific lexical and rhythm tables separated; non-conflicting common section 6 requirements restored. Compiler/task coverage rerun PASS.
- Persistence: new pending paid-report prose/hooks/storytelling/quality are cleared, prior complete records preserved. Sequential generation blocks later items until earlier ones pass, including after failure.
- Regression found: daily rule-based result was empty after pending-copy removal. Fixed explicit calculated-body assignment before completion; daily+persistence 11/11 PASS.
- Full regression before the numeric gate: 633 tests, 100 suites, 633 PASS, 0 FAIL (134.5 seconds). Latest regression is recorded above.
- P01 common 1~3 first review recorded. Authoring-opening and bare internal-field counterexamples now rejected; quote and normal Korean-word fixtures pass. Traceable work-in-progress is in `task-progress.json` and survives task-index regeneration.
- No claim of full migration, teaser migration, live interpretation QA or production readiness. KMS save/get/search verified at `personal/carrotcap/notes/umsh-zip-task-audit-20260912.md`.


2026-09-12

- TV01 compiler: 82 source files retained, SHA-256 inventory, 158 heading references, 20 personas with 13 fields and 18 character identities. Three compiler tests PASS. Heading inventory is not a clause-by-clause acceptance audit.
- TV02 runtime: independent bundle used by conversation/report system prompts; unknown services fail without legacy fallback. Seventeen focused tests PASS; typecheck PASS before subsequent changes, rerun required at closure.
- Review corrections: removed internal reference-character section from runtime policy; preserved fenced lexical prohibitions; resolved 30% to latest 50%; adapted old-voice tests to the user's new formal voice; retained verified wedding/year/home calculation boundaries.
- Original workspace remains untouched. Clone starts at committed HEAD; original dirty integration metadata and unrelated untracked operational records are preserved in original, not imported as new runtime state.
- Missing local skill references: test-driven-development, prd-screen-planning master reference, prd-to-code. Available planning/coding/verification guidance applied; no claim of running missing skills.
- TV03 corpus static audit: 28 packs, 234 knowledge blocks, 28 review candidates. Semantic review and corpus replacement remain pending.
- TV04 full generation: pending. Existing templates and copy normalization still use old behavior; connecting the system prompt alone does not complete migration.
- TV05 visual/print/integration: NOT_RUN. Original outlines, character map and external qa-check.js are not in ZIP. Desktop search found a separate quit_fortune outline, provenance/compatibility not yet verified.
- Deployment: not performed; releaseReady=false.

## Latest: marry_match corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new report snapshots.
- All 20 blocks passed input/calculation/symbol/hypothetical-example, autonomy and safety review; stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review.
- Verification: focused 8/8, related 74/74, full 751/751 across 105 suites, typecheck, Vercel build, deterministic builder, credential boundary, closure review, ProjectOps and CreamWIKI PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN.

## Latest: love_spouse corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- The block separates user-stated preferences and observed behavior from future-spouse identity, attributes, timing, feelings and outcomes; autonomy and safety signals override symbolic interpretation.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- Verification: focused 8/8, related 88/88, full 799/799 across 111 suites, typecheck, Vercel build, deterministic builder and closure review PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN.

## Latest verification

- P01 adjacent nextCriterion recognition (2026-09-12): a current/future plan-setting sentence may connect only to its immediately following concrete, particle-marked safe action. Same-sentence and adjacent candidates share target, negation, past/perfect, and abandonment guards. Saved fresh attempt 2 re-evaluates density 4/4 PASS without rewriting the historical `failed` record. Focused 33/33, related 60/60, compiler/task 7/7, full 675/675 (101 suites), typecheck, Vercel build, replay and diff check PASS. Independent approval review: Critical/Major/Minor 0. All-service live acceptance and Production remain pending.

- P01 representative `pass_angle` E2E (2026-09-12): a fresh synthetic run reached the real provider and existing two-attempt retry path, but persisted `failed`. Attempt 1 passed direct answer, grounding and scene but missed the next criterion; attempt 2 passed direct answer, grounding and next criterion but the deterministic scene check rejected its `다음 복기에서` review setting. Acceptance is FAIL, not release evidence. Review hardened the synthetic harness so only the approved OpenAI credential/model selectors survive environment isolation and attempt models are replayed automatically. Focused 58/58, compiler/task 7/7, full 673/673, typecheck, Vercel build and diff check PASS. No production code or Production state changed.

- P01 common §10 safety gate: context-aware post-generation review covers certain human outcomes, symbolic authority, explicit relationship boundaries, professional-judgment substitution, guardian-chart pet causation, and unmeasured feng-shui claims. Active clauses remain IN_PROGRESS pending live semantic/professional evaluation.
- Latest full regression: 662 tests, 100 suites, 662 PASS, 0 FAIL (116.5 seconds). Focused related regression 58/58 PASS; compiler/task 7/7 PASS; task-index 3/3 PASS.
- Typecheck PASS; vercel-build PASS; git diff --check PASS. Direct `npx vercel build` was BLOCKED because the isolated fork intentionally has no `.vercel` project link; no link or remote mutation was created.
- KMS put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-safety-claims-gate-20260912.md`; server reindex NOT_RUN.
- Full regression rerun: 627 tests, 100 suites, 627 PASS, 0 FAIL (107.8 seconds). The earlier run failed on superseded voice assertions and a missing wedding boundary; both were corrected and verified.
- Compiler: 3 PASS. Focused runtime/conversation: 17 PASS. Sequential batch primitive: 3 PASS. Wedding regression: 3 PASS.
- Typecheck PASS; vercel-build PASS; git diff --check PASS.
- Batch primitive is not connected to provider/persistence/UI. No claim of full generated-report acceptance.
- Release check emits NOT READY as intended. No production deployment or completed-report rewrite.
- KMS save/get/search PASS.
- Original workspace received concurrent admin changes from other work; none were reverted or copied into this fork.
- Additional Documents/Downloads/projects/OneDrive search found no referenced outline directory, character map or qa-check.js. Referenced C:/dev/cream/umsh does not exist here.

## Task 완료 브리핑

- [x] Project context, source requirements, plan, available skills
- [x] Compiler and runtime prompt implementation
- [x] Focused tests and code review
- [x] Status and reusable knowledge candidate
- [ ] Full 20-service behavior and visual acceptance
- [ ] Production attachment

## Admin source visibility — 2026-09-12

- `/admin/corpus` now reads the active Tone V2 corpus registry and displays every real pack path, version, role, service mapping, and content hash.
- `/admin/prompts` now reads the generated Tone V2 manifest, common prompt metadata, ten source/guide artifacts, and all 20 specified persona/service files.
- Raw prompt bodies are not returned to the browser. `releaseReady=false` is shown as review in progress rather than falsely released.
- Focused 84/84, full regression 668/668, typecheck and Vercel build PASS. CreamWIKI put/get/search PASS at `personal/carrotcap/notes/umsh-admin-tone-v2-source-visibility-20260912.md`; server reindex NOT_RUN. Production remains unchanged until an approved commit/deploy task.

## P01 context grounding recognition — 2026-09-12

- Lexical grounding remains intact; an additive same-fact user-context overlap check fixes the captured `연습 점수/목표 수준` false negative.
- Explicit user-input paths only. No cross-field accumulation; name, savedChat, wedding/newyear, terrain evidence, and partner calculations are excluded.
- Unchanged captured synthetic attempt re-evaluates density 4/4 PASS. Historical stored section status remains failed.
- Focused 57/57, compiler/task 7/7, full regression 672/672, typecheck, Vercel build and diff check PASS. All-service semantic acceptance remains pending.

## P01 review-session scene recognition — 2026-09-12

- The scene gate now recognizes `복기`, `오답 노트`, and `마킹 검토` only when a bounded review setting is paired with an affirmative observable action.
- Generic encouragement, action-only `문제...하면/에서`, noun-only action labels, and negated actions remain rejected; existing ordinary and explicitly fictional scene routes remain.
- The immutable `pass_angle` provider attempt re-evaluates density 4/4 PASS, while its historical saved status remains `failed`. This is not a fresh persisted E2E pass.
- Focused related 59/59, compiler/task 7/7, full regression 674/674, typecheck, Vercel build and diff check PASS. Fresh provider and all-service acceptance remain pending.

## P01 pass_angle fresh E2E rerun — 2026-09-12

- A unique version was confirmed `not-generated`, then one synthetic `pass_angle` section reached the real provider and existing two-attempt persistence path.
- Both fresh attempts passed the repaired scene element. Attempt 2 failed only nextCriterion; attempt 1 also failed the 2-4-sentence paragraph rule. The saved report remains `failed`, so business acceptance is FAIL.
- Record, report/result ids, attempt ids, model, token usage, raw/prose hashes, and zero public rejected-copy lengths replay consistently. Full raw prose remains only in ignored isolated storage.
- Focused 59/59, compiler/task 7/7, full regression 674/674, typecheck, Vercel build, saved replay, and diff check PASS. All-service and release acceptance remain pending; Production is unchanged.

## P04 pass_angle one-section completion E2E — 2026-09-12

- A unique synthetic version was `not-generated` before the provider call. The first attempt failed nextCriterion and the existing repair retry produced a second attempt that passed the complete deterministic review and density 4/4.
- The new report and section persisted `complete` with a non-empty public hook/body. Saved record SHA-256 and replay match.
- The harness now rejects reused versions with `--fresh` and production generation/replay share one complete review function.
- Focused 35/35, related 61/61, compiler/task 7/7, full 676/676, typecheck, Vercel build and diff check PASS. Independent rereview resolved both Majors; no Critical/Major/Minor remains.
- P04 remains IN_PROGRESS because the full ordered `pass_angle` outline, the other 19 services, and Production attachment are not complete.

## Latest: today_fortune corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- The one block passed input/calculation/symbol/hypothetical-example and event/outcome safety review; stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review.
- Verification: focused 8/8, related 82/82, full 759/759 across 106 suites, typecheck, Vercel build, deterministic builder, credential boundary, closure review and ProjectOps PASS.
- The deterministic daily renderer was unchanged. Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN.

## Latest: love_again corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- The block separates confirmed breakup/contact facts from longing, consent and reunion intent; explicit refusal, contact-stop requests and danger signals override symbolic interpretation.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- Verification: focused 8/8, related 88/88, full 791/791 across 110 suites, typecheck, Vercel build, deterministic builder, credential boundary, closure review and ProjectOps PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN.
## Latest: couple_signal corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- All 12 blocks separate confirmed relationship facts, calculated values, symbolic questions, unknown partner state and labeled hypothetical examples; consent, privacy and danger boundaries override contact advice.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- Verification: focused 8/8, related 147/147, full 839/839 across 116 suites, typecheck, Vercel build, deterministic builder and closure review PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN. Remote CreamWIKI remains BLOCKED pending CLI authentication.

## Latest: wedding_day corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- All six blocks separate submitted candidate dates, server-calculated relations, confirmed constraints, missing partner/time data, unknown future and labeled hypothetical examples.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- Verification: focused 8/8, related 232/232, full 863/863 across 119 suites, typecheck, Vercel build, deterministic builder and closure review PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN. Remote CreamWIKI remains BLOCKED pending CLI authentication.

## Latest: newyear_flow corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- All ten blocks and retrieval topics separate server-calculated cycles, symbolic questions, confirmed user context, unknown future and labeled hypothetical examples; no invented future event, outcome or personal state remains.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- Verification: focused 8/8, related 218/218, full 855/855 across 118 suites, typecheck, Vercel build, deterministic builder and closure review PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN. Remote CreamWIKI remains BLOCKED pending CLI authentication.

## Latest: lucky_color corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- All 24 blocks separate calculations, symbolic correspondences, confirmed user context, unknown reality and labeled hypothetical examples; they make no efficacy, health, sleep, concentration, mood, financial or outcome claim.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- Verification: focused 8/8, related 147/147, full 847/847 across 117 suites, typecheck, Vercel build, deterministic builder and closure review PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN. Remote CreamWIKI remains BLOCKED pending CLI authentication.
## Latest: job_choice corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- All 12 blocks separate confirmed offer documents, server calculations, user reality, unknown company conditions, employer intent and symbolic comparison viewpoints; unsupported facts, outcomes and numeric prescriptions are excluded.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- Verification: focused 8/8, related 217/217, full 871/871 across 120 suites, typecheck, Vercel build, deterministic builder and closure review PASS.
- Provider-output evaluation, customer-data mutation, Production, deployment, commit and push were NOT_RUN. Remote CreamWIKI remains BLOCKED pending CLI authentication.
## Latest: love_this_year corpus/RAG release candidate (2026-09-13)

- Preserved the original 2.0.0 pack and activated a separately reviewed 2.1.0 pack for new RAG snapshots.
- All 10 blocks separate confirmed relationship facts, server calculations, symbolic questions, unknown partner/future reality, privacy, consent and safety; invented events, minds, outcomes and numeric prescriptions are excluded.
- Stored 2.0.0 snapshots remain isolated through retrieval, prompts and saved-attempt review, and hash mismatch fails closed.
- The dedicated analyze route remains unchanged and the generic analyze fallback remains blocked.
- Verification: focused 9/9, related 238/238, full 880/880 across 121 suites, typecheck, Vercel build, deterministic builder and closure review PASS.
- All 20 service-specific registry packs now resolve to 2.1.0. Aggregate release acceptance, provider-output evaluation, Production, deployment, commit and push remain NOT_RUN.

## Latest: all-service corpus release evaluation (2026-09-13)

- Built a deterministic aggregate candidate from all 20 actual 2.1.0 corpus releases, semantic reviews, prompt/persona sources and 2.0.0 rollback files.
- Corpus integrity is 20/20 and every review is approved with no sample-output ingestion; stored snapshots and registry-only rollback remain explicit.
- Complete release decision is `NO_GO`: verified provider prose 0/20, attached full-outline independent review 1/20, aggregate HTML/image/render/mobile/print evidence 0/20, Production attachment not attempted.
- Verification: focused 7/7, related 279/279, full 887/887 across 122 suites, typecheck/build/deterministic replay PASS.
- Next inactive Task is `task-tone-v2-p04-lucky-color-full-outline-evidence`; no provider call starts before a new user `다음`.

## Latest: pass_angle visual render evidence (2026-09-13)

- The immutable 52/52 corpus-2.1.0 result passed desktop, exact 390px mobile and complete-print verification through the real saved-result reader.
- Current-run defects in rendered target size and print-introduction contrast were fixed and regression-tested.
- The accepted 28-page print contains all 52 titles and one-line answers, no blank pages and no fixed chrome.
- Sanitized evidence is attached to the reversible Pass Angle candidate; aggregate visual coverage is 5/20 and the complete release remains `NO_GO`.
- Full repository 934/934, typecheck, Vercel build and deterministic rebuild PASS. Production, customer data, deployment, commit and push were NOT_RUN.

## Latest: today_fortune deterministic full-outline evidence (2026-09-13)

- One real isolated saved `daily-rules-v3` result passed 7/7 customer fields and immutable same-KST-day replay.
- All five relation branches and twelve zodiac branches passed; the deterministic copy now follows the final no-address informal persona.
- Sanitized evidence is attached without an LLM call. Provider-output provenance is 5/19, full-outline independent review is 6/20, visual evidence is 5/20 and the release remains `NO_GO`.
- Full repository 936/936, typecheck, Vercel build and deterministic rebuild PASS. Production, customer data, Supabase, deployment, commit and push were NOT_RUN.
