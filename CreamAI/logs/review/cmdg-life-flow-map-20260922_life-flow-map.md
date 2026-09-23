리뷰 범위는 cmdg 장문 인생 흐름 지도의 로컬 design-review 추가분으로 한정하고, 변경 파일과 검증 흔적부터 확인하겠습니다.검토 대상은 격리된 로컬 화면의 인생 흐름 지도 추가분입니다. 구현과 기존 additional-context 패턴을 대조하겠습니다.# Review Report - cmdg longform life-flow map

## 1. Scope
- Task id: cmdg-life-flow-map-20260922
- Reviewed files: `design-workspace/actual-service-pages/review/cmdg-longform-review.js`, `design-workspace/actual-service-pages/review/cmdg-longform.css`, `design-workspace/actual-service-pages/review/cmdg-longform.html`, `design-workspace/actual-service-pages/review/cmdg-life-flow-map-prd-20260922.md`, `design-workspace/actual-service-pages/site/css/service-shell.css`, `design-workspace/actual-service-pages/site/css/umsh-verified-reader.css`, `tests/unit/cmdg-longform-review.test.ts`
- Review time: 2026-09-22T06:04:14Z

## 2. Verdict
- Changes requested
- Summary: 차단할 데이터 손실·저장·API 결함은 없다. 삼재 칸은 `계산값 미연결`로 남고, 나이 축·미래 곡선·삼재 해당 여부는 만들지 않는다. 다만 분야 별칭이 채워지는 막대와 함께 운세 게이지로 읽히고, 카드 이동은 sticky 상단바 아래로 제목을 보낸다. 이 두 항목을 고치기 전에는 안전 문구와 이동 기준을 충족했다고 볼 수 없다.

## 3. Critical Issues
- 없음. `cmdg-longform-review.js`의 삼재 값은 `계산값 미연결`이고, 출생 연도·해당 기간·해당 여부를 채운 결과는 없다. 같은 파일에 `fetch`, `localStorage`, `sessionStorage`, `indexedDB`, cookie 기록이 없다. 입력은 기존 `additionalContext` 메모리 객체를 `updateAdditionalContext`에서 읽고, `updateLifeFlowMap`이 그 값을 막대에 반영한다.

## 4. Major Issues
- [design-workspace/actual-service-pages/review/cmdg-longform-review.js:309] Issue: 분야 헤더에 `재물운`, `직장운`, `연애운`이 올라간다. 같은 카드의 막대 너비는 `cmdg-longform-review.js:445`에서 `Math.round((complete / fields.length) * 100)`이고, `cmdg-longform.css:153`이 그 비율로 금색 막대를 채운다. 저장 리포트의 운세 점수는 아니며 화면 문구는 확인 항목 수다. 운 이름과 채워지는 막대가 한 헤더에 있어 재물·직장·연애 점수로 읽힌다.
- Risk: 검토본이 지키려는 “운세 점수·확률·사건 예측을 만들지 않는다”는 기준이 화면에서 약해진다. 이 별칭이 남으면 이후 회원별 그래프가 입력 완성도를 운세 결과로 오인하기 쉽다.
- Recommendation: 별칭을 빼거나 `확인 완성도`처럼 입력 상태를 말하는 말로 바꾼다. 막대 옆에는 운 이름을 두지 않는다.

- [design-workspace/actual-service-pages/review/cmdg-longform-review.js:506] Issue: 이동 버튼이 `scrollIntoView({ behavior: 'smooth', block: 'start' })`로 `.reading-card` 상단을 스크롤포트 맨 위에 둔다. `service-shell.css:43`과 `service-shell.css:157`의 상단 셸은 `position: sticky; top: 0`이다. 로고 높이는 `service-shell.css:197`의 50px이고, 앱바 패딩은 `service-shell.css:72`의 21px 12px이며, 검토 CSS `cmdg-longform.css:35`가 셸에 10px 패딩을 더한다. `.reading-card > summary`는 `umsh-verified-reader.css:48`에서 `min-height: 44px`, `padding: 20px 2px`이다. `scroll-margin-top`은 없다.
- Risk: 카드는 열리지만 포커스가 가는 `summary`가 상단바 아래에 가려진다. 375px에서는 제목 한 줄이 셸 높이보다 낮아 이동 결과가 보이지 않을 수 있다.
- Recommendation: 카드에 상단 셸 높이 이상의 `scroll-margin-top`을 주거나, 스크롤 위치를 셸 높이만큼 아래로 잡는다. 데스크톱과 375px에서 이동 후 제목과 포커스 링이 셸 밖에 보이는지 확인한다.

