# Status

## Current Task

- 2026-09-20 연동 안전 복구 완료: 기존 미커밋 기록을 `codex/backup-pre-sync-20260920`/`0a4e4c3`에 보존하고 로컬 `main`을 `origin/main` `69d36fc`로 fast-forward했다. 깨진 legacy `upstream`은 보존하되 기본 fetch에서 제외해 `git fetch --all`을 복구했다. 승인된 서비스 목차 축소 뒤 남은 CI 가드·고객 안내·JSON-LD·묶음 칩을 11개 서비스의 실제 범위에 맞추고 회귀 테스트를 추가했다. 전체 1,474 테스트와 CI-equivalent 검증, 운영 연동 10/10, Vercel Production Ready를 확인했다. Supabase 원격 전용 migration 11개를 원격 history SQL로 복원하고 타임스탬프 오기 2개를 맞춰 원격 전용은 0이 됐다. 로컬 전용 8개는 운영 스키마에 객체가 모두 존재하지만 history에 없으며, 원격 `migration repair`는 §6 H2/TASK-004 G1~G5에 따라 미실행이다. 상세: `CreamAI/reports/integration-recovery-20260920.md`.

- 2026-09-17 06-1 디자인 부착: 천명사주·직업운·상대방 마음·재회운·배우자운. 디자인 폴더에 전용 패키지는 없어 연애 계열은 `나 올해 연애기` 06-1 구조, 직업운은 직장/퇴사 계열, 천명사주는 골드 히어로로 붙이고 `reportPath`와 라우트를 연결했다.

- 2026-09-17 소비성향 05: 가이드 이미지 위 히어로·통계·권한카드·정적 목차를 숨기고, 이미지 아래에 검증 본문 슬롯(`data-umsh-slot=sections`)을 두어 항목을 같은 화면에서 토글로 연다. 아래쪽에 같은 목차가 한 번 더 그려지던 중복을 없앤다.

- 2026-09-17 결제 완료 CTA: `풀이 이어서 입력하기`(04 미리보기)를 `전체 풀이보기`(06-1 해석 목차)로 바꿈. `returnPath`/`returnTo` 대신 `readingPath`. 06-1 없는 상품(cmdg·직업운·상대방마음·재회운·배우자운)은 `/r/:id`.

- 2026-09-17 L4 분량 예산·엔진 라벨: `tone-v2/report-budget.json`은 현행 `sectionLengthPlan` 실측 구간(1200-1600 / 1100-1500 / 450-700)에 두 번 측정 공식(min×0.9, max×1.35)을 적용한 값이다. 서머리·하이라이트는 구간 밖이면 최대 3회 재생성 후 명시 실패. 프롬프트의 `dayMasterStrength` 날것 대신 `dayMasterForce`(힘을 덜 받는 쪽). 본문 `돈 낮음` 류는 검수 거부.

- 2026-09-17 L3 하이라이트 본문 생성: 주제는 `사주/data/longform-blocks.json` (공개 10개, `cmdg`→`saju_master` 별칭). 미정의 서비스는 `highlights` 필드를 만들지 않는다. 생성은 결론·서머리 다음, 항목 실패는 그 카드만 `failed`로 남기고 섹션은 계속. 문단 수·1순위 모순 검사 포함.

- 2026-09-17 longform 이어서: 인쇄 CSS에 결론·서머리·하이라이트 보존(CTA만 숨김), `/data/longform-blocks.json` 만 정적 예외로 열고 Vercel public 복사. L1 결론 고정 — `SajuReport.verdict` 추가, 생성 시작 시 한 번 결정해 이후 섹션 프롬프트에 `fixedVerdict`로 주입, 1순위 모순 검사, 없으면 기존 동작. 20컷 신규 생성 없음.

- 2026-09-17 longform 디자인 토큰을 기존 고객 키트에 맞춤. JSON `accent` 의 Tailwind hex(`#8b5cf6` `#e11d63` `#0f766e` `#b45309`)를 각 05/06 페이지 `:root` 토큰 이름(`gold` `rose` `coral` `teal` `pink` `green`)으로 바꿨다. CSS는 `--text`/`--panel`/`--gold`/`--umsh-cta-height`/`--umsh-field-radius`/`--umsh-card-radius`/`--umsh-stack-gap`만 받고, CTA는 52px·8px·가로 100%. JS는 허용 토큰만 `var(--이름)`으로 주입한다. 20컷 신규 생성 없음. 생성 파이프라인(L1~L4)은 아직 없음.

- 2026-09-17 전 서비스 PDF 경로: 06-1 상세 14개 가운데 PDF 버튼이 붙어 있던 것은 저축·퇴사 두 곳뿐이었고, 냥궁합·올해연애는 어느 화면도 로드하지 않는 `UMSHReportPdf` 를 부르고 있었다(자체 `window.print()` 폴백으로만 동작). 나머지 10곳에는 버튼이 없었고, **인쇄 규칙이 한 곳도 없어** 눌러도 상단바·하단 내비·버튼까지 종이에 찍혔다. 14개 전부가 `umsh-report-access.js` 를 로드하므로 개별 수정 대신 그 한 곳에서 본문 렌더 직후 `ensurePdfDock()` 으로 처리한다 — 자체 버튼이 있으면 건드리지 않고, 없으면 키트의 `.umsh-pdf-dock`/`.pdf-button` 을 본문 아래에 넣는다. 06-1 이 없는 서비스는 보관함이 공용 리더(`/r/:id`)로 보내므로 고유 주소도 같이 포함하고, 티저(04)는 제외한다. 새 `사주/css/umsh-report-print.css` 는 역할 표시(`data-umsh-service-top` 등)와 대화형 요소를 기준으로 지운다. 실측에서 드러난 두 건을 함께 고쳤다: (1) 붙는 자리가 `display:grid`(직장선택 `#detailStage`)면 버튼이 92×402 세로 막대가 됐다 — 독이 스스로 크기를 고정한다. (2) 규칙을 고쳐도 브라우저가 캐시된 옛 사본을 써서 PDF 가 화면 배색으로 찍혔다 — HTML 의 `?v=` 규약대로 버전을 붙인다. 카드에 `break-inside: avoid` 는 쓰지 않는다(한 항목이 한 페이지보다 길어 앞 페이지가 크게 비므로, `umsh-verified-reader.css` 와 같은 판단). 검증: 로컬 파일 저장소로 실제 저축 리포트를 열어 인쇄 미디어에서 흰 배경·검은 글자·크롬 제거·문단 블록 잘림 방지 확인, 버튼 없던 직장선택에 92×44 로 주입 확인. `npm test` 1143/1143, typecheck, 검수 15종, 20개 서비스 QA 통과.

- 2026-09-17 유료 해석 생성 실패 복구: 보관함의 `해석을 준비하고 있어요` 잔존은 데이터 상태가 아니라 결함 세 건이었다. (1) **검수 게이트 결함** — 다음 판단 기준 인식기가 `해요`·`하십시오` 계열만 받아서, 페르소나가 `~거예요`를 강제하는 `money_save`·`couple_signal`과 `~거야`인 `today_fortune`은 시간 표지·확인 대상·행동이 다 있는 문장을 써도 통과가 **구조적으로 불가능**했다. `~하는 거예요/거야`를 인식하되 대상 없는 문장과 부정형은 계속 거른다. (2) **토큰 예산 부족** — gpt-5 계열은 추론 토큰도 `max_completion_tokens`에서 깎는다. `money_save` 첫 항목은 4200을 전부 추론에 쓰고 본문을 한 글자도 못 냈고(`finish_reason: length`), 실측 성공에 5292 토큰이 필요했다. `sectionMaxTokens` 4200 → 9000. (3) **잘림이 재시도 대상이 아니었다** — `length` 가 일반 `Error` 로 올라와 한 번의 잘림이 항목을 영구 실패로 굳혔다. `OpenAiTruncatedError` 를 분리해 재시도하되, 프롬프트를 더 늘리지 않도록 재작성 지시문은 붙이지 않는다. 함께 1차 지시문과 재작성 지시문이 서로 다른 문장을 요구해 모든 서비스가 1차에서 같은 항목으로 떨어지던 것을 공유 상수 `SECTION_CLOSING_RULES` 로 묶고, 왕복을 2 → 4회로 늘렸다. 실측: 5개 서비스(`money_save` 2회·`work_move` 1회·`quit_fortune` 2회·`cat_compatibility` 2회·`couple_signal` 3회) 전부 complete. 검증: `npm test` 1139/1139, typecheck, 검수 15종, 20개 서비스 QA 통과. 회귀 테스트 2건 추가(페르소나 종결형 인식, 잘림 재시도).

