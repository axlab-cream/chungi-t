# TASK-009 — `origin/main` 병합 해소 계획

- 작성일: 2026-09-10
- CreamAI task: `task-009`
- 해소 대상: U13(20커밋 미반영), U23(cat 검색 단계), U25(stale guard 11개), U15(wedding 병렬 구현)
- 상태: **병합 1차 시도 완료 후 abort. 파일별 해소 방침 확정. 사용자 결정 1건 대기**

## 0. 현재 저장소 상태 — 안전

병합을 실제로 시도해 충돌 24건의 내용을 전부 확인한 뒤 `git merge --abort`로 되돌렸다.

```
HEAD              dac38355b5ef4bb5e91778fdcf458873fc63f29e  (변경 없음)
MERGE_HEAD        없음
충돌 파일          0건
dirty             31건 (병합 시도 전과 동일)
복구 지점          backup/pre-merge-20260910 = dac3835
```

미커밋 작업물(admin-ops 문서, `.env.example`, `README.md`) 전부 보존됐다.
`git fetch`와 `merge --abort`만 수행했고 커밋·푸시·배포는 없다.

**중단 이유:** 아래 §4의 결정 1건이 5개 파일의 해소 방향을 바꾸고,
저장소를 병합 중(MERGING) 상태로 둔 채 결정을 기다리는 것은 위험하다.
대신 24건 전부의 해소 방침을 확정해 두었으므로, 승인 후 한 번에 실행할 수 있다.

## 1. [즉시 조치 권고] 병합과 별개로 발견된 운영 문제

`/api/payment/config`는 **인증 없이 누구나** 호출할 수 있고, 지금 이렇게 응답한다:

```
GET https://umsh.kr/api/payment/config
"setupMessage": "결제 모듈 연결 전입니다. 남은 설정: 이니시스 MID·SignKey (INICIS_MID, INICIS_SIGNKEY)."
```

**내부 환경변수 이름이 고객에게 그대로 노출되고 있다.**
`origin/main`은 이미 이 문제를 고쳤다:

```
aca0bf3 fix(chrome): finish the common GNB and stop showing env vars at checkout
```

수정 내용 (`origin/main:src/server/app.ts:1187`):
```ts
const PAYMENT_UNAVAILABLE_NOTICE = '지금은 결제를 열 수 없습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.'
```

심각도: 비밀값이 아니라 **변수 이름**이므로 즉시 악용 가능한 취약점은 아니다.
그러나 내부 구성을 고객에게 알릴 이유가 없고, 결제 화면 문구로도 부적절하다.
→ **병합의 부수 효과로 해소되며, 병합을 서둘러야 할 근거 하나가 더 늘었다.**

## 2. 충돌 24건 — 파일별 해소 방침

### 2.1 그룹 A — 자동 판정 (근거 확정, 결정 불필요)

| 파일 | 방침 | 근거 |
| --- | --- | --- |
| `data/corpus/registry.json` | **어느 쪽이든 동일** | 양쪽 `packs` 28개, **id 집합이 완전히 같다**. version도 둘 다 `1.9.0`. 텍스트 배치 차이일 뿐 |
| `src/server/app.ts` 충돌 ②<br>(`paymentConfigPayload`) | **우리 필터 + 저쪽 문구** | 우리: `PUBLICLY_DISABLED_PRODUCT_KEYS` 필터(판매 게이트, T02 U10) + env 이름 노출 문구.<br>저쪽: 필터 없음 + `PAYMENT_UNAVAILABLE_NOTICE`.<br>→ **판매 게이트는 유지하고 고객 문구만 교체**하면 양쪽 장점을 다 취한다 |

```ts
// 해소 결과
catalog: listPaymentProducts()
  .filter((product) => !PUBLICLY_DISABLED_PRODUCT_KEYS.has(product.key))
  .map(publicPaymentProduct),
setupMessage: enabled || testMode ? '' : PAYMENT_UNAVAILABLE_NOTICE,
```

### 2.2 그룹 B — 정책·공개 페이지 5건: **우리 쪽 채택**

`사주/privacy.html`, `terms.html`, `refund.html`, `support.html`, `portal.html`

| 항목 | OURS | THEIRS |
| --- | --- | --- |
| `privacy.html` 줄 수 | 81 | 86 |
| 정책 nav | `/about`, `/faq`, `/terms`, `/privacy`, `/refund`, `/support` **6링크** | `/terms`, `/privacy`, `/refund`, `/support` (정책만) |
| `<title>` | `개인정보처리방침 · UMSH 운명상회` | `개인정보처리방침 · 운명상회` |
| css 버전 | `policy.css?v=20260909-logo` | `policy.css?v=20260901-policy-pages` |
| 공용 크롬(mountChrome/service-shell) | 없음 | 없음 (정책 페이지는 공용 크롬 미사용) |