## 5. Minor Issues
- [design-workspace/actual-service-pages/review/cmdg-longform-review.js:506] Issue: `prefers-reduced-motion` 처리는 `cmdg-longform.css:310`에서 버튼의 `transition`만 끈다. 그 버튼의 기본 규칙에는 `transition`이 없다. 실제 움직임은 `scrollIntoView`의 `behavior: 'smooth'`이다.
- Risk: 동작 줄이기 설정이 카드 이동의 스크롤에 적용되지 않는다. 테스트는 CSS 문자열만 확인해 이 공백을 통과시킨다.
- Recommendation: `prefers-reduced-motion: reduce`일 때 `behavior: 'auto'`를 쓴다.

- [design-workspace/actual-service-pages/review/cmdg-longform-review.js:470] Issue: 미연결 스타일 `is-unavailable`가 삼재 값이 아니라 배열의 세 번째 칸(`index === 2`)에 붙는다. 현재 데이터에서는 그 칸이 삼재라 표시는 맞다.
- Risk: 층 순서가 바뀌면 다른 층이 점선 처리되고 삼재는 연결된 층처럼 보인다.
- Recommendation: 미연결 여부를 층 데이터에 두고, 그 값으로 클래스를 준다.

## 6. Verification Gaps
- Gap: `tests/unit/cmdg-longform-review.test.ts:81`은 소스 문자열 8개 중 마지막 검사다. 이 리뷰에서 `node --test tests/unit/cmdg-longform-review.test.ts`는 8/8 통과했고, `node --check`도 통과했다. 테스트는 DOM을 만들지 않아 막대 비율, 별칭, 삼재 문구, 이동 후 제목 가시성, reduced-motion 동작을 실행하지 않는다. `prefers-reduced-motion` 문자열만 있어도 통과한다.
- Suggested check: 검토 HTML을 열어 초기 문구(`경진 대운`, `2026년 병오`, `계산값 미연결`, `확인한 항목 0/3·0/6·0/3`)를 읽고, 직장 6칸 입력 후 해당 막대만 `6/6`이 되는지, 다른 분야는 그대로인지 확인한다. 이어서 세 이동 버튼을 데스크톱과 375px에서 눌러 열린 카드의 `summary`가 sticky 상단바 밖에 있는지 본다. `prefers-reduced-motion: reduce`에서 스크롤이 즉시 이동하는지도 본다.

- Gap: 이 리뷰는 브라우저를 다시 열지 않았다. `status.md`의 데스크톱·375px 확인 기록은 이동 후 제목이 상단바에 가리는지까지 적고 있지 않다.
- Suggested check: 위 DOM 시나리오를 브라우저에서 한 번 재실행한다.

## 7. Final Recommendation
- Next action: 별칭 제거와 이동 스크롤 오프셋을 반영한 뒤 위 브라우저 확인을 다시 돌린다. 그 전에는 이 검토본을 안전 기준 통과로 두지 않는다. 운영 데이터 계약 전에 남을 위험은 다음과 같다. `lifeFlowProfile`은 이 저장본의 `경진 대운`과 `2026년 병오`에 고정되어 있다. 회원별 화면은 리포트마다 계산된 대운·세운·삼재 원자료가 있을 때만 같은 레일을 채워야 하고, 삼재 원자료가 없으면 `계산값 미연결`을 유지해야 한다. 분야 막대는 입력 완성도이므로 운세 점수·확률·사건 시점으로 바꾸면 안 된다. 현재 입력은 탭 메모리에만 있으므로 저장·권한·삭제 정책은 아직 없으며, 그 정책 없이 서버에 옮기면 안 된다.