- 2026-09-17 06 상세 시안 해석 차단(PR #41, `3a13368`): 실측 중 드러난 결함 다섯 건을 함께 고쳤다. (1) 해석 칸 가드 CSS 를 `A{...},B,C{...}` 로 이어 붙여 뒤쪽 규칙이 통째로 무시되고 있었다 — 선택자를 먼저 합친 뒤 선언을 한 번만 붙인다. (2) `umsh-chrome.loadShellScript` 가 `?v=` 붙은 주소를 경로와 직접 비교해 마운트마다 `service-shell.js` 를 중복 로드했다 — 양쪽 `pathname` 비교. (3) 이직·저축 06 은 라이브 리포트가 없으면 히어로 소개문까지 비우고 의도한 안내문만 `data-umsh-filled` 로 남긴다. (4) 올해연애·직장선택 스토어의 무가드 `UMSHReportAccess` 접근. (5) 이직운 티저 금지 표현, ui-kit 의 `UMSH` 표기. 추가로 `check:quit` 이 리다이렉트 스텁이 된 03 을 정식 단계로 요구해 main 의 CI 가 빨간불이었던 것을 바로잡았다(`f33ef87`).

- 2026-09-17 이직운 STEP1 히어로 카피를 하단으로 내려 상단 이미지가 보이게 한다. 근거: CreamWIKI `operations/aios-standards/09-assets/AIOS-AST-01-image-prompt.md`.

- 2026-09-17 Chrome 즐겨찾기/트레이 아이콘: 장식형 3D 운 16px를 심플 금 원+궤도+받침 마크로 교체. SVG 우선, ICO 16/32/48/256, 192/512, `manifest.json` `start_url: /`. 북마크·PWA·빈 referrer는 스플래시 후 메인, 사이트 안 홈 이동은 세션당 1회. 근거: CreamWIKI `operations/aios-standards/09-assets/AIOS-AST-06-logo-rule.md`.

- 2026-09-17 퇴사운 STEP2: 제출 아래 안내(`재직 기간·퇴사 후보일…`)와 하단 면책 푸터를 제거. 입력 칸과 CTA만 남긴다.

- 2026-09-17 퇴사운 퍼널: STEP3 상황 입력을 STEP2에 합쳐 공개 9개와 같이 `1→2→4→5→6`. 저장 사주가 있으면 이유 라디오만, 없으면 이름·년월일·시(모름)·성별. 재직기간·후보일·다음계획·메모는 받지 않는다. `/situation`·03 주소는 02로 보낸다. 근거: `design-system/customer-kit.md`, CreamWIKI `operations/aios-standards/08-components/AIOS-CMP-09-form.md`.

- 2026-09-16 퍼널 순서: 공개 9개는 `1 스토리 → 2 입력 → 4 티저 → 5 목차 → 6 상세`. 퇴사운만 `2 → 3 추가입력 → 4`. 결혼궁합 01 미리보기 링크가 05로 건너뛰던 경로를 막는다. 천명사주는 한 화면. 근거: `design-system/customer-kit.md`.

- 2026-09-16 퍼널 CTA: STEP1~6 한 화면 한 제출, 결과 동사, STEP4 미결제는 `전체 보기 (금액)`. 커플 오표기 `1전체 보기 · 9,900원`을 `전체 보기 (19,900원)`으로 고친다. 근거: `design-system/customer-kit.md`, CreamWIKI `operations/aios-standards/08-components/AIOS-CMP-08-cta.md`.

- 2026-09-16 동의 모두 선택: 티저 결제 동의는 개별 버튼 탭 대신 체크박스 + `모두 선택` 한 칸. 필수 2개와 선택 마케팅을 한 번에 켠다. 근거: CreamWIKI `operations/aios-standards/08-components/AIOS-CMP-09-form.md`.

- 2026-09-16 모바일 캔버스: 430px 프레임을 정본으로 `100vw`를 퍼센트 폭으로 바꾸고, 결제창을 680→430·입력/CTA 52px로 키트에 맞춘다. 상단바는 430 이하 56–64px, 360 이하 로고 100px. 소비성향 `.app { min-width: 390px }` 는 375에서 잘려 공용 크롬이 `min-width: 0`·`width: min(100%, 430px)`로 덮는다. 로컬 375/360/430/768 overflow-x 0. 근거: CreamWIKI `operations/aios-standards/07-design-system/AIOS-DS-02-typography.md`, `operations/aios-standards/08-components/AIOS-CMP-08-cta.md`, `design-system/customer-kit.md`.

- 2026-09-16 체크아웃 상품 로드: HTML 시드(`save`,`couple_match`,`love_thisyear`,`marriage_compatibility`)가 카탈로그 키와 달라 `/payment`가 "상품 정보를 확인하지 못했습니다"에서 멈췄다. 서버 `canonicalPaymentProductKey` + 설정 `aliases`/`pathPrefixes` + `payment.js` 정규화로 공개 서비스 전수 조회. 결제 처리(PG 과금)는 추가하지 않음. 근거: CreamWIKI `personal/carrotcap/notes/umsh-inicis-checkout-recovery-20260914.md`, `operations/aios-standards/04-workflows/AIOS-WF-07-e-commerce-flow.md`.

- 2026-09-16 STEP4 핵심 티저: `reportId` 재진입 때 toc 골격을 report로 받아 빈 섹션 제목만 12% 칸에 그렸다. 04는 동결 `preview`만 쓰고, 유료 본문이 있을 때만 renderTeaser. JS `?v=live-20260916t`. 근거: CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-teaser-trust-gate-20260912.md`.

- 2026-09-16 STEP4~6 오픈 10개: 로그인 레이스로 티저/목차/상세가 비던 경로를 `resolveLiveSession`(900ms) + 05/06 preview analyze + `toc` 바인드로 고친다. JS `?v=live-20260916`. PR #32 merge `bd51e1e`, Vercel production `dpl_B2RcW8fuTiMMn82SMnxF8kPNQuT8` READY (`https://umsh.kr`). 운영 확인: 저축 04 HTML cache-bust, `umsh-auth-session.js`에 `resolveLiveSession`/`bindServiceSession`. 근거: CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-teaser-trust-gate-20260912.md`.

- 2026-09-16 STEP4 저축 티저 결론 칸이 `GATE_COPY.login`으로 덮이던 원인: getSession 한 번 + 로그인 실패 `reportPromise` 캐시. `resolveLiveSession`/`bindServiceSession`으로 SIGNED_IN을 기다리고, 결론 칸에는 로그인 안내를 쓰지 않는다. 근거: CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-teaser-trust-gate-20260912.md`. 커밋·배포 미실행.

- 2026-09-16 STEP4 무료 티저: `previewOnly` 응답을 `report.sections` 없음으로 실패 처리하던 경로를 전수 보강. `UMSHReportAccess.acceptAnalyze`가 미리보기를 성공으로 받고, 공개 서비스 스크립트는 결론 칸에 `GATE_COPY.error`를 쓰지 않는다. 04는 reportId 없이 boot gate를 건너뛴다. 근거: CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-teaser-trust-gate-20260912.md`.

- 2026-09-16 STEP2 제출 CTA는 화면당 1개. 저축 입력은 폼 `next-cta`만 남기고 같은 문구의 고정 `submit-dock`을 제거. 근거: `design-system/customer-kit.md` #4, CreamWIKI `operations/aios-standards/08-components/AIOS-CMP-08-cta.md`.

- 2026-09-16 생년월일 키트: 칸 안의 년·월·일만 쓰고 옆 접미사·중복 도움말 제거. 이직운 STEP1 히어로 `topline` 삭제. umsh.kr 배포.

- 2026-09-16 버튼 가이드: STEP2/일부 STEP4 CTA를 가로 100% · 높이 52px · 1열 독으로 맞춤. `.primary-cta` 등 별칭을 `umsh-kit.css`에 포함. 냥궁합 150px 독 해소. 제출 문구를 결과 동사로 교체. 근거: `design-system/customer-kit.md` #4, CreamWIKI `operations/aios-standards/08-components/AIOS-CMP-08-cta.md`.

- 2026-09-16 UX 라이팅: 커플 STEP2 히어로를 금지문(`상대 정보는 내 정보로 채우지 않아요`)에서 가치문(`두 사람이 맞는 방식부터 확인합니다`)으로 교체. 공개 10개 STEP2 제목도 같은 규칙(무엇을 얻는지 / 왜 이 입력인지). 결제·배포 미실행. 근거: CreamWIKI `personal/carrotcap/notes/umsh-all-service-teaser-release-20260914.md`.

- 2026-09-16 공유 GNB: 커플 스토리 로고 클릭 홈 이동 + `/cmdg/` 상단 바 표시. PR #28 merge `c2613cac`, Vercel production `dpl_AacHfPv2MZ86hbtXZywx7mXutM1a` READY (`https://umsh.kr`). 운영 확인: couple logo → `/`, `/cmdg/` appbar 84px visible.

- 2026-09-16 고객 화면 보류: `home_pungsu`(지금 사는 집), `lucky_color`(운 붙는 색과 물건), `pass_angle`(붙을 각), `newyear_flow`·`wedding_day`(곧 다가올 운명). 검색·보관함·결제·직접 진입을 막고 관리자 카탈로그는 유지. 코드는 삭제하지 않고 `hidden` + HTML 주석 + 경로 302.

- 2026-09-13 `task-tone-v2-p05-cat-compatibility-corpus-rag-release-candidate` DONE: reviewed 38/38 blocks, activated 2.1.0 for new snapshots, preserved 2.0.0 snapshots and rollback, and passed focused 8/8, related 139/139, full 831/831, typecheck/build/determinism/review. Next inactive Task is `task-tone-v2-p05-couple-signal-corpus-rag-release-candidate`.
- 2026-09-13 `task-tone-v2-p05-pass-angle-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. All 8 blocks separate confirmed exam facts, official instructions, actual study records and calculated symbols; unsupported fixed periods were removed. Focused 8/8, related 143/143, full 823/823 across 114 suites, typecheck/build/determinism/review PASS. Existing 52-item record unchanged; 2.1.0 provider/Production NOT_RUN. Next inactive Task is `task-tone-v2-p05-cat-compatibility-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-corpus-snapshot-20260913.md` put/get/search PASS and ProjectOps memory promotion PASS.

- 2026-09-13 `task-tone-v2-p05-work-move-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. All 10 blocks separate confirmed facts, documents, reported promises, unknown company conditions and calculated symbols. Focused 8/8, related 153/153, full 815/815 across 113 suites, typecheck/build/determinism/review PASS. Provider/Production NOT_RUN. Next inactive Task is `task-tone-v2-p05-pass-angle-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-work-move-corpus-snapshot-20260913.md` put/get/search PASS and ProjectOps memory promotion PASS.

- 2026-09-13 `task-tone-v2-p05-home-fit-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. All 12 blocks separate observations, measurements, unknowns and symbols; the dedicated home reader now honors stored snapshots. Focused 8/8, related 107/107, full 807/807 across 112 suites, typecheck/build/determinism/review PASS. Provider/Production NOT_RUN. Next inactive Task is `task-tone-v2-p05-work-move-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-home-fit-corpus-snapshot-20260913.md` put/get/search PASS and ProjectOps memory promotion PASS.

- 2026-09-13 `task-tone-v2-p05-love-spouse-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. User-stated preferences and observed behavior are separated from future-spouse identity, attributes, timing, feelings and outcomes; autonomy and safety signals are authoritative. Focused 8/8, related 88/88, full 799/799 across 111 suites, typecheck/build/determinism/review PASS. Provider/Production NOT_RUN. Next inactive Task is `task-tone-v2-p05-home-fit-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-love-spouse-corpus-snapshot-20260913.md` put/get/exact-title search PASS and ProjectOps memory promotion PASS.

- 2026-09-13 `task-tone-v2-p05-love-again-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. Confirmed breakup/contact facts are separated from longing, consent and future reunion; refusal/contact-stop and danger signals are authoritative. Focused 8/8, related 88/88, full 791/791 across 110 suites, typecheck/build/determinism/review PASS. Provider/Production NOT_RUN. Next inactive Task is `task-tone-v2-p05-love-spouse-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-love-again-corpus-snapshot-20260913.md` put/get/exact-title search PASS and ProjectOps memory promotion PASS.

- 2026-09-13 `task-tone-v2-p05-love-mind-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. Observed behavior is separated from private feelings; explicit refusal and safety risks cannot be overridden. Focused 8/8, related 88/88, full 783/783 across 109 suites, typecheck/build/determinism/review PASS. Provider/Production NOT_RUN. Next inactive Task is `task-tone-v2-p05-love-again-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-love-mind-corpus-snapshot-20260913.md` put/get/exact-title search PASS and ProjectOps memory promotion PASS.

- 2026-09-13 `task-tone-v2-p05-work-job-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 only for new snapshots. The block separates confirmed work facts, calculated symbols, symbolic questions and labeled hypothetical examples and avoids deterministic career or workplace claims. Focused 8/8, related 100/100, full 775/775 across 108 suites, typecheck/build/determinism/review PASS. Provider and Production remain NOT_RUN. Next inactive Task is `task-tone-v2-p05-love-mind-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-work-job-corpus-snapshot-20260913.md` put/get/exact-title search PASS and local ProjectOps memory promotion PASS.

- 2026-09-13 `task-tone-v2-p05-saju-master-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 only for new snapshots. The block separates user facts, server-calculated original-chart/daewoon values, symbolic hypotheses and labeled hypothetical examples, and excludes deterministic personal, future and professional-domain claims. Focused 8/8, related 98/98, full 767/767 across 107 suites, typecheck/build/determinism/review/KMS PASS. Provider, Production, customer data, commit, push and deploy remain NOT_RUN. Next inactive Task is `task-tone-v2-p05-work-job-corpus-rag-release-candidate`.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-saju-master-corpus-snapshot-20260913.md` put/get/exact-title search PASS and the local ProjectOps memory was promoted. Server-only manual reindex remains NOT_RUN; remote search returned the saved note immediately.

## Initial Entry

- Status: `TODO`
- Created by: CreamAI ProjectOps SETUP
- Rule: append future progress entries below this section. Do not overwrite previous status history.

## Log

<!-- Append timestamped entries here. -->

## 2026-09-11 — T13 통합 검색·읽기 홈 완료

- Status: `DONE`
- API: `/api/admin/v1/search`가 주문·회원·리포트·지원 케이스의 정확 식별자만 권한별 read scope로 검색한다. 개인정보 원문·리포트 본문·결제 거래번호는 반환하지 않는다.
- UI: `/admin/search`에 대상 선택과 정확 식별자 폼을 연결했다. 부분 이름·이메일 검색은 개인정보 보호를 위해 제공하지 않는다.
- 배포·검증: Production `dpl_3SGaRp1LXYKCpPycHhJhJujXn4nu` Ready, 로그인된 관리자 화면에서 실제 검색 폼을 확인했다. typecheck PASS, focused admin tests 49/49 PASS.

## 2026-09-11 — T13 통합 검색·읽기 홈 시작

- Status: `IN_PROGRESS` → `DONE`
- 범위: 권한별 정확 ID 검색(주문·회원·리포트·지원 케이스)과 실제 운영 요약. 부분 이름·이메일 검색, 개인정보 원문, 브라우저 DB 직접 조회는 제외한다.

## 2026-09-11 — T12 CS 케이스 관리 완료

- Status: `DONE`
- DB: `support_cases`, `support_notes` additive migration을 Production에 적용했다. 두 테이블은 RLS=true이며 `anon`·`authenticated` 권한은 0건이다.
- API/UI: `support:read/write` 범위로 실제 케이스 접수·상태/담당자 변경·내부 메모·고객 답변 초안을 제공한다. 답변 초안은 어떤 고객 채널에도 자동 발송하지 않는다.
- 보호: 모든 쓰기는 T06 감사·멱등 명령, Idempotency-Key, revision 비교 갱신을 사용한다. 고객 원문·리포트 본문은 반환하지 않는다.
- 배포·UI 확인: Production `dpl_7ndiRAtb48aAaUyY4QdcCmFZdkhm` Ready 및 `/admin/support` 로그인 세션에서 실제 빈 상태와 접수 폼을 확인했다. 검증용 임의 케이스는 만들지 않았다.
- 검증: typecheck PASS, focused admin/support test 29/29 PASS.

## 2026-09-11 — T12 CS 케이스 관리 시작

- Status: `IN_PROGRESS` → `DONE`
- 원격 DB 점검: `public.support_cases`, `public.support_notes`는 아직 존재하지 않는다. 새 테이블을 additive migration으로 만들고, RLS와 브라우저 역할 권한 차단을 적용한다.
- 범위: 실제 케이스 접수·배정·내부 메모·고객 답변 초안·종료. 고객 연락 발송 채널은 구현하지 않는다.

## 2026-09-11 — T06A 관리자 계정 실제 변경 완료

- Status: `DONE`
- 실제 API: `POST /api/admin/v1/admin-accounts`, `PATCH /api/admin/v1/admin-accounts/:id/password`, `PATCH /api/admin/v1/admin-accounts/:id/status`를 `umsh_admin_accounts`에 연결했다. 비밀번호 평문은 저장·감사 기록·응답에 포함하지 않는다.
- 보호: `settings:write` 범위, 12자 이상 비밀번호, revision 비교 갱신, Idempotency-Key, 자기 계정 비활성화 차단을 적용했다. 모든 변경은 T06 감사 원장과 command receipt를 재사용한다.
- UI: `/admin/settings`에서 실제 관리자 목록, 관리자 추가, 비밀번호 변경, 활성/비활성 전환을 제공한다. 검증용 신규 운영 계정은 만들지 않았다.
- 배포·UI 확인: Production `dpl_AK8reynWaCWvDv5783spHDAwaZzh` Ready 및 `umsh.kr` 별칭을 확인했다. 로그인된 관리자 설정 화면에서 실제 계정 1건과 관리자 추가·비밀번호 변경·비활성화 제어가 표시되는 것을 확인했다. 검증용 계정 생성·비밀번호 변경은 수행하지 않았다.
- 검증: typecheck PASS, focused 관리자 단위 테스트 33/33 PASS.

## 2026-09-11 — T06A 관리자 계정 실제 변경 시작

- Status: `IN_PROGRESS`
- 범위: 실제 `umsh_admin_accounts` 계정 생성, 비활성화, 비밀번호 변경을 기존 audit/idempotency command 기반에 연결한다. 고객 데이터와 다른 도메인 테이블은 변경하지 않는다.

## 2026-09-11 — T06 감사·멱등 명령 기반 완료

- Status: `DONE`
- 원격 DB: `admin_audit_events`, `admin_command_receipts`를 additive migration으로 생성하고 RLS=true, `anon`·`authenticated` grant=0을 링크된 Production DB에서 검증했다.
- 서버: `executeAdminCommand`가 동일 요청 replay, 다른 본문 충돌, 감사 시작 실패 시 mutation 미실행을 보장한다. 감사 원장은 server-only service role로만 조회한다.
- UI: `/admin/audit`는 실제 감사 테이블의 행만 보여주며, 현재 원본 행이 0건이라 실제 빈 상태를 표시한다.
- 배포: `dpl_7Si8jCgfaDvAsGNMYW91uiLM4C3S` Ready 및 `umsh.kr` 별칭 확인. 브라우저 실검증에서 권한 있는 세션이 실제 빈 감사 원장을 렌더링했다.
- 검증: typecheck PASS, focused admin test 27/27 PASS. 초기 scope 누락은 커밋 `9277e28`에서 수정하고 재검증했다.

## 2026-09-11 — T06 감사·멱등 명령 기반 시작

- Status: `IN_PROGRESS`
- 범위: `admin_audit_events`와 command receipt 저장소를 실제 Supabase에 추가하고, 서버 전용 audit 조회 화면까지 연결한다. 이후 관리자 계정·CS·콘텐츠·정산 쓰기 작업은 이 기반을 재사용한다.
- 계획: `docs/superpowers/plans/2026-09-11-admin-audit-command-foundation.md`.
- 보안 결정: RLS 활성화, `anon`·`authenticated` 권한 회수, service role만 접근. 감사 기록에는 비밀번호·토큰·원문 개인정보를 넣지 않는다.

## 2026-09-11 — T10 실제 회원·리포트 운영 데이터 연결

- Status: `DONE` (읽기 전용 실제 데이터 범위)
- 원본: Production `cheongi_user_profiles`와 `cheongi_reports`를 서버 전용 서비스 키로 조회한다. 브라우저는 서버 API(`/api/admin/v1/members`, `/api/admin/v1/reports`, `/api/admin/v1/operations-snapshot`)를 통해서만 접근한다.
- 개인정보: 회원의 생년월일·성별·프로필 원문과 리포트의 본문·입력 데이터는 반환하지 않는다. 회원 식별자·이름·이메일은 마스킹하고, 운영 상태·서비스 키·시각만 내려준다.
- UI: 개요·회원·리포트·서비스 화면은 실제 데이터만 렌더링한다. 레거시 KPI/예시 행/`데이터 연동 대기` 템플릿을 삭제했다. 아직 원천 테이블이 없는 메뉴는 임의 데이터 대신 원천 미생성 상태만 표시한다.
- 배포: Production `dpl_AKmuNf3pjBfS6ATQkXWojYPSazqV` Ready, `umsh.kr` 별칭 반영 확인.
- 실브라우저 검증: 로그인된 관리자 세션에서 회원 6건, 리포트 68건, 공개 서비스 15개, 활성 코퍼스 팩 28개가 실제 값으로 렌더링됨을 확인했다.
- 검증: `npm run typecheck`, 관리자 관련 테스트 54/54 PASS, 목업 템플릿 문자열 스캔 PASS.
- 후속: 환불·정산·지원·콘텐츠·미디어·작업·감사 등은 해당 실제 원천 테이블/외부 시스템이 아직 없으므로, 테이블 설계·migration·감사 명령을 한 Task씩 추가해야 한다.

## 2026-09-11 — T05 관리자 계정 저장소 실제 연결

- Status: `IN_PROGRESS` (초기 관리자 등록 대기)
- 실제 DB: `public.umsh_admin_accounts`의 RLS 활성화, `anon`·`authenticated` grant 0건, `service_role` grant는 `SELECT`·`INSERT`·`UPDATE`만 남긴 것을 원격 쿼리로 재검증했다. `role='super_admin'` 제약을 추가했다.
- 이력: migration `20260911102420_umsh_admin_accounts_hardening`을 운영 DB에 적용하고 remote migration history에 `applied`로 기록했다.
- 코드: 서버 전용 PostgREST 관리자 계정 저장소, scrypt 비밀번호 해시 검증, 활성 계정 세션 판정, 실제 계정 목록 API, bootstrap 관리자 등록 API를 추가했다. 브라우저에는 해시·서비스 키·비밀번호가 전달되지 않는다.
- 배포: `UMSH_ADMIN_ACCOUNT_STORE=enabled` Production 설정 후 `dpl_FxHbcZicCR2aKwG7VEFR1Vhkncva` 배포 Ready 확인.
- UI 검증: `/admin/settings`에서 실제 `GET /api/admin/v1/admin-accounts` 결과(0개)와 초기 등록 CTA가 표시됨을 확인했다.
- 남은 단계: 로그인된 bootstrap 관리자가 설정 화면의 `현재 관리자 계정 등록`을 실행해 첫 실제 계정 레코드를 생성해야 한다. 이후 계정 추가·비활성화·비밀번호 변경은 감사 명령(T06)과 함께 활성화한다.

## 2026-09-11 — T05 관리자 membership 영속화 준비 점검

- Status: `BLOCKED` (원격 스키마 이력 승인 대기)
- 확인: Production에 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있고, Supabase 프로젝트 ref는 `wdyzollywccgaepjeynu`로 연결되어 있다. 그러나 이 PC에는 Supabase CLI가 없으며, `public.umsh_admin_accounts`의 현재 원격 스키마·RLS·grant는 독립적으로 검증하지 못했다.
- 결정: 현재 환경변수 기반 로컬 관리자 로그인은 유지한다. 검증되지 않은 테이블을 권한의 유일한 근거로 전환하지 않으며, 브라우저·클라이언트에는 관리자 계정 테이블을 노출하지 않는다.
- 산출물: `docs/superpowers/plans/2026-09-11-admin-membership-storage.md`에 migration → server-only repository → password verification → audited UI → rollout 순서를 고정했다.
- 근거: Supabase RLS 공식 문서에 따라 exposed `public` 테이블은 RLS와 `anon`/`authenticated` grant 회수를 함께 검증해야 한다. 서버 `service_role`만 접근하는 구조를 계획에 명시했다.
- 다음 조건: 원격 migration history 쓰기와 Supabase CLI 설치 또는 인증된 DB 조회 경로에 대한 사용자 승인 후 T05 Task 1을 진행한다.

## 2026-09-11 — admin LNB 화면 셸 확장

- Status: `DONE` (화면 구조·탐색 범위)
- 범위: `/admin` 좌측 LNB의 운영 현황, 고객·콘텐츠, AI 운영, 시스템 경로를 화면별로 분리했다.
- 반영: 공용 `route-placeholder`를 제거하고, 각 경로에 업무별 제목·KPI 구조·목록 열·명시적 빈 상태·비활성 CTA를 제공했다. 데이터가 연결되지 않은 곳은 임의 수치 대신 `— / 데이터 연동 대기`로 표시한다.
- 경로: 검색, 주문, 환불, 정산, 회원, 고객 지원, 콘텐츠, 서비스, 미디어, 리포트, 작업 큐, 코퍼스, 프롬프트, 평가, 릴리스, 통계, 로그, 장애, 감사 기록, 설정.
- 디자인: `design-system/MASTER.md`에 운영 화면 토큰, LNB/표 규칙, 미연동 상태와 반응형 기준을 기록했다.
- 검증: `npm run typecheck` PASS; `npx tsx --test tests/unit/admin-shell.test.ts tests/unit/admin-orders.test.ts tests/unit/admin-local-auth.test.ts` PASS (47/47).
- 제한: 이번 반영은 페이지 구조와 안전한 빈 상태까지다. 콘텐츠·회원·AI 운영의 조회/저장 API 및 실제 변경 CTA는 별도 작업에서 권한·감사 로그와 함께 연결해야 한다.

## 2026-09-10 — task-002 프로젝트 분석 및 3서비스 연동 진단

- Status: `IN_PROGRESS` → `DONE` (분석/문서화 범위)
- Task: task-002 (`CreamAI/backlog/task-002.md`, status: active)
- 실행: 프로젝트 구조 분석, Git/Vercel/Supabase 연동 진단, 로컬 baseline 검증, 후속 Task 큐 정의
- 검증 결과:
  - `npm run typecheck` PASS (오류 0건)
  - `npm test` PASS (373/373, 29 suites)
  - `node scripts/check-integrations.mjs` PARTIAL (8 PASS / 2 FAIL — Inicis MID·SignKey, checkout enabled)
  - `remember-integration.ps1` github=configured, vercel=configured, supabase=missing_cli
  - Supabase REST 3개 테이블 도달(HTTP 401 = RLS 거부), Auth settings HTTP 200 (google/kakao/email)
- 판정: Git configured / Vercel configured / Supabase partial (CLI 미설치, migrations 없음)
- 산출물: `CreamAI/reports/task-002_analysis.md`, `goal.md`, `plan.md`, `tests.md` 갱신
- 발견: `run-projectops-harness.ps1`의 test 모드가 저장소 package.json을 못 찾아 실제 테스트를 실행하지 않음
- 변경하지 않은 것: CLI 설치/로그인, Vercel 환경변수, Supabase 스키마, git 커밋/푸시
- 다음: TASK-003 로컬 `.env` 완결화 (사용자 승인 대기)
- Codex 리뷰 반영: Critical 0 / Major 1 / Minor 2 — 전부 수용
  - Major: 라이브 스키마 마이그레이션 안전 게이트 부재 → `plan.md`에 G1~G5 추가, TASK-004를 BLOCKED로 변경
  - Minor: `check:*` 개수 16 → 17 정정, Task 상태(backlog/plan/status) 일치화
- 하네스: preflight/test/review/rag/release 5모드 실행 (test 모드는 하네스 결함으로 실제 테스트 미실행)
- Memory candidate: `CreamAI/memory/candidates/task-002_memory.md` (should_promote_to_rag: false)
- 최종 리포트: `CreamAI/reports/task-002_final.md`

## 2026-09-10 — task-003 PAUSED

- Status: `IN_PROGRESS` → `PAUSED`
- 완료: `.env` 백업(프로젝트 밖 스크래치패드), Vercel Development/Production `env pull` 진단,
  `.env.example` 보강(Sensitive 경고·REPORT_STORAGE_DIR·PUNGSU 별칭), `README.md` 동기화 절차 문서화
- 핵심 발견: Vercel의 모든 비밀값이 Sensitive로 설정되어 `env pull` 시 `KEY=""` 빈 값으로 내려온다.
  `.env.local`은 `override: true`로 이기기 때문에 pull 결과를 그대로 쓰면 정상 `OPENAI_API_KEY`가 비워진다.
  또한 `vercel env pull`은 병합이 아니라 파일 전체를 재작성한다.
- 미완료: `.env`에 `UMSH_ADMIN_EMAILS` / `PAYMENT_TEST_MODE` / `PUBLIC_BASE_URL` 반영
  (글로벌 규칙 `.env*` 수정 금지로 자동 차단, 사용자 승인 대기)
- 사유: 승인 확인 중 사용자가 admin-ops 구축으로 작업 방향 전환

## 2026-09-10 — task-t01 (admin-ops T01) 기준 소스·운영 차이 기록

- Status: `DONE` (조사 작업)
- 기준: HEAD `dac3835` / 브랜치 `fix/umsh-qa-ux` / dirty 30건
- 패키지 무결성: `admin-ops-execution-pack` 21문서 SHA-256 전부 일치
- 중대 발견:
  1. HEAD가 `origin/main` 대비 -20/+10 → **로컬 소스는 운영 배포 코드가 아니다** (U1)
  2. 패키지 "현재 확인된 API" 15개 **전부 실재** — 초판의 `GET /api/report/:reportId` 부재 판정은
     배열 형태 라우트 등록을 놓친 grep 오류였고 Codex 리뷰로 정정 (app.ts:2398, 별칭 `/api/reports/:reportId`)
  3. 패키지 02-EVIDENCE 미기재 실제 API 23건
  4. `src/auth/admin.ts`에 관리자 이메일 하드코딩 → 환경변수로 회수 불가 → A03 현 구조로 충족 불가
  5. 로컬 주문 저장 모드 `memory` 실측 (Dev/Preview는 미검증) → A17 대응 필요 (U2)
  6. `express.static`(683~684행)은 파일이 있으면 인증 없이 서빙 → 관리자 UI는 정적 루트 밖 `admin-ui/`에 배치 (ADR-0002 D1)
  7. `/admin`, `/api/admin` 경로 충돌 없음
- E01~E16 재검증: 확인됨 11건, 부분 확인됨 1건, 미재검증 4건(T03/T25 범위), 충돌 0건
- 회귀 기준: typecheck 0건, unit 373/373, check-integrations 운영 8P/2F · 로컬 7P/3F
- 산출물: `docs/admin-ops/T01-baseline.md`, `docs/admin-ops/HANDOFF.md`, `docs/adr/ADR-0002.md`,
  `CreamAI/backlog/task-t01.md`, `plan.md`(T01~T38 큐), `goal.md`(admin-ops 최우선 목표)
- 운영 반영: 없음 (커밋·푸시·배포·스키마 변경·운영 DB 조회·PG 거래 전부 미수행)
- Codex 리뷰: Critical 0 / Major 5 / Minor 4 — **전부 수용, 반려 0건**
  - M1 리포트 API 부재 오판 정정 (가장 중대), M2 라우트 총계 정정(145 등록문 / 286 경로 / `/api` 39)
  - M3 static 순서 설명 정정, M5 U1이 T02·T03도 게이팅
  - m3 문서에서 관리자 이메일 주소 삭제, m4 ADR-0002 D1·D3 재작성
- 미해결(사용자 결정): 패키지 `20-HANDOFF.md` 갱신 여부 (선택지 A 유지 중)
- 다음: T02 (20종 키·노출 매핑, "로컬 HEAD 기준" 라벨 조건) — 사용자 승인 대기

## 2026-09-10 — task-t02 (admin-ops T02) 20종 키·노출 매핑

- Status: `DONE` (조사 작업). 기준: 로컬 HEAD `dac3835` = **운영 소스와 일치**
- 20종 누락: **0건** (canonical 20 = manifest 20 = 프롬프트 파일 20)
- alias 충돌 **2건**:
  1. [중대] `cmdg ↔ saju_master` 브리지가 코드에 없음. `loadServiceSystemPrompt('cmdg')` THROW.
     현재는 `/api/saju/analyze`가 400으로 거절해 사용자 영향 없으나, 관리자가 paymentKey를
     프롬프트/코퍼스 조회에 넘기면 500이 된다
  2. `home` 정규화 방향 역전 (prompt: home_pungsu→home_fit / directory: home_fit→home_pungsu)
- hidden 자동 공개: **없음** (`listServiceDirectory()` 런타임 15건 확인)
- [신규] **노출 15종 ≠ 판매 19종** — `PUBLICLY_DISABLED_PRODUCT_KEYS`가 빈 Set이라
  discovery에서 숨긴 4종도 결제 catalog에 노출되고 신규 주문이 가능하다 (U10, 정책 결정 필요)
- [신규] 06-SCREENS S02 요구 17개 필드 중 **12개는 코드 상수, 5개는 부재 → 관리자 편집 가능 0개.**
  서비스 제목·가격·노출·판매를 바꾸려면 코드 수정 + 재배포가 필요하다 (T22 범위 정의)
- 18-SERVICES 표: 20행 중 19행 정확, 1행(`saju_master｜cmdg`)은 코드 미구현 매핑
- `npm run check:service-contracts` 통과 (기존 검증기는 결제 catalog·directory를 검사하지 않음)
- 산출물: `docs/admin-ops/T02-service-mapping.md`

## 2026-09-10 — U1/U7 해소: 운영 소스 정본 확인 (사용자 질문 계기)

- 사용자 질문: "운영에서 최신파일이 있다면 그것을 다운받아 로컬이 동기화 되어야 겠지?"
- **결과: 운영이 최신이 아니다. 운영 = 로컬 HEAD `dac3835`.**
  - 운영 배포 `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ` (2026-09-09 17:06:57), git 메타데이터 없음
  - 이 배포 id는 admin-ops 패키지 02-EVIDENCE의 조사 루트와 **동일**
  - 라이브 마커 3종(robots.txt·sitemap.xml 존재, `/privacy` title·css 버전)이 모두 HEAD와 일치
  - HEAD 커밋 시각 17:06:34 → 배포 17:06:57 (+23초)
- **T01 초판 결론 정정**: "HEAD는 운영 소스가 아니다"는 `README.md`의 잘못된 전제
  ("main push가 Production 트리거")를 검증 없이 사용한 오류였다. U1/U7 해소, T02/T03 라벨 해제
- **신규 U13**: `origin/main`의 20 커밋(결혼택일·공용 GNB·브랜드 통일·모바일 프레임 정합)이
  운영·로컬 모두에 미반영. 병합 dry-run 충돌 **24개**, `wedding_day`는 양쪽 독립 구현(add/add)
- **신규 U14**: 운영 배포가 Git 연동이 아니라 CLI 로컬 배포로 보임. `README.md` 서술과 불일치
  (→ 2026-09-10 16:25 **정정·해소**: 연동은 있었고 CLI 배포가 그것을 우회한 것이다. 아래 참조)
- 권고: 병합은 별도 Task로 분리(선택지 C). admin-ops는 운영 소스 위에서 계속 진행
- 수행한 git 작업: `git fetch origin`, `merge-tree` dry-run만. merge/rebase/checkout 없음
- 산출물: `docs/admin-ops/production-source-of-truth.md`

## 2026-09-10 — task-t03 (admin-ops T03) 저장소 스키마·권한 조사

- Status: `DONE` (조사 작업). 운영 DB 쿼리 없음 (service_role 키 미보유)
- 수용 조건 충족:
  - `owner_id` 타입: **`uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT`**
    → **08-DATA의 "owner_id(TEXT)" 기재는 틀렸다**
  - 구형 payload fixture: `tests/unit/report-persistence.test.ts:102` 확보
- 정본 SQL vs 코드 `ensureDb()`가 **서로 다른 스키마를 만든다**
  (orders: uuid+FK+CHECK+RLS+grant+index vs TEXT만 / reports: 분석열 8 vs 1 / profiles: 정본 SQL 부재)
- 3개 스토어 접근 모델이 전부 다르다:
  orders·reports = service_role(RLS 우회) / **profiles = publishable키 + 고객 accessToken(RLS 통과)**
  → 관리자는 현재 함수로 고객 프로필을 조회할 수 없다 (T10에 별도 adapter 필요)
- 낙관적 동시성: reports는 4개 모드 전부 CAS(payload 내 `revision`) + 불변 필드 강제.
  orders는 **상태 가드만** 있고 revision·멱등키·row lock 없음 → A09/A10 미충족 (U17)
- [중대] `cheongi_reports`의 관리자 분석 열 8개(`service_key`, `status`, `public_id`,
  `progress_*`, `order_id`, `input_fingerprint`, `admin_status`)를 **애플리케이션이 기록하지 않는다.**
  그 위 인덱스 4개의 유용성이 불확실하다. 운영 실제 값은 미확인(쿼리 불가).
  안전한 결론: T10은 운영 측정·backfill 결정 없이 이 열에 의존할 수 없다 (U18)
- [중대] **PG 승인 성공 후 저장 실패를 불확정 상태로 남길 수 없다.** `catch`가 상태 확인 없이
  `failed`를 쓰려 시도하고, `status` enum에 불확정 상태가 아예 없다 → A12/A13 충족 불가 (U22).
  현재는 `checkoutEnabled=false`라 잠재적이나 **TASK-007(결제 활성화) 전에 해소 필요**
- U9 부분 해소: `developmentReportAccess` 술어는 소스로 확정. Supabase URL·공개키가 설정된
  환경에서 `false`이므로 현재 4개 환경은 안전하나, 설정 누락 런타임에서는 열린다
- U12 → U4로 이관 (저장된 `context.serviceKey` 분포는 운영 DB 조회 필요)
- 신규: U17(주문 직렬화), U18(분석열 미기입), U19(profiles 정본 SQL 부재),
  U20(주문·프로필 memory 차단 장치 없음), U21(REST upsert amount 덮어씀), U22(불확정 상태 부재)
- Codex 리뷰: Critical 0 / Major 5 / Minor 3 — **전부 수용, 반려 0건.** 지적 대부분이 증거 경계 초과였고,
  "미기입 단정" / "항상 false" / "verify 스크립트를 성공으로 표기" / "U22 최종 상태 단정"을 모두 하향 조정
- 산출물: `docs/admin-ops/T03-storage-schema.md`

## 2026-09-10 — task-t04 (admin-ops T04) 기존 회귀 기준 수집 — M0 마지막

- Status: `DONE` (조사 작업)
- baseline 고정: typecheck PASS(0), `npm test` **373/373 PASS**, `qa:all-services` PASS,
  `check:*` 16개 중 **4 PASS / 12 FAIL**
- [중대] **unit 결과가 실행 형태에 따라 결정적으로 갈린다.** 동일 60개 파일:
  `npm test`(glob) → 373/0 (2회 재현), 명시 파일 목록 → **365/8** (2회 재현).
  **원인은 특정하지 않았다**(U24). baseline은 명령·환경(Node v24.13.1/tsx v4.23.12)·
  파일 manifest 해시까지 고정해야 유효하다
  - 실패 8개는 `report-content-guards`(1) / `report-generator`(2) / `report-persistence`(5) 소속.
    T10이 `report-store.ts`를 건드릴 때 먼저 확인
- [중대] **`check:*` 실패 12개의 성격을 전수 규명했다.**
  - **11개는 stale guard** — 리팩터 커밋 `fdc80f2`(HEAD 조상)가 심볼을 옮겼고,
    가드 수정본은 `origin/main`에만 있다(`7a4ef1c`, `00453e0`, `f6402cd`).
    11개 가드 각각에 대해 옛 심볼/신 심볼/우리 코드 존재 여부를 표로 검증했다.
    **서비스 코드 유실이 아니다.** `origin/main` 병합 시 11개 전부 해소 (U25)
  - **1개는 실제 코드 차이** — `src/pet/cat-service.ts`에 `retrieveCategoryOwnChunks`
    (자기 코퍼스 우선 검색)가 없다. 형제 5개 서비스와 `origin/main`에는 있다.
    고양이 궁합만 RAG 근거 선택이 한 단 빠진 상태로 운영 중일 가능성 (U23)
- **`check:production-source`가 저장소의 수동 배포 preflight다.** 두 조건(작업트리 청결 +
  HEAD가 fetch한 `origin/main` 포함)을 요구하고 현재 **exit 1**.
  단 이 스크립트는 배포를 차단하지 않으므로 **과거 배포가 이를 무시했는지는 미확인**이다 (U14)
- 16-ACCEPTANCE 지정 재사용 테스트 9개: **전부 존재·전부 통과.**
  단 `admin.test.ts`가 하드코딩 관리자 이메일을 테스트로 고정하고 있어 T05에서 "고쳐서 통과" 금지
- A01~A40 매핑: **덮임 2 / 부분 17 / 없음 21.**
  덮임 2개(A33 소유권, A34 완료 불변)는 "관리자를 만들면서 절대 깨뜨리면 안 되는 것"이며
  이미 테스트로 보호된다. A32·A39는 핵심 동작은 보호되나 시나리오 전체는 미충족(부분)
- 정정: 초안이 `qa:all-services`를 "LLM 호출 추정 — 미실행"으로 적었으나 **정적 스크립트였다.**
  실행해 PASS 확인, baseline에 포함
- Codex 리뷰: Critical 0 / Major 4 / Minor 3 — **전부 수용, 반려 0건.**
  "순서 의존" 단정 하향, "배포 정책 위반" 주장 하향, A32·A39 덮임→부분 하향,
  `qa:all-services` 오분류 정정, check diff 11→12 정정
- **U23을 병합/출시 차단 항목으로 격상** (Codex 권고 — 판매 중인 서비스의 동작 차이)
- 산출물: `docs/admin-ops/T04-regression-baseline.md`
- **M0의 T01~T04 4개 Task 전부 DONE.** 단 M0 종료 게이트("코드·WIKI 차이 해결")는
  U13·U23·U25가 남아 **미완결**이며, 세 항목 모두 `origin/main` 병합으로 수렴한다.
  Codex도 "M0 완료 선언 불가"로 동일 판정

## 2026-09-10 — task-009 `origin/main` 병합 1차 시도 → abort (BLOCKED)

- Status: `BLOCKED` — 브랜드 표기 결정 1건 대기
- **저장소 안전:** HEAD `dac3835` 불변, MERGE_HEAD 없음, 충돌 0건, dirty 31건(시도 전과 동일).
  복구 지점 `backup/pre-merge-20260910` 생성. 미커밋 작업물 전부 보존.
  수행한 git 작업: `fetch`, `merge --no-commit`, `merge --abort`. **커밋·푸시·배포 없음**
- 사전 안전 확인: 미추적 29건 vs incoming 216건 충돌 **0건**,
  우리가 수정한 tracked 2건(`.env.example`, `README.md`)도 incoming에 없음
- 충돌 24건 전수 확인 후 **파일별 해소 방침 확정** → `docs/admin-ops/TASK-009-merge-plan.md`
  - `registry.json`: 양쪽 packs 28개 id 완전 동일 → 텍스트 차이뿐
  - `app.ts`: 우리 판매 게이트 필터 + 저쪽 고객 문구 = **양쪽 장점 결합**
  - 정책 페이지 5건: **우리 쪽 채택** (우리 nav가 `/about`·`/faq`를 가리키고 두 페이지는
    우리 브랜치에만 존재. 저쪽 채택 시 살아 있는 링크가 사라짐)
  - 결혼택일 11건: **THEIRS 기준 + 우리 `birthTimeKnown` 정확성 가드 이식**
    (THEIRS는 RAG 정제·카피 가독성·공용 verified reader 연결이 앞서고,
     OURS만 출생시간 미상 오판 방지 가드를 가진다 — 어느 쪽도 상위집합이 아니다)
  - `cat-service.ts`는 충돌 없음 → 저쪽 버전 유입으로 **U23 해소 예상**
  - `check-*.mjs` 11개 저쪽 갱신으로 **U25 해소 예상**
- **[별건 발견 / 즉시 조치 권고]** `GET /api/payment/config`(무인증)가 `setupMessage`로
  **내부 환경변수 이름을 고객에게 노출**한다:
  `"… 남은 설정: 이니시스 MID·SignKey (INICIS_MID, INICIS_SIGNKEY)."`
  `origin/main`의 `aca0bf3`이 이미 `PAYMENT_UNAVAILABLE_NOTICE`로 교체해 해소했다.
  비밀값이 아니라 변수 이름이므로 즉시 악용 가능한 취약점은 아니나 노출 이유가 없다.
  병합의 부수 효과로 해소된다
- abort 사유: 브랜드 표기(`UMSH 운명상회` vs `운명상회`)가 양쪽 브랜치의 **반대 결정**이고
  정책 페이지 5건의 해소 방향을 바꾼다. 병합 중 상태로 결정을 기다리는 것은 위험

## 2026-09-10 — task-009 `origin/main` 병합 완료 (DONE)

- 사용자 승인: 선택지 (C) — 브랜드 표기 현행 유지, 브랜드 통일은 TASK-011로 분리
- **병합 커밋 `659ba7f`** (부모 `dac3835` + `fb686b6`). **푸시하지 않았다.** 복구 지점 `backup/pre-merge-20260910`
- 실제 통합 커밋 수는 **21건**이었다. T04의 `check:production-source`가 `git fetch`를 수행해
  `origin/main`이 `f010f55` → `fb686b6`로 갱신되어 있었고, 여기에 **Android 하이브리드 앱 셸**이 포함됐다

### 검증 (병합 전 → 후)
| 검증 | 전 | 후 |
| --- | --- | --- |
| typecheck | 오류 0 | **오류 0** |
| `npm test` | 373/373 | **415/415** (+42) |
| `check:*` 15개 | 4 PASS / 11 FAIL | **15 PASS / 0 FAIL** |
| `qa:all-services` | PASS | **PASS** |

### 해소
- **U13** 21커밋 통합 / **U15** 결혼택일 우리 구현 정본 판정 / **U23** cat 자기 코퍼스 검색 확보 /
  **U25** stale guard 11개 전부 PASS

### 충돌 24건 해소 요지
- 정책 페이지 4건: **우리 쪽** (우리 nav가 `/about`·`/faq`를 가리키고 두 페이지는 우리 브랜치에만 존재)
- portal: 카드 링크·aria는 저쪽(가드 요구), **집 풍수 카드·풍수 칩은 우리 쪽** (`dc42c81` 재개 상태)
- **결혼택일 전부 우리 쪽 정본.** 저쪽은 절대위치 오버레이 레이아웃 + 2단락 본문(15/21)이라
  우리 readability QA(로컬 폰트·텍스트/이미지 분리·3단락 이상)를 통과하지 못한다.
  저쪽 프롬프트의 '손 없는 날·삼재 구분'과 확장된 금지 규칙은 채택
- `app.ts` 결제 설정: **판매 게이트(우리) 유지 + 고객 문구(저쪽) 교체**
- `app.ts` 라우트·상수, 테스트 2건: **합집합**
- `registry.json`: packs 28개 id 동일 → 텍스트 차이만 해소

### 병합 부작용 정리
- `services-manifest.json`·`KNOWN_SERVICE_KEYS`의 `wedding_day` **중복 제거** (add/add 산물)
- `SERVICE_TERM_GUIDANCE`의 `wedding_day` 중복 키 제거
- `service-directory.ts` `home_pungsu` hidden 해제

### 예상 못한 유입 (후속 Task 필요)
- **Android 하이브리드 앱 셸** (`android/`, Capacitor) + Google Play 결제 → TASK-014
- `/api/payment/google/verify` 구글플레이 영수증 검증 → **T15 금융 이벤트에 두 번째 결제 경로**
- `/.well-known/assetlinks.json` Android App Links
- 결제 문구 환경변수 노출 해소 → TASK-012 DONE (단 **배포 전까지 운영 노출은 계속**)

### 남은 상태
- `.env.example`(staged), `README.md`(unstaged)에 TASK-003 편집이 남아 있다. stash pop 충돌은
  양쪽 항목을 모두 살려 해소했다 (내 Sensitive 경고 + 저쪽 Google Play 변수)
- 배포는 하지 않았다 → TASK-015

## 2026-09-10 — task-009 Codex 리뷰 반영 (Critical 1건 수정)

- 리뷰: `CreamAI/logs/review/task-009_merge-resolution-review.md` — **Critical 1 / Major 4 / Minor 2**
- **[Critical] `/api/day/wedding/analyze`가 병합으로 두 번 등록되어 있었다.**
  앞쪽 핸들러가 항상 응답하고 `next()`를 부르지 않아 뒤쪽이 도달 불가였고,
  그 결과 `input.birthTimeKnown` 배선과 `buildWeddingTeaser` 조립이 **런타임에서 죽어 있었다.**
  즉 병합에서 지키려 했던 출생시각 미상 가드가 실제로는 동작하지 않았다
  → 커밋 `67b4d7b`로 핸들러 하나로 합쳐 수정
- [Major] `partnerBirthTimeKnown` 정규식이 두 자리 시각만 인정해 `9:30`을 미상으로 처리했다
  → `parseTime`이 `known`을 함께 반환하게 하고 확인 여부의 단일 출처로 삼았다
- 회귀 테스트 2건 추가. **배선을 임시로 제거해 테스트가 실제로 실패하는 것을 확인**했다
- [Major, 미수정 — 게이트로 등록] Play 토큰 재사용 차단 부재(check-then-write, `tid` unique 없음),
  U22 불확정 상태 부재가 Play 경로에도 적용, `assetlinks.json` 서명 지문 placeholder,
  Android 빌드·기기 검증 미수행 → `plan.md`의 **출시 게이트 G6~G9** 신설
- 재검증: typecheck 0 / `npm test` **417/417** / `check:*` 15개 전부 PASS / `qa:all-services` PASS
- Codex 독립 확인: 병합 커밋 부모 2개, `backup/pre-merge-20260910` = `dac3835`,
  원격 어느 브랜치도 병합을 포함하지 않음, 스키마 변경·DB 쿼리 없음,
  `.env.example` 비밀값 없음, 매니페스트 20개 유니크·BOM 없음, `wedding_day.md` BOM 유지

### 배포 게이트 현재 상태
`check:production-source` 차단 요인이 **2건 → 1건**으로 줄었다.
- ~~HEAD가 `origin/main`을 포함하지 않음~~ → **해소** (병합)
- 작업 트리 비청결 → **TASK-008(커밋 전략)** 이 유일한 남은 차단 요인

## 2026-09-10 — task-008 미커밋 산출물 정리 (DONE) — 배포 게이트 녹색

- 사용자 승인: "이 분류로 커밋"
- 커밋 `f9bcd17`, **219파일**. **push 미수행** (`ahead 24`)
- 커밋 전 안전 검사: 후보 261파일에서 JWT / `sb_secret_`·`sk-` / 비밀번호 포함 Postgres
  접속문자열 / `Bearer 토큰` / 이메일 / 전화번호 **전부 0건**.
  패턴은 양성 대조(`src/auth/admin.ts`, `.env.example`에서 이메일 검출)로 유효성 확인
- gitignore 추가 (커밋 안 함): `CLAUDE.local.md`(파일이 커밋 금지 명시),
  `output/`(39, QA 산출물), `CreamAI/logs/**/_prompt_*.txt`(8, ProjectOps §8.4 원문 프롬프트 미저장).
  `*.codex-stdout.log` 6건은 기존 `*.log` 규칙으로 이미 무시
- **배포 게이트가 처음으로 PASS로 바뀌었다:**
  `[production-source] PASS: clean source includes the current remote main.`
  차단 요인 2건(T04) → 1건(TASK-009 병합 후) → **0건**
- 작업 트리 dirty **0건**. 커밋 후 재검증: MANIFEST SHA-256 ALL OK(21), typecheck 0 오류

### 현재 커밋 스택 (전부 미푸시, ahead 24)
```
f9bcd17  chore(projectops): AIOps 워크스페이스·admin-ops 산출물 커밋
67b4d7b  fix(wedding): 병합이 남긴 중복 analyze 라우트 수정
659ba7f  merge: origin/main 21커밋 통합
```
복구 지점 `backup/pre-merge-20260910` = `dac3835`

## 2026-09-10 — TASK-015 운영 배포 (DONE) — SEO·FAQ·about 복구

### 배포 전 발견: 세션 중에 운영이 바뀌어 있었다
- 15:11 KST에 `origin/main` 계열이 Production에 배포되어(`dpl_GvzMisxCbojK93hZVYJ8f5W6LiMq`)
  `umsh.kr` 별칭을 가지고 있었다. **나는 그 배포를 실행하지 않았다.**
- 그 배포로 **우리 브랜치 10커밋의 공개 SEO·FAQ·about 작업이 서비스되지 않게 됐다**:
  `/robots.txt` `/sitemap.xml` `/about` `/faq` 전부 **404**, `/api/services` **15종 → 14종**
  (집 풍수가 목록에서 사라짐)
- 반대로 그 배포는 **결제 문구의 환경변수 노출을 해소**하고 Android App Links를 가져왔다
- ~~**U14 확정**: `vercel project inspect`에 Git 연동 섹션이 아예 없다. 배포는 CLI 전용이며
  `README.md`의 "main push가 Production을 트리거한다"는 사실이 아니다~~
  → **이 판단은 틀렸다(16:25 정정).** 연동은 있었고 `README.md` 서술은 사실이었다.
  실제 원인은 CLI 배포가 연동 배포를 우회한 것이다
- 기록: `docs/admin-ops/production-state-20260910-1511.md`

### 사용자 결정
"기존에 제작한 SEO 그건 복구해야해" + **병합본을 지금 배포**

### 배포 전 처리
- 게이트가 다시 BLOCKED로 바뀜 → 원인 2개 해소:
  (1) 문서 커밋 `569aef3`, (2) **`origin/main`이 또 갱신됨**(`fb686b6` → `f825d26`,
  Android Play 스토어 문서 4파일) → 병합 `006defe`
- 재검증: typecheck 0 오류, 로컬 서비스 15종, `check:production-source` **PASS**

### 배포
- `vercel deploy --prod` → `https://chungi-387wmilw8-ax-lab-cream.vercel.app`
- 빌드 로그: `Generated 126 FAQs in 11 categories`,
  `PASS SEO: robots, 19 sitemap URLs, consistent Organization/WebSite, 126 FAQ answers`
- **Aliased: https://umsh.kr**

### 복구 검증 (배포 전 → 후)
| 항목 | 전 | 후 |
| --- | --- | --- |
| `/robots.txt` | 404 | **200** |
| `/sitemap.xml` | 404 | **200** |
| `/about` | 404 | **200** |
| `/faq` | 404 | **200** |
| `/api/services` | 14종 (집 풍수 없음) | **15종 (집 풍수 포함)** |

### 15:11 배포의 개선도 유지됨
| 항목 | 현재 |
| --- | --- |
| `setupMessage` | `"지금은 결제를 열 수 없습니다…"` — 환경변수 미노출 유지 |
| `assetlinks.json` | HTTP 200 |
| 결제 catalog / storage | 19종 / supabase |

### 운영 통합 점검
8 PASS / 2 FAIL. 실패 2건은 **기존 항목**이며 이번 배포와 무관하다
(`INICIS_MID`·`INICIS_SIGNKEY` 미설정 → checkout 비활성. TASK-007 범위, U22 선행 필요).
`/api/health` ok:true, openai:true, corpus 28팩 / registry 1.9.0.

### 미수행
- **`git push` 차단됨** (권한). 커밋 스택이 로컬에만 있어 이번 사고의 근본 원인(원격 미보존)이
  아직 남아 있다. 사용자 조치 필요

## 2026-09-10 — task-018 배포 경로 정상화 (제안 완료, 적용 승인 대기)

- ~~**U14 해소.** Git 연동 부재를 도구 출력으로 확정: `vercel project inspect`에 Git 섹션
  부재, `vercel git ls`에 조회 서브커맨드 없음, Production 배포 3건 모두 git 메타데이터 없음
  → 배포는 CLI 전용. `git push`는 배포를 트리거하지 않는다~~
  → **이 결론은 틀렸다.** 아래 "2026-09-10 16:25 — task-018 완료 및 U14 정정" 절 참조
- `README.md` 배포 섹션 정정: 거짓 서술 제거, 실제 절차, 게이트 선행 이유,
  브랜치 기준(로컬 `main`을 쓰지 말 것) 명시
- 제안서: `docs/admin-ops/TASK-018-deploy-path.md`

### 전환 순서 — 바꾸면 사고 재발
`origin/main`은 우리 HEAD의 **조상**이다 (0 behind / 16 ahead, fast-forward 가능).
그러나 **`origin/main`에는 아직 우리 16커밋이 없다.**
연동을 먼저 켜고 누군가 `main`에 push하면 **불완전한 main이 자동 배포**되어
15:11 회귀가 재발한다.

```
1) git push origin fix/umsh-qa-ux      # 브랜치 보존
2) git push origin HEAD:main           # main fast-forward (강제 불필요)
3) 0 behind / 0 ahead 확인
4) vercel git connect …                # 그 다음에 연동
5) main 에 커밋 push 해 자동배포·git 메타데이터 확인
```
되돌리기: `git push origin f825d269:main --force-with-lease`

### 로컬 `main` 판정
`5269272`(09-02), `origin/main` 대비 150 behind / 28 ahead. 낡은 라인이다.
28커밋의 기능은 모두 현재 코드에 있고, `data/pungsu/**`·`src/pungsu/home-service.ts`(607줄)는
외부 풍수 API(`PUNGSU_DATASET_API_BASE`) 연동으로 대체되어 현재 코드에서 참조되지 않는다
(현재는 `src/pungsu/dataset-client.ts` 하나). 보관하되 배포 기준으로 쓰지 않는다.

### 중복 배포 주의 (TASK-005 범위 제약)
연동 후 GitHub Actions에 `vercel deploy`를 넣으면 push 한 번에 배포가 2회 돈다
(T02 리서치 F9). Actions는 **CI 전용**(typecheck + test + `check:*`)으로 제한한다.

### 승인 필요
1. `git push origin HEAD:main` — 현재 세션에서 push 권한이 차단되어 사용자 직접 실행
2. `vercel git connect` — Vercel 설정 변경
3. Production Branch를 `main`으로 둘지 확정
**1 → 2 순서 필수**


## 2026-09-10 16:25 — task-018 완료 및 U14 정정

### U14 판단이 틀렸다 — 16:25 시점에 Git 연동이 존재한다

`vercel git connect` 실행 결과:
```
> axlab-cream/chungi-t is already connected to your project.
```
그리고 `git push origin fix/umsh-qa-ux`와 `git push origin HEAD:main` 직후
Preview·Production 배포가 각각 자동으로 시작됐다.

**내가 왜 틀렸나.** 근거로 삼은 두 관측이 모두 연동 여부를 판정할 수 없는 신호였다.

| 관측 | 내 결론 | 실제 |
| --- | --- | --- |
| `vercel project inspect`에 Git 섹션 없음 | 연동 없음 | CLI 출력이 Git 섹션을 표시하지 않을 뿐 |
| Production 배포 3건에 git 메타데이터 없음 | CLI 배포뿐 → 연동 없음 | 메타데이터 부재는 CLI 배포와 **양립**하지만 배포 경로를 식별하지 못한다 |

관측은 맞았고 **해석이 틀렸다.** Codex가 T02 리뷰에서 "메타데이터 부재는 CLI 배포의
증거가 아니다"라고 지적해 한 번 가설로 낮췄는데, 이번에 다시 단정으로 올렸다. **같은 실수 반복.**

**그리고 정정 초안에서 같은 실수를 반대 방향으로 또 했다** (Codex task-018 리뷰 Major 1).
"Git 연동은 처음부터 있었다"·"그 3건은 실제로 CLI 배포였다"고 적었는데, 증거는
**관측 시점의** 연결 상태와 라우팅만 증명한다. 이전 배포 당시의 상태는 확정할 수 없다.
→ 전 문서에서 "16:25 시점에 연동이 존재한다"로 하향했다.

### 그래서 오늘 사고의 진짜 원인
연동 부재가 아니라 **CLI 배포가 연동 배포를 우회한다는 것**이다.
`vercel deploy --prod`는 Git 상태와 무관하게 로컬 작업 트리를 올리므로,
연동이 있어도 `main`에 없는 소스가 운영이 된다.
**규칙: `--prod` CLI 배포를 기본 경로로 쓰지 않는다. `main` push로만 배포한다.**

### 수행 결과 (D1~D6 전부 완료)
| 단계 | 결과 |
| --- | --- |
| D1 `git push origin fix/umsh-qa-ux` | `dac3835..0556e49` (exit 0) |
| D2 `git push origin HEAD:main` | `f825d26..0556e49` fast-forward (exit 0) |
| D3 분기 확인 | `origin/main...HEAD` = `0  0`, `merge-base --is-ancestor` 성공 |
| D4 `vercel git connect` | **이미 연결됨** — U14 정정의 근거 |
| D5 라우팅 관측 | 관측한 `main` push→**Production**, 브랜치 push→**Preview**. **2회 재현**(16:19, 16:39). 단 **Production Branch 설정값 자체는 대시보드/API로 확인하지 않았다** |
| D6 연동 배포 검증 | `dpl_42CkhxK2KC4CAKbPEwMQVQDAVXs1` Ready(46s), alias `chungi-t-git-main-ax-lab-cream.vercel.app`, `umsh.kr` 이동. **관측 1건이므로 alias 형식을 배포 경로의 단독 판정자로 쓰지 않는다** |

### 운영 회귀 복구 확인 (배포 후 실측)
| 검증 | 결과 |
| --- | --- |
| `/robots.txt` `/sitemap.xml` `/about` `/faq` `/my` | **전부 200** (404에서 복구) |
| `/.well-known/assetlinks.json` | **200** (origin/main 개선 유지) |
| `GET /api/services` | **15종, `home_pungsu` 포함** (14종에서 복구) |
| `GET /api/payment/config` | 환경변수 이름 노출 **0건**, catalog 19종, 문구 정상 |
| `/privacy` 마커 | `UMSH 운명상회` / `v=20260909-logo` |

→ **회귀 복구와 개선 유지를 동시에 달성.** 사용자 지시("기존에 제작한 SEO는 복구해야 한다") 이행 완료.

### 문서 정정 범위
`README.md`(배포 경로 2개 명시), `docs/admin-ops/TASK-018-deploy-path.md`(§0 신설),
`production-source-of-truth.md`, `production-state-20260910-1511.md`(§7 복구 결과 추가),
`T04-regression-baseline.md`, `plan.md`, `tests.md`(V-069 무효화, V-072~V-075 추가)

### 다른 저장소의 push
사용자 확인: 다른 곳에서 push되던 것은 **네이티브앱 폴더(별도 저장소)**이며 이 저장소와 무관하다.
→ 이 저장소의 `main`은 우리 브랜치와 동일하므로 제3자 push로 인한 회귀 위험은 현재 없다.

### 남은 제약
- GitHub Actions에 `vercel deploy`를 넣지 않는다 (push 1회에 배포 2회 — TASK-005 범위 제약)
- `check:production-source`는 유지한다. 연동이 있어도 **push 전 게이트**로 필요하다
- **CLI 배포 금지에는 자동 강제 수단이 없다.** 게이트 스크립트가 스스로
  "Manual preflight only … does not intercept other deploys"라고 밝힌다
  (`scripts/check-production-source.mjs:5`). 이것은 기술적 통제가 아니라 **운영 절차 규칙**이다
- 15:11 배포에서 preflight 실행 여부는 **기록으로 확인되지 않았다.** "게이트를 건너뛴
  결과"라고 단정하지 않는다
## 2026-09-10 17:05 — task-013 결혼택일 RAG 렌더링·문맥 이식 (완료)

### 고친 것 두 개
1. **RAG 검색 결과가 본문에 도달하지 않았다.** `sectionBody`가 배정된 청크를
   `_chunk`(미사용 매개변수)로 받았다. **검색 비용은 쓰고 결과는 버렸다.**
   → 각 대분류 마지막 문단에 `[참고 기준]`으로 근거를 싣는다.
2. **계산한 사실이 LLM 문맥에 없었다.** `buildWeddingContext`가 고정 문구뿐이라
   후보일 판정·요일·조건 수·절기 달·상대 명식이 전달되지 않았다.
   → 전부 문맥에 싣고, 병합 때 삭제됐던 테스트 3건을 복구했다.

### 부수 발견 — 배선을 살리자 숨은 품질 문제가 드러났다
같은 청크가 3개 대분류에 배정되어 **같은 근거 문단이 반복**됐다.
검색을 상위 2건 받아 `[0]`만 썼기 때문이다. 상위 4건 중 **미사용 청크를 먼저 고르도록**
바꾸자 6개 대분류가 서로 다른 근거를 받고, 각 근거가 그 주제에 맞아떨어졌다.

### 내가 만든 개인정보 노출을 Codex가 잡았다 (Critical 2건)
반대편 구현을 그대로 이식하면서 `context.partner.birth`에 **상대의 연·월·일·시·분·
성별·달력**을 실었다. 이 문맥은 리포트 payload 로 파일/DB/Supabase 에 저장되고
분석·조회 응답으로도 나간다. → **문맥에서 원본을 제거**했다(계산 결과만 남김).
sanitize 로 막는 대신 **애초에 담지 않는 쪽**을 골랐다.
회귀 테스트로 직렬화 문자열에 상대 생년월일시 흔적이 없음을 확인한다.

**이식은 복사가 아니다.** 같은 코드가 다른 저장·전송 경로에 놓이면 개인정보 등급이 달라진다.

### 리뷰 지적 하나는 근거를 갖춰 반박했다 (Major 1)
`partner.pillars`의 한자에 독음을 붙이라는 지적. 반영하지 않았다.
- 검수기(`interpretation-validation.ts:47`)의 한자 검사 대상은 **생성된 본문**이고 문맥이 아니다
- `partner.pillars`를 한자 그대로 두는 것은 6개 서비스 공통 규약이다
→ 위험은 인정하되 **U27**(전역 사안)으로 올렸다.

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **430 pass / 0 fail** (417 → 430) |
| `npm run typecheck` | 0 오류 |
| 음성 대조 | 배선 제거 시 해당 테스트만 실패 → 복원 확인 |
| 코퍼스 전수 실측 | 363청크, 출력 최대 170자, 한도 초과 0건, `。` 0건 |
| `check:wedding` `check:newyear` `check:polish` `check:service-contracts` `check:prompt-guide` | PASS |
| `qa:all-services` | 20/20 |
| `check:integrations` | Inicis MID/SignKey 미설정 2건 FAIL — TASK-007/U22 소관, 이번 변경 무관 |

### 코퍼스가 내 규칙을 반증했다
처음 쓴 전수 불변식("모든 근거는 문장 끝에서 끝난다")이 `mr-001`에서 실패했다.
그 청크는 **원문 자체에 마침표가 없다** — 절단 문제가 아니다.
→ 단정을 "실제로 잘린 경우"로 좁혔다. **개별 케이스 테스트만 썼다면 이 사실을 못 보고
잘못된 규칙을 굳혔을 것이다.**

### 신규 미해결
- **U26**: `love_this_year`·`love_again` 등은 여전히 `context.partner.birth`에 상대
  생년월일시를 담아 저장·반환한다(`src/server/app.ts:873-877`,
  `src/report/report-generator.ts:2059`). 결혼택일만 고쳤다. 전 서비스 정리는 별건이다
- **U27**: `partner.pillars`를 한자 그대로 문맥에 넣는 규약 (6개 서비스 공통)
### 검증 도구 자신의 결함 — ProjectOps 테스트 하네스가 테스트를 돌리지 않았다
`run-projectops-harness.ps1`의 `$ProjectRoot`는 `CreamAI/`다. 그런데 `Get-PackageScripts`가
`$ProjectRoot/package.json`을 찾아서 **항상 없다고 판정**하고
`WARN: package.json has no test script`만 남긴 뒤 `failed: false`로 기록했다.
→ **`npm test`가 한 번도 실행되지 않았다.** 과거 `task-002_test.json`도 같은 상태다.

수정: `$RepoRoot`를 분리(`package.json`이 `$ProjectRoot`에 없으면 상위 폴더)하고
`Invoke-TrackedCommand`에 `-WorkingDirectory`를 추가해 npm 명령을 저장소 루트에서 돌린다.
재실행 결과: `PASS npm test exit_code=0`, tail 에 `fail 0` 기록됨.

**교훈: 하네스의 `failed: false`는 "검사가 통과했다"가 아니라 "검사가 실패를 보고하지
않았다"는 뜻일 수 있다. WARN 을 통과로 읽지 않는다.**
## 2026-09-10 17:55 — task-019 상대 개인정보 전 서비스 정리 (U26 해소)

### 무엇이 문제였나
리포트 문맥의 `context.partner.birth` 에 **상대의 생년월일시·성별**이 들어 있었다.
상대는 이 서비스의 사용자가 아니다 — 동의 절차도 삭제 요청 창구도 없다.
그 데이터가 저장소, API 응답, 그리고 **외부 모델 프롬프트**로 흘렀다. 6개 서비스 공통.

### 데이터가 나가는 경계를 세서 처리했다
| 경계 | 지점 수 | 처리 |
| --- | --- | --- |
| 쓰기(저장) | 6 | 5개 서비스 partner 블록에서 `birth` 제거 + `enrichReportContext` 계산 후 버림 |
| 응답 | 7 | `publicReportContext` 통과 |
| LLM 프롬프트 | 2 | `sectionPrompt` 의 `context` **와 `featureJson`** |
| 파생 저장 | 1 | 저장된 상담이 부모 문맥을 복사·저장·전송하던 경로 |

### Codex 가 잡은 것 — 내가 놓친 경계 2개
1. **`featureJson.userContext`**: `sectionPrompt` 의 `context` 만 가렸는데,
   같은 프롬프트의 `featureJson` 이 문맥을 통째로 싣는다(`analyzer.ts:488`).
   과거 레코드에서 섹션을 재생성하면 원본이 외부 모델로 나갔다.
   → 처음엔 호출자에서 막았는데 **테스트가 함수를 직접 호출하자 여전히 실패**했다.
   함수 자신이 걷어내도록 고쳤다. **호출자만 고치면 다음 호출자가 다시 샌다.**
2. **저장된 상담**: `saved-chat.ts:141` 이 부모 문맥을 복사해 시스템 메시지로 직렬화하고
   **새 레코드로 저장**했다. `/api/chat` 이 `parentReportId` 를 받으므로 과거 원본이 다시 퍼졌다.

### 사용자 결정
1. `love_this_year` 도 저장·응답에서 제거 (개인정보 우선) — 저장된 해석 재열람 시 상대
   입력 폼이 비는 것을 감수
2. 과거 레코드는 **삭제하지 않고 응답에서만 가림**

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **446 pass / 0 fail** (430 → 446) |
| typecheck | 0 오류 |
| 음성 대조 3건 | 궁합 서비스 / `/api/report/:id` / 저장된 상담 — 각각 되돌려 해당 테스트만 실패 확인 후 복원 |
| `check:*` | 15/15 PASS |
| `qa:all-services` | 20/20 |

### dead path 판정
`parseOptionalPartnerContext` 는 `/api/saju/analyze` 에서만 도달하고, 그 라우트가
`love_this_year` 를 즉시 400 으로 막는다(`app.ts:2511-2513`).
→ **상대 정보 유입구는 현재 도달 불가**이며 과거 레코드에만 원본이 남아 있다. Codex 동의.
라이브 경로는 `사주/js/thisyear-service.js` → `/api/love/this-year/analyze` 이고
그 서비스는 partner 블록을 만들지 않는다.

### 신규 미해결
- **U28**: cmdg 의 레거시 love_this_year 분기. 정리된 레코드를 복원하면 `partnerMode='known'`
  인데 상대 칸이 공란이라 수정 없이 제출하면 검증 오류가 난다(런타임 오류 없음).
  그 제출 경로 자체가 이미 400 이라 프런트엔드를 바꾸지 않았다
- **과거 레코드 소급 정리**: 저장소에는 원본이 그대로 있다. 하려면 영향 레코드 수 집계가 선행
## 2026-09-10 18:40 — task-011 브랜드 통일 + 정적 노출 차단

### 브랜드 정본은 코드가 이미 답하고 있었다
`og:site_name`·schema.org `Organization.name`·`WebSite.name`·`<title>` 19개가 모두
`운명상회` 였고, `UMSH 운명상회` 는 정책 페이지 4개에만 있었다.
→ 그 4개를 `운명상회` 로 통일하고, 도메인 토큰은 `Organization.alternateName: "UMSH"` 로 남겼다.
`UMSH*` 561건 중 대부분은 코드 식별자여서 대상이 아니다.

### 그 작업 중에 발견한 것 — 운영에서 내부 산출물이 공개되고 있었다
| 노출 | 개수 | 조치 전 |
| --- | --- | --- |
| `PROMPT.md` (서비스 생성 프롬프트 **원문**) | 15 | **200** |
| `*.py` (스크래핑·검증 스크립트) | 7 | **200** |
| `*-RESULT.json` (생성 결과) | 18 | **200** |
| `extracted_decoded.html` (외부 사이트 스크래핑 121KB) | 1 | **200** |
| 앱 페이지 중복 URL (`/사주/index.html`) | 1 | **200** |

`express.static` 이 정적 트리를 통째로 내보내고 있었다. 정적 마운트 앞에 가드를 두어
비웹 확장자와 중첩 폴더의 두 번째 URL 공간(`/사주/...`)을 막았다.
**저장소 파일은 지우지 않았다** — 서비스 폴더 규약의 일부이고 로컬 스크립트가 읽는다.

### 테스트가 내 가드의 구멍 둘을 찾았다
1. `PROMPT%2Emd` — `req.path` 는 디코딩되지 않는데 `express.static` 은 디코딩한 경로로 찾는다
2. `PROMPT.md/` — **원문 4017바이트를 그대로 반환했다.** `send` 가 끝의 슬래시·점을 무시한다
→ 원본·디코딩본·끝문자 제거본을 모두 검사(`staticPathCandidates`).
**"차단됐다"를 코드 리뷰로 판단하지 않고 요청을 보내서 판단했다.**

### Codex Critical — 확장자 목록이 `.html` 산출물을 놓쳤다
스크래핑 결과가 `.html` 이라 목록을 지나갔다. → URL 공간 자체를 닫았다.
Major(allow-list 구조 전환)는 **U31** 로 승격 — 정적 구조 재편이라 이 Task 범위를 넘는다.

### 내가 만든 사고 둘 (같은 원인: 문자열 조립)
1. 파이썬 슬라이싱으로 `about.html`·`portal.html` **527줄을 지웠다.**
   `git diff --stat` 으로 즉시 발견 → `git checkout` 복원 → 정확한 치환으로 재작업(diff +2/-1)
2. 정규식 편집 중 **백스페이스 제어문자(0x08)** 가 박혀 `<script` 가 죽은 패턴이 됐다.
   눈으로는 안 보였고 `cat -A` 로 확인. 변경 파일 전수에서 0x08 재검사(0건)
→ **유일 매칭 문자열 치환만 쓰고, 편집 직후 `git diff --stat` 으로 줄 수를 본다.**

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **471 pass / 0 fail** (446 → 471) |
| 우회 매트릭스 | 8변형 전부 404 |
| 과잉 차단 방지 | `robots.txt`·`sitemap.xml`·`assetlinks.json`·`/privacy`·`/css/policy.css` 200 |
| 음성 대조 | 가드 무력화 시 8건 실패 → 복원 |
| `check:*` / `verify-seo-foundation` / `qa:all-services` | 15/15 · PASS · 20/20 |

### 신규 미해결
- **U31**: 정적 제공을 allow-list(공개 전용 디렉터리)로 전환. 확장자 deny-list 는
  새 산출물 형식에 진다. 파일을 배포 산출물에서 제외하는 것도 함께 판단
### [2단계] Express 가드만으로는 부족했다 — Vercel 정적 레이어가 우회했다

가드를 배포한 뒤 운영을 재확인하니 **저장소 경로와 겹치는 URL 이 여전히 200**이었다.

| 경로 | 가드 배포 후 |
| --- | --- |
| `/사주/me/pass-angle/01-step-1-story/PROMPT.md` | **200** (프롬프트 원문) |
| `/사주/사주/extract_mhtml.py` | **200** |
| `/사주/사주/extracted_decoded.html` | **200** |
| `/data/runtime-config.json` | **200** (런타임 설정) |
| `/prompts/README.md` | **200** |

원인: `vercel.json` 의 `rewrites` 는 **파일시스템을 먼저 확인**한다. 저장소 경로와 겹치는
URL 은 함수를 거치지 않고 배포 산출물에서 그대로 나갔다. Express 가드는 볼 기회가 없었다.

조치: 레거시 `routes` 로 바꿨다. `handle: filesystem` 단계를 두지 않으면 파일시스템보다
먼저 적용되므로 **모든 요청이 함수로 간다.** 실질 변화는 작다 — 예쁜 URL 은 이미 함수를
거치고 있었고, 저장소 경로와 겹치는 URL 만 정적으로 나가고 있었다.

`vercel.json` 형태를 테스트로 고정했다 — 캐치올 route 존재, `rewrites` 부재
(되돌리면 구멍이 다시 열린다), `routes` 와 공존 불가한 키 부재, `includeFiles` 유지.

### 배포 후 운영 실측 (2026-09-10 19:0x)
| 검사 | 결과 |
| --- | --- |
| 노출 7경로 (프롬프트·스크립트·스크랩·runtime-config·README·중복 URL) | **전부 404** |
| `/` `/faq` `/about` `/privacy` `/robots.txt` `/sitemap.xml` `/.well-known/assetlinks.json` | **200** |
| `/css/policy.css` `/js/faq-knowledge.js` `/assets/umsh-brand-logo.png` `/favicon.ico` | **200** |
| `/day/wedding/01-step-1-story/index.html` | **200** |
| `/privacy` `/terms` 제목 | **· 운명상회** (브랜드 통일 반영) |
| `about` 구조화 데이터 | `"alternateName":"UMSH"` |
| `GET /api/services` / `/api/payment/config` | 15종 / catalog 19 |

**교훈: 가드는 "요청이 그 가드를 지나가는가"부터 확인해야 한다.**
Express 안에서 막았다고 끝이 아니었다. 배포 플랫폼의 라우팅 순서가 먼저다.
## 2026-09-10 19:40 — task-020 정적 제공을 허용 목록으로 (U31 해소)

### 기본값을 뒤집었다
거부 목록은 형식을 세는 방식이라 새 형식에 진다(Codex task-011 Major).
→ **허용 목록**으로 전환. 웹 형식만 통과하고 나머지는 기본 거부.
근거는 트리 실제 분포(webp 446 · html 127 · js 61 · mp4 56 · png 52 · css 21 · woff2 9 ·
ttf 3 · xml 1 · jpg 1 · ico 1). 소스맵은 넣지 않았다. 확장자 없는 파일 0개를 테스트로 고정.

### 살아 있는 유출 둘을 더 찾았다
| 유출 | 찾은 사람 | 내용 |
| --- | --- | --- |
| `GET …/PROMPT.md%5C` → **200** | Codex (응답 검증) | 프롬프트 원문 전체. Windows 는 백슬래시를 경로 구분자로 쓰는데 끝문자 제거가 `/`·`.`·공백만 처리했다 |
| `GET /extracted_decoded.html` → **200** | 내 확인 | 외부 사이트 스크랩 **116KB**. 중첩 폴더가 `/사주/` 말고 **루트에도** 통째로 마운트돼 있었다 |

두 번째는 마운트가 제공하던 것을 파일 단위로 세어 보고 제거했다 — 최상위 웹 확장자
파일은 `index.html`(라우트가 직접 보낸다)과 스크랩 산출물 둘뿐이고 `assets/` 는 이미
경로별로 명시 마운트돼 있었다. **그 마운트는 스크랩 산출물만 추가로 공개하고 있었다.**

### 같은 가드가 여섯 번 뚫렸다
`%2Emd`(내 테스트) → `PROMPT.md/`(내 테스트, 원문 4017B) → Vercel `rewrites` 가 가드 자체를
우회(배포 후 운영 재확인) → `.html` 산출물이 목록 통과(Codex) → `%5C`(Codex 응답 검증) →
중첩 폴더 루트 마운트(내 확인, 116KB).

**교훈: 보안 가드는 한 번에 완성되지 않는다.** 매번 "이제 됐다"고 느꼈고 매번 남아 있었다.
(1) 매트릭스를 테스트로 남긴다 (2) 배포 후 운영에서 다시 확인한다 (3) 음성 대조로 가드가
그 케이스를 실제로 막는지 확인한다 — 하나라도 빼면 다음 구멍을 못 본다.

### 검증
| 항목 | 결과 |
| --- | --- |
| `npm test` | **498 pass / 0 fail** (474 → 498) |
| 음성 대조 3건 | 허용목록→거부목록 6건 · 백슬래시 정규화 제거 6건 · 중첩 마운트 복원 1건 실패 → 복원 |
| 배포 후 운영 | 차단 7종 **404** / 정상 15종 **200** |
| `check:*` / `verify-seo` / `qa:all-services` | PASS · PASS · 20/20 |

### 신규 미해결
- **U32**: 공개 자산 전용 디렉터리로 옮기는 경로 기반 모델. `SAJU_ROOT` 전체 마운트가
  남아 있어, 웹 확장자로 내부 산출물이 새로 생기면 **테스트는 잡지만 런타임은 막지 못한다**
## 2026-09-10 20:10 — task-005 GitHub Actions CI (검사 전용)

### 문제
지난 여러 Task 의 게이트가 **내 로컬에서만** 돌고 있었다 — 정적 노출 매트릭스,
상대 개인정보, RAG 배선, 브랜드·검색 기반, 20개 서비스 QA.
`.github/workflows/` 는 **빈 폴더**였다. 다른 사람 push 는 게이트를 거치지 않는다.

### 구성 (배포 단계 없음)
checkout@v5 → setup-node@v5(`.nvmrc`=24) → `npm ci` → typecheck → test →
검수 15개 → 검색 기반(커밋 상태) → 20개 서비스 QA → **`vercel-build`(배포 빌드 검증)**
→ **`git diff --exit-code`(생성물 최신)**. 권한은 `contents: read` 하나.

제외 2개와 이유를 워크플로에 적었다 — `check:integrations`(실계정 필요),
`check:production-source`(배포 직전 preflight, main 보다 뒤처진 브랜치에서 정상 실패).

### 실측
| 항목 | 결과 |
| --- | --- |
| GitHub 실행 | **4회 모두 success** (1m53s · 2m15s · 2m20s · main), 10단계 녹색 |
| `main` push | CI 1회 + Vercel Production **1회** — 중복 배포 없음 |
| `npm test` | **503 pass / 0 fail** (498 → 503) |
| Node 정합 | `.nvmrc` 24 = Vercel `nodeVersion` **24.x** (드리프트 없음) |
| 음성 대조 5건 | 배포 주입 / 게이트 삭제 / 권한 승격 / job 권한 / `npx vercel@latest --prod` |

### Codex 가 잡은 것
1. **CI 가 Vercel 실제 빌드를 돌리지 않았다.** `vercel-build` 가 FAQ 126건·사이트맵 생성과
   `public/` 복사를 한다 → 복사 원본 누락은 **배포에서만** 깨진다. 게이트로 추가하고
   `git diff --exit-code` 로 생성물 최신성까지 확인
2. **권한 계약이 정책보다 약했다.** `contents: read` 가 **있는지만** 봐서 추가 권한이나
   job 수준 승격을 놓쳤다 → 블록 1개 · 내용 정확히 1줄로 강화
3. 배포 금지가 문자열 목록이라 `npx vercel@latest --prod` 를 놓쳤다 → 정규식으로

**교훈: "CI 가 로컬과 같은 것을 돌리는가"가 아니라 "CI 가 배포와 같은 것을 돌리는가".**
그리고 보안 계약은 "있는지"가 아니라 **"그것만인지"** 를 검사해야 한다.

### 알아 둘 것
- **CI 는 배포를 차단하지 못한다.** Vercel 연동 배포는 CI 와 병렬로 시작한다.
  차단이 필요하면 GitHub 브랜치 보호(required status check) 설정이 필요하다 — 사용자 판단
- `gh` 는 remote 가 여러 개면 `upstream` 을 골라 404 를 낸다. `--repo` 를 명시해야 한다

### 신규 미해결
- **U34**: 액션을 커밋 SHA 로 pin + Dependabot (지금은 공식 액션 mutable 태그)
- 브랜치 보호 규칙 도입 여부 (CI 를 배포 차단 게이트로 쓸지)
## 2026-09-10 20:40 — task-021 자산 엣지 캐시 + T07 관리자 셸

### task-021 — 자산이 매 요청 함수를 거치고 있었다
운영 실측: `Cache-Control: public, max-age=0` · `X-Vercel-Cache: MISS` ·
1.6MB PNG · 341KB webp. `express.static` 기본값으로는 Vercel CDN 이 응답을 보관하지 않는다.

`immutable` 은 쓸 수 없다 — `/css`·`/js` 참조 **789건 중 버전 쿼리가 붙은 것은 164건(21%)**
뿐이라 나머지는 배포 후 낡은 파일을 계속 쓴다.
→ **브라우저는 짧게(300s), 엣지는 길게(1년)**. Vercel 캐시는 배포 단위로 무효화되므로
자산이 바뀌는 유일한 계기에 자동 갱신된다. HTML 은 `max-age=0` 유지.

**배포 후 실측: `X-Vercel-Cache: HIT`.** `s-maxage` 는 클라이언트 응답에서 사라지는데,
Vercel CDN 이 그 지시자를 소비하고 제거하는 정상 동작이며 `HIT` 으로 캐시를 확인했다.

### T07 — 관리자 셸·라우터 (사용자 지시 1번)
ADR-0002 **Accepted (사용자 승인)**. U3 해소. 초안 전제 두 가지를 갱신했다 —
`routes` 캐치올로 모든 요청이 함수를 지난다는 점, 그리고 D1 의 경고가 **실측으로
확인됐다는 점**(TASK-011·020 에서 프롬프트 원문·스크랩이 인증 없이 서비스됐다).

| 항목 | 내용 |
| --- | --- |
| 셸 | `admin-ui/index.html` — 정적 루트 **밖**(D1), 인라인 CSS/JS, 새 CDN 없음 |
| 라우트 | `/admin` + 딥링크. **정적 마운트 위**(D2-2). `noindex` + `no-store` |
| API | `GET /api/admin/v1/me` (`/api` 안이라 no-store + Vary 자동) |
| 디자인 | 의미 기반 토큰 독립 정의(D3), 색 + 텍스트 라벨(D4), `tabular-nums` |

### Codex Critical — 내가 스스로 기록한 규칙을 위반했다
초판은 `/api/admin/v1/me` 에서 **`isAdminOwner` 로 관리자 권한을 부여했다.**
`plan.md` 와 `T01-baseline.md` 에 이미 이렇게 적어 두었다:
> 관리자 권한 판정에 `isAdminEmail`·`isAdminOwner`(레거시 unlock)를 **절대 사용하지 않는다.**

그 목록은 **결제 없이 유료 리포트를 여는 레거시 unlock** 이다. 운영 권한으로 재사용하면
직원 membership 없이 관리자 API 가 열리고 회수·감사 경로가 없는 "코드에 박힌 권한"이 된다.

→ **지금은 누구에게도 권한을 주지 않는다.** 인증된 회원에게도 403
`STAFF_MEMBERSHIP_REQUIRED`. A02 테스트로 고정했다(unlock 이메일 → 403).
T05 가 회수 가능한 membership 원본을 만들면 그때 판정을 교체한다.

**교훈: 내가 문서에 적어 둔 금지 규칙을 구현 단계에서 다시 읽지 않았다.**
Task 착수 시 `plan.md` 의 해당 영역 제약을 먼저 읽는 절차가 필요하다.

### 배포 후 운영 실측
| 경로 | 결과 |
| --- | --- |
| `/admin` `/admin/` `/admin/orders` `/ADMIN` | 200 + noindex + no-store |
| `/admin-ui/index.html` | **404** (정적 경로로 열리지 않는다) |
| `/api/admin/v1/me` 미인증 | **401** `AUTH_REQUIRED` |
| 자산 | `X-Vercel-Cache: HIT` |

### 신규 미해결
- **U36**: 관리자 HTML 진입점을 인증 뒤로 옮기려면 서버 세션 쿠키가 필요하다.
  지금은 데이터 없는 셸을 익명에게도 준다 → 관리자 경로·메뉴 구조가 노출된다
- **(2) 최소 관리자**를 붙이려면 T05 없이 무엇을 권한 근거로 쓸지 먼저 정해야 한다

## 2026-09-11 — 관리자 직원 로그인 + 권한 근거 (사용자 지시)

### 사용자가 본 것: "로그인 ID PW 넣는 곳이 나와야 하잖아"
맞는 지적이었다. 셸에 **입력 지점이 아예 없었다.** `data-admin-state="anonymous"` 패널이
`<a href="/login">` 로 보내는데 **`/login` 라우트는 존재하지 않는다**(app.ts 에 0건).
그리고 이 사이트의 회원 로그인은 `signInWithOAuth` 뿐 — 비밀번호 로그인 경로가 없었다.
즉 관리자는 "권한이 없어서" 못 들어간 게 아니라 **로그인할 방법 자체가 없었다.**

### 한 것
| 항목 | 내용 |
| --- | --- |
| 권한 근거 | `src/auth/staff.ts` 신규. `UMSH_ADMIN_SUPER_EMAILS` 하나만 본다 |
| `/api/admin/v1/me` | 403 고정 해제 → membership 있으면 200 `{email, role, scopes[], environment}` |
| 셸 | 이메일/비밀번호 폼 + 조직 계정(SSO) 경로. 끊어진 `/login` 링크 제거 |
| scope | 조회만 (`orders/members/reports/settings:read`). 감사 기반(T06) 없이 쓰기 안 만든다 |
| 문서 | `docs/API.md` 에 401/403/200 계약과 하위 호환 규칙 명시 |

**Codex Critical 재발 방지**: 권한 근거를 `isAdminEmail`/`isAdminOwner`(레거시 unlock)와
**완전히 분리된 모듈**에 두었다. 테스트가 두 목록의 분리를 코드로 고정한다 —
unlock 목록 계정에 `staffMembership()` 이 `undefined` 인지 직접 확인한다.
권한은 코드에 박히지 않고 배포 설정에서만 오므로 **설정을 비우면 코드 변경 없이 회수**된다.
그 회수 경로도 테스트로 고정했다(설정 삭제 → 403).

### 막힌 것 — 지시한 계정에 비밀번호가 없다
`axlab@crea-m.com` / 지시받은 비밀번호 2종 모두 `invalid_credentials`.
비밀번호가 틀린 게 아니라 **그 계정에 비밀번호 자격증명이 없다.** 근거:

| 확인 | 결과 |
| --- | --- |
| `/auth/v1/token?grant_type=password` × 2회 | 400 `invalid_credentials` |
| `/auth/v1/signup` (같은 이메일) | 200 + **빈 user 객체** = 중복 보호 응답 → **계정은 이미 있다** |
| `/auth/v1/settings` | `mailer_autoconfirm: false`, google·kakao 활성 |

계정이 Google 로그인으로 먼저 만들어져 password identity 가 없는 상태다.
로컬에 service role key 가 없어 관리자 API 로 비밀번호를 설정할 수 없다.
→ 비밀번호 설정은 Supabase 콘솔(사용자 작업)이 필요하다. 그 사이에도 들어올 수 있도록
**조직 계정(Google) 경로를 같은 화면에 붙였다.** 권한 판정은 경로와 무관하게 동일하다.

### 스스로 만든 사고 — 줄바꿈/BOM 전면 변경
Python 패치를 `newline=''` + `utf-8-sig` 로 쓰면서 대상 파일 **전체를 LF 로 바꾸고
BOM 을 새로 붙였다.** `.env.example` diff 가 8줄이어야 하는데 136줄로 부풀었다.
`.env` 계열에 BOM 이 붙으면 첫 키 파싱이 깨질 수 있어 위험하기도 했다.
HEAD 규약(CRLF, 파일별 BOM 유무)으로 되돌려 8줄로 복구했다.

**교훈: 파일을 문자열로 통째로 다시 쓰는 패치는 내용뿐 아니라 바이트 규약을 바꾼다.
쓰기 전에 원본의 줄바꿈·BOM 을 읽어 그대로 복원해야 한다.**

### 남은 것
- **운영 반영 전 필수**: Vercel 에 `UMSH_ADMIN_SUPER_EMAILS` 설정. 없으면 운영은 계속 403
- `axlab@crea-m.com` 비밀번호 설정(Supabase 콘솔) 또는 조직 계정 경로 사용
- SSO `redirectTo` (`/admin`) 가 Supabase redirect 허용목록에 없으면 홈으로 떨어진다
  (세션은 생기므로 `/admin` 재방문 시 로그인 상태) — 허용목록 확인 필요
- **U36 그대로**: 셸 HTML 은 여전히 익명에게 응답한다(서버 세션 쿠키 없음)
- T05 는 이 응답 형태를 유지한 채 판정 근거만 영속 저장소로 교체

## 2026-09-11 — 관리자 OAuth 복구 점검

- Supabase Authentication URL Configuration의 Site URL을 `https://umsh.kr`로 변경하고,
  Redirect URLs에 `https://umsh.kr/**`, `https://www.umsh.kr/**`를 추가했다.
- Production Vercel 프로젝트에 `UMSH_ADMIN_SUPER_EMAILS` 키가 존재하고, 현재
  `umsh.kr` 별칭은 Ready인 Production 배포를 가리키는 것을 확인했다. 값은 로그에
  기록하지 않았다.
- Google 조직 계정으로 새 OAuth 흐름을 재현했으나, Google 동의 뒤 Supabase callback에서
  `Unable to exchange external code`가 다시 발생했다. Redirect URL 문제가 아니라
  Supabase Google provider의 OAuth client secret과 Google Cloud OAuth client 설정의
  불일치 또는 무효화가 남은 차단점이다.
- Google Cloud Console은 선택된 조직 계정의 재인증 비밀번호를 요구했다. 비밀번호·OAuth
  client secret은 수집하거나 기록하지 않았으며, 해당 비밀값을 갱신하기 전에는 관리자
  세션과 화면을 검증할 수 없다.

## 2026-09-11 — Supabase 이메일 관리자 전환

- Supabase의 `axlab@crea-m.com` 사용자가 Email provider 계정임을 확인했다.
- Production `UMSH_ADMIN_SUPER_EMAILS`를 해당 이메일로 설정하고, 기존 운영 배포를
  재배포했다. `umsh.kr` 별칭이 새 Ready 배포를 가리키는 것을 확인했다.
- `/admin`의 이메일 로그인은 정상 노출된다. 다만 Supabase 사용자 상세의 `Confirmed at`이
  비어 있고 기존 비밀번호도 인증에 실패하므로, 사용자 본인이 확인 메일과 비밀번호 복구
  메일을 통해 계정을 활성화해야 한다.

## 2026-09-11 — 관리자 비밀번호 복구 화면

- 원인: Supabase Dashboard에서 보낸 복구 메일은 기본 Site URL(루트)로 돌아오지만,
  루트 화면에는 `type=recovery` 일회성 세션을 처리하는 비밀번호 설정 UI가 없었다.
- `admin-ui/index.html`에 recovery 세션 전용 새 비밀번호·확인 폼을 추가했다. 비밀번호는
  일치·최소 길이를 확인한 뒤 `auth.updateUser`로만 전송하고, 성공·실패 뒤 DOM에서 지운다.
- `사주/portal.html` 루트는 recovery fragment를 보존한 채 `/admin`으로 즉시 넘긴다.
  따라서 Dashboard 기본 링크도 관리자 설정 화면으로 도착한다.
- `npx tsx --test --test-concurrency=1 tests/unit/admin-shell.test.ts --test-name-pattern
  "(셸이 직원 로그인 폼을 갖고 있다|비밀번호 복구 링크는 관리자 설정 화면으로 이어진다)"`
  결과: 18 passed. Production 배포 `dpl_G3r1o2WZgkcGuvkaAV1PqfdaUu14` Ready 및
  `#type=recovery` → `/admin#type=recovery` 이동을 브라우저에서 확인했다.

## 2026-09-11 — 공개 주문 목록

- 사용자 요청에 따라 `/admin/orders` 목록 경로만 무인증으로 열었다. 목록 DTO의 이메일,
  전화번호, 거래 식별자 원문은 기존 마스킹 규칙을 계속 적용하며, 주문 상세와 나머지
  관리자 API는 `requireStaff` 인증을 유지한다.
- `npm run typecheck`와 관리자 셸·주문 테스트(42 passed)를 통과했고, Production 배포
  `dpl_7fUDBo1GiYyHc5sBnwFn43vRWwST`에서 로그인 없이 목록 화면이 열리는 것을 확인했다.

## 2026-09-11 — 관리자 자체 비밀번호 로그인

- `/admin` 로그인 폼을 Supabase `signInWithPassword` 호출에서 자체 관리자 로그인 API로 교체했다.
  운영에서는 `UMSH_LOCAL_ADMIN_EMAIL`, `UMSH_LOCAL_ADMIN_PASSWORD`,
  `UMSH_LOCAL_ADMIN_SESSION_SECRET`의 암호화 환경 변수만으로 인증한다. 비밀번호와 세션
  서명값은 소스·응답·이력에 기록하지 않는다.
- 성공 시 서버가 서명한 `HttpOnly`, `Secure`, `SameSite=Strict` 세션 쿠키를 발급한다.
  이후 `/api/admin/v1/me`와 인증된 관리자 상세 API는 이 쿠키만 검증하며, 자체 로그인이
  켜진 운영에서는 Supabase로 폴백하지 않는다. 로그아웃은 해당 쿠키를 즉시 만료한다.
- 회귀 검증: `npm run typecheck`, 관리자 자체 로그인·셸·주문 테스트 **45 passed**.
  Production 배포 `dpl_8jdgm1MCv96qiwBa45SdESfwVbJ1`(umsh.kr 별칭)에서 실제 계정으로
  로그인해 `super_admin` 권한, 관리자 메뉴, 주문 화면이 열리는 것을 브라우저로 확인했다.

## 2026-09-11 — 관리자 좌측 LNB 및 실행 명세 기준 확정

- 관리자 상단 메뉴를 좌측 LNB로 교체했다. 운영·관리·시스템 업무군에 개요, 주문,
  회원·리포트, 콘텐츠·서비스, 고객 지원, 환불·정산, 통계·로그, 설정 경로를 배치하고
  현재 경로를 강조한다. 768px 이하에서는 가로 스크롤 메뉴로 전환한다.
- 아직 데이터 기능이 없는 경로가 주문 화면을 잘못 재사용하지 않도록 독립 준비 상태로
  분리했다. Production `dpl_9gKrNpU2ZtQ4TH2XeBsEHshrjS2w`에서 `/admin/settings`의
  좌측 LNB와 설정 준비 화면을 브라우저로 확인했다.
- 이후 구현 기준은 `admin-ops-execution-pack/15-TASKS.md`로 확정했다. 현재 로그인·셸·주문의
  선행 구현은 해당 Task의 부분 산출물로 취급하고, 다음은 T06 감사·멱등 기반부터 수용 조건
  순서대로 진행한다.

## 2026-09-11 — 관리자 주문 목록 지연 완화

- 운영 실측에서 공개 주문 목록은 캐시 금지 상태로 첫·반복 요청 모두 약 0.98초였다.
  목록은 마스킹 DTO만 반환하므로 `s-maxage=10`, `stale-while-revalidate=30`의 짧은 edge
  cache를 허용했다. 주문 상세와 나머지 관리자 API의 no-store 정책은 변경하지 않았다.
- Production `dpl_JBgNjVEbaU1Hk6k4cacpWSzfTtTf`에서 첫 요청은 새 인스턴스 초기화로 2.52초였고,
  반복 요청은 0.27초, `X-Vercel-Cache: HIT`, `Age: 5`로 확인됐다. 관리자 함수 자체는
  여전히 295.74MB 단일 함수이므로 콜드 스타트 개선은 별도 구조 작업으로 남긴다.

## 2026-09-11 — T14 영속 작업·outbox 배포 검증

- `ops_jobs`·`ops_outbox` 및 lease 기반 `claim_ops_jobs` RPC는 운영 DB에 반영되어 있으며,
  RLS 활성화와 `anon`/`authenticated` 권한 제거를 유지한다.
- Vercel Production의 `CRON_SECRET`은 안전한 표준 입력으로 교체 등록했다. 값은 저장소·문서·로그에 기록하지 않았다.
- 처리기가 아직 없는 작업을 성공으로 표시하던 결함을 수정했다. 이제 `NO_OPS_HANDLER`로 지수 backoff 재시도 후 최대 시도에서 dead-letter로 이동한다.
- Production에서 `/admin/jobs`가 실제 작업 큐와 연결되어 빈 큐 상태를 표시하는 것을 브라우저로 확인했다.
- 검증: worker 단위 테스트 2/2 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS. 전체 `npm test`는 기존 대형 테스트 실행으로 단일 30초 실행 창을 넘겨 이 Task에서는 완료 확인하지 못했다.
- LNB 감사: 회원·리포트·서비스·지원·감사 기록은 실제 원천 연결, 미디어를 포함한 나머지 준비 화면은 후속 Task의 실제 테이블/API가 필요하다. 목업 데이터를 추가하지 않는다.
- 남은 검증: Vercel이 첫 예약 cron을 실행한 뒤의 worker 로그·응답 확인.
- KMS 기록: `personal/carrotcap/notes/umsh-ops-worker-20260911.md`.

## 2026-09-11 — T15 금융 이벤트·상태 투영

- 운영 DB에 `financial_events` append-only 원장을 생성했다. 승인 이벤트는 `provider + source_ref` 고유키로 중복을 차단하고, 주문 ID·승인 금액·발생 시각만 저장한다. 원시 PG 응답이나 고객 개인정보는 저장하지 않는다.
- RLS를 활성화했고 `anon`·`authenticated` 권한을 제거했다. 기존 기본 권한에서 `service_role` UPDATE/DELETE가 남는 것을 발견해, 별도 migration으로 INSERT/SELECT만 남겨 append-only 계약을 확인했다.
- 이니시스·Google Play·테스트 승인 경로는 금융 이벤트를 먼저 기록한 후에만 주문을 `paid`로 투영한다. 이니시스에서 증거 기록 뒤 상태 투영이 실패하면 `failed`로 덮지 않아 T19 대사로 회수할 수 있다.
- `viewed`는 금융 이벤트를 추가하지 않는다. 따라서 열람 재시도나 상태 갱신이 매출 이벤트를 중복 생성하지 않는다.
- 검증: 금융·결제 관련 50개 테스트 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS, 운영 DB RLS/고유키/권한 확인, Production `/admin/orders` LNB·주문 화면 확인.
- KMS 기록: `personal/carrotcap/notes/umsh-financial-events-20260911.md`.

## 2026-09-11 — T16 PG 조회·취소 sandbox adapter

- KG 이니시스의 공식 INIAPI v2 계약을 확인했다. 거래 조회는 sandbox `/v2/pg/inquiry`와 `type=inquiry`, 전액 취소는 `/v2/pg/refund`와 `type=refund`를 사용하며, 두 요청의 서명은 `INIAPIKey + mid + type + timestamp + data`의 SHA-512이다.
- `createInicisSandboxAdapter`는 호출자가 주입한 transport로만 통신하고 전역 `fetch`를 쓰지 않는다. 따라서 production PG 호출·취소, 주문 상태 변경, 금융 이벤트·환불 저장이 이 Task에서 발생하지 않는다.
- timeout은 `INICIS_SANDBOX_TIMEOUT`으로 구분하고, 공식 기취소 코드 `500626`은 재요청하지 않는 terminal duplicate로 반환한다. PG 성공 뒤 저장 실패는 adapter 레이어에서 성공을 실패로 바꾸지 않아 T17/T19의 영속 intent·대사 경계가 유지된다.
- 검증: sandbox 계약 테스트와 기존 결제 테스트 9/9 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS. 실 TID·INIAPI Key·실거래는 사용하지 않았다.
- 남은 조건: T17에서 INIAPI Key 계약·운영 egress, 환불 intent 영속화, 요청/승인자 분리, 금액 예약, unknown 대사 경로를 구현하기 전에는 live 취소를 연결하지 않는다.
- KMS 기록: `personal/carrotcap/notes/umsh-inicis-sandbox-adapter-20260911.md`.

## 2026-09-11 — T17 환불 요청·독립 승인·예약

- `refund_requests`와 service-role 전용 RPC를 운영 DB에 반영했다. 요청 RPC는 주문 행을 잠그고 활성 요청의 예약액을 합산하므로 동시에 요청해도 원 결제금액을 초과 예약할 수 없다.
- 요청자와 승인자가 같으면 DB에서 거부하며, 승인 전/후 어느 경로도 PG를 호출하지 않는다. 주문 상태, 고객 구매권한, 완료 리포트 본문도 변경하지 않는다.
- 검증: refund·INIAPI 테스트 9/9 PASS, typecheck/build PASS. 운영 DB에서 RLS=true, anon/authenticated SELECT=false, service_role RPC execute=true 확인.

## 2026-09-11 — T18 환불 운영 화면

- `/admin/refunds`를 실제 `refund_requests` 원천에 연결하는 화면·서버 경로를 구현했다. 빈 데이터베이스는 "아직 실제 환불 요청이 없습니다"로만 보이며 예시 행·임의 금액·목업 CTA는 표시하지 않는다.
- 관리자는 실제 주문을 먼저 조회한 뒤 요청 금액·사유·revision으로 환불 intent를 등록할 수 있다. 요청 후에도 PG 환불은 실행되지 않으며 별도 관리자의 승인만 가능하다.
- 승인 검토에는 요청/승인자·금액·사유·시각·PG 상태를 표시한다. `failed`와 `unknown`은 성공으로 표현하지 않고 PG 상태 확인·재조회를 우선하도록 안내한다. 요청자는 자기 요청을 승인할 수 없으며 API도 403으로 거부한다.
- 검증: 환불 store/API/관리자 셸 26개 테스트 PASS, `npm run typecheck` PASS, `npm run vercel-build` PASS. Production 배포(`dpl_3DvQf8yWZrTtHAtcxCsjZi4LxtXB`) 후 브라우저에서 목록 API가 503으로 실패하는 것을 확인했다. 테이블·service_role SELECT·PostgREST schema reload까지 확인했으나 원인은 아직 미확정이므로 T18은 NEEDS_REVIEW다.

## 2026-09-12 — 결제 트랙 보류·T22 착수

- 사용자 지시에 따라 결제·환불(T18~T21) 보완은 보류하고 비결제 운영 작업인 T22 서비스·콘텐츠 버전 저장을 착수했다.
- 현재 고객 서비스의 정본은 `src/server/service-directory.ts`와 `src/payment/catalog.ts`에 있으며, T22는 이 목록을 바꾸거나 예시 콘텐츠를 추가하지 않고 버전 저장·검증·서버 읽기 경계를 먼저 만든다.

## 2026-09-12 — AIOS 공통 소규모 기능 실행 워크플로우

- 사용자 제공 가이드를 `C:/Users/user/.codex/workflows/aios-small-slice-workflow.md`로 상세화하고 전역 및 프로젝트 AGENTS.md에서 참조하도록 등록했다. 경로 범위는 이 PC의 Codex 프로젝트이며 다른 도구/PC의 자동 적용을 의미하지 않는다.
- 요구사항 확인 → PRD → 사용자 결과별 vertical slice → 구현/검증/리뷰 → KMS 기록을 적용한다. 연속 승인된 작업은 형식적인 재승인 없이 순차 진행한다. 실제 데이터 원칙과 결제 보류는 유지한다.
- CreamWIKI 사전 검색에서 직접 적용할 기존 근거는 확보하지 못해 사용자 가이드를 정본으로 사용했다. `personal/carrotcap/notes/aios-small-slice-workflow-20260912.md` 저장, get 재조회, 검색 결과 1건 확인 PASS. 서버 전용 재인덱싱 명령은 로컬에 없어 NOT_RUN이며 검색 성공과 구분한다.
- 문서 작업만 수행했다. 앱 변경/배포/동작 테스트는 해당 없음. T22는 스키마 중간 산출물 상태로 계속 미완료이며 다음 기능 작업에서 서버/API/실제 사용자 흐름 검증을 이어간다.

## 2026-09-12 — T22 Slice 1 실제 서비스·버전 조회

- `/api/admin/v1/services`를 `services:read` 권한 뒤에 추가하고, 현재 운영 코드의 19개 결제 카탈로그(검색 노출 15, 숨김 4)에 `service_config_versions`의 최신 발행/초안 메타데이터를 결합했다.
- `/admin/services`는 공개 목록 API 대신 관리자 API를 사용하며 canonicalKey, 분류, 검색 노출, 판매 상태, 기준 가격, 발행/초안 버전, 고객 경로를 표시한다. 저장소가 불가하면 목록을 0건으로 속이지 않고 코드 정본과 버전 미확인을 구분한다.
- Supabase 기본 권한으로 남을 수 있는 `service_role` DELETE를 후속 migration에서 제거했다. 운영 조회 결과 두 버전 테이블 모두 service_role SELECT/INSERT/UPDATE만 있고 anon/authenticated 권한은 없다.
- 검증: 관련 25개 테스트 PASS, 전체 622개 테스트 PASS, typecheck PASS, vercel-build PASS. 운영 배포와 로그인 세션 E2E는 커밋 후 이어서 확인한다.
- T22는 계속 IN_PROGRESS다. 다음 slice는 구조화 draft 생성·revision 충돌·감사 기록 연결이다.

## 2026-09-12 — Tone V2 independent fork

- User authorized full handoff migration sequentially using the registered AIOS workflow. Work is isolated in `C:/Users/user/Desktop/chungi-t-tone-v2`, branch `codex/tone-v2`; original project is not modified by this task.
- Source compiler and conversation/report system-prompt wiring are implemented. Source inventory: 82 members, 158 heading references; 20 personas with 13 fields, 18 character identities.
- Corpus audit: 28 packs, 234 knowledge blocks, 28 static review candidates. This does not constitute semantic corpus approval or a finished replacement.
- Batch primitive preserves supplied IDs/titles, carries previous full text and stops on validation failure. Actual provider/persistence/UI integration remains incomplete.
- Verification: focused compiler/runtime/batch/wedding tests PASS, typecheck and vercel-build PASS. Full regression is being rerun; see `tone-v2/STATUS.md`.
- KMS stored, retrieved and found by search: `personal/carrotcap/notes/umsh-tone-v2-20260912.md`.
- Full migration and production attachment remain incomplete. Missing source outlines and QA dependencies plus old template pathways are explicitly tracked in `tone-v2/PRD.md` and `tone-v2/STATUS.md`.

## 2026-09-12 — Tone V2 P01 유료 해석 밀도 게이트

- 공통 규칙 §4의 직접 답·개인 근거 또는 판단 조건·생활 장면·다음 기준 네 요소를 생성 후 저장 전 필수 검사로 연결했다. 한 요소라도 없으면 완료 처리하지 않고 기존 재시도 경로로 보낸다.
- 완료된 형제 항목과 명시적 편집 레이블 순서가 같으면 반복 틀로 차단하고, 만족·안정·문제없음 입력에 숨은 위기를 지어내는 문장도 차단한다.
- ZIP-003-036/043/046은 REFERENCE/PASS, ZIP-003-037~042/044~045는 ACTIVE/IN_PROGRESS다. 정적 신호 검사는 의미 정확성이나 전체 70개 항목의 체감 다양성을 보장하지 않는다.
- 검증: 신규 생성 검수 11/11 PASS, persistence 통합 PASS, compiler/task 7/7 PASS, task-index 재생성 후 3/3 PASS, 전체 642/642 PASS, typecheck/build/diff PASS.
- 실제 OpenAI 출력 평가, 코퍼스/RAG 교체, 릴리스 부착, 배포, Production 변경은 실행하지 않았다.

## 2026-09-12 — Tone V2 P01 항목별 고유성 게이트

- 완료된 형제 항목과 같은 hook을 재사용하거나, 정규화 문자 3-그램 Dice 유사도 0.86 이상의 긴 문단이 두 개 이상 겹치면 생성 완료를 거부한다. 한 개의 공통 긴 문단은 공통 근거의 과잉 차단을 피하려고 허용한다.
- 질문 핵심어가 전혀 없고 범용 문구 신호가 누적된 원고를 제목 교체 가능성이 높은 문장으로 차단한다. 원문에 명시된 제작용 소제목 5종도 차단하고 생활 장면형 소제목을 생성 계약에 추가했다.
- ZIP-003-047은 REFERENCE/PASS, ZIP-003-048~052는 ACTIVE/IN_PROGRESS다. 문자열 하한선만으로 의미 고유성을 확정하지 않는다.
- 검증: generation 13/13, persistence 8/8, compiler/task 7/7, task-index 3/3, 전체 644/644 PASS. typecheck/build/diff PASS.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-section-uniqueness-gate-20260912.md` put/get/search PASS. 서버 전용 재인덱싱 명령은 이 클라이언트에서 실행할 수 없어 NOT_RUN이다.
- 실제 OpenAI 전체 리포트 평가, 코퍼스/RAG 교체, 릴리스 부착, 배포, Production 변경은 실행하지 않았다.

## 2026-09-12 — ZIP-first task inventory and first review fixes

- User authorized missing-material supplementation using ZIP patterns. Verified all 82 extracted members against the archive by SHA-256; no missing or extra files.
- Created 82 source-file TASKs and 1,500 source review units with exact original text/line coverage, including reference/history/examples. This is review coverage, not implementation completion.
- Active plan: `tone-v2/EXECUTION-PLAN.md`; evidence-preserving progress: `tone-v2/task-progress.json`; initial common 1~3 review: `tone-v2/reviews/P01-common-1-3.md`.
- Fixed multiline persona truncation, cross-service lexical appendix contamination, loss of non-conflicting common section 6 rules, pending legacy copy exposure and out-of-order section generation. Daily calculated snapshots explicitly save their complete body before completion.
- Verification: compiler/task coverage 7/7 PASS, full regression 633/633 PASS (100 suites), typecheck/build/diff checks PASS. Live generation, full clause acceptance, UI/print and production attachment remain incomplete.
- CreamWIKI: `personal/carrotcap/notes/umsh-zip-task-audit-20260912.md`, stored/retrieved/searchable. Original workspace preserved.

## 2026-09-12 — Tone V2 P01 numeric prescription and arithmetic gate

- Scope: ZIP common §2-1 review units ZIP-003-022, ZIP-003-023, ZIP-003-024, ZIP-003-025, ZIP-003-028. This slice covers exact number+unit grounding and add/subtract formula checks; live semantic output review remains pending.
- Code: added numeric evidence extraction, add/subtract arithmetic verification, and unsupported prescription-number detection to `src/report/tone-v2-review.ts`. `src/report/report-generator.ts` now passes birth input, public context, server calculation features, and the current section title/question as numeric evidence into generated hook/body review.
- Result: generated prose now rejects unsupported action numbers such as `침대를 30cm 떼세요` and `통화 15분 잡아보세요`, while allowing the same number+unit when it is present in the actual evidence, such as an entered `58점` or measured `30cm`.
- Arithmetic result: `320만원 - 210만원 = 110만원` passes when both operands are grounded; wrong results, missing operands, and mixed-unit equations fail.
- Task tracking: `tone-v2/task-progress.json`, `tone-v2/TASKS.md`, `tone-v2/task-index.json`, and the per-task files were regenerated after the progress update. Status remains `IN_PROGRESS`, not release-ready.
- Verification: focused generation 5/5 PASS; focused generation+persistence 13/13 PASS; compiler/task 7/7 PASS; task-index regeneration check 3/3 PASS; `npm run typecheck` PASS; `npm run vercel-build` PASS; `git diff --check` PASS with CRLF warnings only; full regression `npm test` 635/635 PASS in `tone-v2/latest-regression.log`.
- Not performed: live OpenAI output quality grading, full 1,500 review-unit acceptance, UI/print/browser QA, commit, push, deployment, or production attachment.

## 2026-09-12 — Tone V2 P01 future/mind/private fact gate

- Scope: ZIP common §1 and §2 review units ZIP-003-010 and ZIP-003-018. This slice covers deterministic rejection for generated prose that states future events, another person's mind, or private facts about company, family, home, region, disease, or cat behavior as confirmed facts.
- Code: added `certaintyIssues` to `src/report/tone-v2-review.ts` and wired it into `reviewToneCopy()`. The generation instruction now also states that future events, other people's minds, company/family/home/cat state must not be written as confirmed facts.
- Result: unsupported assertions such as `상대는 이미 마음이 떠났어요.`, `올해 결혼해요.`, `회사는 곧 구조조정해요.`, and `고양이가 외로워서 문제 행동을 해요.` fail review. Conditional or observation-based alternatives pass.
- Task tracking: `tone-v2/task-progress.json`, `tone-v2/TASKS.md`, `tone-v2/task-index.json`, and per-task files were regenerated after the progress update. Status remains `IN_PROGRESS`, not release-ready.
- Verification: focused generation 6/6 PASS; focused generation+persistence 14/14 PASS; compiler/task 7/7 PASS; task-index regeneration check 3/3 PASS; `npm run typecheck` PASS; `npm run vercel-build` PASS; `git diff --check` PASS with CRLF warnings only; full regression `npm test` 636/636 PASS in `tone-v2/latest-regression.log`.
- Not performed: live OpenAI output quality grading, full 1,500 review-unit acceptance, UI/print/browser QA, commit, push, deployment, or production attachment.

## 2026-09-12 — Tone V2 P01 persona contract and answer-opening gate

- Persona root cause: the V2 source already specifies 20 service personas after documenting the old empty-field problem, but the runtime contract did not expose a standalone name or definition status. Names existed only inside `이름(초안)`, generated assets were uncommitted, and the fork remained `releaseReady:false`; therefore Production/admin could not treat these as an attached released persona set.
- Compiler/runtime now emits and validates `displayName`, `definitionStatus=specified`, `displayNameStatus=draft`, exactly 20 personas, all 13 fields, lexicon contracts, and explicit rhythm/null. It fails rather than silently using an incomplete persona.
- ZIP-003-008/009/032 were strengthened: direct-answer hook contract, additional authoring-opening rejection, and internal report/schema/debug vocabulary rejection. Semantic live-output review remains pending, so the tasks stay IN_PROGRESS.
- Verification: initial RED 6/8 with two expected failures; final focused 8/8 and persistence-inclusive 16/16; compiler/task 7/7; regenerated task index 3/3; full `npm test` 636/636; typecheck and Vercel build PASS.
- CreamWIKI source evidence used: `personal/carrotcap/notes/umsh-tone-v2-20260912.md`. New work log: `personal/carrotcap/notes/umsh-tone-v2-persona-contract-20260912.md` (put/get/search result recorded after upload). Server-side reindex remains NOT_RUN.
- No commit, push, deployment, DB write, Production attachment, existing completed-report rewrite, or live customer data mutation was performed.

## 2026-09-12 — Tone V2 P01 input/evidence boundary

- Scope: ZIP-003-011 and ZIP-003-013~017. ZIP-003-012 is a heading-only REFERENCE and is recorded PASS; ACTIVE rules remain IN_PROGRESS pending live semantic evaluation.
- Prompt input now separates `userFacts`, `verifiedCalculations`, `traditionalInterpretationCandidates`, and `fictionalExamplePolicy` under `evidenceLayers`. Legacy ambiguous root `birth/context/featureJson/rag` fields are no longer sent by the report section prompt.
- The contract prevents repeating birth/address/concern/choices in every section, keeps only completed prior sections as context, distinguishes traditional symbols from facts/calculations, and labels fictional scenes with `예를 들어` or `만약`. Partner privacy and unknown-time behavior remain covered.
- Verification: TDD RED 6/7 before implementation; focused 58/58 PASS; compiler/task 7/7 PASS; regenerated task index 3/3 PASS; full `npm test` 637/637 PASS; typecheck, Vercel build, and diff check PASS.
- Not performed: live provider call, actual-output grading, corpus or RAG production replacement, UI/print QA, commit, push, deployment, database write, or Production attachment.

## 2026-09-12 — Tone V2 P01 service RAG and corpus-copy boundary

- Scope: ZIP-003-026, ZIP-003-031, ZIP-003-033~035. ACTIVE tasks remain IN_PROGRESS pending live output evaluation.
- Found and fixed `wedding_day` dedicated-corpus routing drift. The registry now owns explicit `serviceKey` mappings for all 20 service packs; the retriever no longer maintains a second hard-coded map.
- Generated output review now compares hook/body with the actual retrieved corpus and rejects normalized verbatim source sentences of at least 18 characters. It also rejects targetless bare actions and instructs missing-data responses to present observable real-world conditions instead of invented facts.
- Verification: RED 39/42 with three expected failures; focused GREEN 93/93; compiler/task 7/7; full `npm test` 640/640; typecheck, Vercel build, and diff check PASS.
- Local skill note: the fork lacks the routed `.claude/skills` files and `test-driven-development` was also absent from the original project. The original project's available read-only skill instructions were applied; TDD was executed directly and the missing local skill remains recorded rather than claimed.
- Not performed: live provider call, actual-output semantic evaluation, corpus content replacement, commit, push, deployment, database write, or Production attachment.

## 2026-09-12 — Tone V2 P01 말투와 캐릭터 게이트

- 범위: ZIP-003-053~064. 제목/개정 설명은 REFERENCE/PASS, 옛 하게체 및 격식체 범위는 최신 결정에 따라 SUPERSEDED/PASS, 실행 규칙은 실제 출력 평가 전까지 IN_PROGRESS다.
- 최신 persona registry를 말투의 실행 기준으로 고정하고, 하게체 전면 거부, 격식체 2개 서비스, 반말 2개 서비스, 해요체 16개 서비스를 검증했다.
- 3문장 이상 동일 종결어미 반복, 임의 화자 설정, 비하·유아어·과장된 무속 연출·독심 표현을 생성 후 차단한다. 명사형 판정문은 말투 위반으로 오탐하지 않으며 관찰 가능한 작은 비유는 허용한다.
- 검증: focused RED에서 누락 게이트 2건 실패 확인; GREEN generation 16/16, persistence/persona 10/10; compiler/task 7/7; task index 재생성 후 3/3; 전체 `npm test` 647/647; typecheck, Vercel build, diff check PASS.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-voice-character-gate-20260912.md` put/get/search PASS. 클라이언트에서 서버 reindex 명령을 제공하지 않아 NOT_RUN이다.
- 수행하지 않음: live provider 호출/실제 출력 의미 평가, 코퍼스·RAG 교체, 릴리스 부착, 커밋, push, 배포, DB 쓰기, Production 변경.

## 2026-09-12 — Tone V2 P01 전문용어 경계 게이트

- 범위: ZIP-003-065~070. 제목은 REFERENCE/PASS이며 실행 규칙은 실제 출력 의미 평가 전까지 IN_PROGRESS다.
- 리포트 읽기 순서로 오행·용신·신강·신약·합·충의 첫 사용을 확인해 `한글(한자, 쉬운 뜻)`을 요구하고, 이전 항목에서 소개된 뒤에는 한글만 사용해도 허용한다.
- 복수 한자/중첩 괄호, 오행 개수와 용신의 등치, 신강·신약의 인간 능력 등급화, 합·충의 재결합·이별 확정을 차단한다.
- 코드리뷰 중 `합격·충분` 오탐을 발견해 두 번째 RED로 재현하고 단음절 용어 경계를 수정했다.
- 검증: focused §7 3/3, generation/persistence/persona 29/29, compiler/task 7/7, 재생성 task index 3/3, 전체 `npm test` 650/650, typecheck, Vercel build, diff check PASS.
- CreamWIKI search-first는 일반 언어 QA 근거만 반환했고 동일 구현은 없었다. `personal/carrotcap/notes/umsh-tone-v2-technical-terms-gate-20260912.md` put/get/search PASS; 서버 reindex는 NOT_RUN이다.
- 수행하지 않음: live provider 호출/실제 출력 의미 평가, 20개 서비스 쉬운 뜻 정확성 평가, 코퍼스·RAG 교체, 릴리스 부착, 커밋, push, 배포, DB 쓰기, Production 변경.
## 2026-09-12 — Tone V2 P01 점수·그래프·표 근거 게이트

- 범위: 공통 프롬프트 §8, ZIP-003-071~076. 제목 ZIP-003-071은 REFERENCE/PASS이고 실행 규칙 ZIP-003-072~076은 실제 출력 의미 평가 전까지 IN_PROGRESS다.
- 생성문 점수·날짜·그래프 수치를 기존 서버 유래 `numericEvidence`로 검증한다. 사건 확률형 점수, 산정 축과 높고 낮음의 의미가 없는 해석 점수, 실제 비교 대상 없는 비교 점수, 장식 차트, 근거 없는 스파크라인, 표·차트 수치 중복을 차단한다.
- 새 계산기나 UI 차트 렌더러는 추가하지 않았다. 생성 원고 하한선 검수만 구현했으며 구조화 시각화의 의미 중복과 편집 유용성은 실제 출력 평가가 필요하다.
- 검증: RED export 부재 실패 확인; 첫 GREEN에서 테스트 fixture 전달 오류를 찾아 수정; 최종 §8 3/3, generation/persistence/persona 32/32, compiler/task 7/7, task-index 3/3, 전체 `npm test` 653/653, typecheck, Vercel build, diff check PASS.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-score-visual-evidence-gate-20260912.md` put/get/search PASS. 서버 reindex는 클라이언트 명령 부재로 NOT_RUN이다.
- 수행하지 않음: live provider/20개 서비스 구조화 시각화 평가, 코퍼스·RAG 교체, 릴리스 부착, 커밋, push, 배포, DB 쓰기, Production 변경.
## 2026-09-12 — Tone V2 P01 티저 신뢰 게이트

- 범위: 공통 프롬프트 §9, ZIP-003-077~084. 제목은 REFERENCE/PASS이며 실행 규칙은 실제 티저 의미 평가와 기존 레코드 구조 마이그레이션 전까지 IN_PROGRESS다.
- `reviewTeaser`가 저장 원천에 있는 한 줄 판정, 대표 근거 1~2개, 생활 장면, 구체적인 전체 해석 범위를 확인한다. 운영 상태, 가짜 잠금 인용, 공포·손실 압박, 확정 예언은 신규 저장과 기존 저장 티저 읽기 경로에서 차단한다.
- 실제 결함 수정: pending 저장 리포트가 본문을 비운 뒤 티저까지 만들던 순서를 바꿔, 무료 티저만 입력별 결정론적 template에서 먼저 조립한다. 저장되는 유료 섹션의 hook/interpretation/storytelling redaction은 그대로 유지한다.
- 새해 티저에는 계산된 시기를 일정·약속 장면으로 표현했고, 결혼 택일은 대표 근거를 두 개로 제한하면서 길일·흉일 비확정 경계를 paid scope에 보존했다.
- 검증: §9 prompt 1/1, teaser review 3/3, 관련 integration 69/69, compiler/task 7/7, task-index 3/3, 전체 `npm test` 657/657 PASS. typecheck, Vercel build, diff check PASS.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-teaser-trust-gate-20260912.md` put/get/search PASS. 서버 reindex는 클라이언트 명령 부재로 NOT_RUN이다.
- 수행하지 않음: 20개 서비스 live/의미 평가, 기존 레코드 구조 마이그레이션, 코퍼스·RAG 교체, 릴리스 부착, 커밋, push, 배포, DB 쓰기, Production 변경.

## 2026-09-12 — Tone V2 P01 안전·확정 표현 게이트

- 범위: 공통 프롬프트 §10, ZIP-003-085~091. 제목은 REFERENCE/PASS이며 실행 규칙은 실제 출력 의미·전문 검토 전까지 IN_PROGRESS다.
- `reviewSafetyClaims`를 공통 생성 후 검수에 연결하고 hook·본문 모두 실제 `SajuReportContext`를 받게 했다. 실제 사람의 마음·외도·질병·수명·합격·채용·수익·결혼·이별 확정과 상징을 현실 정답으로 바꾸는 표현을 차단한다.
- 기존 `relationshipState`를 재사용해 차단·접촉 거부·협박·강요 문맥에서 연락·재회 추진을 거부한다. 의료·법률·투자·계약 권위 대체, 보호자 사주 탓의 고양이 행동 원인화, 서버 지형 근거 없는 흉지·사고·재산 가치 연결도 차단한다.
- 검증: RED export 부재 실패 확인; §10 focused 5/5, 관련 tone/love/report/home 58/58, compiler/task 7/7, task-index 3/3, 전체 `npm test` 662/662 PASS. typecheck, Vercel build, diff check PASS.
- CreamWIKI search-first는 동일 프로젝트 구현 없이 일반 안전·승인 원칙만 반환했다. `personal/carrotcap/notes/umsh-tone-v2-safety-claims-gate-20260912.md` put/get/search PASS; 서버 reindex는 NOT_RUN이다.
- 수행하지 않음: live provider/20개 서비스 의미 red-team, 법률·의료 전문 검토, 측정값과 문장 간 의미 함의 평가, 코퍼스·RAG 교체, 릴리스 부착, 커밋, push, 배포, DB 쓰기, Production 변경.
2026-09-12 — Tone V2 §11 vertical slice: added 2–4 sentence paragraph, slash-list and judgment punctuation gates; shared saved-reader answer/evidence/action hierarchy with truthful legacy fallback; result-specific CTA/pager labels. Focused frontend 44/44, persistence 8/8, compiler/task 7/7, and full regression 667/667 PASS; typecheck/vercel-build/diff PASS. CreamWIKI put/get/search PASS at `personal/carrotcap/notes/umsh-tone-v2-readable-report-cards-20260912.md`; server reindex NOT_RUN. Styled synthetic reader inspection is NOT_RUN because browser URL policy blocked injection; no deployment or Production mutation.
2026-09-12 — Tone V2 ZIP-003-100~102 audit: classified the §11 revision marker and ambiguity note as REFERENCE/PASS and the punctuation discriminator as ACTIVE/PASS. Existing hook-role review preserves `지금은 보류.` while shared-reader labels remove terminal periods and join category/classification with `·`; no runtime code change required. Focused tests 73/73 and task-index 3/3 PASS; diff check PASS. CreamWIKI put/get/exact-title search PASS. Server reindex NOT_RUN.

2026-09-12 — Tone V2 P01 첫머리·내부 필드 실제 출력 평가: 운영 데이터와 분리된 합성 입력으로 격식체·해요체·반말체 대표 서비스 3종의 실제 `gpt-5.5-2026-04-23` 응답 6건을 판독했다. ZIP-003-008 직접 답변 6/6, ZIP-003-009 제작 안내형 시작 없음 6/6, ZIP-003-032 내부 필드 미노출 6/6으로 대표 체크포인트는 PASS다. 20개 서비스 전량 출력 승인과 다른 품질 게이트가 남아 있어 세 review unit·P01·릴리스는 IN_PROGRESS를 유지한다. 근거는 `tone-v2/evaluations/P01-opening-internal-live-20260912.json`; 원문은 ignored 격리 캐시에만 유지하고 추적 파일에는 SHA-256·첫 3문장·결정적 판정을 보존했다. 전체 회귀 668/668, typecheck/build/diff PASS. 독립 리뷰 Critical 0/Major 1은 지속 가능한 증거 추가로 반영했다. Antigravity와 Claude fallback 조사는 결과를 만들지 못해 NOT_RUN(degraded)이다. 운영 DB·고객 데이터·Production 변경 없음.
CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-opening-live-evaluation-20260912.md` put/get/search PASS. 서버 reindex는 클라이언트 명령 부재로 NOT_RUN이다.

2026-09-12 — Tone V2 P01 실제 재시도 교정 안내: 거부 사유를 중복 제거 번호 목록으로 전달하고 매 재시도에 문장당 한자 설명 하나·문단당 2~4문장 불변식을 재고지한다. 거부 원문은 복사하지 않으며 사용자 수동 재시도의 첫 호출도 최신 실패 사유를 이어받는다. 합성 실제 모델 최종 재시도에서 목표 규칙 3종은 각각 3/3 PASS, 전체 완료는 별도 다음 판단 기준 실패로 2/3이다. focused 55/55, compiler/task 7/7, 전체 670/670, raw+prose 해시 12/12, typecheck/build/diff PASS. 운영 데이터·DB·Production·배포 변경 없음.
CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-live-repair-guidance-20260912.md` put/get/search PASS. ProjectOps implementation secret scan은 `task-tone...` 파일명 오탐으로 FAIL, test mode는 CreamAI 하위 package script 부재로 WARN이며 저장소 루트 검증 결과를 기준으로 삼는다. 서버 reindex와 수정 후 독립 재리뷰는 NOT_RUN이다.

2026-09-12 — Tone V2 P01 `pass_angle` 다음 판단 기준 판별: 짧은 반말 행동인 `루틴으로 세워봐`를 놓치던 nextCriterion 어휘 경계를 수정했다. 독립 리뷰의 안전 오탐 지적을 수용해 폐기·중단 동사는 제외하고 `시험을 버려`·`공부를 끊어`를 반례로 고정했으며, 원본 표현 `버릴 공부를 정해`·`남길 공부 순서를 매겨`를 정상 사례로 추가했다. 이전 저장 원문은 density 4요소 전체 PASS, 신규 실제 출력 두 번째 시도는 nextCriterion PASS/grounding FAIL이다. focused 56/56, compiler/task 7/7, 전체 671/671, 해시 6/6, typecheck/build/diff PASS. 운영 고객 데이터·DB·Production·배포 변경 없음.
CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-next-criterion-20260912.md` put/get/search PASS. 서버 reindex와 수정 후 독립 재리뷰는 NOT_RUN이다.
ProjectOps implementation harness는 `task-tone...` 파일명 secret 오탐으로 FAIL, test mode는 CreamAI 하위 package script 부재로 WARN이다. 별도 경계 인식 credential scan은 0건이며 저장소 루트 검증을 기준으로 삼는다.

2026-09-12 — 관리자 코퍼스·프롬프트 원천 가시성 결함 수정: 운영 셸의 두 메뉴가 공통 미구현 안내로 끝나고 operations snapshot에는 개수·지문만 있던 것이 원인이었다. 실제 `data/tone-v2/corpus/registry.json`, `tone-v2/generated/manifest.json`, 생성 common/service/persona 파일과 기준 가이드 메타데이터를 읽는 인증 전용 API 및 표 화면을 추가했다. 프롬프트 본문은 응답하지 않으며 Vercel 함수 번들 포함 경로를 명시했다. RED 2건을 확인한 뒤 focused 84/84, 전체 668/668, typecheck/Vercel build/diff check PASS. 로컬 포트 8791 셸은 열렸으나 로컬 관리자 계정 저장소에 제공 계정이 없어 로그인 후 시각 검수는 NOT_RUN. CreamWIKI `personal/carrotcap/notes/umsh-admin-tone-v2-source-visibility-20260912.md` put/get/search PASS; 서버 reindex는 NOT_RUN. 커밋·push·배포·Production 변경 없음.
- 2026-09-12 `task-tone-v2-p01-context-grounding` IN_PROGRESS: 실제 합성 출력이 입력의 `연습 점수`와 `목표 수준`을 재사용했지만 편집용 표지어가 없어 grounding FAIL이 된 원인을 별도 작은 Task로 분리했다. 범위는 컨텍스트 기반 결정적 판별과 일반론 반례이며 새 모델 호출, 프롬프트·재시도·운영 데이터·Production 변경은 하지 않는다.
- 2026-09-12 `task-tone-v2-p01-context-grounding` DONE: 명시한 사용자 입력 필드의 같은 사실 안에서 복수 구체 토큰이 재사용될 때만 lexical 표지어 없는 grounding을 인정한다. 단일 일반론, 필드 간 합산, context 없음, name/savedChat 일치는 거부한다. 기존 합성 provider 원문 재평가 density 4/4 PASS, 역사적 `failed` 상태 유지. 독립 리뷰 Critical 0/Major 3 전부 반영. focused 57/57, compiler/task 7/7, full 672/672, typecheck/Vercel build/diff PASS. 새 provider 호출·커밋·배포·Production 변경 없음.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-context-grounding-20260912.md` put/get/search PASS. ProjectOps implementation의 `task-tone...` secret 오탐과 test 하위 package 경고를 기록했으며 Task 파일 경계 인식 credential scan은 0건, rag/release는 PASS다. 서버 reindex와 독립 재리뷰는 NOT_RUN이다.
- 2026-09-12 `task-tone-v2-p01-pass-angle-e2e` IN_PROGRESS: 새 version key의 합성 `pass_angle` 한 항목을 실제 provider·기존 2회 재시도·격리 저장 경로로 생성한다. 성공은 저장 상태 complete와 전 결정적 검수 PASS이며 실패는 그대로 보존해 다음 결함 하나로 분리한다. 운영 고객 데이터·DB·인증·결제·배포·Production은 범위 밖이다.
- 2026-09-12 `task-tone-v2-p01-pass-angle-e2e` DONE / acceptance FAIL: 기존 AIOS 환경을 값 노출 없이 프로세스에 로드해 새 합성 `pass_angle` 레코드로 실제 provider 응답 2건을 받았다. 저장 상태는 `failed`; 첫 시도는 nextCriterion만, 두 번째는 scene만 실패했다. 독립 검토에서 모델 버전·문장 필드 불일치와 무관한 자격증명이 프로세스에 남는 격리 결함을 찾아 교정했다. 하네스는 이제 승인한 OpenAI 키·모델 선택자만 남기며 재생 결과가 attempt model을 자동 기록한다. environment RED→1/1, focused 58/58, compiler/task 7/7, 전체 673/673, typecheck/Vercel build/diff check PASS. 제품 런타임·운영 고객 데이터·DB·Production·배포는 변경하지 않았다. 다음 승인 Task는 `다음 복기에서`와 관찰 행동을 좁게 인식하되 일반 행동문을 장면으로 허용하지 않는 scene 경계다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-e2e-20260912.md` put/get/search PASS. ProjectOps implementation은 `task-tone...`를 토큰으로 보는 광범위 패턴 때문에 FAIL했지만 Task 파일 경계 인식 scan은 0건이며 별도 JSON 증거로 남겼다. Test mode는 CreamAI 하위 package 경고이며 저장소 루트의 실제 673/673를 기준으로 삼는다. RAG/release PASS.
- 2026-09-12 `task-tone-v2-p01-review-session-scene` IN_PROGRESS: 새 provider 호출 없이 저장된 합성 `pass_angle` 두 번째 응답의 `다음 복기에서 ... 나눠봐`를 재평가한다. 복기·오답노트·마킹 검토의 명시적 세션 연결어와 관찰 가능한 분류·기록·확인 행동이 함께 있을 때만 scene으로 인정하며, 일반 격려와 bare noun은 계속 거부한다.
- 2026-09-12 `task-tone-v2-p01-review-session-scene` DONE: 복기·오답 노트·마킹 검토의 명시적 세션과 긍정형 관찰 행동이 같은 문장에 있을 때만 scene으로 인정한다. 일반 격려, 명사형 행동 라벨, 복기 맥락 없는 행동, `문제...하면/에서` 행동문, 부정된 행동은 거부한다. 저장된 합성 provider 원문은 density 4/4 PASS로 재평가됐지만 역사적 `failed` 상태는 유지했다. 독립 리뷰의 Major 경계 지적을 반영했으며 focused related 59/59, compiler/task 7/7, full 674/674, typecheck/Vercel build/diff PASS. 새 provider 호출·커밋·배포·Production 변경 없음.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-review-session-scene-20260912.md` put/get/search PASS. ProjectOps implementation은 `task-tone...` 문자열의 광범위 secret 오탐으로 FAIL했지만 Task 파일 boundary-aware credential scan은 0건이며, test 하네스의 CreamAI 하위 package 경고 대신 저장소 루트 674/674를 권위 증거로 사용했다. RAG/release PASS.
- 독립 closure 재리뷰는 Approved, Critical 0 / Major 0 / Minor 0이다. 대상이 세션 표현 앞뒤에 있는 경우를 모두 지원하되 대상→긍정형 행동 순서를 제한 구간에서 강제했고, 명사형·희망/부정형·동작 뒤에 우연히 나온 대상은 거부한다.
- 2026-09-12 `task-tone-v2-p01-pass-angle-e2e-rerun` IN_PROGRESS: 기존 OpenAI 키 재사용을 사용자에게 승인받았다. 새 version의 합성 `pass_angle` 한 항목만 실제 provider·기존 재시도·격리 저장으로 실행하며, 런타임·모델·프롬프트·검수 gate·운영 데이터·DB·Production은 변경하지 않는다.
- 2026-09-12 `task-tone-v2-p01-pass-angle-e2e-rerun` DONE / business acceptance FAIL: 사전 조회 `not-generated`인 새 version에서 실제 provider 2회 응답을 받고 격리 레코드에 저장했다. 두 시도 모두 scene은 PASS. attempt 2는 nextCriterion만 실패했고, attempt 1은 2~4문장 문단 규칙과 nextCriterion을 함께 실패했다. 독립 리뷰 Major 2건(실패 원인 과축소, 최신 테스트 상태 미기록)을 증거 문서에 반영했다. focused 59/59, compiler/task 7/7, full 674/674, typecheck/Vercel build/saved replay/diff PASS. 런타임·모델·재시도·운영 데이터·DB·Production·배포 변경 없음.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-e2e-rerun-20260912.md` put/get/search PASS. Task 경계 인식 credential scan은 0건이다. 다음 승인 Task는 attempt 2의 대상·행동 종결문이 nextCriterion으로 인식되지 않은 좁은 경계를 진단한다.
- ProjectOps implementation harness는 광범위 `sk-...` 패턴이 `task-tone...` 식별자를 오탐해 FAIL했다. 별도 경계 인식 scan 0건을 기준으로 비밀값 미저장을 확인했다. test mode는 `CreamAI` 하위 package를 조회해 WARN이고 저장소 루트 674/674가 권위 결과다. rag/release harness PASS는 실제 배포를 뜻하지 않으며 커밋·push·배포는 NOT_RUN이다.
- 독립 closure re-review는 Approved, Critical 0 / Major 0 / Minor 0이다. 다음 단계는 이미 분리한 nextCriterion 경계 Task이며 이번 증거 종료에서 런타임을 변경하지 않았다.
- 2026-09-12 `task-tone-v2-p01-adjacent-next-criterion` IN_PROGRESS: 기존 nextCriterion이 시간/순서 표지와 행동을 같은 문장에서만 찾기 때문에 fresh attempt 2의 인접 문장 구조를 놓친다는 root cause를 확정했다. RED→인접 2문장 최소 수정→반례 검증으로 진행하며 새 provider 호출·문단 규칙·Production은 범위 밖이다. 지정 TDD 스킬 파일은 이 포크와 원본 프로젝트 모두 없어 수동 TDD 절차로 대체한다.
- 2026-09-12 `task-tone-v2-p01-adjacent-next-criterion` DONE: 현재/미래 계획 문장과 바로 다음의 조사 표시 구체 행동을 nextCriterion으로 연결한다. 같은 문장 경로도 동일한 대상·부정·과거완료·시험/공부 포기 경계를 적용하고, 버스·접수·버티기·끊김 및 포기 금지 표현은 오탐하지 않는다. 불변 fresh attempt 2는 density 4/4 PASS로 재평가됐고 과거 저장 상태 `failed`와 SHA-256은 유지했다. focused 33/33, related 60/60, compiler/task 7/7, full 675/675, typecheck/Vercel build/diff PASS. 독립 승인 리뷰 Critical/Major/Minor 0. 새 provider 호출·커밋·배포·Production 변경 없음.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-adjacent-next-criterion-20260912.md` put/get/search PASS. ProjectOps implementation은 `task-tone...` 식별자를 비밀 토큰으로 보는 광범위 패턴 때문에 FAIL했지만 경계 인식 credential scan은 0건이다. test mode는 CreamAI 하위 package script 부재로 WARN이며 저장소 루트 675/675를 권위 증거로 삼는다. rag/release PASS; server reindex는 클라이언트 명령 부재로 NOT_RUN이다.
- 2026-09-12 `task-tone-v2-p04-pass-angle-completion-e2e` IN_PROGRESS: nextCriterion 수정 뒤 새 합성 `pass_angle` 한 항목이 실제 provider와 기존 재시도·격리 저장 경로에서 `complete`로 저장되는지 확인한다. 고유 version 사전 조회, 신규 complete 레코드, 공개 hook/body, 전 결정적 검수 PASS가 완료 기준이다. 프롬프트·모델·재시도·운영 데이터·DB·인증·결제·배포·Production 변경은 범위 밖이다.
- 2026-09-12 `task-tone-v2-p04-pass-angle-completion-e2e` DONE / acceptance PASS: 고유 version을 사전 `not-generated`로 확인한 뒤 합성 `pass_angle` 한 항목을 실제 provider와 기존 2회 재시도·격리 파일 저장으로 실행했다. 첫 시도는 nextCriterion 실패, 두 번째는 전 결정적 검수와 density 4/4를 통과해 report/section `complete`, 공개 hook 23자·본문 304자로 저장됐다. 증거 하네스는 `--fresh`로 기존 version 재사용을 fail-closed 처리하고 production 생성과 동일한 공용 전수 검수 함수를 재생한다. 독립 재리뷰에서 기존 Major 2건 해결, Critical/Major/Minor 0. focused 35/35, related 61/61, compiler/task 7/7, full 676/676(101 suites), typecheck/Vercel build/saved replay/fresh guard/diff PASS. P04 전체 목차와 20개 서비스, 커밋·배포·Production은 미완료다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-completion-e2e-20260912.md` put/get/search PASS. ProjectOps implementation은 `task-tone...` 식별자를 비밀 토큰으로 보는 광범위 패턴 때문에 FAIL했지만 경계 인식 credential scan은 0건이다. test mode는 CreamAI 하위 package script 부재로 WARN이며 저장소 루트 676/676을 권위 결과로 삼는다. rag/release PASS; server reindex는 클라이언트 명령 부재로 NOT_RUN이다.
- 2026-09-12 `task-tone-v2-p04-pass-angle-full-outline` IN_PROGRESS: 사용자가 기존 OpenAI 키 재사용과 ignored `.env.local` 설정을 승인했다. 다섯 실전 파일의 명시적 10/11/10/10/11 소제목 블록만 52항목 목차 원천으로 사용하고 예시 본문은 재사용하지 않는다. 정확한 ID·제목·그룹·순서, progress 52, 순차 stop-on-failure, 전체 결정적 replay를 먼저 테스트한 뒤 고유 합성 version을 실제 provider로 실행한다. 운영 고객 데이터·기존 완료 결과·DB·인증·결제·배포·Production은 범위 밖이다.
- 2026-09-12 `task-tone-v2-p04-pass-angle-full-outline` DONE / business acceptance FAIL: 다섯 명시적 목차 블록을 10개 그룹·52항목으로 연결하고 파일 SHA-256·제목·순서를 기계적으로 검증했다. 독립 리뷰의 Major 1건인 전체 형제 본문 O(n²) 누적을 전 항목 160자 요약 + 최근 4개 본문 각 1,200자 상한으로 수정했다. 고유 합성 version 실제 provider 실행은 첫 항목이 2회 모두 품질 검수에 실패했고, 이후 호출은 0건이었다. focused 53/53, full 681/681(101 suites), compiler/task 7/7, typecheck/Vercel build/diff PASS. 전체 52항목 실제 출력·릴리스·Production·커밋·배포는 미완료이며 다음 승인 Task는 `task-tone-v2-p04-pass-angle-first-section-quality`다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-full-outline-20260912.md` put/get/search PASS. 서버 reindex는 클라이언트 명령 부재로 NOT_RUN. ProjectOps preflight/rag/release PASS, test는 CreamAI 하위 package 경로로 WARN, implementation은 `task-tone...` 식별자 오탐으로 FAIL이다. 실제 키·원문은 추적 증거에 저장하지 않았다. Closure re-review는 Approved, Critical/Major/Minor 0이다.
- 2026-09-12 `task-tone-v2-p04-pass-angle-first-section-quality` IN_PROGRESS: 사용자의 `다음` 승인에 따라 첫 `pass-angle-verdict` 결함만 시작했다. 기존 ignored `.env.local` 키 존재·ignore 상태를 값 노출 없이 확인했다. CreamWIKI의 paid-density, live repair, next-criterion, 단일 completion 사례를 검색했고, 생성 안내와 실제 결정적 검수의 불일치만 RED→최소 수정→새 첫 항목 provider 실행으로 검증한다.
- 2026-09-12 `task-tone-v2-p04-pass-angle-first-section-quality` DONE / business acceptance FAIL: 첫 항목에만 상징/현실 경계, 실제 장면, 구체 다음 기준, 한자 설명 분리 계약을 연결하고 `--limit=1` 하네스로 범위 밖 호출을 차단했다. 실제 provider 첫 시도는 문단 구조·상징 경계, 두 번째는 다음 기준·복수 한자 설명에서 실패했다. 즉 재시도가 기존 통과 조건을 회귀한 별도 결함이다. focused 48/48, full 682/682(101 suites), compiler/task 7/7, typecheck/Vercel build/diff PASS. 2~52항목·운영 데이터·DB·Production·배포·커밋은 실행하지 않았다.
- 다음 승인 대기 Task는 `task-tone-v2-p04-repair-invariant-preservation`이다. 현재 실패 규칙을 고치면서 이미 통과한 품질 규칙을 보존하는 repair 계약만 다루며, 이번 Task에서는 추가 provider 호출을 하지 않는다.
- 독립 closure review는 Approved with comments, Critical 0 / Major 0 / Minor 1이다. ProjectOps release가 덮어쓴 최종 보고서와 test summary의 증적 공백을 즉시 복구했으며 코드 변경이나 추가 provider 호출은 없었다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-first-section-quality-20260912.md` put/get/search PASS(정확한 제목 첫 결과). 서버 reindex는 클라이언트 명령 부재로 NOT_RUN이다.
- 2026-09-12 `task-tone-v2-p04-repair-invariant-preservation` IN_PROGRESS: 사용자 `다음` 승인에 따라 직전 실제 두 시도의 상호 보완적 실패만 진단한다. CreamWIKI의 live repair와 first-section 품질 기록을 검색했고, 현재 실패만 고치다가 통과 규칙을 회귀하지 않도록 공용 repair 계약을 RED→최소 수정으로 보강한다. 지정 local 디버깅/TDD 스킬 파일은 없어 수동 절차로 대체한다.
- 2026-09-12 `task-tone-v2-p04-repair-invariant-preservation` DONE / business acceptance FAIL: repair 메시지에 직접 답, 근거 층, 가상 장면, 구체 다음 기준, 한자·문단, 서비스 말투, 안전, 수치·내부 필드·코퍼스·형제 중복 불변식을 재고지했다. 거부 원문 비복사와 실패 목록 중복 제거를 유지했다. RED 9/10→GREEN 10/10, focused 48/48, full 682/682(101 suites), compiler/task 7/7, typecheck/Vercel build/diff PASS. 실제 provider는 첫 시도 문단 구조, 두 번째 nextCriterion에서 실패했고 2~52항목과 제한 밖 호출은 0건이다. 다음 승인 대기는 `task-tone-v2-p04-repair-next-criterion-retention`이다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-repair-invariant-preservation-20260912.md` put/get/exact-title search PASS. 독립 closure review는 Approved with comments, Critical/Major 0이며 증거 보고서 공백을 보강했다. ProjectOps review PASS; 서버 reindex는 NOT_RUN이다.
- 2026-09-12 `task-tone-v2-p04-repair-next-criterion-retention` IN_PROGRESS: 사용자 `다음` 승인으로 P04 attempt 2의 nextCriterion 단일 회귀를 시작한다. 마지막 의미 단락의 구체 대상 + 기록·비교·확인 행동과 반환 전 자기검사를 repair 계약으로 고정하며 recognizer/gate/model/retry는 바꾸지 않는다. CreamWIKI search-first PASS; 지정 local 코딩/TDD/검증 스킬 파일은 없어 수동 RED→GREEN으로 대체한다.
- 2026-09-12 `task-tone-v2-p04-repair-next-criterion-retention` DONE: 마지막 의미 단락 2~4문장, 구체 대상, 기록·비교·확인 행동, 모호한 반례, 반환 전 비출력 자기검사를 공용 repair 계약에 추가했다. RED 9/10→GREEN 10/10, focused 48/48, full 682/682(101 suites), compiler/task 7/7, typecheck/Vercel build/diff PASS. 실제 합성 첫 항목은 attempt 1에서 complete되어 1/52이며 live repair 경로는 NOT_RUN이다. 후속·제한 밖 호출은 0건이다.
- 독립 closure re-review는 Approved with comments, Critical/Major 0이다. 최초 Major 3건은 task-specific scope, boundary scan 0건, 저장소 루트 테스트 증거로 해소했고 `tests.md` stale-line Minor도 원래 섹션으로 이동했다. CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-repair-next-criterion-retention-20260912.md` put/get/exact-title search PASS; 서버 reindex는 NOT_RUN이다. 다음 비활성 Task는 `task-tone-v2-p04-pass-angle-full-outline-continuation`이다.
# 2026-09-12 — Tone V2 P04 pass-angle full-outline continuation

- IN_PROGRESS: 사용자 `다음` 승인으로 기존 version `p04-repair-next-criterion-retention-20260912-1`의 1/52 레코드를 이어 쓴다. OpenAI 기존 키의 존재·gitignore·재사용 승인을 값 노출 없이 재확인했다. CreamWIKI search-first 근거에 따라 정확한 순서, 첫 미해결 실패 즉시 중단, gate 불변, 원문·비밀 미기록을 적용한다.
- DONE / business acceptance FAIL at 2/52: 기존 item 1은 해시·complete 상태를 보존했다. item 2는 첫 시도의 scene·nextCriterion 실패를 자연 repair가 고쳐 complete/replay PASS가 됐다. item 3은 첫 시도 4개 규칙, 두 번째 시도 `nextCriterion` 1개를 실패해 중단했다. item 4~52 호출은 0건이며 provider 호출 4회·82,249 tokens를 사용했다.
- 검증: saved replay PASS, focused 48/48, compiler/task 7/7, full 682/682(101 suites), typecheck/Vercel build/diff PASS. ProjectOps implementation 광범위 scan은 `task-tone...` 오탐으로 FAIL했으나 경계 인식 scan 0건이다. ProjectOps test의 하위 package 경고 대신 저장소 루트 테스트가 권위 결과다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-full-outline-continuation-20260912.md` put/get/exact-title search PASS. 첫 독립 리뷰는 운영 문서 미종료를 Major로 지적했고 모두 보완했다. 다음 비활성 Task는 `task-tone-v2-p04-comparative-next-criterion-diagnosis`이며 새 사용자 `다음` 전에는 시작하지 않는다.
- 독립 closure re-review는 Approved with comments, Critical/Major/Minor 0이며 ProjectOps review PASS다. 이 Task는 DONE / business acceptance FAIL at 2/52로 종료하고 추가 provider 호출 없이 사용자 `다음`을 기다린다.
- 2026-09-13 `task-tone-v2-p04-comparative-next-criterion-diagnosis` IN_PROGRESS: 사용자 `다음` 승인으로 저장된 item 3 attempt 2의 nextCriterion 단일 실패를 새 provider 호출 없이 진단한다. CreamWIKI search-first는 기존 같은 문장/인접 문장의 구체 대상·안전 행동·부정/포기 방지 규칙을 반환했다. 라우터가 지정한 `.claude/skills` 원본 4개는 이 포크에 없어 CreamAI 래퍼와 수동 증거 우선 절차로 대체한다.
- DONE: 저장 문장은 시간 표지·관찰 가능한 비교 대상·비교 행동·결과별 후속 판단을 모두 포함해 출력 결함이 아니다. 현재 recognizer가 안전한 `해봐` 활용형과 주격 관찰절 대상을 각각 놓치며, 한 조건만 표준화하면 false, 둘 다 표준화하면 true가 되는 이중 false negative를 확인했다. targetless/vague/negated 통제군은 false다.
- 검증: attempt/raw hash 일치, record raw-file SHA-256 전후 일치, focused 35/35, compiler/task 7/7 PASS. provider 호출 0, 제품 코드 변경 0. 다음 비활성 Task는 `task-tone-v2-p04-comparative-next-criterion-recognition`이다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-comparative-next-criterion-diagnosis-20260913.md` put/get/exact-title search PASS. Task 파일 경계 인식 credential scan은 0건이다. ProjectOps implementation의 광범위 `task-tone...` 오탐과 nested `CreamAI/package.json` test 경고 대신 경계 scan 및 저장소 루트 테스트를 권위 증거로 삼는다. RAG/release harness PASS는 실제 배포를 뜻하지 않으며 커밋·push·배포·Production 변경은 NOT_RUN이다.
- 독립 closure review는 Approved with comments, Critical/Major/Minor 0이다. 유일한 재현성 의견인 통제 변형의 안전한 fixture 문자열 또는 해시 보존을 후속 recognition Task acceptance에 반영했다.
- ProjectOps review PASS. 최종 JSON 4개 parse, immutable record SHA-256 재확인, core/task diff check PASS로 진단 Task를 닫았다.
- 2026-09-13 `task-tone-v2-p04-comparative-next-criterion-recognition` IN_PROGRESS: 사용자 `다음` 승인으로 이중 false negative 최소 수정을 시작했다. CreamWIKI search-first에서 한국어 행동 동사 확장은 시간·구체 대상·안전 동사·포기 반례를 함께 묶어야 한다는 기존 규칙과 직전 진단을 재사용한다. 지정 local 디버깅/TDD/검증 Skill 원본 5개는 이 포크에 없어 수동 RED→GREEN 및 증거 우선 절차로 대체한다.
- 구현/검증 완료, closure 진행 중: `비교/확인해봐`만 안전 활용으로 추가하고, 주격 대상은 관찰 가능한 결과 술어가 있는 절로 제한했다. 첫 독립 리뷰의 시간·기점 대상화와 띄어 쓴 과거 보조용언 오탐을 추가 RED 38/2로 재현해 수정했다. 최종 focused 40/40, related 45/45, compiler/task 7/7, full 687/687(101 suites), typecheck/Vercel build PASS. 저장 attempt density 4/4 PASS, 역사적 failed 상태·2회 시도·raw-file SHA-256 유지. provider 호출과 Production 변경 0.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-comparative-next-criterion-recognition-20260913.md` put/get/exact-title search PASS. ProjectOps implementation은 `task-tone...` 광범위 오탐으로 FAIL, nested package test는 WARN이며 task-boundary credential scan 0건과 저장소 루트 687/687을 권위 증거로 삼는다. RAG/release PASS는 실제 배포를 뜻하지 않는다.
- DONE: 첫 독립 리뷰의 Major 2건을 수정한 뒤 closure re-review Approved, Critical/Major/Minor 0. 최종 focused 40/40, related 45/45, compiler/task 7/7, full 687/687(101 suites), typecheck/Vercel build PASS. CreamWIKI 업데이트 put/get/exact-title search와 ProjectOps review PASS. 다음 비활성 Task는 `task-tone-v2-p04-pass-angle-item3-recovery`이며 새 사용자 `다음` 전에는 시작하지 않는다.
- 2026-09-13 `task-tone-v2-p04-pass-angle-item3-recovery` IN_PROGRESS: 사용자 `다음` 승인으로 item 3 저장 실패 상태 복구를 시작했다. 원문·attempt 이력과 item 1~2/4~52를 보존하며 동일 production review PASS일 때만 CAS로 섹션을 승격한다. 지정 local 구현/TDD/검증 skill 원본은 없어 수동 RED→GREEN 절차로 대체한다. CreamWIKI search-first와 ProjectOps preflight를 실행했다.
- 독립 조사 dispatch는 Antigravity의 empty-prompt 오류 뒤 Claude fallback이 출력 없이 지연되어 중단했다. 조사 보고서는 `NOT_RUN (degraded)`이며, CreamWIKI의 기존 저장·재생 사례와 현재 코드의 CAS/전체 검수 근거로만 구현 결정을 진행한다.
- DONE: 저장된 item 3 attempt 2를 공용 parser와 production review로 재검증해 section projection만 complete로 승격했다. 동시 2회+반복 1회에서 revision 18→19 한 번만 변경됐고 record는 3/52 generating이다. identities, item 1~2, attempts/raw SHA-256, item 4~52는 불변이며 provider 호출·후속 attempt는 0건이다.
- 리뷰 의견으로 malformed lease 거부와 expired lease 허용 테스트를 명시적으로 보강했다. 최종 focused 13/13, related 53/53, compiler/task 7/7, full 690/690(101 suites), typecheck/Vercel build/3항목 replay PASS. 독립 리뷰 Approved with comments, Critical/Major 0; ProjectOps rag/release/review PASS. implementation은 광범위 `sk-...` 패턴이 `task-tone...` 식별자를 잡는 알려진 오탐으로 FAIL이며 task-scoped boundary-aware scan 0건을 권위 증거로 삼는다. nested-package test WARN은 저장소 루트 결과로 대체한다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-pass-angle-item3-recovery-20260913.md` put/get/exact-title search PASS. 서버 reindex는 CLI 명령 부재로 NOT_RUN이다. 커밋·push·배포·Production은 실행하지 않았다. 다음 비활성 Task는 `task-tone-v2-p04-pass-angle-full-outline-resume-from-item4`이며 새 사용자 `다음` 전에는 시작하지 않는다.
- 2026-09-13 `task-tone-v2-p04-pass-angle-full-outline-resume-from-item4` IN_PROGRESS: 사용자 `다음` 승인으로 기존 3/52 격리 레코드에서 item 4 이후 순차 생성을 시작한다. ignored `.env.local`의 usable OpenAI 키 존재와 이전 명시적 재사용 승인을 값 노출 없이 확인했다. 첫 미해결 실패 즉시 중단하고 item 1~3·식별자·운영 데이터·Production은 불변으로 둔다.
- ProjectOps preflight와 CreamWIKI search-first PASS. 기존 전체 목차 이어쓰기·단일 E2E·저장 복구 기록의 순차 실행, 첫 실패 중단, 원문 비저장, 불변 해시 원칙을 재사용한다. Antigravity는 empty-prompt 오류, Claude 대체 조사는 두 차례 제한 대기에도 무응답이라 중단했으며 조사 보고서는 `NOT_RUN (degraded)`로 기록한다.
- Live continuation 결과: 정확히 item 4부터 시작해 4~6번이 각 2회 시도 안에 complete/replay PASS가 됐다. 7번 `study-style-sprint-vs-steady`는 두 시도 모두 nextCriterion 단일 사유로 실패해 즉시 중단했다. 현재 6/52 failed, item 8~52 attempt 0, item 1~3 prose SHA-256과 report/result ID 불변이다. 이번 실행은 provider 8회, 167,007 tokens이며 추적 증거에는 원문·비밀을 저장하지 않았다.
- 사용자 보강 지시를 반영해 첫 실패를 Task 종료가 아닌 안전 체크포인트로 전환했다. item 7 attempt 2는 `다음 풀이`의 관찰 대상·조건 결과·구체 유지 결정을 포함하지만 현재 판별기는 명령형 행동만 인정해 `줄면 ... 유지야` 조건형 결정을 놓친다. 좁은 RED→최소 판별 보강→저장 attempt 복구 후 item 8부터 계속한다.
- DONE / acceptance PASS: 실패별 stop/진단/RED→최소 수정/저장 복구 또는 기존 retry 루프를 order 52까지 반복해 동일 격리 레코드를 52/52 `complete`로 마쳤다. item 1~3 prose SHA-256과 report/result identity는 불변이며 최종 production-equivalent replay 52/52 PASS다. items 4~52는 provider 103회, 2,307,658 tokens를 사용했다.
- 독립 closure 리뷰를 9차까지 반복하며 모든 지적을 RED→GREEN으로 수정했다. 마지막 r8의 `아침부터 확인해` 같은 시간 기점 대상화도 generic `부터` 분기를 제거해 차단했고, r9는 Approved(Critical/Major/Minor 0)다. 최종 focused 68/68, serial full 705/705(101 suites), typecheck/Vercel build/live replay 52/52 PASS. 병렬 full run의 Windows temp cleanup EPERM 1건은 해당 파일 단독 10/10과 serial full 705/705로 환경 경합임을 확인했다.
- 추적 증거에는 provider 원문·비밀을 저장하지 않았다. 운영 고객 데이터·DB/auth/payment/admin·corpus/release·commit/push/deploy/Production은 NOT_RUN이다. 독립 조사는 Antigravity empty-prompt와 Claude fallback 지연으로 NOT_RUN(degraded)이며 기존 CreamWIKI와 현재 production contract로 대체했다.
- 최종 문서와 CreamWIKI 정식 경로 `personal/carrotcap/notes/umsh-tone-v2-pass-angle-52-completion-20260913.md`를 최신 안전 규칙으로 갱신했고 put/get/exact-title search PASS다. CLI 상대 경로를 한 차례 중복 지정해 생긴 보조 문서는 삭제 API 미지원으로 증거 없는 superseded 안내문으로 덮어썼다. ProjectOps review PASS의 기계 생성 상세 경로는 최종 r9 승인 보고서로 교정했다.
- 2026-09-13 `task-tone-v2-p04-quit-fortune-full-outline` IN_PROGRESS: 사용자 `다음` 승인. 인계 순서의 두 번째 파일럿 `quit_fortune`은 제공 실전 목차가 48항목이지만 현재 런타임은 30항목이라, 실제 provider 실행 전 원천 해시·제목·순서와 48-pending 저장 불변성을 먼저 고정한다. 로컬 skill 원본은 포크에 없어 수동 RED→GREEN과 기존 독립 리뷰 절차로 대체했고 CreamWIKI search-first PASS다.
- 2026-09-13 `task-tone-v2-p04-quit-fortune-full-outline` DONE: source contract RED에서 기존 30항목을 재현한 뒤 정확한 10개 그룹/48개 제목·순서로 전환했다. 임시 legacy alias가 30개 장면만 만들던 전체 회귀 실패를 테스트 약화 없이 제거하고, 48개 제목마다 독립적인 직접 해석·고유 장면·행동을 부착했다. 새 유료 저장 결과는 48개 immutable identity를 유지하면서 전부 pending/빈 본문으로 저장된다.
- 최종 검증: focused 9/9, full 708/708(101 suites), Vercel build/typecheck PASS. 독립 closure review는 Approved with comments, Critical/Major 0; 지적된 마지막 안전 고지의 옛 제목 조건을 새 제목으로 수정하고 동일 검증을 재실행했다. ProjectOps test/rag/review PASS. implementation 광범위 scan은 `task-tone...` 식별자를 secret로 잡는 알려진 오탐이며 실제 비밀 값은 문서·평가에 저장하지 않았다.
- provider 생성, 고객/운영 데이터, DB/auth/payment/admin, corpus/release, commit/push/deploy/Production은 NOT_RUN이다. 다음 비활성 Task는 `task-tone-v2-p04-quit-fortune-full-outline-generate`이며 새 사용자 `다음` 전에는 시작하지 않는다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-quit-fortune-48-outline-20260913.md` put/get/exact task-id search PASS. 평가 JSON parse와 task-boundary credential scan 0건, task-scoped diff check PASS(CRLF 경고만 있음).
- 2026-09-13 `task-tone-v2-p04-quit-fortune-full-outline-generate` IN_PROGRESS: 사용자 `다음` 승인. OpenAI credential gate에 따라 ignored `.env.local`의 usable key 존재를 값 노출 없이 재확인했고 이전 명시적 기존 키 재사용 승인을 적용한다. 전용 합성 격리 하네스 RED/GREEN 후 item 1 실제 검수 게이트부터 시작한다.
- 2026-09-13 `task-tone-v2-p04-quit-fortune-full-outline-generate` DONE: 고유 합성 격리 레코드 `p04-quit-fortune-full-outline-20260913-1`에서 실제 configured provider로 정확한 48개를 순차 생성했고 최종 48/48 complete, production-equivalent replay 48/48 PASS다. provider attempt 109회 중 거부 71회를 그대로 보존하고 legitimate gate RED/GREEN 뒤 10개 항목을 안전 복구했다. 첫 미해결 실패 뒤 및 요청 범위 밖 attempt는 0건이다.
- 독립 1차 리뷰가 retry/recovery 모드의 전체-prefix 완료조건 우회(Major)와 `고도화` 지형어 오탐(Minor)을 찾았다. 공통 실행형 완료 불변식과 양·음성 지형 경계 fixture로 수정했고 focused 103/103, 저장 48/48 replay, full 719/719(101 suites), typecheck, Vercel build를 재실행해 모두 PASS했다. 재리뷰는 Approved with comments, Critical/Major/Minor 0이다.
- 평가 파일은 해시·상태·통계만 포함하며 provider 원문·시크릿·개인정보를 포함하지 않는다. ProjectOps preflight/implementation/test/review/rag/release PASS. 고객/운영 데이터, Supabase/DB/auth/payment/admin/corpus/release, commit/push/deploy/Production은 NOT_RUN이다.
- CreamWIKI search-first에서 기존 52항목 checkpoint 완료 패턴과 한국어 nextCriterion 보강 사례를 재사용했다. `personal/carrotcap/notes/umsh-tone-v2-quit-fortune-48-provider-completion-20260913.md` put/get/exact task-id search PASS이며 로컬 ProjectOps 후보도 approved knowledge로 승격했다. 서버 전용 수동 reindex 4개 명령은 이 PC에 스크립트가 없어 NOT_RUN이지만 remote search에는 저장 문서가 즉시 1건 반환됐다.
- 2026-09-13 `task-tone-v2-p05-quit-fortune-corpus-rag-release-candidate` IN_PROGRESS: 사용자 `다음` 승인. 조사 결과 런타임은 Tone V2 corpus registry를 읽지만 `quit_fortune` 2.0.0의 12개 블록은 여전히 semantic review 미완료이며, report에 저장된 corpus snapshot이 후속 생성 retrieval에 전달되지 않아 registry 교체 시 한 report 안에서 버전이 섞일 수 있다. 이번 Task는 이 결함의 RED/GREEN, 별도 2.1.0 pack, 신규 report 전용 attachment와 rollback 증거까지 포함한다. CreamWIKI search-first PASS; 로컬 `.claude/skills` 부재로 사용자 공통 workflow의 수동 TDD/검증 절차를 적용한다.
- 2026-09-13 `task-tone-v2-p05-quit-fortune-corpus-rag-release-candidate` DONE: 기존 2.0.0은 덮어쓰지 않고 `releases/quit-fortune-service-2.1.0.json` 12개 블록을 입력 사실·계산값·상징 해석·가상 사례·수치 출처·안전 경계로 전수 검수해 신규 snapshot용으로 활성화했다. report 저장 snapshot을 registry/file loading/RAG/section generation/saved-attempt review 전 경로에 전달했고, 과거 snapshot에는 current vector rank를 섞지 않으며 파일 해시 불일치 시 fail-closed한다.
- 최종 task-specific 8/8, related RAG 41/41, full 727/727(102 suites), typecheck/Vercel build/deterministic builder/diff check PASS. Codex closure review Approved with comments, Critical/Major/Minor 0. 평가와 release manifest에는 해시·상태만 있고 provider 원문·시크릿·개인정보가 없다. ProjectOps preflight/review/rag/release PASS; nested test WARN은 root suite로 대체했고 implementation의 `task-tone-*` secret 오탐은 알려진 하네스 한계로 기록했다.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-quit-fortune-corpus-snapshot-20260913.md` put/get/title search PASS. 로컬 ProjectOps memory도 approved로 승격했다. 서버 전용 수동 reindex 명령은 이 PC에 없어 NOT_RUN이다. Production·고객 데이터·DB/auth/payment/admin·commit/push/deploy는 NOT_RUN이다.
- Task 산출물 경계 인식 credential scan은 0건이며, 최종 candidate corpus/review/manifest builder 재실행 해시는 동일해 재현성 PASS다.
- 2026-09-13 `task-tone-v2-p05-money-save-corpus-rag-release-candidate` IN_PROGRESS: user approved the next Task. The active 2.0.0 pack has 12 blocks and remains `needs_semantic_review`; unsupported prescription periods/counts and unverified habit claims will be removed. CreamWIKI search-first found the prior snapshot-isolation and evidence-layer patterns, which this Task reuses. Production and provider calls remain 0.
- 2026-09-13 `task-tone-v2-p05-money-save-corpus-rag-release-candidate` DONE: preserved the original 2.0.0 pack and activated a separate reviewed 2.1.0 pack for new snapshots. All 12 blocks now separate input facts, calculated values, symbolic hypotheses and hypothetical examples, with arbitrary amount/percentage/period/count prescriptions and deterministic financial outcomes removed. Old snapshots remain pinned in retrieval, prompt construction and saved-attempt review; content-hash mismatch fails closed.
- Verification: task 8/8, related 74/74, serial full 735/735 across 103 suites, typecheck/Vercel build/deterministic builder/credential boundary PASS. Manual Codex closure review Approved with comments, Critical/Major/Minor 0. ProjectOps preflight/implementation/rag/release/review PASS; its nested `CreamAI/package.json` test check WARN is superseded by the repository-root suite. CreamWIKI put/title search PASS; direct get initially used an incomplete relative path and returned 404, then was rechecked with the returned canonical path. Provider output, Production, customer data, DB/auth/payment/admin, commit, push and deploy remain NOT_RUN.
- 2026-09-13 `task-tone-v2-p05-match-couple-corpus-rag-release-candidate` IN_PROGRESS: user approved the next Task. The active pack has 18 blocks and remains `needs_semantic_review`; unverified partner emotions, relationship scenes, future outcomes and arbitrary periods/counts will be removed. CreamWIKI search-first returned the established evidence-layer, safety-claims and snapshot-isolation rules. Production and provider calls remain 0.
- 2026-09-13 `task-tone-v2-p05-match-couple-corpus-rag-release-candidate` DONE: preserved the original 2.0.0 and activated separately reviewed 2.1.0 for new snapshots. All 18 blocks now separate two-person input, calculated values, symbolic hypotheses and hypothetical examples. Partner mind, affection, intent, future and abuse status are not inferred; threat, control and violence are separated from ordinary conflict and route to safety and appropriate professional support.
- Verification: task 8/8, related 74/74, serial full 743/743 across 104 suites, typecheck/Vercel build/deterministic builder/credential boundary PASS. Manual Codex closure review Approved with comments, Critical/Major/Minor 0. ProjectOps preflight/implementation/rag/release/review PASS; nested `CreamAI/package.json` test WARN is superseded by the repository-root suite. CreamWIKI put/get/exact-title search PASS and approved ProjectOps memory promoted. Provider output, Production, customer data, DB/auth/payment/admin, commit, push and deploy remain NOT_RUN.
- 2026-09-13 `task-tone-v2-p05-marry-match-corpus-rag-release-candidate` IN_PROGRESS: user approved the next Task. The active pack has 20 blocks and remains `needs_semantic_review`, including a contextual-claim finding on mar-020. Marriage dates/outcomes, partner/family reactions and unsupported periods/counts will be removed. CreamWIKI search-first returned relationship safety, evidence-layer and snapshot patterns. Production and provider calls remain 0.
- 2026-09-13 `task-tone-v2-p05-marry-match-corpus-rag-release-candidate` DONE: preserved the original 2.0.0 and activated separately reviewed 2.1.0 for new snapshots. All 20 blocks now separate user input, calculated values, symbolic hypotheses and labeled hypothetical examples. Partner/family intent, marriage timing/outcome and reproductive decisions are not inferred; threat, control, violence and contact refusal route to safety and appropriate support.
- Verification: task 8/8, related 74/74, serial full 751/751 across 105 suites, typecheck/Vercel build/deterministic builder/credential boundary PASS. Manual Codex closure review Approved with comments, Critical/Major/Minor 0. ProjectOps preflight/implementation/rag/release/review PASS; nested `CreamAI/package.json` test WARN is superseded by the repository-root suite. Provider output, Production, customer data, DB/auth/payment/admin, commit, push and deploy remain NOT_RUN.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-marry-match-corpus-snapshot-20260913.md` put/get/exact-title search PASS and the local ProjectOps memory was promoted. The next inactive Task resumes remaining corpus review at `today_fortune`; it requires a new user `다음`.
- 2026-09-13 `task-tone-v2-p05-today-fortune-corpus-rag-release-candidate` IN_PROGRESS: user approved the next Task. The active pack has one block and remains `needs_semantic_review`; its scenarios are unlabeled and its condition/forbidden fields repeat migration boilerplate. CreamWIKI search-first returned the evidence-layer and snapshot-isolation patterns. The deterministic daily renderer, provider, Production and customer data remain unchanged.
- 2026-09-13 `task-tone-v2-p05-today-fortune-corpus-rag-release-candidate` DONE: preserved the original 2.0.0 and activated separately reviewed 2.1.0 for new RAG snapshots. The block now separates the service key, server-calculated date pillar, user-confirmed schedule facts, symbolic interpretation and labeled hypothetical examples; it does not predict dates, events, outcomes or another person's reaction.
- Verification: task 8/8, related 82/82 including deterministic daily tests, serial full 759/759 across 106 suites, typecheck/Vercel build/deterministic builder/credential boundary PASS. Manual Codex closure review Approved with comments, Critical/Major/Minor 0. ProjectOps preflight/implementation/rag/release/review PASS; nested `CreamAI/package.json` test WARN is superseded by the repository-root suite. Daily renderer, provider output, Production, customer data, DB/auth/payment/admin, commit, push and deploy remain unchanged or NOT_RUN.
- CreamWIKI `personal/carrotcap/notes/umsh-tone-v2-today-fortune-corpus-snapshot-20260913.md` put/get/exact-title search PASS and the local ProjectOps memory was promoted. Server-only manual reindex commands are unavailable on this PC and remain NOT_RUN; remote search returned the saved note immediately. The next inactive Task is `saju_master` corpus review.
- 2026-09-13 `task-tone-v2-p05-cat-compatibility-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. All 38 blocks separate user observations, guardian chart calculations, symbolic questions and unknown cat state; animal welfare, veterinary escalation, household applicability and numeric provenance are explicit. Focused 8/8, related 139/139, full 831/831 across 115 suites, typecheck/build/determinism/review PASS. Provider/Production/customer data/commit/push/deploy NOT_RUN. CreamWIKI remote put/get/search BLOCKED by unauthenticated CLI; sanitized local candidate saved for later upload. Next inactive Task is `task-tone-v2-p05-couple-signal-corpus-rag-release-candidate`.
- 2026-09-13 `task-tone-v2-p05-couple-signal-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 for new snapshots. All 12 blocks separate confirmed actions/direct words, server calculations, symbolic questions, unknown partner state and labeled hypothetical examples. Mind/fidelity verdicts, monitoring and unsupported numeric prescriptions are excluded; contact refusal, threat, coercion, violence and stalking route to boundaries and safety support. Focused 8/8, related 147/147, full 839/839 across 116 suites, typecheck/build/determinism/review PASS. Provider/Production/customer data/commit/push/deploy NOT_RUN; remote CreamWIKI remains BLOCKED pending CLI authentication. Next inactive Task is `task-tone-v2-p05-lucky-color-corpus-rag-release-candidate`.
- ProjectOps release/review/RAG records PASS. The implementation scan's historical `task-tone-*` matches are known false positives and the nested CreamAI package test is WARN; the scoped credential scan (0 hits) and repository-root 839/839 suite are authoritative. Local ProjectOps memory was promoted; remote CreamWIKI upload remains BLOCKED by the unauthenticated CLI.
- 2026-09-13 `task-tone-v2-p05-lucky-color-corpus-rag-release-candidate` IN_PROGRESS: user approved the next registry-ordered corpus Task. The 24-block 2.0.0 pack mixes symbolic color/material/direction mappings with invented room, clothing, food, sleep and routine scenes plus unsupported duration/count claims. The Task will preserve 2.0.0, create an explicit reviewed 2.1.0 candidate, prove stored-snapshot isolation and keep provider/Production/customer mutations at zero. Local skill originals are missing, so the documented manual RED→GREEN fallback applies.
- 2026-09-13 `task-tone-v2-p05-lucky-color-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 only for new snapshots. All 24 blocks now separate calculated chart values, symbolic color/material/direction questions, confirmed user facts, unknown reality and labeled hypothetical examples. Efficacy, health, sleep, concentration, mood, financial and outcome claims plus unsupported numeric prescriptions are excluded. Focused 8/8, related 147/147, full 847/847 across 117 suites, typecheck/build/determinism/review PASS. Provider/Production/customer data/commit/push/deploy NOT_RUN; remote CreamWIKI remains BLOCKED pending CLI authentication. Next inactive Task is `task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate`.
- ProjectOps release/review/RAG records PASS and local memory was promoted. The generic implementation scan's historical `task-tone-*` matches and nested CreamAI package test WARN are known harness limitations; the task-scoped credential scan has 0 hits and the repository-root 847/847 suite is authoritative.
- 2026-09-13 `task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate` IN_PROGRESS: user approved the next registry-ordered corpus Task. The 10-block 2.0.0 pack mixes calculated annual/seasonal values with invented work, money, relationship, body and routine scenes plus unsupported 2–3 week, 1–2 year and 3-month prescriptions. This Task preserves 2.0.0, creates a reviewed 2.1.0 candidate, proves stored-snapshot isolation and keeps provider/Production/customer mutations at zero. Project memory search returned no direct hit, so prior verified corpus-snapshot patterns are reused from repository evidence. Local skill originals are missing; the documented manual RED→GREEN fallback applies.
- 2026-09-13 `task-tone-v2-p05-newyear-flow-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 only for new snapshots. All ten blocks and retrieval topics separate server calculations, symbolic questions, confirmed facts, unknown future and labeled hypothetical examples; invented work, money, relationship, health, legal and routine claims plus unsupported periods/counts are excluded.
- Verification: focused 8/8, related 218/218, full 855/855 across 118 suites, typecheck/build/determinism/review PASS. Provider/Production/customer data/commit/push/deploy NOT_RUN. Remote CreamWIKI remains BLOCKED pending CLI authentication; sanitized local memory is ready.
- 2026-09-13 `task-tone-v2-p05-wedding-day-corpus-rag-release-candidate` IN_PROGRESS: user approved the next registry-ordered corpus Task. The six-block 2.0.0 pack retains generic migration boilerplate and mixes calculated candidate-day relations with invented partner/family feelings, venue and contract conditions, wedding-day condition, post-wedding rhythm and unsupported counts or periods. This Task preserves 2.0.0, creates a reviewed 2.1.0 candidate, proves stored-snapshot isolation and keeps provider/Production/customer mutations at zero. Prior local knowledge reinforces unknown-birth-time and partner-privacy boundaries; remote CreamWIKI remains unauthenticated.
- 2026-09-13 `task-tone-v2-p05-wedding-day-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 only for new snapshots. All six blocks separate submitted candidate dates, server calculations, confirmed constraints, missing partner/time data, unknown future and labeled hypothetical examples; invented family, venue, contract, condition and post-wedding facts plus unsupported periods/counts are excluded.
- Verification: focused 8/8, related 232/232, full 863/863 across 119 suites, typecheck/build/determinism/review PASS. The first related run caught a negated internal term leaking to customer prose; it was replaced and fully rerun. Provider/Production/customer data/commit/push/deploy NOT_RUN. Remote CreamWIKI remains BLOCKED pending CLI authentication.
- 2026-09-13 `task-tone-v2-p05-job-choice-corpus-rag-release-candidate` IN_PROGRESS: user approved the next registry-ordered corpus Task. The 12-block 2.0.0 pack mixes user offer questions and symbolic palace viewpoints with invented role, organization, compensation, commute, contact, health and negotiation facts plus unsupported counts and periods. This Task preserves 2.0.0, creates a reviewed 2.1.0 candidate, proves stored-snapshot isolation and keeps provider/Production/customer mutations at zero. Local memory search returned the related verified-offer pattern from work_move; remote CreamWIKI remains unauthenticated.
- 2026-09-13 `task-tone-v2-p05-job-choice-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 only for new snapshots. All 12 blocks separate offer documents, calculations, confirmed user reality, unknown company conditions, employer intent and symbolic viewpoints; invented role, organization, compensation, commute, contact, health, negotiation, outcome and unsupported numeric prescriptions are excluded. Focused 8/8, related 217/217, full 871/871 across 120 suites, typecheck/build/determinism/review PASS. Provider/Production/customer data/commit/push/deploy NOT_RUN; remote CreamWIKI remains BLOCKED pending CLI authentication. Next inactive Task is `task-tone-v2-p05-love-this-year-corpus-rag-release-candidate`.
- ProjectOps preflight/RAG/release/review PASS. The generic implementation scan's unbounded `sk-` pattern matched historical `task-*` filenames and remains a known harness false positive; the Task-scoped left-boundary credential scan is authoritative at 0 findings. The nested CreamAI test check is WARN because it has no test script; repository-root 871/871 is authoritative. Local memory was promoted.
- 2026-09-13 `task-tone-v2-p05-love-this-year-corpus-rag-release-candidate` IN_PROGRESS: user approved the final registry service pack still on 2.0.0. The 10-block source mixes calculated year/month relationship symbols with invented introductions, contact, schedules, feelings and outcomes plus unsupported numeric prescriptions. This Task preserves 2.0.0, creates a reviewed 2.1.0 candidate, proves stored-snapshot isolation, keeps partner privacy/safety boundaries and preserves the dedicated route while the generic legacy fallback remains blocked. Provider/Production/customer mutations remain zero.
- 2026-09-13 `task-tone-v2-p05-love-this-year-corpus-rag-release-candidate` DONE: preserved 2.0.0 and activated reviewed 2.1.0 only for new snapshots. All 10 blocks separate confirmed relationship facts, calculations, symbolic questions, unknown partner/future reality, consent, privacy and safety; invented introductions, contact, schedules, feelings, outcomes and unsupported numeric prescriptions are excluded. Dedicated route remains intact and generic fallback remains blocked. Focused 9/9, related 238/238, full 880/880 across 121 suites, typecheck/build/determinism/review PASS. All 20 service registry packs now resolve to 2.1.0. Provider/Production/customer/routing/commit/push/deploy mutations remain 0 or NOT_RUN; remote CreamWIKI remains BLOCKED pending CLI authentication. Next inactive Task is aggregate release evaluation.
- ProjectOps preflight/RAG/release/review PASS. The generic implementation scan's unbounded `sk-` pattern matched historical `task-*` filenames and remains a known harness false positive; the Task-scoped left-boundary credential scan is authoritative at 0 findings. The nested CreamAI test check is WARN because it has no test script; repository-root 880/880 is authoritative.
- 2026-09-13 `task-tone-v2-p05-all-service-corpus-release-evaluation` IN_PROGRESS: user approved a deterministic 20-service aggregate audit. The Task will prove registry/review/release/rollback and persona/retrieval coverage, then report missing provider-output, full-outline, visual/mobile/print and Production evidence as blockers rather than inferring release readiness. No provider, Production, customer data, deploy, commit or push action is authorized.
- 2026-09-13 `task-tone-v2-p05-all-service-corpus-release-evaluation` DONE: built a deterministic aggregate from the actual 20 service 2.1.0 candidates, approved semantic reviews, runtime prompt/persona sources, registry mappings and 2.0.0 rollback files. Corpus integrity is 20/20 with zero sample-output ingestion, but the complete release is `NO_GO`: retained verified provider prose 0/20, attached full-outline independent review 1/20, aggregate visual/render/mobile/print evidence 0/20 and Production attachment not attempted.
- Verification: RED 0/7 → GREEN 7/7, related 279/279, full 887/887 across 122 suites, typecheck/Vercel build and deterministic SHA-256 replay PASS. Manual closure review Approved with comments, Critical/Major/Minor 0 after correcting the full-outline evidence count from 0/20 to 1/20. No provider, customer data, Production, deploy, commit or push action ran. Next inactive Task is `task-tone-v2-p04-lucky-color-full-outline-evidence` and requires a new user `다음`.
- ProjectOps preflight/implementation/review/RAG/release PASS; nested test WARN is only the known missing test script in `CreamAI/package.json` and repository-root 887/887 is authoritative. Task-scoped credential scan found 0 findings. Sanitized local memory was promoted; remote CreamWIKI sync remains BLOCKED because authenticated remote access is unavailable.
- 2026-09-13 `task-tone-v2-p04-lucky-color-full-outline-evidence` IN_PROGRESS: user approved the next supplied pilot and reuse of the existing ignored local OpenAI key. This Task freezes the three-part `lucky_color` outline, uses only a unique synthetic isolated result, stops at the first unresolved item, and records actual provider/replay evidence. Production, customer data, deployment, commit and push remain outside scope.
- 2026-09-13 `task-tone-v2-p04-lucky-color-full-outline-evidence` DONE: exact hashes and order for the three supplied files became an executable 24-item contract. One fresh synthetic result in ignored isolated storage completed 24/24 using `gpt-5.5-2026-04-23`; all accepted sections replayed through the production-equivalent grounding/persona/tone/duplication/safety/continuity gate at 24/24. The tracked evidence contains only provenance, metrics and immutable hashes, never raw provider prose, credentials or personal data.
- Verification: RED 3/4 with the live harness absent, then focused/related 97/97 and full 894/894 across 122 suites PASS; typecheck and Vercel build PASS. During generation, narrow false positives in scene/grounding/technical-term/next-action/future recognition received regression tests, and recovery now uses the latest failed attempt that actually retained raw output. The all-service aggregate records full-outline independent review 2/20 and remains `NO_GO` with provider prose 0/20 and visual/render/mobile/print 0/20. Production, customer data, deploy, commit and push were NOT_RUN.
- ProjectOps preflight/RAG/release PASS; review initially WARN pending this Task's direct Codex review artifact. Generic implementation scan retains the known `task-*` identifier false positive and nested test WARN; task-scoped credential scan is authoritative at 0 findings and repository-root 894/894 is authoritative. Remote CreamWIKI remains BLOCKED because authenticated CLI access is unavailable. Next inactive Task is `task-tone-v2-p04-newyear-flow-full-outline-evidence` and requires a new user `다음`.
- Closure correction: direct Codex review artifact was added and the ProjectOps review harness reran PASS with Critical/Major/Minor 0. Deterministic lucky-color and aggregate builders reproduced identical hashes; sanitized ProjectOps memory was promoted locally and a KMS note was stored. Remote CreamWIKI sync remains BLOCKED, not PASS.

## 2026-09-13 — task-tone-v2-p04-newyear-flow-full-outline-evidence ACTIVE

- User gate received: `다음`; existing configured provider credential reused without printing or rewriting it.
- Source contract frozen at five SHA-256 hashes, 10 groups, and 36 ordered items.
- Added isolated fresh/fail-closed/replay harness; focused contract tests pass 8/8.
- Production deployment, customer records, and live database connections remain out of scope.

## 2026-09-13 — task-tone-v2-p04-newyear-flow-full-outline-evidence DONE

- Fresh isolated synthetic report `6d8f803aa124d4b1e74338d767d2` completed 36/36 using the configured provider; all 36 accepted sections passed stored-snapshot replay.
- 82 provider attempts were retained in the isolated record: 36 accepted and 46 rejected; tracked evidence stores hashes/metrics only and no provider prose, secret or personal data.
- Added low-reasoning evaluation override support without changing the Production default, plus resume/retry invariants for the full-outline harness.
- Candidate release evidence attached; aggregate full-outline review coverage is now 3/20 and complete-service release remains NO_GO.
- Verification: focused 23/23 after expectation update; full 897/897 across 122 suites; typecheck PASS; Vercel build PASS (126 FAQs, 19 sitemap URLs, SEO PASS).
- No Production deployment, customer report mutation, commit or push was performed.

## 2026-09-13 — task-tone-v2-p04-wedding-day-full-outline-evidence DONE

- The immutable source contract is three SHA-256 hashes, six groups and 20 ordered items. Runtime drift from 21 renamed items was corrected without importing supplied example prose.
- Fresh isolated synthetic report `aa873d319ba79520285271cac79e` completed 20/20 with `gpt-5.5-2026-04-23`; every accepted section passed stored-snapshot production-equivalent replay.
- The record preserves 48 stored attempts: 47 provider responses, 28 rejected responses, 19 directly accepted responses, one recovered accepted section and one interrupted no-response attempt.
- Wedding-specific scene and polite-action recognizer gaps were fixed with narrow positive/negative regression tests; no quality boundary was disabled.
- Tracked evidence stores only hashes, aggregate metrics and review outcomes. Provider prose, credentials and personal data remain outside tracked files.
- Focused/related 132/132, full 903/903 across 122 suites, typecheck and Vercel build PASS. Direct Codex review Approved with comments; Critical/Major/Minor 0.
- Aggregate full-outline independent review coverage is 4/20. Complete release remains NO_GO because provider prose is intentionally 0/20 and visual/render/mobile/print evidence is 0/20.
- Production, customer data, Supabase, deployment, commit and push were NOT_RUN.

## 2026-09-13 — task-tone-v2-p04-wedding-day-full-outline-evidence ACTIVE

- User gate received: `다음`; existing configured provider credential reused without printing or rewriting it.
- Source inspection found a real contract drift: supplied source has 20 ordered items while runtime has 21 and renamed classifications.
- RED test freezes three SHA-256 hashes and the exact source-derived category/title order before implementation.
- Production deployment, customer records, Supabase and live database connections remain out of scope.

## 2026-09-13 — task-tone-v2-p04-wedding-day-full-outline-evidence closure correction

- The trailing ACTIVE entry above is an append-order artifact and is superseded by the earlier DONE result; no work was reopened.
- Deterministic rebuild reproduced identical hashes for the sanitized evidence, Wedding release, 20-service aggregate and aggregate assessment.
- Missing local KMS and test-summary artifacts were restored. The next Task remains inactive and requires a new user gate.
- ProjectOps preflight/review/RAG/release PASS; the nested `CreamAI` test check is WARN because that package has no test script, while repository-root 903/903 is authoritative.
- The generic implementation scan remains FAIL only because its unbounded `sk-` pattern matches historical `task-*` identifiers. The Task-scoped left-boundary credential scan covered 23 files with 0 findings.
- Sanitized memory was promoted locally. Remote CreamWIKI synchronization remains BLOCKED because authenticated remote access is unavailable.

## 2026-09-13 — task-tone-v2-p04-wedding-day-visual-render-evidence ACTIVE

- User gate received: `다음`. The existing completed isolated synthetic record will be reused read-only; no provider call is required.
- Initial audit found customer-visible count drift: three Wedding pages and the client renderer still say 21 although the reviewed runtime contract is 20.
- Visual direction remains the existing warm paper/brass editorial reader. This Task repairs correctness and responsive/print defects without redesigning adjacent flows.
- Required local `.claude/skills` design registries are missing in this fork; the installed Product Design audit and Vercel browser-verification workflows are used as the documented fallback.
- Production, customer data, Supabase, deploy, commit and push remain out of scope.

## 2026-09-13 — task-tone-v2-p04-wedding-day-visual-render-evidence DONE

- The real saved-result reader loaded the immutable isolated Wedding record and exposed six groups and exactly 20 complete detail items.
- Desktop 20/20 and exact 390px mobile 20/20 checks passed with 5–6 paragraphs, 20 selector options and zero content, navigation or horizontal-overflow failures.
- Contents → first → next → final selector → contents navigation passed. Thirty-two visible controls met the 24px minimum; item links exposed a 3px keyboard focus outline.
- Twenty print documents passed structural inspection (2–3 pages each, zero blank pages, no missing progress labels or interactive flag controls); six representative rendered pages passed visual inspection.
- Visual review found and fixed two defects before acceptance: stale 21-item customer copy and a fixed report control overlapping printed prose. Final Critical/Major/Minor findings: 0/0/0.
- Sanitized evidence was attached to the Wedding 2.1.0 candidate and the aggregate visual gate advanced from 0/20 to 1/20. The complete service release remains `NO_GO`.
- Related verification 71/71, full repository 906/906 across 122 suites, typecheck and Vercel build PASS. Deterministic evidence/release/aggregate/assessment hashes reproduced exactly.
- No new provider call, Production, customer data, Supabase, deploy, commit or push action ran. Remote CreamWIKI remains unavailable; sanitized reusable knowledge is stored locally.
- Next inactive Task: `task-tone-v2-p04-newyear-flow-visual-render-evidence`; a new user `다음` is required.

## 2026-09-13 — task-tone-v2-p04-wedding-day-visual-render-evidence closure

- ProjectOps preflight, review, RAG and release harnesses PASS. The nested CreamAI test harness is WARN only because that package has no test script; repository-root full tests are authoritative.
- The generic implementation scan is FAIL because it scans the large inherited dirty worktree and its broad `sk-` pattern matches historical `task-*` identifiers. The Task-scoped left-boundary credential scan covered 23 files and found 0 credentials.
- Sanitized memory was promoted to local ProjectOps knowledge and a KMS note was saved. Remote CreamWIKI synchronization remains blocked because authenticated remote access is unavailable.
- The local read-only QA server was stopped after verification. No Production or customer connection remains open.

## 2026-09-13 — task-tone-v2-p04-lucky-color-visual-render-evidence closure

- The immutable isolated `lucky_color` result rendered through the real saved-result reader as 6 categories and 24/24 complete sections.
- Desktop and exact 390px mobile inspection found zero empty content, external element or horizontal overflow failures; disclosure clicks, direct final-section entry, unique-address replay and keyboard toggle passed.
- Complete print produced 21 nonblank Letter pages with all 24 section titles and one-line answers, no missing content and no fixed app/report controls; first, middle and final representative pages passed visual review.
- Sanitized visual evidence is attached to the Lucky Color 2.1.0 candidate. Aggregate visual coverage is now 3/20 and the truthful overall release decision remains `NO_GO`.
- Focused 18/18, related 78/78, full repository 913/913 across 122 suites, typecheck, Vercel build and five byte-identical release rebuilds passed.
- ProjectOps preflight, implementation, review, RAG and release harnesses passed. The nested CreamAI test harness is WARN only because that package has no test script; repository-root tests are authoritative.
- Credential scan findings were only `task-...` identifier/test-pattern false positives; no credential values were present. `git diff --check` passed with line-ending warnings only.
- Sanitized memory was promoted locally and a KMS note was saved. Remote CreamWIKI sync/reindex remains BLOCKED because authenticated remote access is unavailable.
- No provider call, Production, customer data, Supabase, deployment, commit or push action ran. The local QA server was stopped after verification.
- Next inactive Task: `task-tone-v2-p04-quit-fortune-visual-render-evidence`; a new user `다음` is required.

2026-09-13 ACTIVE — `task-tone-v2-p04-lucky-color-visual-render-evidence`: user gate received. Reuse the immutable isolated 24-section `lucky_color` result read-only; verify the real reader on desktop, exact 390px mobile and complete print. No provider, Production, customer, Supabase, deployment, commit or push work is authorized.

## 2026-09-13 — task-tone-v2-p04-newyear-flow-visual-render-evidence ACTIVE

- User gate received: `다음`; the immutable complete 36-section isolated result will be reused read-only with no new provider call.
- Product Design context preflight found no saved references. Required project-local design registries are absent in this fork, so the installed Product Design audit, browser verification workflow, existing verified-reader design and approved local visual-QA memory are the documented fallback.
- Scope is the real New Year saved-result reader: 10 categories, 36 disclosure sections, direct selection, exact 390px reflow and complete print output.
- Production, customer data, Supabase, deployment, commit and push remain out of scope.

## 2026-09-13 — task-tone-v2-p04-newyear-flow-visual-render-evidence DONE

- The immutable isolated New Year result rendered through the real saved-result HTML/CSS/JavaScript with 10 categories and 36/36 complete sections.
- Desktop 36/36 and exact 390px mobile 36/36 passed with 6–9 rendered paragraphs per section and zero content or horizontal-overflow failures.
- Direct-section, immutable-link, click, keyboard and focus behavior passed; all 52 visible controls met the 24px minimum after the unique-address target fix.
- The first print exposed a real defect: closed disclosures were omitted and the fixed report flag printed over content. `beforeprint`/`afterprint` now expand and restore disclosures, and print CSS hides interactive chrome.
- The accepted print is 36 nonblank pages with all 36 section titles, answers and actions; representative pages 1, 18 and 36 passed visual inspection.
- The local QA server now restricts source loading to the approved isolated record directory, remains loopback-only and exposes no mutation routes.
- Sanitized evidence is attached to the New Year 2.1.0 release; aggregate visual coverage advanced from 1/20 to 2/20 while the truthful overall decision remains `NO_GO`.
- Related verification 75/75, full repository 910/910 across 122 suites, typecheck, Vercel build and five deterministic release outputs PASS.
- No new provider call, Production, customer data, Supabase, deploy, commit or push action ran. Remote CreamWIKI remains unavailable; sanitized reusable knowledge is stored locally.
- Next inactive Task: `task-tone-v2-p04-lucky-color-visual-render-evidence`; a new user `다음` is required.

## 2026-09-13 — task-tone-v2-p04-newyear-flow-visual-render-evidence closure

- ProjectOps preflight, review, RAG and release harnesses PASS. The nested CreamAI test harness is WARN only because that package has no test script; repository-root full tests are authoritative.
- Task-scoped credential scanning covered 16 implementation, evidence and ProjectOps files with zero findings; `git diff --check` passed with line-ending warnings only.
- Sanitized memory was promoted to local ProjectOps knowledge and a KMS note was saved. Remote CreamWIKI synchronization and reindex remain BLOCKED because authenticated remote access is unavailable.
- The local read-only QA server was stopped after verification. No Production or customer connection remains open.

## 2026-09-13 — lucky-color visual Task final pointer

- `task-tone-v2-p04-lucky-color-visual-render-evidence` is DONE with 24/24 desktop/mobile/print evidence, 913/913 full tests and aggregate visual coverage 3/20. The next Task remains inactive until a new user `다음`.

## 2026-09-13 — task-tone-v2-p04-quit-fortune-visual-render-evidence ACTIVE

- User gate received: `다음`. Reuse the immutable isolated 48-section `quit_fortune` result read-only; verify the real reader on desktop, exact 390px mobile and complete print.
- Product Design user-context preflight found no saved context. Required project-local design registries are absent, so the installed Product Design audit, Vercel browser verification workflow, existing verified-reader design and approved local KMS pattern are the documented fallback.
- No provider call, Production, customer data, Supabase, deployment, commit or push is authorized.

## 2026-09-13 — task-tone-v2-p04-quit-fortune-visual-render-evidence DONE

- The immutable isolated Quit Fortune result rendered through the real saved-result reader as 10 categories and 48/48 complete sections.
- Desktop and exact 390px mobile passed with 5–7 paragraphs per section, zero empty content and zero horizontal-overflow failures. Disclosure clicks, direct-section entry, immutable-link replay and keyboard Enter toggle passed.
- The accepted print is 48 nonblank Letter pages with all 48 section titles and one-line answers, no fixed app/report chrome; representative pages 1, 24 and 48 passed visual inspection.
- Sanitized visual evidence is attached to the Quit Fortune 2.1.0 candidate. Aggregate visual coverage advanced from 3/20 to 4/20 while the truthful overall release decision remains `NO_GO`.
- Focused 18/18, related 72/72, full repository 916/916 across 122 suites, typecheck, Vercel build and five byte-identical release rebuilds passed.
- Task-scoped credential scanning covered 11 implementation/evidence files with zero findings; `git diff --check` reported line-ending warnings only.
- No new provider call, Production, customer data, Supabase, deployment, commit or push ran. Remote CreamWIKI remains unavailable; sanitized reusable knowledge is stored locally.
- No later Task is active. A new user `다음` is required before continuing.

## 2026-09-13 — task-tone-v2-p04-quit-fortune-visual-render-evidence closure

- ProjectOps preflight, review, RAG and release harnesses PASS. The nested CreamAI test harness is WARN only because that package has no test script; repository-root full tests are authoritative.
- The generic implementation scan is a known false positive because its broad `sk-` pattern matches historical `task-*` identifiers across the inherited dirty worktree. The Task-scoped left-boundary credential scan covered 11 files with 0 findings.
- Sanitized memory was promoted to local ProjectOps knowledge and a KMS note was saved. Remote CreamWIKI synchronization and reindex remain BLOCKED because authenticated remote access is unavailable.
- The local read-only QA server was stopped after verification. No Production or customer connection remains open.

## 2026-09-13 — task-tone-v2-p04-pass-angle-2-1-full-outline-generation ACTIVE

- User gate received: `다음`. The existing completed 52-section record is preserved as historical evidence because it predates corpus 2.1.0 and cannot prove the current candidate.
- This Task creates one fresh unique synthetic result in isolated local storage and asserts the active `pass-angle-service` 2.1.0 snapshot before the first provider call.
- The existing configured provider credential may be reused without printing or rewriting it. Generation remains ordered and fail-closed at the first unresolved review failure.
- Required project-local coding, planning, TDD and completion skill files are absent in this fork; the documented contracts, existing fail-closed live harness and ProjectOps verification workflow are the fallback.
- Production, customer data, Supabase, deployment, commit and push remain out of scope.

## 2026-09-13 — task-tone-v2-p04-pass-angle-2-1-full-outline-generation DONE

- A fresh unique synthetic record pinned `pass-angle-service` 2.1.0 before provider use and completed all 52 sections in exact source order.
- Production-equivalent replay against the stored corpus snapshot passed 52/52. Direct reading of all accepted hooks and bodies found no Critical, Major or Minor issue; two editorial comments preserve the intentionally repetitive measurable error-log axis.
- Final record SHA-256 is `5fc40af448836d7084919d3fc9afba7199cbe47a3d88f656115370845633e7fa`; ordered accepted prose SHA-256 is `a25f7afd69e0417350600cbced7d60c1ee015bd276a3dc8f758e12488e9c007e`.
- Sanitized evidence is attached to the Pass Angle 2.1.0 local reversible candidate. Aggregate full-outline human review advanced from 4/20 to 5/20; visual evidence remains 4/20 and complete release remains `NO_GO`.
- Focused 92/92, full repository 930/930 across 122 suites, typecheck, Vercel build and deterministic release rebuild passed.
- No Production, customer data, Supabase, deployment, commit or push action ran. Remote CreamWIKI synchronization remains unavailable; reusable sanitized knowledge is stored locally.
- No next Task is active. Pass Angle visual render/mobile/print evidence requires a new user gate.

## 2026-09-13 — task-tone-v2-p04-pass-angle-2-1-full-outline-generation closure

- ProjectOps preflight, review, RAG and release harnesses passed. The nested CreamAI test harness is WARN only because that package has no test script; repository-root 930/930 is authoritative.
- The generic implementation scan failed on its known broad `sk-` pattern matching historical `task-*` identifiers across the inherited dirty worktree. The Task-scoped left-boundary credential scan covered nine implementation/evidence/ProjectOps files with zero findings.
- `git diff --check` passed for the Task implementation and evidence files. Local approved memory and the KMS note contain no credentials, provider prose or personal data.
- No Production, customer, Supabase, deployment, commit or push action ran.

## 2026-09-13 — task-tone-v2-p04-pass-angle-visual-render-evidence ACTIVE

- User gate received: `다음`. Reuse the immutable complete 52-section Pass Angle corpus-2.1.0 result read-only; no provider call is required.
- Audit scope is the real saved-result reader on desktop, exact 390px mobile and complete print, including content, overflow, navigation, focus, target size and fixed-chrome behavior.
- Product Design user-context preflight returned no saved references, so the existing verified-reader design and current actual-result screenshots are the grounding source.
- Production, customer data, Supabase, deployment, commit and push remain out of scope.

## 2026-09-13 — task-tone-v2-p04-pass-angle-visual-render-evidence DONE

- The immutable corpus-2.1.0 Pass Angle record rendered through the real saved-result reader as 10 groups and 52/52 complete sections.
- Desktop and exact 390px mobile passed content, direct selection, immutable replay, click, keyboard, focus, target-size and horizontal-overflow checks.
- Current audit fixed two real reader defects: shared navigation/control targets below 44px and low-contrast introductory text on white print pages.
- The accepted print is 28 nonblank Letter pages with all 52 section titles and one-line answers and no fixed interactive chrome; every page was visually reviewed.
- Sanitized evidence is attached to the Pass Angle 2.1.0 candidate. Aggregate visual coverage advanced from 4/20 to 5/20; complete release remains `NO_GO`.
- Focused 19/19 and full repository 934/934 across 122 suites passed, as did typecheck, Vercel build and deterministic rebuild.
- No provider call, Production, customer data, Supabase, deployment, commit or push ran. Remote CreamWIKI remains unavailable; reusable knowledge is stored locally.
- No next Task is active. A new user `다음` is required.

## 2026-09-13 — task-tone-v2-p04-pass-angle-visual-render-evidence closure

## 2026-09-13 — task-tone-v2-p04-today-fortune-full-outline-evidence ACTIVE

- User gate received: `다음`. The next service follows the explicit P05 order after Wedding Day.
- Today Fortune is a deterministic `daily-rules-v3` service, so this Task verifies one real isolated saved result plus all five relation and twelve zodiac branches without adding or claiming an LLM call.
- Scope is seven-field completeness, immutable same-day replay, direct output review, sanitized release attachment and truthful aggregate accounting.
- Production, customer data, Supabase, deployment, commit and push remain out of scope.

## 2026-09-13 — task-tone-v2-p04-today-fortune-full-outline-evidence DONE

- One synthetic file-backed `daily-rules-v3` result completed all seven customer fields; same-KST-day replay preserved report/result identities and saved prose.
- All five element relations and twelve birth-year zodiac variants passed direct runtime tone/safety review.
- Direct review found and fixed three real deterministic-template defects: forbidden name honorifics, polite speech instead of the approved informal persona, and one unsupported fixed condition count.
- The aggregate provider gate now counts actual provider calls plus independent review instead of requiring provider prose to be stored; it excludes deterministic Today Fortune from the denominator. Coverage is truthfully 5/19 provider-output and 6/20 full-outline review.
- Focused 22/22, related 176/176 and full repository 936/936 across 122 suites passed; typecheck, Vercel build and deterministic release rebuild passed.
- Sanitized evidence is attached to the Today Fortune 2.1.0 candidate. Complete release remains `NO_GO`; visual evidence remains 5/20.
- No LLM/provider call, Production, customer data, Supabase, deployment, commit or push ran. Next inactive Task is `task-tone-v2-p04-saju-master-full-outline-evidence`.

## 2026-09-13 — task-tone-v2-p04-today-fortune-full-outline-evidence closure

- ProjectOps preflight, direct review, RAG/memory and release harnesses passed. The nested CreamAI test harness is WARN-only because that package has no test script; repository-root 936/936 is authoritative.
- The generic implementation scan retains its known inherited false positive because broad `sk-` matching treats `task-*` identifiers as credentials. The Task-scoped credential scan covered implementation, evidence, release and ProjectOps outputs with 0 findings.
- `git diff --check` passed for tracked Task files with line-ending warnings only. Sanitized memory was promoted to local approved knowledge and a KMS note was saved.
- Remote CreamWIKI synchronization and reindex are BLOCKED because `CREAMWIKI_ROOT` is not configured. The local work log remains available.

- ProjectOps review, RAG and release harnesses passed. The nested CreamAI test harness is WARN-only because that package has no test script; repository-root 934/934 is authoritative.
- The generic implementation scan retains its known false positive because broad `sk-` matching treats inherited `task-*` identifiers as credentials. A Task-scoped credential scan across implementation, evidence and ProjectOps outputs found 0 credentials.
- `git diff --check` passed for Task files with line-ending warnings only. Approved local memory and a KMS note contain no provider prose, secrets or personal data.
- The local QA browser/session and loopback server were stopped after verification. No Production or customer connection remains open.
# 2026-09-13 — Production commit/deploy

- `task-tone-v2-production-commit-deploy-20260913` ACTIVE after explicit user approval.
- Git source: `codex/tone-v2`, canonical GitHub remote `axlab-cream/chungi-t`.
- Vercel target verified: owner `AX-Lab-cream`, project `chungi-t`, project ID `prj_83OG8hBV8JxhI10zAlbUVUXRpYV3`.
- Domain mapping verified: `umsh.kr` and `www.umsh.kr` belong to this project.
- Next: stage/scan, release verification, commit/push, Production deploy, live smoke verification.
- Vercel production-build RED: CLI 50.19.1 rejected the accumulated array-valued `includeFiles` because this project schema requires one string glob.
- Minimal fix: preserve every required runtime path in one brace-expanded string and freeze that exact contract in the static-exposure test.
- Verification GREEN: full serial suite 936/936 across 122 suites; focused static-exposure 60/60; typecheck PASS; `vercel build --prod --scope ax-lab-cream` PASS.
- Credential boundary: staged real OpenAI/Supabase/GitHub/private-key formats 0; previously submitted password literals 0.
- Commit: `e75104c` (`feat: integrate tone v2 corpus and release evidence`), pushed to GitHub branch `codex/tone-v2`.
- Production deployment: `dpl_DzR7DobFjVRzgvWUQNNm8GrHp6Yg`, status Ready, alias `https://umsh.kr`, immutable URL `https://chungi-pfex4hhnc-ax-lab-cream.vercel.app`.
- Production smoke: `/`, `/admin`, `/admin/corpus`, `/admin/prompts`, `/admin/media` all 200; `/api/health` 200 with `ok: true` and registry `tone-v2.2.0.20`; unauthenticated admin data APIs correctly return 401.
- Post-deploy error scan: no error logs found for the deployment in the first ten minutes.
- Task status: DONE.

# 2026-09-13 — All-service final PDF

- `task-tone-v2-all-service-final-pdf-20260913` DONE after the user requested a Desktop folder containing the workflow-derived final artifact.
- Exported 20 services and 730 customer-facing interpretation sections: five actual provider-verified records, one actual deterministic saved result and fourteen production-equivalent synthetic QA builds.
- Generated `C:\Users\user\Desktop\운명상회-최종\운명상회-전체서비스-최종산출물.pdf`: 328 A4 pages, 20 service bookmarks, 1,584,133 bytes, no blank pages.
- Visual inspection passed for cover, TOC, service overview, deterministic opening, mid-document synthetic QA, provider-verified final service and closure page.
- Privacy scan found no submitted account email/password, provider attempts, raw provider prose, token usage or generated-by metadata.
- Release truthfulness remains `NO_GO`: fourteen services are explicitly labeled production-template QA until provider/full-outline/visual evidence is attached.
- Artifact SHA-256: `D86D07585BB6061CBB34AF6183B3BB91624A09159071B6940CA0DB00456C679E`.
- CreamWIKI tunnel was available, but `/api/v1/kms/me` returned `authentication_required`; remote search, write and reindex are BLOCKED for this Task. Sanitized local KMS and memory-candidate files were saved instead.

# 2026-09-14 — All-service teaser release

- `task-tone-v2-all-service-teaser-release-20260914` ACTIVE after explicit user authorization to resolve the remaining release work, evaluate the middle teaser page, apply fixes, commit and deploy.
- Scope is the 19 paid-service teaser path; Today Fortune is a free complete-result service and is tracked as not applicable rather than given a fake paid teaser.
- CreamWIKI search-first PASS. Reused `personal/carrotcap/notes/umsh-tone-v2-teaser-trust-gate-20260912.md`: freeze a grounded teaser before paid-body redaction, require one verdict, one or two grounds, a scene and concrete full-report scope, and block operations copy, pressure and certain-event claims.
- Product Design audit uses the existing production reader and current-run synthetic screenshots. Project-local design skill registries are absent, so the installed audit framework plus the existing verified-reader design is the documented fallback.
- RED audit found 8/19 passing and 11/19 missing a grounded everyday scene or being blocked by an over-broad permission word match. GREEN audit now passes 19/19 using current production-equivalent report builders.
- The shared teaser now renders one verdict, one or two representative grounds, an exact full-report scope and a non-pressuring CTA. Empty `signals` correctly falls back to `insights`.
- Current-run visual QA passed on desktop and exact 390px mobile: zero horizontal overflow, two evidence rows and a 53.75px CTA target. The fixture was loopback-only synthetic data; payment and customer records were not touched.
- Focused 75/75, post-fix regression 34/34 and final full serial 941/941 pass. TypeScript, Vercel Production build and the active 20-service persona/prompt/corpus contract pass. The first full run exposed one over-broad purchase-word false positive; it was fixed, covered and cleared by the full rerun.
- Review: `tone-v2/reviews/P04-all-service-teaser-release-20260914.md`. Evidence: `tone-v2/evaluations/P04-all-service-teaser-evidence-20260914.json`.
- Sanitized CreamWIKI writeback and re-read PASS at `personal/carrotcap/notes/umsh-all-service-teaser-release-20260914.md`; no credential, customer or provider prose was stored.
- Commit `2337c21` delivered the 19-service teaser evidence/UI plus the final-PDF reusable export workflow. Live smoke then caught the shared report JS returning 404 even though the page and CSS were deployed.
- Root cause: the catch-all Vercel route bypassed the deliberately curated `public/` static output. Commit `9bf66ae` now recreates that allowlisted directory from scratch per build, serves only those filesystem assets first, and keeps every other path behind the Express security guard.
- Production deployment `dpl_7HBHG3e9cS63vCnk7qAbWWP9dE6o` is Ready at `https://umsh.kr`. Health, job-choice teaser route, new JS and CSS are 200; both internal prompt probes are 404; the ten-minute error scan returned no logs.
- Task status: DONE. Overall Tone V2 release status remains `NO_GO` because this slice does not complete the remaining provider/full-outline/visual aggregate gates.
# 2026-09-14 — saju_master full-outline provider evidence

- `task-tone-v2-p04-saju-master-full-outline-evidence-20260914` ACTIVE under the user's continuous GO authorization.
- CreamWIKI search-first PASS. Prior evidence covered only representative `saju_master` output and explicitly did not approve a complete report.
- The canonical runtime outline contains 37 sections. This slice uses a fresh synthetic identity and isolated file storage, preserves the 2.1.0 corpus snapshot, and stops at the first unresolved review failure.
- Existing provider credential reuse was previously approved and presence was confirmed without exposing its value. Production, Supabase, customer records, auth and payment remain disconnected during generation.

## 2026-09-14 — saju_master full-outline provider evidence DONE

- Fresh isolated provider result `20260914-saju-master-full-v3` completed the canonical 37/37 sections in order; production-equivalent stored-corpus replay passed 37/37.
- A rejected v2 draft exposed a repeated relationship opening. A service-specific current-relationship instruction and cross-section opening-similarity gate produced a distinct v3 result without weakening the general duplicate guard.
- Direct review approved all 37 hooks and bodies with Critical 0 and Major 0. Three non-blocking editorial comments document repeated connective/editing phrases and the intentionally shared responsibility-boundary observation axis.
- The saved teaser now requires a real setting or routine plus an observable action. The accepted teaser includes a server-grounded verdict, two grounds, a meeting-room scene and exact 37-item full-report scope; generic work/relationship/schedule copy is rejected.
- Sanitized evidence contains hashes, counts and provider metadata only—no accepted prose, credential or customer data. Aggregate coverage is provider 6/19, full-outline review 7/20 and visual 5/20; overall release remains `NO_GO`.
- Focused verification passed. Final repository suite passed 947/947 across 123 suites; TypeScript and Vercel build passed.
- Production deployment is authorized for these runtime/evidence changes. Customer records, Supabase, authentication and payment remain untouched.
- CreamWIKI write and re-read passed at `personal/carrotcap/notes/umsh-saju-master-full-outline-teaser-20260914.md`; the note contains no provider prose, credential or personal data.
- Commit `b228086` (`feat: verify saju master outline and teaser`) was pushed to GitHub branch `codex/tone-v2`.
- Vercel Production deployment `dpl_6kLaAzyA4M96C8E4WMzWnfPkBYvq` is Ready and aliased to `https://umsh.kr`; immutable URL is `https://chungi-2i6pzhinz-ax-lab-cream.vercel.app`.
- Live smoke passed: root, health, saved-result reader, shared reader JS/CSS and admin shell return 200; internal Tone V2 source remains 404; unauthenticated admin corpus API remains 401. The first smoke used three nonexistent legacy filenames and correctly returned 404; exact current allowlisted paths then passed.
- Ten-minute deployment error scan returned no logs. This deploy ships the runtime review/teaser safeguards and sanitized release evidence but does not declare the aggregate Tone V2 release GO.

## 2026-09-14 — saju_master visual/render evidence ACTIVE

- Continuous GO proceeds to the next vertical slice using the immutable complete 37-section synthetic record read-only.
- CreamWIKI search-first completed. The reusable standard requires responsive, keyboard and visual QA evidence tied to current-run captures.
- Product Design audit preflight found no saved plugin context; the existing verified reader, current code and immutable record are the grounding sources.
- Scope is desktop, exact 390px mobile, disclosure/navigation/focus and complete print. Production/customer/Supabase/auth/payment/provider mutation is excluded.

## 2026-09-14 — saju_master visual/render evidence DONE

- The fail-closed loopback QA server accepted only the immutable synthetic 37/37 record and exposed no write route or production credential.
- Desktop rendered 37 disclosures in a 430px reader with no horizontal overflow. Exact 390px mobile rendered all 37, one selected disclosure, zero outside content elements and no horizontal overflow.
- Direct `section=long-report-depth` opened only that item. Enter closed and reopened it with a visible 2px focus outline.
- Real generic `/r/{resultId}` testing found and fixed a shared-reader defect: the permalink had no service route key, so boot never ran. It now derives the immutable ID from the path and loads the server-returned service safely.
- Print expanded 37/37 answers into 38 non-empty pages. First, middle and last rendered pages passed direct inspection with no clipping, overlap or blank output.
- Tracked evidence contains only counts, hashes and outcomes; screenshots, PDF and provider prose stay in ignored local QA storage.
- Focused verification passed 64/64 and permalink-focused verification passed 50/50. Final serial repository suite passed 952/952 across 123 suites; TypeScript and Vercel build passed.
- Aggregate coverage is provider 6/19, full-outline review 7/20 and visual 6/20. Overall Tone V2 release remains `NO_GO`; no production corpus attachment or customer-record rewrite occurred.
- Reusable memory was promoted locally at `CreamAI/memory/approved/task-tone-v2-p04-saju-master-visual-render-evidence_memory.md`; sanitized upload source is `tone-v2/kms-notes/umsh-saju-master-visual-reader-permalink-20260914.md`.
- Remote CreamWIKI write/re-read is BLOCKED: the tunnel answers `authentication_required`, the remote CLI has no token, and direct personal-path upload is permission denied. Server-side reindex is NOT_RUN. No credential was requested or exposed.
# 2026-09-14 — KG이니시스 운영 결제 연동 ACTIVE

- 사용자가 결제 보류를 명시적으로 해제하고 merchant bundle, SignKey, 모바일 HashKey를 제공해 운영 결제 연동을 승인했다.
- ZIP은 읽기 전용으로 구조와 해시만 확인했다. 개인키·인증서·암호 파일은 저장소에 추출하거나 커밋하지 않는다.
- CreamWIKI 검색-first PASS: 기존 PC INIStdPay 이식 가이드를 찾았고 현재 코드와 대조했다.
- 관측된 결함: 모바일 환경이 PC 결제 모듈로 호출됨, callback이 모바일 성공코드를 실패로 처리함, IDC-URL 상호검증이 없음, 승인 후 금융 증거 저장 전 실패 시 망취소가 없음.
- 결정: PC와 모바일을 한 사용자 결제 수직 슬라이스로 연결하고, 승인 후 저장 실패는 망취소 또는 `approving` 대사 대상으로 보존한다. HashKey는 모바일 위변조 방지에만 사용하며 INIAPI 환불키로 오용하지 않는다.
- 실결제와 실환불은 검증 중 실행하지 않는다.
- PC 요청은 INIStdPay와 `centerCd(Y)`, 모바일 요청은 전용 결제 URL과 SHA-512 Base64 위변조 검증으로 분리했다. 두 승인 콜백은 주문번호·금액·IDC 호스트를 서버에서 다시 검증한다.
- 승인 뒤 내부 저장 실패는 공식 망취소를 시도한다. 망취소 성공은 `payment_net_cancelled` append-only 원장과 cancelled 주문으로 남기며, 결과 불확실 시 주문을 `approving`으로 보존한다.
- Supabase migration `payment_net_cancelled_event` 적용 및 제약 재조회 PASS. 새 advisor 경고 없음; 기존 서버 전용 RLS INFO와 Auth leaked-password WARN은 이 Task 밖의 기존 항목이다.
- Vercel Production의 MID·SignKey·HashKey 이름 등록 PASS, 값 출력·저장 없음. 인증서 ZIP은 저장소에 추출하지 않았다.
- focused 36/36, full repository 961/961 across 124 suites, typecheck, Vercel build PASS. 로컬 결제 화면은 desktop 및 390px에서 내용·48px CTA·무가로오버플로·오버레이 없음 PASS.
- Commit `53d776d` (`feat: integrate Inicis PC and mobile payments`) pushed to GitHub branch `codex/tone-v2`.
- Vercel Production deployment `dpl_NhbZnDVJWyyLHLFp8n2aMj5FnqSm` is Ready and aliased to `https://umsh.kr`; health, payment config, payment page and cache-busted payment script smoke checks return 200. The config confirms PC checkout and mobile checkout are enabled without exposing secret names or values.
- CreamWIKI write/re-read/search PASS at `personal/carrotcap/notes/umsh-inicis-pc-mobile-20260914.md`. The sanitized note reuses the existing PC and mobile integration guides and contains no credential, customer or payment payload.
- Task status: DONE for implementation and non-charge Production verification. One operator-supervised low-value PC payment and one mobile payment remain NOT_RUN to verify the merchant contract and enabled live payment methods.

## 2026-09-14 — KG이니시스 결제창 실행 복구 ACTIVE

- 운영 재현에서 `/api/payment/orders`가 실패했다. Vercel의 Node `url.parse()` deprecation 경고는 동시 발생한 비원인 로그였고, 실제 첫 원인은 런타임 insert 계약에 있는 `revision` 컬럼이 운영 `cheongi_payment_orders`에 없었던 스키마 드리프트였다.
- Supabase migration `payment_order_revision`을 적용해 `revision integer not null default 0`과 비음수 제약을 운영 DB에 추가했다. 새 advisor 경고는 없으며 기존 RLS 정책 INFO와 Auth leaked-password WARN만 유지된다.
- 주문 저장 복구 뒤 KG이니시스가 `Verification 값이 잘못되었습니다.`를 반환했다. 공식 PC 표준결제 규격과 대조해 요청·승인 signature/verification 입력이 값 단순 연결이 아니라 순서가 고정된 NVP `key=value&...` 문자열이어야 함을 확인했다.
- 요청과 승인(망취소 보조 포함) 해시 직렬화를 교정하고 exact-hash 회귀 테스트를 추가했다. 집중 15/15, 전체 962/962(124 suites), typecheck, Vercel build PASS.
- 다음 단계는 검증된 트리를 Production에 배포하고 실제 결제 UI가 열리는 지점까지만 확인하는 것이다. 카드 인증·승인·과금은 실행하지 않는다.

### 결제창 실행 복구 운영 확인

- Commit `5d3ad22`를 GitHub `codex/tone-v2`에 push하고 Vercel Production `dpl_AtnZvZU29aaamcHB2wnoFzPMSJT3`에 배포했다. 배포는 Ready이며 `https://umsh.kr` alias가 연결됐다.
- 운영 신규 주문은 승인 전 `ready`, `revision=0`으로 저장됐다. KG이니시스 실제 결제 UI에서 신용카드·계좌이체·무통장입금, 카드사 목록, 상품명과 금액을 확인했다.
- 카드 인증·승인·과금은 실행하지 않았다. 새 주문 요청에는 애플리케이션 오류가 없고, 별도의 Node `url.parse()` deprecation 경고는 기존 비원인 항목이다.

### 결제창 닫기 복귀 ACTIVE

- 실제 닫기 재현에서 KG이니시스 iframe이 `/payment/close` 문서로 바뀌었지만 부모 결제 화면은 그대로 남았다. 원인은 닫기 문서가 iframe 자신에게만 `window.close()`를 호출하고 부모에게 상태를 전달하지 않은 것이다.
- 닫기 문서는 동일 출처 부모 또는 opener에 `umsh:payment-closed` 메시지를 전달한다. 결제 페이지는 동일 출처 메시지만 수신하고, 외부 URL을 거부한 뒤 원래 `returnTo` 또는 상품 기본 경로로 복귀한다.
- 집중 16/16, 전체 963/963(124 suites), typecheck, Vercel build PASS.
- Commit `ec4ef3f`를 push하고 Vercel Production `dpl_A9Ex6qKja6ZZWGZVqYCsia99KdLn`에 배포했다. 배포는 Ready이며 `https://umsh.kr` alias가 연결됐다.
- 운영에서 결제창을 새로 열고 KG이니시스 닫기 → 취소 확인을 실행했다. `/payment/close` 이벤트 뒤 `/place/home/01-step-1-story/index.html`로 정상 복귀했으며 실제 결제 승인·과금은 없었다.
- 운영 로그는 주문 생성, 닫기 URL, 상품 기본 경로와 최종 시작 페이지의 순차 200 요청을 보여준다. Node `url.parse()` deprecation 경고는 남아 있지만 이번 사용자 흐름을 막지 않는 별도 기술부채다.
- Task status: DONE.

## 2026-09-17 — 공개 서비스 90점 품질 루프

- 실측 62%의 공통 원인: STEP4 preview 응답에 권한이 없어 슈퍼관리자도 결제 CTA, 05·06도 preview라 빈 목차, 하단 시트가 STEP1 CTA 가로챔.
- 보강: 미리보기에 `entitled` 표시, 권한 시 `전체 목차 열기`, 05·06은 본문 analyze, 시트 `visibility:hidden`, 직장선택·썸신호 STEP1 실링크, 06 기본 항목·PDF.
- 단위 테스트 통과. 로컬 8790에서 직장선택 STEP2 도달·퇴사 06 PDF 확인. PG 보류. 배포 전 `umsh.kr` 점수는 그대로다.
- CreamWIKI: `personal/carrotcap/notes/umsh-quality-90-loop-20260917.md`

## 2026-09-17 — 관리자 보관함 우회

- 보관함은 `paid` 주문만 남긴다. 슈퍼관리자(`good1621`)는 결제 없이 본문만 열려 QA 서비스가 목록에 안 쌓였다.
- 우회: 가짜 결제 주문은 만들지 않고, 관리자 `/api/user/reports`만 서비스당 최신 해석 1건을 보탠다. 일반 계정은 구매 목록 그대로다.
- 단위 테스트 `vault-purchase-order` 14건 통과.

## 2026-09-17 — 유료 해석 생성 복구와 전 서비스 PDF (PR #43, #44)

- 생성 실패의 원인은 세 겹이었다. 게이트의 다음 판단 기준 정규식이 저축 페르소나의 `~거예요` 명사형을 못 읽었고, `gpt-5` 추론 토큰이 4200 예산을 먹어 응답이 잘렸고, 잘림이 재시도 대상이 아니었다.
- 보강: `OpenAiTruncatedError` 도입해 잘림을 재시도로 돌리고, 섹션 예산을 9000으로 올리고, 시도 한도를 4로 늘리고, 마무리 문단 규칙을 본 프롬프트와 수정 프롬프트가 함께 쓰게 상수로 뺐다.
- PDF: 06-1 상세와 공용 리더 `/r/:id` 모두에 인쇄 스타일시트와 `PDF 저장` 버튼을 주입한다. 06-1이 없는 4개 상품은 `hidden`이고 운용 중인 `cmdg`는 공용 리더를 그대로 쓴다(사용자 확정).

## 2026-09-17 — 이에요/예요 받침 문법 게이트

- 저축 리포트가 “깔끔해지는 타입예요.”를 실제로 내보냈다. 받침 유무로 기계 판정되는 오류라 사람 검수에 맡길 일이 아니다.
- 게이트는 받침 있는 말 뒤의 `예요`·`에요`, 홀로 선 `이예요`, `아니예요`를 잡고 재생성으로 교정한다. 고칠 자리를 `타입예요`처럼 낱말째로 알려 준다.
- 오탐 차단: `풀이예요`, `장바구니예요`, 페르소나가 강제하는 `~거예요`, `아니에요`는 통과한다. 코퍼스(`data/`)와 화면 문안(`사주/`) 전문을 게이트로 재스캔해 위반 0건을 확인했다.
- 전체 1144/1144(테스트), typecheck PASS.

## 2026-09-17 — 실행 승인 모델 SSOT 교체 + 리뷰어 Grok 전환 [UPDATE]

- rules.md §6 을 「실행 승인 모델 (SSOT)」 전문으로 교체했다. 무중단 연속 실행, D1~D8 기본값, H1~H5 하드 스톱, 자율 판단 범위, 코어 문서 로딩 범위를 한 곳에 모았다.
- 중복 정책 제거: rules.md §2 의 one-Task approval gate 줄, AGENTS.md 2026-09-12 항목 본문, supervisor-system-prompt.md 의 ONE_TASK_GATE·One Task Gate 절, CreamAI/CLAUDE.md 작업순서 11 / §8.1.4 / §8.2.14 를 전부 §6 참조로 바꿨다.
- 코드 리뷰어를 Codex → Grok 으로 전환했다(Codex rate limit). goal.md:32, CreamAI/CLAUDE.md, supervisor-system-prompt.md 문서와 CreamAI/scripts/run-reviewer.ps1 실제 호출부를 같은 작업에서 함께 고쳤다.
- run-reviewer.ps1: -Cli 파라미터(auto|grok|codex|claude) 추가, 체인 grok → codex → claude(opus), grok 은 --prompt-file/--cwd(코드 루트)/읽기전용 플래그로 호출하고 -o 가 없으므로 래퍼가 보고서를 직접 쓴다. 1차가 아닌 CLI 가 돌면 role-fallback 주석을 첫 줄에 남긴다. 기존 codex 전용 경로가 CreamAI 폴더만 보던 문제도 $codeRoot 로 함께 고쳤다.
- 검증: PowerShell 구문 파싱 PASS. 실제 grok 리뷰 1회 실행은 NOT_RUN.
- .claude/settings.local.json allow 에 python/powershell/node/npx/curl 등 16개를 추가했다. 파괴적 명령 deny 목록은 그대로다.

## 2026-09-17 — Supabase CLI 연동 [BLOCKED]

- supabase CLI 가 PATH 에 없다. npm 전역 node_modules/supabase 는 package.json 도 bin 도 없는 실패 설치 잔해(tar 만 남음)였고, setupHint 가 가리키던 ~/.aios/projects/umsh/ops/connect-supabase.ps1 도 없다.
- 우회로 확인: npx supabase@latest --version → 2.117.0 정상. 전역 설치 없이 쓸 수 있다.
- 런타임 연동은 정상이다. .env 에 SUPABASE_URL·ANON_KEY·PROJECT_REF 등 8개 키가 있어 REST/Auth 는 동작한다. 끊긴 것은 CLI 경로뿐이고 영향은 마이그레이션·db 작업에 한정된다.
- 해제 조건(D6/사용자 조치): 브라우저 로그인. {"_tag":"Error","error":{"code":"LegacyLoginMissingTokenError","message":"Cannot use automatic login flow inside non-TTY environments. Please provide --token flag or set the SUPABASE_ACCESS_TOKEN environment variable."}} 후 {"project_ref":"wdyzollywccgaepjeynu","message":""}. 에이전트는 login 을 실행하지 않는다(rules.md §7).
- github·vercel 은 configured 재확인. CreamWIKI 는 터널 18765·토큰 carrotcap·search 정상.

## 2026-09-17 — 결제→06-1 재확인 + 해석 속도 분석 + 보관함 순차 QA [BLOCKED]

- 운영 `/api/payment/config` 공개 카탈로그 14개 전부 `readingPath`가 06-1. 일시정지 lucky/newyear/wedding/pass_angle/home은 공개 카탈로그에 없음.
- 실측 소비성향 주문 `UMSH1789651145148r6ml4prs` 결제 결과 CTA는 `전체 풀이보기`이며 href는 `/money/save/06-step-6_1-report-detail/index.html?paid=1&orderId=...&reportId=98515f23f9fb249e22c56ea023d5#step-6_1-report`. 클릭 후 같은 06-1로 이동. 04 미리보기 아님.
- 공개 14개 06-1 HTML은 전부 production 200.
- 속도: `generateReportSectionNow`가 첫 섹션 본문 전에 verdict → summary → 하이라이트 3장을 **순차** 호출. 첫 섹션은 창=1, 이후 6병렬. 보관함 안내는 전체 30~50분. 첫 화면이 느리게 느껴지는 주원인.
- 소비성향 06-1 비로그인: 정적 히어로(`돈이 새는 장면을 하나씩 잡아볼게요`) + 로그인 게이트. `PDF 저장`은 보여서 `window.print()`는 호출되지만 본문 카드 0개라 실제 해석 PDF는 아님.
- good1621 보관함 순차 QA는 세션 없음으로 BLOCKED. 이 계정은 Supabase 이메일/비밀번호가 없고 Google 전용이다. 자동화·CDP Chrome에서 Google은 `signin/rejected` 또는 비밀번호 입력 후 `다음` 미제출로 막힌다. 비밀번호·토큰은 문서에 남기지 않았다.
- 다음: 일반 Chrome에서 good1621로 `/vault` 로그인된 상태를 열어 주면 소비성향 1건부터 해석 품질·PDF를 이어서 확인한다.

## 2026-09-17 — 관리자 보관함은 결제 없이 구매 이후처럼 쌓인다

- 슈퍼관리자(good1621)는 가짜 결제 주문을 만들지 않는다. 유료 본문(06-1·섹션 생성)을 여는 순간 `adminAcquiredAt`을 찍고 결제와 같은 생성 큐를 건다.
- 보관함은 서비스당 1건이 아니라 그렇게 연 해석을 계보마다 쌓는다. 04 티저(pending)는 넣지 않는다. 이미 생성 중인 기존 QA 행은 stamp 없이도 목록에 남는다.
- 단위 테스트 `vault-purchase-order` 16/16 PASS.

## 2026-09-17 — 실제 구매가 보관함에서 사라진 원인

- 결제는 `paid` → 풀이 화면(`?paid=1&orderId=`)을 여는 순간 `/viewed` 로 `viewed` 가 된다. 권한 판정·생성 큐는 `paid`와 `viewed`를 둘 다 산 것으로 본다.
- 보관함 `selectPurchasedReadings`만 `paid`만 인정했다. 그래서 good1621이 실제로 산 뒤 06-1을 열면 목록에서 빠졌다. 관리자 우회와 무관한 모든 계정 공통 결함이다.
- 수정: `paid`와 `viewed`를 구매로 센다. 테스트 4b 포함 `vault-purchase-order` 17/17 PASS.
- `reportId`가 비어 있는 구형 주문은 여전히 목록에 못 넣는다(무엇을 샀는지 추측하지 않음).

## 2026-09-18 — 대기·실패 해석 매분 자동 재개

- Vercel cron `/api/cron/ops` 는 이미 1분마다 돈다. 워커가 차선(3)을 가득 채운 분에는 백필을 건너뛰어, 그 사이 산 회원의 대기·실패 목차가 큐에 안 탔다.
- 이제 매분 워커와 상관없이 미완성(pending/generating/failed)을 훑어 큐에 다시 넣는다. 결제분·관리자 적립분은 전부, 오래된 것부터. 해석 완성 잡 오류 백오프는 1분.
- 검증: `report-completion-job` 8/8, `latency-strategy` 해당 항목 PASS (`NODE_ENV=test`).

## 2026-09-18 — 중요 안내 가독성

- 안내 박스는 보관함(`vault.html`)과 06-1/공용 리더(`umsh-report-access.js`가 심음) 두 곳이다. 본문이 `#c9bfb2`라 어두워 안 보였다.
- 본문 `#f7f2e8`, 리드 `#fffaf0`, 강조 `#ffe9b8`, 글자 13.5px. 공통 `umsh-chrome.css`로 인라인 색도 덮는다.

## 2026-09-18 — 공개 9서비스(천명사주 제외) QA 스냅샷

- 단계 정본: 01 스토리 → 02 사주입력 → 04 티저 → 05 허브 → 06-1 상세. 공개 9개 전부 보유. 퇴사운만 03 추가(유지).
- 06-1 production 200: 9/9. inplace: 9/9. 소비성향만 시안 `#detailContent`를 본문 슬롯으로 써서 시안 단건과 라이브 목차가 충돌 → 전용 `detail-stack` 슬롯으로 올해 연애운과 맞춤.
- 구매 해석 본문 완결 실측: 자동화 세션 없음 → 0/9. 전체 완성도 **구조 100 / 생성 실측 0 → 보고 50**. goal(admin-ops)은 이 슬라이스로 닫지 않음.

## 2026-09-18 — 공개 9개 06-1 목차 슬롯 통일

- 올해 연애운·소비성향에 이어 상대온도차·직장선택·퇴사운·이직운·고양이궁합·커플궁합·결혼궁합 06-1에도 progress/state/sections 슬롯을 명시했다. 시안 단건 카드는 라이브 목차와 분리.
- 생성 완결 실측은 여전히 로그인 게이트. 종합 보고는 구조 100 / 실측 0 → 50.

## 2026-09-18 — 중요 안내 화이트 글자가 밝은 06-1에서 안 보임

- 소비성향 06-1 배경은 `rgb(232,238,233)`. 크림 화이트 본문은 대비 1.65로 사실상 안 보인다. 보관함·천명사주 등 어두운 페이지와 섞여 한 색으로 맞출 수 없다.
- 안내 박스를 불투명 종이(`#fff8ee`) + 잉크(`#1a1814`/`#6b3f0e`)로 고정. 페이지 배경과 무관하게 대비 16.8. 06-1 19개+보관함 실측 후 샘플 6페이지 전부 PASS.

## 2026-09-18 — 구매 리포트 UUID 로 워커가 못 찾아 미완성으로 남던 결함

- 06-1 URL `reportId=` 는 결제·화면이 쓰는 `resultId` UUID 다. DB 행 키는 해시 `report_id`. 워커는 해시만 찾아 REPORT_NOT_FOUND 로 죽었고, 백필 결제 매칭도 UUID vs 해시라 구매분이 티저 1건에 밀렸다.
- `getReportRecordAsService` 가 resultId/publicId 로도 찾고, 백필은 UUID 주문과 해시 행을 같은 구매로 본다. 유료 본문 GET 시 미완성이면 완성 큐에 다시 넣는다. 공개 서비스 공통.
- 검증: `report-completion-job` + `report-list-view` 17/17 PASS (`NODE_ENV=test`).

## 2026-09-20 — 로컬·Git·Vercel·Supabase 안전 복구

- 미커밋 연동 증거를 로컬 백업 브랜치에 보존한 뒤 `main`을 `origin/main`에 fast-forward했다. push·배포는 실행하지 않았다.
- 승인된 목차 축소와 달랐던 11개 서비스 CI 기대값, 소개 페이지 숫자·구조화 데이터·묶음 칩을 정합화했다. Grok 리뷰의 퇴사운 칩 불일치와 기존 주석·예시·상태 문구 지적도 반영했다.
- 검증: typecheck, 단위 테스트 1,474/1,474, 서비스 검수 14종, SEO, 20개 서비스 QA, Vercel build, 운영 연동 10/10 모두 PASS.
- Supabase migration은 원격과 일치 22, 원격 전용 0, schema-present/history-missing 로컬 전용 8이다. `migration repair`·`db push`는 승인 게이트 때문에 실행하지 않았다. `db lint --linked`는 DB password 인증 실패로 BLOCKED이며 원격 변경은 없었다.
- CreamWIKI `personal/.../notes/umsh-integration-state-recovery-20260920.md`에 비밀정보 없는 복구 패턴을 저장하고 검색 재조회했다.

## 2026-09-20 — 승인 후 GitHub·Vercel 운영 반영

- 사용자 승인 후 `ae12c69`를 `origin/main`에 push했다. GitHub CI run `35473142768`은 typecheck, 1,474 테스트, 서비스 검수, SEO, 20서비스 QA, Vercel build, 생성물 diff를 모두 통과했다.
- Vercel Production `dpl_8hxeRbUCLcHAofNXms8uHoCzXvGU`가 Ready로 `umsh.kr`에 연결됐다. 운영 연동 10/10과 `/about`의 서비스 범위·퇴사운 8개 칩을 재검증했다.
- Supabase에는 완료된 물리 백업 8개가 있고 최신 백업은 `2026-09-19T16:55:10Z`다. PITR은 비활성이다.
- 사용자의 승인은 TASK-004 G5를 충족한다. 다만 G3 전체 권한·RLS 동등성 검토와 G4 사전 dry-run 0건은 아직 충족되지 않아 migration history repair와 `db push`는 실행하지 않았다.

## 2026-09-20 — Supabase migration history 정합화

- 사용자 추가 승인 후 공식 Management API 읽기 전용 SQL로 history 누락 8건의 실제 원격 스키마·함수·권한·RLS를 대조했다. 기계적 동등성 조건 21/21 PASS.
- 완료된 physical backup 8개와 프로젝트 ref `wdyzollywccgaepjeynu`를 재확인한 뒤, 스키마 SQL 없이 `migration repair --status applied`로 8개 history 행만 복구했다.
- 사후 `migration list`는 로컬/원격 30/30 일치, `db push --dry-run --include-all --skip-vault`는 적용 대상 0건이다. 운영 연동도 10/10 PASS.
- Docker Desktop은 shadow diff 기동 중 Inference Manager의 `dockerInference` 소켓 정리 오류로 종료됐다. 검증은 Docker에 의존하지 않는 공식 읽기 전용 API로 대체했으며 DB 작업 결과에는 영향이 없다.
- Advisor 후속 후보: invoker 함수 `cheongi_report_light` search path 고정, Auth leaked-password protection 활성화, unused index 추세 관찰. 이번 history 복구 범위에서는 변경하지 않았다.

## 2026-09-20 — 무료 Supabase 보안 후속 완료·Docker 제외

- 새 migration으로 `cheongi_report_light(jsonb)`의 search path를 고정했다. 함수 본문·SECURITY INVOKER·service-role-only 권한은 유지되고 advisor 경고는 해소됐다.
- 공식 Management API의 단일 필드 변경으로 Auth 유출 비밀번호 차단을 활성화했다. 사후 advisor에서 해당 경고가 사라졌다.
- 로컬/원격 migration 31/31, dry-run 0건, typecheck PASS, 운영 연동 10/10 PASS.
- PITR은 별도 유료 add-on이라 사용자 지시에 따라 제외했다. 비용·설정 변경 0건이며 기존 physical backup 8개를 유지한다.
- Docker는 이 프로젝트 운영에 필요하지 않아 사용을 중단했다. 오래된 Windows 소켓 폴더는 삭제하지 않고 백업 이름으로 이동했으며 Docker 프로세스는 종료했다.

## 2026-09-20 — 관리자 비밀번호 재설정 후 로그인 401 복구

- 원인은 관리자 로그인 API가 `umsh_admin_accounts.password_hash`만 검사하는 반면, 비밀번호 재설정은 Supabase Auth 비밀번호만 변경한 이중 정본이었다.
- 기존 로컬 관리자 로그인을 롤백 경로로 유지하고, 그 경로가 401일 때만 Supabase 비밀번호 인증을 수행한 뒤 새 `/api/admin/v1/session/supabase`에서 인증 사용자와 활성 관리자 행을 독립 검증해 기존 HttpOnly 관리자 쿠키로 교환한다.
- 브라우저용 Supabase 관리자 세션은 저장·자동갱신하지 않고 교환 직후 제거한다. 복구 링크는 로컬 관리자 단축 분기보다 먼저 처리한다.
- 독립 리뷰의 Major 2건(토큰 지속 저장, 복구 분기 도달 불가)과 Minor 1건(로컬 관리자 로그아웃이 무관한 고객 세션을 지울 가능성)을 모두 반영했다. 최종 리뷰 기준 Critical 0, Major 0이다.
- 집중 인증 테스트 29/29, 전체 직렬 테스트 1,476/1,476, typecheck, Vercel build, diff check가 통과했다.
- CreamWIKI `personal/carrotcap/notes/umsh-admin-supabase-session-20260920.md`에 비밀정보 없는 원인·결정·검증을 저장하고 재조회·검색했다.
- 커밋 `0b12c0d`를 `origin/main`에 push했고 Vercel Production `dpl_AL2zBFeEWX7WTAmmHyzSghqerZJ3`가 Ready로 `umsh.kr`에 연결됐다. 운영 health, 관리자 HTML의 새 폴백·비영속 설정, 무토큰 교환 401을 확인했다.
- Codex 브라우저에서 `/admin`을 새로 열어 이전 실패 문구가 사라진 깨끗한 직원 로그인 폼을 확인했다. 비밀번호를 읽거나 입력하지 않았으므로 인증 완료 화면 확인만 사용자 재입력 뒤 남아 있다.

## 2026-09-20 — 관리자 운영 로그인 최종 확인

- 사용자가 Codex 브라우저에서 자격 증명을 다시 입력해 관리자 로그인을 완료했다.
- Vercel Production 로그에서 `POST /api/admin/v1/login` 200, 후속 `GET /api/admin/v1/me` 200, 운영 데이터 API 200을 확인했다.
- 활성 `super_admin` 계정과 기존 HttpOnly 관리자 세션 경로가 정상 동작하므로 추가 코드·Supabase 설정 변경은 하지 않았다.

## 2026-09-20 — 관리자 리포트의 회원 이름·서비스명 정합화

- 원인은 `/admin/reports`가 리포트 대상 이름 대신 계정 이메일을, 서비스명 대신 내부 키(`cmdg`, `today` 등)를 직접 표시한 것이었다.
- 운영 Supabase 읽기 전용 집계에서 리포트 84건 중 81건은 `payload.context.name`에 사주 입력 이름이 있고 3건은 이름이 없음을 확인했다. 비어 있지 않은 실제 서비스 키 21종은 공용 서비스 디렉터리로 모두 해석됐다.
- 회원 열을 `회원 이름`으로 바꾸고 리포트 스냅샷의 입력 이름을 표시한다. 이름 없는 과거 기록은 `이름 미확인`, 알 수 없는 서비스는 `서비스 미확인`으로 표시한다. 목록 조회에서 불필요한 `user_id`·`user_email` 요청도 제거했다.
- 검증: 집중 테스트 29/29 PASS, `npm run vercel-build` PASS, diff check PASS. 서비스명 변경 뒤 전체 회귀 1,476/1,476 PASS.
- 사용자의 지시에 따라 Grok 리뷰는 중단했고 앞으로 이 작업에 사용하지 않는다. 로컬 diff 자체 점검에서 추가 결함은 발견되지 않았다.
- CreamWIKI `personal/carrotcap/notes/umsh-admin-report-identity-20260920.md`에 비밀·개인정보 없는 기준을 저장하고 get/search 재조회했다.
- [GATE] 로컬 변경은 아직 Git push·Vercel 운영 배포하지 않았다. `rules.md` §6 H1/H2에 따라 명시적 승인 뒤 진행한다.

## 2026-09-20 — 관리자 리포트 이름·서비스명 운영 배포

- 사용자 승인 후 커밋 `d6011e7`을 `origin/main`에 push했다. GitHub CI run `35490010617`은 typecheck, 전체 테스트, 서비스 검수, 검색 기반 검증, 20개 서비스 QA, Vercel build, 생성물 검사를 모두 통과했다.
- Vercel Production `dpl_HVAYBq8PbVY3TqpJ6QukShArZUB5`가 Ready로 `umsh.kr`에 연결됐다. 운영 연동 10/10 PASS, 배포 직후 error log 0건이다.
- Codex 브라우저에서 로그인 세션으로 `/admin/reports`를 새로고침해 `회원 이름` 헤더, 사주 입력 이름, `오늘운`·`천명사주` 등 실제 서비스명, 과거 누락 행의 `이름 미확인`·`서비스 미확인` 표시를 확인했다.
- 사용자의 지시에 따라 Grok은 실행하지 않았고 이후에도 이 작업에 사용하지 않는다.

## 2026-09-20 — 관리자 코퍼스 역할 설명·파일 다운로드

- 코퍼스 레지스트리의 내부 영문 `role`은 실행 계약이라 바꾸지 않고, 관리자 API에서 한국어 역할명과 실제 사용 설명을 파생하도록 분리했다. 서비스 전용 팩은 공용 서비스 디렉터리의 실제 한국어 상품명을 사용한다.
- 관리자 코퍼스 표는 `역할과 사용 방식` 셀에 한국어 역할명·설명을 함께 표시하며, 원천 파일명은 클릭 가능한 다운로드 링크로 바꿨다.
- 다운로드 라우트는 `reports:read` 권한을 다시 검사하고 현재 활성 레지스트리에 등록된 팩 ID만 허용한다. 클라이언트가 임의 파일 경로를 전달할 수 없고 응답은 `attachment`, `private, no-store`다.
- 집중 테스트 46/46, 전체 직렬 테스트 1,478/1,478, TypeScript typecheck, Vercel build, diff check가 통과했다.
- Grok은 사용하지 않았다. 로컬 구현은 완료됐다. [GATE] Git push·Vercel 운영 배포는 `rules.md` §6 H1/H2에 따라 새 승인 전이라 실행하지 않았다.

## 2026-09-21 — 대용량 미사용 PNG 8개 WebP 전환·부착

- 지정된 PNG 8개를 WebP 품질 82로 변환하고, 원본 15,483KB를 778KB로 줄여 14,706KB(95.0%)를 절감했다. 원본 PNG는 Git 이력으로 복구 가능하며 작업 트리에서는 제거했다.
- 연애운 4개 이미지는 기존 연애운 랜딩의 각 설명 구간, FAQ 이미지는 질문 안내 상단, 퇴사운 이미지는 무료 리포트 히어로, 포털 2개 이미지는 홈 히어로 배경과 보조 Open Graph 이미지에 연결했다.
- 중첩 자산의 실제 공개 경로는 관리자 표시 경로 `/사주/assets/...`가 아니라 서버 마운트 `/assets/...`임을 HTTP 404/200으로 확인해 브라우저 참조를 바로잡았다.
- 8개 공개 URL HTTP 200, FAQ·퇴사운·포털 시각 렌더링, 관리자 카탈로그 `in_use`, 전체 직렬 테스트 1,479/1,479, typecheck, Vercel production build·SEO 생성 검사, `check:quit`, `check:thisyear`, diff check를 통과했다.
- CreamWIKI `personal/carrotcap/notes/umsh-admin-media-webp-20260921.md`에 원인·변환 기준·검증·재사용 교훈을 저장하고 재조회·검색했다.
- Grok은 사용하지 않았다. [GATE] Git push·Vercel 운영 배포는 `rules.md` §6 H1/H2에 따라 새 승인 전이라 실행하지 않았다.

## 2026-09-21 — 코퍼스 개선·미디어 WebP 운영 배포

- 사용자 승인 후 커밋 `bc6e863`, `77e201f`를 `origin/main`에 push했다. GitHub CI run `35551515507`은 typecheck, 전체 테스트, 서비스 검수, 검색 기반 검증, 20개 서비스 QA, Vercel build, 생성물 검사를 모두 통과했다.
- Vercel Production `dpl_3MXjCMCxZCe1np69MeXVHBaFPzdT`가 Ready로 `umsh.kr`, `www.umsh.kr`에 연결됐다.
- 운영 WebP 8개는 모두 HTTP 200, 제거한 PNG 표본 3개는 HTTP 404였다. FAQ와 포털 HTML도 새 WebP 경로를 참조한다.
- 로그인된 운영 관리자 화면에서 미사용 이미지가 110개에서 102개로 감소하고 기존 대용량 PNG 8개가 사라졌음을 확인했다. 코퍼스 화면에서도 한글 역할 설명과 파일 다운로드 링크를 확인했다.
- 배포 직후 5xx 로그는 0건이다. `/api/cron/ops` 200 응답에서 Node `url.parse()` deprecation 경고 1건이 error 레벨로 수집됐지만 이번 변경과 무관하며 요청 실패는 아니다.
- 롤백 기준은 직전 Ready 배포 `dpl_H8hEyygKZ1ey3HtTsZeVURyDn2jW`이며, 장애 시 해당 배포로 Vercel alias를 되돌린다.

## 2026-09-22 — 저장 해석 링크 공유 버튼과 공통 썸네일

- `/r/:id` 공용 리더 하단의 고유 주소 이동 링크를 복사 전용 `링크 공유하기` 버튼으로 교체했다. 성공·실패는 접근 가능한 상태 문구로 알리고, 타인에게 본문 열람 권한을 부여하지 않는다.
- 공개 리포트 셸의 Open Graph 이미지 선언을 기존 운명상회 1200×600 JPEG 실물에 맞게 정정하고 잘못된 `/r/` 공통 URL을 제거했다. 개인 풀이를 소셜 메타데이터에 쓰지 않는다.
- 공용 스크립트 버전은 68개 HTML 참조를 함께 올려 화면별 구버전 캐시 불일치를 피했다. 팝업 관리자/팝업과 DB는 변경하지 않았다.
- 로컬 HTTP: 익명 `/r/share-check-only` 200 및 개인정보 없는 셸, 공통 썸네일 200 `image/jpeg`, 새 스크립트 200. 집중 테스트 66/66, 전체 회귀 1512/1512, typecheck와 Vercel build 통과. 초기 회귀의 캐시 버전 불일치 1건은 68개 HTML 참조를 일치시킨 뒤 재실행해 해소했다.
- [GATE] 원격 push·운영 배포는 `rules.md` §6 H1/H2에 따라 이번 변경에 대한 명시적 승인 전 미실행. 소셜 플랫폼 캐시 갱신은 배포 이후에만 확인할 수 있다.

## 2026-09-22 — 천명사주 첫 하이라이트 실사형 이미지 교체

- 사용자 지정 카드 `타고난 그릇과 쓰는 법`의 기존 인물 배너를 소나무·갈림길 실사형 이미지로 교체하는 로컬 변경이다. 요약 이미지와 본문 16개 이미지는 유지한다.
- `cmdg.cutB`만 새 공개 WebP 자산으로 연결했다. 1916×821, 21:9 비율로 카드의 `object-fit: cover`에서 중심 주제가 잘리지 않는다. 이미지 생성 프롬프트와 복구 경로는 `docs/assets/cmdg-wood-path-highlight-v2.md`에 기록했다.
- 기존 리포트 본문·개인 계산값·DB·팝업은 변경하지 않았다. 공용 스크립트와 설정 JSON의 캐시 버전을 갱신하고 HTML 참조를 일치시켰다.
- 검증: 새 배너 연결 집중 테스트 78/78, 전체 회귀 1513/1513, typecheck, Vercel build, diff check 통과. 로컬 HTTP에서 설정 JSON 200이 새 경로를 가리키고, WebP 200 `image/webp`(382,520바이트), 공유 리포트 셸 200이 새 스크립트 버전을 참조한다.
- [GATE] 원격 push·운영 배포는 이번 요청에 별도 지시가 없어 `rules.md` §6 H1/H2에 따라 미실행이다. 운영 화면·메신저 미리보기는 현시점 미변경이다.

## 2026-09-22 — 프로필 현실 기준 입력 제거와 해석 안내 정리

- `/profile`에서 선택 현실 기준 5개 입력을 제거하고 태어난 시간 선택·시각 입력·저장 버튼 간격을 늘렸다. 시간 모름 상태는 입력을 레이아웃·폼에서 제외하고 `aria-pressed`로 선택을 알린다.
- 프로필 저장 요청은 `lifeContext`를 생략한다. 기존 DB 값은 서버의 값 보존 계약대로 유지하며, 저장 해석 원문·계산·회원 권한은 변경하지 않았다.
- 저장 해석의 빈 현실 기준 영역과 MY 등록 유도 링크를 제거했다. 실제 조건이 없는 비교표는 사실 대신 확인할 질문을 표시하고, 대운 그래프는 실생활 결과 예측이 아님을 유지한다.
- 공용 해석 스크립트의 캐시 버전을 참조 HTML 69개에 일치시켰다. 팝업 관리자·팝업은 변경하지 않았다.
- 검증: 집중 테스트 70/70, 전체 직렬 회귀 1,518/1,518, TypeScript, Vercel build, diff check PASS. 로컬 500px 정적 렌더에서 입력 간격·버튼 배치를 확인했다. 인증된 실제 프로필 저장의 브라우저 E2E는 로컬 정적 서버로는 실행하지 않았다.
- CreamWIKI `personal/carrotcap/notes/umsh-profile-optional-context-20260922.md`에 원인·결정·검증·교훈을 기록한다.
- [GATE] 원격 push·운영 배포는 현재 요청에 포함되지 않아 `rules.md` §6 H1/H2에 따라 미실행이다.

## 2026-09-22 — 공유 링크·천명사주 이미지·프로필 간소화 운영 배포

- 사용자 요청에 따라 미배포 로컬 커밋 `853c195`, `f218f30`, `88c7e87`을 `origin/main`에 fast-forward push했다. 팝업 관리자·팝업 및 DB migration은 포함되지 않았다.
- GitHub CI run `35705222319`에서 typecheck, 전체 테스트, 서비스 검수, 검색 기반 검증, 20개 서비스 QA, Vercel build, 생성물 검사 모두 PASS.
- Vercel Production `dpl_4f84M3R7474U4Y6oecqr2VVHR1MM`이 Ready이며 `umsh.kr`, `www.umsh.kr`에 연결됐다. 이전 Ready 배포 `dpl_8CqcZWgfc46N5oWSTPENHq2mMjeS`가 롤백 기준이다.
- 운영 HTTP에서 `/profile` 새 문구·필드 제거, 공용 리더 스크립트 200, 새 WebP 200 `image/webp`, 공유 리포트의 브랜드 OG 메타데이터와 새 스크립트 참조를 확인했다. 로그인된 운영 브라우저에서는 프로필의 입력 간소화·간격, 해석의 MY 등록 안내 제거·공유 버튼·새 이미지 연결을 확인했다. 프로필 저장 제출은 하지 않았다.
- 배포 직후 5xx 로그 0건이다. error 레벨 1건은 기존에도 관찰된 Node `url.parse()` 사용 중단 경고이며 요청 실패는 아니다.

## 2026-09-22 — 20개 서비스 공통 해석 템플릿·대표 썸네일 정합화

- 19개 유료 장문 해석 서비스의 공용 리더를 확장했다. 첫 토글은 메인 카드와 같은 대표 썸네일, 한 줄 답, 서비스별 읽기 안내 표, 저장 원문 순서로 표시하고 이후 이미지 없는 기본 토글은 해당 서비스의 공개 A/B 장면을 교차 사용한다. 항목 전용 이미지가 저장돼 있으면 그 이미지를 우선한다.
- 모든 서비스에 메인 썸네일, `cutA`, `cutB`를 계약으로 등록했다. 실제 공개 자산 57개 경로를 확인했으며, 새 가짜 이미지·회원 개인값·가짜 점수는 만들지 않았다.
- 저장된 `analysis.fortune.daewoon`이 있는 모든 서비스에서 대운 흐름 그래프를 보이게 했다. 그래프는 힘을 쓰기 쉬움·기준 정리·속도 조절의 해석 기준이며 성공·수입 예측 점수가 아니다. 값이 없으면 표시하지 않는다.
- 향후 하이라이트 생성에는 6/6/5 문단 최소 계약을 적용했다. 기존 저장 원문은 클라이언트에서 축약하거나 재작성하지 않는다.
- 팝업 관리자·팝업, 결제, DB schema/migration은 변경하지 않았다. 오늘운은 장문 토글 서비스가 아닌 일일 결과 화면이므로 구조를 강제로 바꾸지 않았다.
- 검증: 집중 테스트 23/23, 전체 `npm test`, TypeScript, 20개 서비스 QA, Vercel build, diff check 통과. 로컬 브라우저 검수에서 올해 연애운의 대표 썸네일·읽기 표·대운 그래프·삼재 원자료를 확인했다.
- 로컬 커밋 `73a61c5`로 고정했다. [GATE] 원격 push·운영 배포는 `rules.md` §6 H1/H2에 따라 별도 명시 승인 전 미실행이다.
