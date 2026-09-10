# T02 — 20종 키·노출 매핑

- pack task: `admin-ops-execution-pack/15-TASKS.md` T02 (M0 / P0 / 선행 T01)
- CreamAI task: `task-t02`
- 요구 추적: R02 / 참고: 18-SERVICES, 06-SCREENS S02
- 작성일: 2026-09-10
- **기준: 로컬 HEAD `dac38355b5ef4bb5e91778fdcf458873fc63f29e` (`fix/umsh-qa-ux`).**
  **= 운영 소스와 일치한다.** 작성 중 U1/U7이 해소되어 "운영 대조 미완료" 라벨을 해제했다.
  근거: `docs/admin-ops/production-source-of-truth.md` — 운영 배포
  `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`의 콘텐츠가 이 HEAD와 일치함을 실측했다.
  따라서 **이 표는 운영 현재값으로 사용할 수 있다.**
  운영 `/api/services`와 `/api/payment/config`를 직접 조회해 이 문서의 매핑표가
  운영 현재값임을 확인했다(§9). 단 운영 트리 전체가 로컬과 비트 단위로 같은지는 미확인(U16).
  `origin/main`의 20 커밋은 운영·로컬 모두에 없다 (U13, 별도 병합 Task).
- 조사 경계: `prompts/services-manifest.json`, `src/prompt/service-system.ts`,
  `src/payment/catalog.ts`, `src/server/service-directory.ts`, `src/server/app.ts`(노출 게이트)
- 코드 변경: 없음. 조사 스크립트는 프로젝트 밖 스크래치패드에서 실행했다.

## 1. 결론 요약

| 검사 항목 | 결과 |
| --- | --- |
| 기준 | **운영 현재값 확정** — 운영 `/api/services`(15건)·`/api/payment/config`(catalog 19건)를 직접 조회해 이 표와 일치함을 확인 |
| 20종 누락 | **0건** — canonical 20 / manifest 20 / 프롬프트 파일 20 전부 일치 |
| alias 충돌 | **2건** — `cmdg↔saju_master` 브리지 부재(중대), `home` 정규화 방향 역전 |
| hidden 자동 공개 | **없음** — `listServiceDirectory()`가 4종을 실제로 제외 (15건 반환) |
| **노출≠판매 불일치** | **4건** — hidden 4종이 결제 catalog에 그대로 노출. **운영 API로 실측 확인** |
| 18-SERVICES 표 정확도 | 20행 중 19행 정확. 1행(`saju_master｜cmdg`)은 코드에 미구현된 매핑 |

## 2. 키 네임스페이스 지도

이 프로젝트에는 서비스 키 네임스페이스가 **3개** 있고, 각각 정규화 함수가 따로 있다.

| # | 네임스페이스 | 정의 위치 | 개수 | canonical 기준 |
| --- | --- | --- | --- | --- |
| N1 | **promptKey** | `src/prompt/service-system.ts` `KNOWN_SERVICE_KEYS` | 20 | `prompts/services/<key>.md` 파일명 |
| N2 | **paymentKey** | `src/payment/catalog.ts` `PaymentProductKey` | 19 | 결제 상품 코드 |
| N3 | **directory seed** | `src/server/service-directory.ts` `SEEDS` | 19 | N2를 그대로 참조 (`key: PaymentProductKey`) |

정규화 함수 3개:

| 함수 | 위치 | 처리 범위 | 반환 |
| --- | --- | --- | --- |
| `normalizeServiceKey` | `src/prompt/service-system.ts:88` | `SERVICE_KEY_ALIASES` 5개 + 소문자·구분자 정규화 | N1 canonical, 미지정 시 `saju_master` |
| `normalizeServiceKey` | `src/server/app.ts:699` (**동명 별개 함수**) | `love_this_year`, `home_fit`, `work_move`, `pass_angle` **4종만** | 해당 4종 또는 `undefined` |
| `serviceHrefForKey` | `src/server/service-directory.ts:76` | `home_fit→home_pungsu`, `home→home_pungsu` | landing href 또는 `undefined` |