**방침: OURS 채택.** 이유는 브랜드가 아니라 **링크 무효화 방지**다.
우리 nav는 `/about`과 `/faq`를 가리키고, 이 두 페이지는 **우리 브랜치에만 존재한다**
(`80c45ea feat: publish public MY, branded about and grouped FAQ pages`,
`3390372 feat: expand public FAQ to 126 searchable service guides`).
저쪽을 채택하면 운영에 살아 있는 about/FAQ 링크가 정책 페이지에서 사라진다.

단 **브랜드 표기는 §4의 결정 대상**이다.

### 2.3 그룹 C — 결혼택일 11건: **저쪽 기준 + 우리 correctness 가드 이식**

`prompts/services/wedding_day.md`, `src/day/wedding-service.ts`,
`scripts/check-wedding.mjs`, `tests/unit/day-wedding-service.test.ts`,
`사주/day/wedding/{01,02,04,05(chat/index),06}/*`, `사주/day/wedding/assets/{app.js,style.css}`,
`사주/js/wedding-service.js`

양쪽이 결혼택일을 **병렬로 구현**했다(U15). 어느 쪽도 상위집합이 아니다.

`src/day/wedding-service.ts` 선언 대조 (OURS 597줄 / THEIRS 727줄):

| 기능 | OURS | THEIRS |
| --- | --- | --- |
| `retrieveCategoryOwnChunks` / `retrieveCategoryRagChunks` | 2 / 2 | 2 / 2 |
| `RAG_FIELD_LABEL` 정규식, `chunkMeaning()`, `compact()` — RAG 라벨 제거·압축 | **없음** | **있음** |
| `RELATION_HANJA_KO` — 合/沖/破/害 → 한글 표기 | **없음** | **있음** |
| `parseTime()` 반환에 `known: boolean` | 없음 | 있음 |
| **`birthTimeKnown`을 `sideView()`·`judgeCandidate()`까지 전달** | **있음** | **없음** |

즉:
- **THEIRS**는 표현·RAG 정제가 앞선다 (`f010f55` 판단값을 섹션 프롬프트로 전달,
  `77ae2d8` 01~06 카피 가독성·아트워크, `2d6490c` 04/05/06을 공용 verified reader에 연결)
- **OURS**는 THEIRS에 없는 **정확성 가드**가 있다 — 출생시간 미상이 확정 용신 매칭으로
  둔갑하지 않게 막는다 (`7260691 feat: strengthen service reading QA`).
  우리 테스트 `unknown birth time never becomes a confirmed useful-element match`가 이를 검증한다

**방침:**
1. 11개 파일 모두 **THEIRS 채택** (HTML/CSS/JS 포함).
   `2d6490c`가 04/05/06을 공용 verified reader에 넘기므로 공용 크롬 방침과도 맞는다.
2. 그 위에 **`birthTimeKnown` 전달을 이식**한다:
   - `sideView(label, analysis, dayStem, dayBranch, birthTimeKnown = true)`
   - `judgeCandidate(iso, sides: Array<{label, analysis, birthTimeKnown?}>)`
   - 호출 지점 전부 갱신
3. 이식 검증은 **우리 테스트를 THEIRS 테스트에 합쳐** 수행한다
   (`unknown birth time…` 케이스가 반드시 통과해야 한다)
4. `scripts/check-wedding.mjs`는 THEIRS 채택 (THEIRS 구현을 검사하는 가드)

### 2.4 그룹 D — 나머지 4건: 확인 후 대부분 저쪽

| 파일 | 방침 | 근거 |
| --- | --- | --- |
| `사주/js/portal.js` | THEIRS 우선, 우리 about/faq 카드 유지 여부 확인 | `f6402cd feat(portal): open the two upcoming cards`, `7d6fac1 fix(couple,portal): chrome follows the frame, card rails drag by mouse` |
| `사주/match/couple/02-step-2-saju-input/index.html` | **THEIRS** | `29902f2 fix(couple): bring the 02 input screen onto the shared 02 pattern`, `3ce3c0a fix(layout): keep every input screen inside the mobile frame` |
| `tests/unit/portal-newyear-coming-soon.test.ts` | **THEIRS** | 카드가 live로 열린 상태를 검증. 우리 가드/HTML 불일치(T04 §4.1)가 함께 해소됨 |
| `tests/unit/service-system-prompt.test.ts` | **합집합** | 양쪽이 서로 다른 서비스 프롬프트 단정을 추가했을 가능성. 3 hunk를 개별 검토 |

