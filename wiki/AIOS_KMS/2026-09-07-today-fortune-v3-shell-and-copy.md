# 오늘운 v3 — 공통 화면 복구와 읽을 가치가 있는 하루 해석

## ProjectOps — 목표와 현재 상태

- 기록일: 2026-09-07, Asia/Seoul.
- 작업 프로젝트: `C:\Users\user\Desktop\chungi-t`.
- 사용자 요청: 오늘운 결과의 GNB·하단 메뉴와 디자인을 공통 화면에 맞추고, 일·돈·관계·주의점에 방향과 실행 가이드를 충분히 담는다. 불필요한 문제를 만들어 불안을 자극하지 않으며, 결론은 명료하게 제시한다. 출생연도와 띠에 맞춘 짧은 해석도 제공한다.
- 관련 진입점: `/today/free?reportId=...`, `/cmdg/#todayResult`, `/r/{resultId}`.
- 최종 운영 런타임 커밋 **`8435068`**, 전체 테스트 **269개 / 28개 suite 통과(53.19초)**, 빌드·타입 검사 통과. 합성·운영 브라우저 검증도 완료했다.
- 최종 배포 [chungi-2khq56m31-ax-lab-cream.vercel.app](https://chungi-2khq56m31-ax-lab-cream.vercel.app)는 **Production READY·운영 승격 완료**다. 실제 포털·저장 리더 검증 중 발견한 초기 로딩 문구 보정까지 반영했다. 아래 최종 절에 실제 배포·운영 확인 결과를 기록한다.
- 기존 키를 유지한다. 이 작업은 새 API 키 발급·회전, DB 스키마 변경, 실제 결제 또는 고객 저장 해석의 덮어쓰기를 포함하지 않는다.
- 로컬 검증은 합성 사용자를 사용했다. 운영에서는 사용자가 로그인한 기존 계정의 오늘운 흐름을 확인했으며, 이 문서에는 키·토큰·실제 고객 입력·해석 본문을 기록하지 않는다.

선행 맥락: [오늘운 최초 연동](C:/Users/user/Desktop/chungi-t/wiki/AIOS_KMS/2026-08-31-umsh-user-profile-today-fortune.md), [해석 품질·결과 영속화](C:/Users/user/Desktop/chungi-t/wiki/AIOS_KMS/2026-09-07-interpretation-quality-and-result-persistence.md), [이전 운영 배포·DB 연결 검증](C:/Users/user/Desktop/chungi-t/wiki/AIOS_KMS/2026-09-07-production-deploy-db-verification.md). 이전 문서의 운영 성공은 이전 배포에 대한 기록이며 이번 v3의 배포 성공을 대신하지 않는다.

## Error — 확인된 문제

| 문제 | 원인 및 근거 |
|---|---|
| 저장된 오늘운 화면에 공통 GNB·하단 메뉴가 보이지 않고 별도 카드처럼 표시됨 | 검증 리더가 기존 앱을 숨긴 뒤 독립 본문을 생성했다. 공통 상단이 숨겨진 앱 안에 남거나 가드가 공통 메뉴까지 숨길 수 있었다. 저장 결과 본문과 공통 탐색 영역의 표시 책임이 분리되지 않았다. |
| 일부 페이지에서 공통 메뉴 중복 또는 기존 메뉴의 폭 불일치 위험 | 공통 쉘 스크립트의 쿼리 버전 URL을 별도 파일로 인식하면 중복 로딩될 수 있었다. 이미 마운트된 상단을 새 리더로 옮겼을 때 고정 하단의 페이지 폭 변수도 갱신해야 했다. |
| 오늘운 각 항목이 단문으로 끝나 활용 가치가 약함 | 이전 규칙은 항목별 한 문장이고, 요약에서 반복 면책 설명이 큰 비중을 차지했다. 사용자가 읽고 바로 적용할 우선순위·조건·행동이 충분히 이어지지 않았다. |
| 사용하지 않는 운세 문구와 실제 출력 사이의 의미 차이 | 기존 `DETAIL_HINTS`에는 상대 반응·성과 등을 단정하는 문구가 남아 있었지만 실제 출력에는 점수만 전달됐다. 사용하지 않는 문구를 개선된 해석으로 오해하지 않도록 제거해야 했다. |
| `/cmdg/#todayResult` 직접 진입과 저장 결과 주소가 일반 사주 경로로 취급될 위험 | 오늘운 장면·서비스 키와 URL의 `reportId`, `entry`, 해시 상태를 함께 유지해야 한다. `/today/free`의 저장 결과에 과거 입력 단계 해시가 남아도 잘못된 단계로 돌아가지 않도록 정규화가 필요했다. |
| 포털 미러 한쪽만 수정하면 실제 제공 화면에 변경이 누락됨 | Express의 `/cmdg/`는 `사주/사주/index.html`을 제공한다. `사주/cmdg/index.html`만 수정하는 것으로 운영 포털이 바뀐다고 가정하면 안 된다. 두 파일을 함께 수정·검증했다. |

## Fix — 화면과 결과 경계

### 공통 쉘을 유지하는 검증 리더

- 새 `#umsh-verified-layout`을 표시 컨테이너로 사용하고 `#umsh-verified-reading` 본문을 그 안에 배치한다.
- 이미 존재하는 `[data-umsh-service-top]` 호스트를 새 표시 컨테이너로 옮겨 재사용한다. `[data-umsh-service-bottom]`도 기존 호스트를 유지한다.
- 서버 확인 전후 가드는 예전 앱의 사적 본문을 계속 숨기되 공통 탐색 메뉴와 새 검증 리더까지 함께 숨기지 않는다.
- 계정 변경 시 저장된 해석을 지우고 재인증 안내로 전환한다. 공통 메뉴를 남기는 것을 이전 사용자의 본문을 다시 노출하는 예외로 구현하지 않는다.
- 공통 쉘 스크립트는 URL의 경로를 기준으로 인식하여 `/js/service-shell.js?v=...`도 기존 로딩으로 재사용한다. 메뉴 이벤트 중복 등록을 피한다.
- 공통 쉘 이동 시 실제 표시 컨테이너 폭으로 `--umsh-page-width`를 다시 설정한다. 리더 CSS 로드 후에도 마운트·치수 동기화가 실행되도록 한다.
- 오늘운 본문은 430px 이내의 공통 모바일 칼럼, 15px 본문과 넉넉한 행간, 구분된 항목 카드·띠별 카드·결론 카드로 표시한다. 고정 하단과 안전 영역에 필요한 본문 여백을 확보한다.

### 오늘운 경로의 정규화

- `/cmdg/`의 `entry=today` 또는 `#todayResult`를 오늘운 서비스로 구분한다.
- 저장 결과를 받은 뒤 `reportId`는 실제 저장 식별자로 유지한다. `/today/free`의 불필요한 입력 단계 해시와 `start`는 제거한다.
- 포털의 오늘운 장면 URL 동기화는 저장 `resultId`를 남기며, 특정 저장 ID를 요청한 경우 API에도 그 ID를 전달한다.
- `사주/사주/index.html`과 `사주/cmdg/index.html`의 오늘운 렌더러를 모두 보강했다. 포털의 기존 공통 쉘도 재사용하며 검증 리더가 이미 쉘을 소유하면 중복 마운트하지 않는다.

## Improvement — 규칙형 해석 v3

### 출력 계약

| 필드 | v3 규칙 |
|---|---|
| `reading.title` | 하루의 핵심 방향을 짧게 제시한다. |
| `reading.summary` | 사용자 이름과 오늘의 방향, 오늘 기운과 태어난 날 중심 기운의 관계를 설명한다. 오행 한자가 나오면 바로 쉬운 한국어 풀이를 붙인다. |
| `work`, `money`, `relationship`, `caution` | 각각 3문장·100자 이상. 방향 → 구체적 행동/확인 조건 → 이미 잘되는 상태의 유지 또는 불필요한 행동 방지를 포함한다. |
| `reading.action` | 결론 2문장. 무엇을 우선할지와 오늘 할 행동을 명확히 정하되 사건 발생·수익·상대 반응을 보장하지 않는다. |
| `reading.zodiac` | `{ birthYear, animal, title, text, basis: 'birth-year' }`. 출생연도 기준 띠와 2문장 안내. 기존 스냅샷에는 없는 선택 필드이며 과거 원문에 임의로 덧붙이지 않는다. |
| `reading.details` | 기존 소비자와의 호환을 위해 각 항목의 `text`를 유지한다. 사용하지 않는 `opportunity`·`caution` 단정 문구는 생성하지 않는다. |
| `reading.score` 및 `details.score` | 기존 클라이언트 호환용 고정 수치만 유지한다. `LEGACY_DISPLAY_WEIGHTS`라는 이름과 주석으로 목적을 명시하고 새 오늘운 화면에서는 점수로 표시하지 않는다. 실제 사건 확률이나 측정값이 아니다. |

- 오행 관계는 `same`, `support`, `output`, `wealth`, `pressure`의 실제 가능한 다섯 경우다. 도달할 수 없는 `balance` 예비 해석은 제거했다.
- 출생연도별 12개 안내와 오늘의 관계별 키워드를 조합한다. 이름·출생연도·사주 입력·KST 날짜를 사용하지만 실제 현재 문제가 발생했다는 사실을 만들어 내지 않는다.
- 띠 이름은 사용자가 입력한 출생연도 기준이다. 1월생을 입춘 이전이라는 이유로 전년도 띠로 몰래 바꾸지 않는다. 사주 연주 계산과 신문식 출생연도 띠 표기를 서로 다른 계약으로 구분한다.
- 이번 오늘운 생성에는 LLM 호출이 없다. 규칙 기반이므로 추가 모델 토큰 비용은 0이며, 기존 모델 키와 유료 해석 프롬프트를 바꾸지 않는다.

### 불변 결과와 새 규칙의 공존

```text
기존 v2 UUID 재조회 → 저장된 v2 원문 그대로 반환

새 오늘운 요청
  → 프로필 + 소유자 + KST 날짜 + daily-reading-v3로 내부 ID 결정
  → 기존 v3 기록이 있으면 재조회
  → 없으면 새 resultId(UUID)로 최초 스냅샷 저장
  → /r/{resultId}에서 같은 날짜의 같은 해석 재열기
```

- 내부 ID 네임스페이스: `daily-reading-v3`. 모델 메타데이터: `daily-rules-v3`.
- 기존 `daily-reading-v2` 기록을 같은 내부 ID로 덮어쓰는 마이그레이션은 하지 않는다.
- 같은 KST 날짜·프로필·소유자의 동시 요청은 최초 저장 결과로 수렴한다. 날짜·출생 입력·소유자가 달라지면 별도 결과가 된다.
- 기존 UUID 화면에는 새 공통 UI가 적용될 수 있지만 저장된 해석 문장을 보강된 문장으로 몰래 교체하지 않는다. 새 규칙의 해석은 새 오늘운 요청으로 만든다.

## Theory — 재사용할 설계 원칙

1. **표시 쉘과 사적 본문의 수명 분리:** 인증 상태가 바뀌어도 탐색 UI를 제공할 수 있다. 단, 이전 본문은 즉시 제거하고 서버에서 확인되지 않은 레거시 본문을 다시 보이면 안 된다.
2. **UI 재사용은 노드와 이벤트까지 포함:** 같은 모양의 HTML을 새로 만드는 대신 기존 공통 호스트·핸들러를 재사용한다. 버전 쿼리와 CSS 비동기 로드도 재마운트 조건에 포함한다.
3. **확신 있는 지침과 사실 단정의 구분:** 행동의 우선순위는 명료하게 말할 수 있다. 입력으로 확인되지 않은 위기·호재·타인의 반응을 단정하는 것은 별개이며 제거한다.
4. **규칙 버전은 결과 정체성의 일부:** 비용 없는 규칙형 풀이도 사용자가 저장·재조회하는 자산이다. 새 규칙을 이전 결과 ID에 덮어쓰지 않고 새 버전 식별자로 분리한다.
5. **단위 테스트와 시각 검증의 분리:** DOM 더블은 노드 소유권·스크립트 중복·가드 동작을 검증한다. 실제 폭·스크롤·겹침·고정 위치는 브라우저에서 따로 확인한다.

## Code Snippets — 최소 재사용 패턴

버전과 소유자를 포함한 날짜별 정체성:

```ts
const context = {
  serviceKey: 'today',
  name: profile.name,
  birthTimeKnown: profile.birthTimeKnown,
  concern: fortune.date.iso,
}
const reportId = createReportId(profile.birth, context, 'daily-reading-v3', owner.id)
```

출생연도 기준 띠 인덱스:

```ts
const index = ((birthYear - 4) % 12 + 12) % 12
// 0=쥐 … 11=돼지. 사주 연주의 입춘 경계와 별도인 UI 표기 계약.
```

표시 컨테이너 이동 후 고정 메뉴 폭 동기화:

```js
var stage = document.getElementById('umsh-verified-layout') || fallbackStage;
var columnWidth = Math.round(stage.getBoundingClientRect().width);
if (columnWidth > 0) {
  document.documentElement.style.setProperty('--umsh-page-width', columnWidth + 'px');
}
```

이 예시는 설계 핵심을 설명하는 축약이며 실제 구현은 아래 REG 참조 파일을 기준으로 한다.

## Success Case / Verification — 작성 시점까지 확보한 근거

| 검증 | 근거와 결과 |
|---|---|
| 오늘운 규칙·영속화 집중 회귀 | `today-fortune.test.ts` 5개 + `daily-report.test.ts` 3개, **8/8 통과**. 타입 검사 통과. |
| 날짜 경계·결정성 | KST 00:00부터 23:59:59.999까지 결과 동일, 다음 KST 날짜에서 날짜·일주 변경. |
| 내용 계약 | 다섯 관계 모두 도달, 항목별 3문장·100자 이상, 결론 2문장, 한자 설명, 반복 면책·확정적 위기/성과 문구 부재. |
| 출생연도 안내 | 12개 띠, 1월생의 출생연도 표기, 음력 입력 연도, 출생 시간 미상 보존. |
| 저장 불변성 | 동시 요청 결과 UUID·revision 1 일치, 재열기 시 본문·수정 시각 불변, 다른 소유자 차단, 날짜·프로필·소유자별 결과 분리, 기존 v2 UUID/본문 불변. 운영 DB를 쓰지 않는 격리된 메모리 테스트. |
| 중간 전체 회귀 | 공통 쉘·포털 신규 15개 테스트가 더해지기 전 **248개 통과**를 담당 작업에서 확인. 최종 전체 집계와 혼동하지 않는다. |
| 공통 쉘 신규 회귀 | 5개 테스트 통과: 숨겨진 앱의 기존 상단 이동, 호스트/스크립트 중복 방지, 버전 URL 재사용, 폭 변수 갱신, 계정 변경 시 본문 제거와 메뉴 유지. 최종 263개 집계에 포함. |
| 포털 신규 회귀 | 두 포털 × 5개 = 10개 테스트 통과: 인라인 스크립트 파싱, 읽기 UI·띠·결론·점수 제거, 쉘 재사용, HTML 이스케이프·기존 무띠 결과, 직접 진입·저장 ID URL 유지. 최종 263개 집계에 포함. |
| 실제 로컬 브라우저 | 담당 작업이 합성 결과로 공통 GNB·하단 메뉴 표시와 메뉴 클릭, 콘솔 오류 없음을 확인했다. 최종 375×812 화면에서 리더/하단 메뉴 폭 **360px/360px**, 데스크톱 **430px/430px**, 수평 넘침 없음, 화면 하단까지 스크롤해도 GNB 상단 좌표 **0** 유지. `/r/local-today-ui`에서도 같은 리더와 메뉴 정상 동작 확인. |
| 최종 독립 전체 회귀·빌드 | 런타임 커밋 `e9e0e12` 기준 **263개 / 28개 suite, 실패 0, 52.50초**. 공통 쉘·두 포털 신규 15개를 포함하며 `npm run vercel-build` 및 타입 검사 통과. |

로컬 합성 재현 도구: `npx tsx scripts/verify-today-ui.ts`. `127.0.0.1:8796`에서만 수신하며, API·DB 관련 환경변수를 비우고 서버 외부 요청을 차단한 합성 fixture를 제공한다. 고객 로그인·고객 DB 저장을 거치지 않으므로 운영 인증·DB 경로 성공으로 확대하지 않는다.

### 현재 경계 / 남은 확인

- 최종 운영 승격·운영 URL 화면 확인 및 직접 진입 초기의 오해를 부르는 실패 문구 보정까지 완료했다.
- 로컬 최종 테스트·빌드와 고정 하단 폭 검증은 위 결과로 완료했다. 이를 후보 또는 운영 배포 성공으로 대신하지 않는다.
- 운영에서 기존 UUID의 본문 유지 및 신규 v3 결과 저장·재조회·새로고침의 화면상 일치를 확인했다. DB 원문 해시를 이번 턴에 별도 SQL로 측정한 것은 아니며, 화면 증거와 격리된 저장소 회귀 테스트를 구분한다.
- 이 작업은 오늘운에 한정된다. 18종 유료 해석의 전체 실생성, 실결제·환불·정산, 전 서비스의 모든 화면 조합 검증은 포함하지 않는다.
- 상시 모니터링을 새로 설정하거나 운영 오류가 계속 없다고 보장하지 않는다. 로그 검사가 있으면 조회 구간과 범위를 명시한다.

## REG — 근거 파일과 재사용 경로

- 규칙형 풀이: [src/saju/today-fortune.ts](C:/Users/user/Desktop/chungi-t/src/saju/today-fortune.ts)
- 날짜별 불변 저장: [src/report/daily-report.ts](C:/Users/user/Desktop/chungi-t/src/report/daily-report.ts)
- 소유자·UUID·최초 저장 계약: [src/report/report-store.ts](C:/Users/user/Desktop/chungi-t/src/report/report-store.ts)
- 검증 리더·경로 가드: [사주/js/umsh-report-access.js](C:/Users/user/Desktop/chungi-t/사주/js/umsh-report-access.js)
- 공통 쉘 마운트: [사주/js/umsh-chrome.js](C:/Users/user/Desktop/chungi-t/사주/js/umsh-chrome.js)
- 공통 메뉴 원본: [사주/js/service-shell.js](C:/Users/user/Desktop/chungi-t/사주/js/service-shell.js)
- 검증 리더 레이아웃: [사주/css/umsh-verified-reader.css](C:/Users/user/Desktop/chungi-t/사주/css/umsh-verified-reader.css)
- 실제 `/cmdg/` 포털: [사주/사주/index.html](C:/Users/user/Desktop/chungi-t/사주/사주/index.html)
- 포털 미러: [사주/cmdg/index.html](C:/Users/user/Desktop/chungi-t/사주/cmdg/index.html)
- 오늘운 진입: [사주/today/free/index.html](C:/Users/user/Desktop/chungi-t/사주/today/free/index.html)
- 경로 매핑 근거: [src/server/app.ts](C:/Users/user/Desktop/chungi-t/src/server/app.ts)
- 해석 계약 테스트: [tests/unit/today-fortune.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/today-fortune.test.ts)
- 스냅샷 회귀: [tests/unit/daily-report.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/daily-report.test.ts)
- 소유권·프런트 가드 회귀: [tests/unit/report-access-frontend.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/report-access-frontend.test.ts)
- 공통 쉘 회귀: [tests/unit/verified-reader-shell.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/verified-reader-shell.test.ts)
- 두 포털 회귀: [tests/unit/today-portal-view.test.ts](C:/Users/user/Desktop/chungi-t/tests/unit/today-portal-view.test.ts)
- 격리된 시각 검증 fixture: [scripts/verify-today-ui.ts](C:/Users/user/Desktop/chungi-t/scripts/verify-today-ui.ts)

## 후속 최종 검증·운영 배포 기록

사전 검증 완료: `e9e0e12`, 263개 테스트 / 28개 suite 통과, 52.50초, 빌드·타입 검사 통과. 합성 리더의 375×812 및 데스크톱 공통 메뉴·폭·스크롤 검증 통과.

첫 운영 배포: [chungi-fq0xwu4o3-ax-lab-cream.vercel.app](https://chungi-fq0xwu4o3-ax-lab-cream.vercel.app), `dpl_FXMZ5ne2J1EnrYvZKB1ye5T2f2k9`, 커밋 `e9e0e12`, Production READY, Express/Node 24. 생성 16:21:37 KST, 원격 빌드 11초, 총 배포 41초. 후보의 실제 Supabase readiness 200을 확인한 후 운영 승격 성공.

- 후보 및 운영 `/api/health?storage=1`: `ok:true`, `reportStorage:{mode:supabase,ok:true,durable:true,keyKind:secret,httpStatus:200}`.
- 실제 `/cmdg/#todayResult`: 로그인된 계정의 v3 오늘운 생성·저장 성공, 공통 상단 및 하단 5개 메뉴, 띠별 카드와 확장 해석 표시.
- 신규 UUID `91db22a5-013d-4a6c-ae49-d97f9d4b5bdc`: 포털의 7개 해석 블록이 `/r/{id}` 본문에 모두 동일하게 존재(`sameInterpretation:true`). 새로고침 후 전체 표시 본문 동일(`sameAfterRefresh:true`).
- 기존 UUID `b9f45985-889c-49ca-a1d2-47124965af29`: 기존 제목·일·돈·관계·행동 원문 유지, 공통 메뉴 복구, 잘못된 입력 단계 해시 제거. 과거 원문의 짧은 풀이/요약을 새 내용으로 덮어쓰지 않는다.
- 기존 결과에서 **새 오늘운 확인**을 누르면 위 v3 UUID를 다시 사용하고 본문도 동일(`sameDailyId:true`, `sameReading:true`).
- 미인증 `/api/report/{신규 UUID}`: **401**, `Cache-Control:no-store, private` 확인(16:24 KST).
- 16:22 KST 이후 첫 v3 배포의 HTTP 500 로그 검사: **No logs found**. 전체 시간대·지속 모니터링 보장이 아니다. Drains 구성과 상시 모니터링은 이번 작업에서 확인·변경하지 않았다.
- 초기 직접 진입 중 인증 확인 전에 잘못된 실패 화면이 잠깐 나타나는 UX를 발견했다. 실제 생성은 성공했으며 이 문구 전환은 후속 보정·검증 대상으로 남겼다.

### 최종 보정판 — 완료

- **URL:** [chungi-2khq56m31-ax-lab-cream.vercel.app](https://chungi-2khq56m31-ax-lab-cream.vercel.app)
- **Target / Status:** Production / READY, `umsh.kr` 승격 및 inspect 매핑 확인.
- **Deployment / Commit:** `dpl_Bi73wnm5GSvQnTb96TfdXkG855a2` / `8435068`.
- **Framework / Duration:** Express·Node 24, 생성 16:25:42 KST, 원격 빌드 11초·총 배포 41초.
- **검증:** 후보 Supabase readiness 200 이후 승격. 전체 회귀 **269/269 통과**, 28 suites, 실패·취소·스킵 0, 53.19초. 포털 전용 회귀 16개 포함. 빌드·타입 검사 통과.
- **실제 화면:** `/cmdg/?reportId=91db22a5-013d-4a6c-ae49-d97f9d4b5bdc#todayResult` 첫 화면에 공통 상단·하단과 정상적인 준비 안내를 표시했다. 이후 같은 저장 결과를 정상 표시했고 7개 풀이 블록이 보정 전과 일치했다(`sameInterpretations:true`). 해당 검증 탭의 콘솔 error 목록은 빈 배열이었다.
- **관측 범위:** 최종 배포 16:26 KST부터 16:27:26 KST 검사 시점까지 HTTP 500 로그는 **No logs found**였다. Drains와 지속 모니터링은 확인·설정하지 않았다.
- **보존:** 기존 키·DB 스키마 변경 없음. 이 작업에서 삭제한 고객 데이터 없음. v3 확인 결과는 재조회할 수 있도록 보존.