`SERVICE_KEY_ALIASES` (N1 입력 별칭) 실측 5건:
`love_thisyear→love_this_year`, `home_pungsu→home_fit`, `home→home_fit`,
`love_signal→couple_signal`, `today→today_fortune`

## 3. 20종 전수 매핑표 (실측)

`-` = 해당 없음. `promptFile`은 `prompts/services/<canonical>.md` 존재 여부.

| # | canonicalKey (promptKey) | paymentKey | promptFile | discovery | landingPath (href) | returnPath |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `today_fortune` | **(없음)** | yes | (seed 없음) | `/today/free/` (app.ts:355) | - |
| 2 | `saju_master` | **(코드상 없음)** | yes | (seed 없음) | `/cmdg/` (seed는 `cmdg` 키로 존재) | `/cmdg/` |
| 3 | `lucky_color` | `lucky_color` | yes | listed | `/me/lucky` | `/me/lucky/04-step-4-report/index.html` |
| 4 | `love_this_year` | `love_this_year` | yes | listed | `/love/this-year` | `/love/this-year` |
| 5 | `job_choice` | `job_choice` | yes | listed | `/work/job-choice` | `/work/job-choice/04-step-4-report/index.html` |
| 6 | `quit_fortune` | `quit_fortune` | yes | listed | `/work/quit` | `/work/quit/04-step-4-report/index.html` |
| 7 | `money_save` | `money_save` | yes | listed | `/money/save` | `/money/save/04-step-4-report/index.html` |
| 8 | `cat_compatibility` | `cat_compatibility` | yes | listed | `/match/cat` | `/match/cat/04-step-4-report/index.html` |
| 9 | `match_couple` | `match_couple` | yes | listed | `/match/couple` | `/match/couple/04-step-4-report/index.html` |
| 10 | `marry_match` | `marry_match` | yes | listed | `/match/marry` | `/match/marry/04-step-4-report/index.html` |
| 11 | `couple_signal` | `couple_signal` | yes | listed | `/love/signal` | `/love/signal/04-step-4-report/index.html` |
| 12 | `pass_angle` | `pass_angle` | yes | listed | `/me/pass-angle` | `/me/pass-angle` |
| 13 | `work_move` | `work_move` | yes | listed | `/work/move` | `/work/move` |
| 14 | `work_job` | `work_job` | yes | **HIDDEN** | `/work/job` | `/work/job` |
| 15 | `love_mind` | `love_mind` | yes | **HIDDEN** | `/love/mind` | `/love/mind` |
| 16 | `love_again` | `love_again` | yes | **HIDDEN** | `/love/again` | `/love/again` |
| 17 | `love_spouse` | `love_spouse` | yes | **HIDDEN** | `/love/spouse` | `/love/spouse` |
| 18 | `home_fit` | **`home_pungsu`** | yes | listed | `/place/home` | `/place/home` |
| 19 | `newyear_flow` | `newyear_flow` | yes | listed | `/flow/newyear` | `/flow/newyear` |
| 20 | `wedding_day` | `wedding_day` | yes | listed | `/day/wedding` | `/day/wedding` |

### 3.1 개수 검산 (런타임 실측)

```
canonical prompt keys       : 20
services-manifest.json keys : 20
prompts/services/*.md       : 20
payment catalog keys        : 19   (today_fortune 무료 + saju_master는 cmdg로 판매)
directory seeds             : 19
directory hidden            : 4    (work_job, love_mind, love_again, love_spouse)
listServiceDirectory()      : 15   ← 런타임 반환값
prompt alias entries        : 5
```

`npm run check:service-contracts` → **통과**
(`20개 서비스 해석 계약 QA 통과: 20개 서비스 · 계약/프롬프트/코퍼스 도메인 확인`).
이 기존 검증기는 manifest ↔ `KNOWN_SERVICE_KEYS` ↔ `SERVICE_VOICE_CONTRACTS` ↔ 코퍼스 도메인을
검사한다. **결제 catalog와 directory는 검사 범위에 없다** — T02가 채운 공백이 여기다.