### 2.5 부수 해소 — U23, U25

- **U23** `src/pet/cat-service.ts`는 충돌 목록에 **없다** → 저쪽 버전이 그대로 들어온다.
  `retrieveCategoryOwnChunks` 2건이 확보되어 `check:cat`이 통과할 것으로 예상된다.
- **U25** `scripts/check-*.mjs` 12개 중 11개가 저쪽 버전으로 갱신되어 stale guard 실패가 해소될 것으로 예상된다.
  (`check-wedding.mjs`만 충돌이며 §2.3에서 THEIRS 채택)

두 항목 모두 **병합 후 실측으로 확인**한다. 예상을 결과로 적지 않는다.

## 3. 병합 후 필수 검증 (T04 회귀 오라클 조건 준수)

```
npm run typecheck                 → 오류 0건
npm test                          → 병합 전 373건 대비 증감을 반드시 설명
                                    (양쪽 테스트가 합쳐지므로 증가가 정상)
                                    ※ 반드시 npm 스크립트로 (T04 §8)
check:* 16개 전수                  → stale guard 11개 해소 확인, cat 통과 확인
npm run qa:all-services           → PASS 유지
npm run check:production-source   → 작업트리 비청결은 예상(TASK-008 전)
```

추가로 T04가 기록한 **실행 형태 의존 8개**(U24)를 병합 후 다시 확인한다.
병합으로 테스트 파일이 늘어나면 발견 순서가 바뀌므로 이 8개가 `npm test`에서도
실패로 돌아설 수 있다. 그 경우 **병합 회귀가 아니라 U24의 발현**임을 구분해야 한다.

## 4. 사용자 결정 필요 — 1건

### 브랜드 표기: 고객 노출 문구에서 `UMSH`를 뗄 것인가?

양쪽 브랜치가 **반대 방향으로** 결정했고, 둘 다 명시적 커밋이다.

| | 커밋 | 시각 | 표기 |
| --- | --- | --- | --- |
| `origin/main` | `e777c43 chore(brand): show 운명상회 everywhere UMSH was still facing the customer`<br>`40f4494 fix(destiny): put the 운명상회 logo in the loading box instead of "UMSH"` | 09-08 16:38~16:47 | **`운명상회`** (UMSH 제거) |
| 우리 브랜치 | `ca95a92 fix: unify public page headers with shared brand logo`<br>`dac3835 seo: unify site identity and validate search foundation at build` | 09-09 15:57~17:06 | **`UMSH 운명상회`** |

- 시각만 보면 **우리 쪽이 더 최신**이고, 현재 **운영에 배포된 표기**이기도 하다.
- 그러나 `origin/main`의 커밋 메시지는 "아직 고객에게 UMSH가 보이던 곳을 전부 운명상회로"라는
  **의도적 정리**다. 우리 브랜치는 그 커밋을 받은 적이 없으므로 되돌린 것이 아니라 **모른 채 진행**한 것이다.
- 영향 범위: 정책 페이지 5건의 `<title>`·설명, `destiny.html` 로딩 박스, 그 외 고객 노출 문구.
  SEO 관점에서 사이트 신원 문자열이 바뀌므로 `dac3835`가 검증한 검색 기반과도 연결된다.

**선택지:**

- **(A) `UMSH 운명상회` 유지** — 현재 운영 표기 유지. 우리 SEO 결정 존중.
  병합 시 정책 페이지는 OURS 채택이므로 추가 작업 없음. **가장 안전한 기본값.**
- **(B) `운명상회`로 통일** — `origin/main`의 브랜드 정리 의도 채택.
  정책 페이지 5건 + `destiny.html` 등의 문구를 손으로 맞추고 SEO 기반 재검증 필요.
- **(C) 지금은 (A)로 병합하고, 브랜드 통일은 별도 Task로 분리** — 병합 범위를 줄여 회귀 원인을 분리.

**권고: (C).** 병합은 기능·가드 통합에 집중하고, 브랜드 표기는 SEO 영향까지 함께 볼 수 있는
별도 Task로 떼어내는 편이 회귀 추적에 유리하다.

## 5. 승인 후 실행 순서

1. `git merge origin/main` (복구 지점 `backup/pre-merge-20260910` 유지)
2. 그룹 A → D 순서로 해소 (§2)
3. `birthTimeKnown` 이식 (§2.3)
4. 검증 전수 실행 (§3)
5. 병합 커밋 생성 — **push는 하지 않는다** (별도 승인 사안)
6. Codex 리뷰 요청
7. 병합 전/후 baseline 대조표 작성, U13·U15·U23·U25 해소 판정

되돌리기: `git reset --hard backup/pre-merge-20260910`