### 3.2 20종 누락 — 0건

- N1(20) = manifest(20) = 프롬프트 파일(20). 세 집합이 완전히 일치한다.
- N2(19)에 없는 canonical 2종은 설계상 정상이다:
  - `today_fortune` — 무료 서비스, 별도 경로 `/today/free/` (18-SERVICES와 일치)
  - `saju_master` — `cmdg` 상품으로 판매됨 (단 아래 4.1의 브리지 부재 문제)
- `assertServicePromptCoverage()`가 기동/CI 시 이 누락을 강제하고 있다.

## 4. alias 충돌 — 2건

### 4.1 [중대] `cmdg ↔ saju_master` 브리지가 코드에 없다

18-SERVICES는 `saju_master ｜ cmdg`로 매핑을 기재하지만, 코드에는 두 키를 잇는 alias가 없다.

런타임 실측:

```
normalizeServiceKey('cmdg')        -> 'cmdg'        (saju_master 아님)
loadServiceSystemPrompt('cmdg')    -> THROW: 서비스 프롬프트가 없습니다: cmdg.
                                             prompts/services/cmdg.md를 추가하세요.
serviceHrefForKey('saju_master')   -> undefined     (역방향도 끊김)
serviceHrefForKey('cmdg')          -> '/cmdg/'
```

즉 `cmdg`는 **결제·라우팅 네임스페이스에만** 존재하고, `saju_master`는 **프롬프트 네임스페이스에만**
존재한다. 두 축은 코드가 아니라 **관례로만** 연결되어 있다: `/cmdg/` 프런트가 serviceKey를
보내지 않으면 `normalizeServiceKey(undefined)`가 기본값 `saju_master`를 돌려주는 방식이다.

현재 사용자에게 노출되는 실패는 없다 — `POST /api/saju/analyze`(app.ts:2345)가
`suppliedKey && suppliedKey !== 'saju_master' && !context.serviceKey` 조건으로
`cmdg`를 **400으로 거절**하기 때문에 프롬프트 로더까지 도달하지 않는다.
(app.ts:699의 별개 `normalizeServiceKey`가 `cmdg`에 대해 `undefined`를 반환하므로
`context.serviceKey`가 채워지지 않아 위 조건이 성립한다.)

관리자 설계에 미치는 영향:
- 09-API의 `GET /services`, `POST /services/:key/drafts`가 **어느 네임스페이스의 key를 쓰는지**
  먼저 고정해야 한다. `paymentKey`를 URL 파라미터로 쓰면 `cmdg`가 들어오고,
  이 값을 프롬프트/코퍼스 조회에 그대로 넘기면 500이 된다.
- 06-SCREENS S02가 요구하는 "프롬프트·코퍼스 연결" 탭은 `canonicalKey ↔ paymentKey`
  변환을 **서버에서** 수행해야 한다.
- 권고: 관리자 도메인 모델에 `canonicalKey`를 **단일 식별자**로 두고
  `paymentKey`를 속성으로 매단다. 그리고 `SERVICE_KEY_ALIASES`에 `cmdg → saju_master`를
  추가해 브리지를 코드로 고정한다 (T22 범위, 이 Task에서 수정하지 않음).

### 4.2 `home` 계열 정규화 방향이 서로 반대다

```
prompt 축 : home_pungsu -> home_fit      (SERVICE_KEY_ALIASES)
             home        -> home_fit
directory : home_fit    -> home_pungsu   (serviceHrefForKey aliases)
             home        -> home_pungsu
```

같은 `home` 입력이 축에 따라 다른 canonical로 간다. 두 축 모두 `/place/home`으로
수렴하므로 현재 동작 오류는 없다 (`serviceHrefForKey('home_fit')`와
`serviceHrefForKey('home_pungsu')` 모두 `/place/home`). 다만 관리자에서 키를 하나로 다루면
어느 방향이 정본인지 모호해진다. 4.1의 권고(canonicalKey 단일 식별자)로 함께 해소된다.

### 4.3 키와 route의 네임스페이스가 다른 사례 (충돌은 아니나 주의)

| canonicalKey | route | 비고 |
| --- | --- | --- |
| `couple_signal` | `/love/signal` | route는 `love/signal`, 키는 `couple_signal` |
| `home_fit` / `home_pungsu` | `/place/home` | route는 `place/home` |
| `saju_master` / `cmdg` | `/cmdg/` | route는 상품코드 |
| `cat_compatibility` | `/match/cat` | |
| `lucky_color` | `/me/lucky` | |
| `pass_angle` | `/me/pass-angle` | |

→ 18-SERVICES의 경고("route 문자열이나 서비스명만으로 상품을 매칭하지 않는다")가
실제 코드에서 확인된다. 관리자 검색·연결은 반드시 키 기준으로 한다.

### 4.4 `returnPath ≠ landingPath` 8건

`job_choice`, `cat_compatibility`, `lucky_color`, `match_couple`, `marry_match`,
`couple_signal`, `quit_fortune`, `money_save` — 8종의 `returnPath`가
`…/04-step-4-report/index.html` 형태의 **플로우 중간 단계**를 가리킨다.
`catalog.ts` 주석이 이유를 밝힌다: "Step 04 is where the paid request resumes,
so the PG returns straight to it."

관리자 영향: 06-SCREENS S02의 `landingPath` 필드와 결제 `returnPath`를
**같은 값으로 취급하면 안 된다**. 서비스 상세 화면은 둘을 별도 필드로 보여주고,
발행 전 링크 검사도 둘을 각각 검증해야 한다.

## 5. hidden 자동 공개 — 없음 (수용 조건 충족)

`listServiceDirectory()`는 `if (seed.hidden) continue`로 4종을 제외하며,
런타임 반환값이 **15건**임을 확인했다. 자동 공개는 발생하지 않는다.

hidden 4종의 기존 결과 링크는 유지된다 (패키지 의도와 일치):

```
serviceHrefForKey('work_job')    -> /work/job
serviceHrefForKey('love_mind')   -> /love/mind
serviceHrefForKey('love_again')  -> /love/again
serviceHrefForKey('love_spouse') -> /love/spouse
```

## 6. [신규 발견] 노출과 판매가 분리되어 있고, 판매 게이트가 비어 있다

노출·판매를 통제하는 지점이 코드에 **4개** 있다.

| 게이트 | 위치 | 현재 값 | 통제 대상 |
| --- | --- | --- | --- |
| `SEEDS[].hidden` | `service-directory.ts` | 4종 true | `GET /api/services` 목록(discovery) |
| `PUBLICLY_DISABLED_PRODUCT_KEYS` | `app.ts:189` | **빈 Set** | `/api/payment/config` catalog + `POST /api/payment/orders` |
| `HOME_FIT_PUBLICLY_ENABLED` | `app.ts:188` | `true` | `/place/home` 라우트 + `/api/saju/analyze` home 키 |
| `/api/saju/analyze` 전용경로 가드 | `app.ts:2345` | 항상 활성 | 다른 서비스 키의 일반 해석 대체 차단 |

`PUBLICLY_DISABLED_PRODUCT_KEYS`가 비어 있으므로:

- `/api/payment/config`의 `catalog` 배열은 **19종 전부**를 반환한다
  (app.ts:1223의 필터가 빈 Set으로 아무것도 걸러내지 않는다).
- `POST /api/payment/orders`는 **hidden 4종의 productKey도 수락**한다
  (app.ts:1442의 차단 조건이 성립하지 않는다).

즉 **discovery 15종 / 판매 가능 19종**이다. hidden은 "목록에서 숨김"일 뿐
"판매 중단"이 아니다. URL을 아는 사용자는 hidden 4종을 새로 구매할 수 있다.

이것이 버그인지 정책인지는 코드만으로 판단할 수 없다. 패키지 18-SERVICES는 hidden 4종에
"기존 결과 링크 유지"라고만 적어 **신규 판매 여부를 명시하지 않는다**.
→ **사용자 결정 필요 항목(U10)** 으로 올린다.

06-SCREENS S02는 `availability`(판매)와 `discoveryVisibility`(노출)를 **별도 필드**로 요구한다.
현재 코드 구조가 이미 두 축으로 분리되어 있다는 점은 설계와 부합한다.
문제는 두 축이 **서로 다른 파일의 상수**라서 함께 바뀌지 않는다는 것이다.

## 7. [신규 발견] 서비스 노출·판매·가격이 전부 코드 상수다 — 운영-관리자 매칭 공백

사용자가 요청한 "운영과 관리자가 매칭되어 잘 구현되도록"의 출발점이다.
06-SCREENS S02가 관리자에서 편집하도록 요구하는 필드의 **현재 소유자**는 다음과 같다.

| S02 요구 필드 | 현재 저장 위치 | 변경 방법 | 관리자 연결 필요도 |
| --- | --- | --- | --- |
| `title` | `catalog.ts` products[].title | 코드 수정 + 재배포 | 높음 |
| `tagline` | `service-directory.ts` SEEDS[].tagline | 코드 수정 + 재배포 | 높음 |
| `summary` | `catalog.ts` products[].summary | 코드 수정 + 재배포 | 높음 |
| `category` | `service-directory.ts` SEEDS[].category | 코드 수정 + 재배포 | 중간 |
| `order` | SEEDS 배열 순서 | 코드 수정 + 재배포 | 중간 |
| `posterAssetId` | SEEDS[].image (문자열 경로) | 코드 수정 + 재배포 | 높음 (T23 미디어) |
| `videoAssetId` | 없음 | — | 신규 |
| `alt` | 없음 | — | 신규 |
| `landingPath` | SEEDS[].href | 코드 수정 + 재배포 | 중간 |
| `availability` (판매) | `PUBLICLY_DISABLED_PRODUCT_KEYS` (빈 Set) | 코드 수정 + 재배포 | 높음 |
| `discoveryVisibility` (노출) | `SEEDS[].hidden` | 코드 수정 + 재배포 | 높음 |
| `기준 가격` | `catalog.ts` products[].amount | 코드 수정 + 재배포 | 높음 |
| `effectiveAt` (예약) | 없음 | — | 신규 |
| `revision` | 없음 | — | 신규 |
| `발행 버전` | 없음 | — | 신규 |
| `품질 상태` | 없음 (평가 체계 미확인) | — | 신규 (T28) |
| `수정시각` | 없음 (git 이력만) | — | 신규 |

**결론: 현재 서비스의 제목·가격·노출·판매를 바꾸려면 코드 수정과 재배포가 필요하다.**
06-SCREENS S02가 요구하는 17개 필드 중 **10개는 코드 상수, 7개는 아예 존재하지 않는다.**
관리자에서 편집 가능한 필드는 0개다.

- 코드 상수 10개: `title`, `tagline`, `summary`, `category`, `order`, `posterAssetId`,
  `landingPath`, `availability`, `discoveryVisibility`, 기준 가격
- 부재 7개: `videoAssetId`, `alt`, `effectiveAt`, `revision`, 발행 버전, 품질 상태, 수정시각

> **정정 (Codex 리뷰 Major 3 반영):** 초판은 "12개 상수 / 5개 부재"로 적었다. 산술 오류였다.
> 같은 표를 다시 세면 10 + 7 = 17이 맞다. T22의 신규 필드 범위가 초판보다 2개 넓다.

이는 T22(서비스·콘텐츠 버전 저장)의 실제 작업 범위를 정의한다.
`06-SCREENS S02`의 "가격 변경은 신규 주문만 적용", "공개 숨김은 기존 구매권한 해제 안 함",
"판매 중단은 서버 신규 주문 생성에서도 검사"는 각각 다음 코드 지점에 대응한다:

| S02 요구 | 대응 코드 지점 | 현재 상태 |
| --- | --- | --- |
| 가격 변경은 신규 주문만 적용 | `app.ts:1470` 주변 order 생성 시 `product.amount` 스냅샷 | 주문 row에 amount를 기록하므로 **이미 충족** (T03에서 재확인) |
| 공개 숨김이 기존 권한 해제 안 함 | `serviceHrefForKey`가 hidden도 해석 | **이미 충족** |
| 판매 중단을 서버에서 검사 | `app.ts:1442` `PUBLICLY_DISABLED_PRODUCT_KEYS` | **메커니즘 존재, 값이 비어 있음** |
| 캐시된 옛 가격 재확인 | `getPaymentProduct(productKey)`로 서버가 다시 조회 | **이미 충족** (클라이언트 금액을 신뢰하지 않음) |

## 8. 18-SERVICES 표 행 단위 대조

20행 중 **19행 정확**, 1행 보완 필요.

| 패키지 행 | 판정 |
| --- | --- |
| `today_fortune ｜ 없음 ｜ /today/free/` | PASS |
| **`saju_master ｜ cmdg ｜ /cmdg/`** | **부분 확인됨** — 매핑 의도는 맞지만 코드에 브리지 없음 (§4.1) |
| `love_this_year`, `job_choice`, `quit_fortune`, `money_save`, `cat_compatibility`, `match_couple`, `marry_match`, `couple_signal`, `pass_angle`, `work_move`, `lucky_color`, `newyear_flow`, `wedding_day` | PASS (13행) |
| `work_job`, `love_mind`, `love_again`, `love_spouse` — `hidden=true` | PASS (4행) |
| `home_fit ｜ home_pungsu ｜ /place/home` | PASS |

패키지의 "discovery '후보'는 seed 존재이며 실제 공개 상태는 route guard·runtime config까지
대조한다"는 경고대로 대조했다. 결과: `HOME_FIT_PUBLICLY_ENABLED=true`이므로
`home_pungsu`의 listed 상태와 route guard가 **일치**한다. 불일치는 없다.
`data/runtime-config.json`은 서비스 노출과 무관한 파일이다(무료 자유대화 서비스 설정 +
리포트 모델 파라미터). 노출 통제에 쓰이지 않는다.

## 9. 검증 증거 — 성공·거절·실패 사례 (pack 요구)

| 구분 | 사례 | 결과 |
| --- | --- | --- |
| **성공** | `loadServiceSystemPrompt('saju_master')` | 정상 로드 |
| **성공** | `normalizeServiceKey('love_thisyear')` | `love_this_year` |
| **성공** | `normalizeServiceKey('home_pungsu')` | `home_fit` |
| **성공** | `normalizeServiceKey('today')` | `today_fortune` |
| **성공** | `listServiceDirectory()` | 15건 (hidden 4종 제외 확인) |
| **성공** | `npm run check:service-contracts` | 20종 계약 QA 통과 |
| **거절** | `POST /api/saju/analyze` with `serviceKey: 'cmdg'` | 400 "이 서비스는 전용 입력 경로에서 시작해 주세요." (app.ts:2345 조건, 코드 경로 분석) |
| **거절** | `POST /api/payment/orders` with 미등록 productKey | 400 "결제 상품을 확인해 주세요." (app.ts:1440) |
| **거절** | `POST /api/payment/orders` (checkout 미설정) | 503 `PAYMENT_NOT_CONFIGURED` (app.ts:1432, 로컬 실측 조건) |
| **성공(운영)** | `GET https://umsh.kr/api/services` | 15건. key·amount·href가 이 문서 §3 표와 완전 일치 |
| **성공(운영)** | `GET https://umsh.kr/api/payment/config` | catalog 19건(hidden 4종 포함), `storage=supabase`, `checkoutEnabled=false`, `testMode=false` |
| **실패** | `loadServiceSystemPrompt('cmdg')` | THROW `서비스 프롬프트가 없습니다: cmdg` (런타임 실측) |
| **실패(미발생)** | `serviceHrefForKey('saju_master')` | `undefined` — 예외 없이 링크 유실 |
| **실패(미발생)** | `serviceHrefForKey('today_fortune')` | `undefined` — 무료 서비스는 seed 없음 (설계상 정상) |

주의: `POST /api/saju/analyze`의 400 거절은 **코드 경로 분석**으로 판정했고
HTTP 요청으로 실측하지는 않았다. 실측이 필요하면 T04 또는 T09에서 회귀 케이스로 추가한다.

## 10. 미확인·결정 필요 항목

| ID | 내용 | 영향 | 해제 조건 |
| --- | --- | --- | --- |
| U10 | **hidden 4종의 신규 판매를 허용하는가?** discovery 15 / 판매 19 — **운영에서 실측 확인됨** | T22, 06-SCREENS S02 `availability` 정의 | 사용자/운영 정책 결정 |
| U11 | 관리자 도메인의 단일 서비스 식별자를 `canonicalKey`로 할 것인가 | T22, 09-API `/services/:key` 경로 규격 | ADR 결정 |
| ~~U1 / U7~~ | ~~이 표가 운영 현재값인지 미확인~~ | — | **해소** — 운영 = 이 HEAD로 실측 확인 (`production-source-of-truth.md`) |
| U13 | `origin/main` 20 커밋 미반영. 그쪽에도 `wedding_day` 독립 구현이 있어 이 매핑표와 다를 수 있다 | 병합 후 T02 재확인 필요 | 병합 Task |
| U12 | `serviceHrefForKey('saju_master')`가 undefined인 것이 실제 보관함에서 링크 유실을 일으키는가 | T10, T11 | 저장된 report의 `context.serviceKey` 실제 분포 확인 (T03) |

## 11. T02 수용 조건 대조

| 수용 조건 | 결과 |
| --- | --- |
| canonical/상품/프롬프트/route 매핑 산출 | 충족 — §3 20행 표 |
| 20종 누락 검출 | 충족 — 0건, 근거 §3.1/§3.2 |
| alias 충돌 검출 | 충족 — 2건 (§4.1 중대, §4.2) |
| hidden 자동 공개 없음 | 충족 — 런타임 15건 확인 (§5) |
| 검증 증거(성공·거절·실패) | 충족 — §9 |

## 12. 다음 ready task

**T03 (저장소 스키마·권한 조사)** — 선행 T01 충족. 경계: `order-store`, `report-store`, `profile-store`.
산출물: 타입·접근·영속성·마이그레이션 차이표. 수용 조건: `owner_id` 타입과 구형 payload fixture 확보.
T02에서 넘기는 확인 요청: U12(저장된 report의 `context.serviceKey` 실제 분포),
그리고 주문 row의 amount 스냅샷 여부(§7 표).
U1 라벨 조건은 해제되었으므로 T03은 운영 기준으로 진행할 수 있다.

## 13. Codex 리뷰 반영 (2026-09-10)

보고서: `CreamAI/logs/review/task-t02_admin-ops-t02-review.md` — Critical 0 / Major 3 / Minor 2. 전부 수용.

| 지적 | 반영 |
| --- | --- |
| Major 1 — "운영 == 로컬 HEAD"가 마커만으로 성립하지 않음 | **운영 `/api/services`·`/api/payment/config`를 새로 조회**해 T02 감사 표면을 직접 검증. 주장 범위를 축소하고 트리 전체 동일성은 U16으로 분리 (`production-source-of-truth.md` §1.3) |
| Major 2 — git 메타데이터 부재가 CLI 배포의 증거가 아님 | 가설로 하향, U14 유지 |
| Major 3 — S02 필드 개수 12/5는 오류 | **§7을 10/7로 정정**하고 각 항목을 나열. T22 신규 필드 범위가 2개 넓어짐 |
| Minor 1 — `merge-tree --write-tree`는 읽기 전용이 아님 | 문구 수정 |
| Minor 2 — add/add가 기능적 독립을 증명하지 않음 | "병렬 추가, 비교 필요"로 수정 |

반려한 지적: 없음.
