가입 혜택 팝업과 `umsh-chrome.js` 연동만 읽고, 캠페인 날짜·닫기·포커스·CTA 흐름을 코드 기준으로 확인하겠습니다.팝업 스크립트, 스타일, chrome 연동, 테스트를 이어서 읽고 KST·닫기·포커스·CTA 반환을 대조하겠습니다.크롬 연동 diff와 지금 파일 내용이 달라 보여서, 팝업 스크립트와 로더를 다시 읽고 인용 줄을 맞추겠습니다.# Review Report - signup-benefit-popup-20260922

## 1. Scope
- Task id: signup-benefit-popup-20260922
- Reviewed files: `사주/js/umsh-signup-benefit-popup.js`, `사주/css/umsh-signup-benefit-popup.css`, `사주/js/umsh-chrome.js` (popup loader only), `사주/사주/assets/signup-benefit-popup-2026-09-22.png`, `tests/unit/signup-benefit-popup.test.ts`. CTA 소비 확인을 위해 `사주/js/common-auth-return.js`, `사주/사주/index.html`, `사주/today/free/index.html`만 추가로 읽음. `umsh-chrome.js` diff 17줄은 팝업 로더뿐이며, 그 외 작업 트리 변경은 이 리뷰에 넣지 않음.
- Review time: 2026-09-22T05:20:24Z

## 2. Verdict
- Changes requested
- Summary: KST 캠페인 경계(`2026-09-22T00:00:00+09:00`–`2026-10-01T23:59:59.999+09:00`)와 로컬 7일(168시간) 숨김 저장은 코드상 맞다. 닫기·CTA·일주일 숨김은 접근 이름이 있다. 그러나 CTA가 여는 `/signup`과 가입 뒤 오늘운 화면이 같은 팝업을 다시 띄우고, `returnTo=/today/free?start=1`은 가입 화면이 읽지 않는다. 포커스 가두는 조건도 대화상자 밖으로 포커스가 나가면 동작하지 않는다.

## 3. Critical Issues
- [`사주/js/umsh-chrome.js:238`] [`사주/js/umsh-signup-benefit-popup.js:38`] Issue: `mount()`가 경로 없이 `loadSignupBenefitPopup()`을 호출하고, `show()`는 캠페인 기간·7일 숨김·중복 id만 본다. `/signup`과 `/cmdg/`는 `사주/사주/index.html:5`, `:7578`에서 같은 크롬을 올리고, `/today/free`도 `사주/today/free/index.html:154`에서 크롬을 올린다. 닫기(`:57`)는 저장하지 않고, 7일 저장은 숨김 버튼(`:85`)만 한다.
- Risk: CTA로 `/signup?entry=today&returnTo=...#login`에 도착해도 같은 `aria-modal`이 로그인 폼을 덮는다. 가입 후 `signupReturnUrl()`이 보내는 `/cmdg/?entry=today#loading`과 `/today/free`에서도 결과 위에 다시 뜬다. 사용자는 매 단계마다 투명 닫기 핫스팟을 찾아야 무료 오늘운으로 진행할 수 있다.
- Recommendation: `/signup`, `/cmdg/`, `/today/free`에서는 팝업을 올리지 말 것. CTA 클릭 시에는 세션 동안 재표시를 막는 값을 남길 것. 닫기(이번만)와 7일 숨김은 그대로 둘 것.

## 4. Major Issues
- [`사주/js/umsh-signup-benefit-popup.js:26`] [`사주/사주/index.html:3600`] Issue: CTA의 `returnTo`는 `/today/free?start=1`이다. 가입 문서는 `entry`만 읽고(`:3493`) `returnTo`는 읽지 않는다. Google·OAuth 복귀는 `signupReturnUrl()`(`:3600`, `:4348`, `:4378`)로 `/cmdg/?signupReturn=1&entry=today#loading`에 고정된다. `beginTodayAfterAuth()`(`:4075`)는 그 페이지의 `todayResult`에 머물며 `/today/free?start=1`로 보내지 않는다.
- Risk: 상태 기록과 CTA 계약(가입 뒤 `/today/free?start=1`)이 실행되지 않는다. 프로필이 없으면 `/today/free`의 `/profile?returnTo=/today/free?start=1` 대신 cmdg 이름 입력으로 빠진다. 오늘운 API는 cmdg 쪽에서도 호출되므로 완전 미실행은 아니다.
- Recommendation: 가입 완료 후 고정 경로 `/today/free?start=1`로 보낼 것. `returnTo`를 그때 해석한다면 `common-auth-return.js`의 동일 출처 경로 검사만 쓰고, 외부 URL은 거부할 것.
- [`사주/js/umsh-signup-benefit-popup.js:64`] Issue: Tab 순환은 `activeElement`가 첫 컨트롤이거나 마지막 컨트롤일 때만 막는다(`:75`). 초기 포커스는 닫기 버튼(`:96`)이지만, 이미지(대화상자 대부분)를 누르면 포커스가 `body`로 빠지고 그 다음 Tab은 페이지 첫 포커스 요소로 나간다. 배경에 `inert`도 없다.
- Risk: 키보드·스크린리더가 모달 밖으로 나간다. 뒤에 있는 로그인·결제 컨트롤을 조작할 수 있다.
- Recommendation: 배경을 `inert`로 두고, 포커스가 대화상자 밖이면 Tab을 막아 닫기 버튼으로 되돌릴 것.

## 5. Minor Issues
- [`사주/js/umsh-signup-benefit-popup.js:53`] Issue: 일주일 숨김은 누르자마자 닫히는데 `aria-pressed="false"`가 고정이다. 토글이 유지되지 않는다.
- Risk: 보조기기가 눌리지 않은 토글로 읽는다.
- Recommendation: `aria-pressed`를 빼거나, 실제 토글이 남아 있을 때만 쓸 것.
- [`사주/js/umsh-signup-benefit-popup.js:28`] [`사주/js/common-auth-return.js:65`] Issue: `show()`가 href를 만들 때 `commonLoginUrl()`을 호출한다. 그 함수는 URL을 만들기만 하지 않고 `sessionStorage`의 `umsh_common_auth_return_to_v1`에 `/today/free?start=1`을 바로 쓴다. `UMSHCommonAuth`가 있는 서비스 페이지에서 팝업이 뜨기만 해도 기존 복귀 경로가 바뀐다.
- Risk: 이후 빈 `returnTo`로 `resolveReturnTo()` / `oauthReturnUrl()`을 타는 로그인이 오늘운으로 샌다. 현재 저장 소비자는 `oauthReturnUrl()`뿐이고 다른 호출은 없다.
- Recommendation: 렌더 때는 `rememberReturnTo` 없이 쿼리만 만들고, 저장은 CTA 클릭 시에만 할 것.
- [`사주/js/umsh-signup-benefit-popup.js:13`] Issue: `setItem`이 실패해도 숨김 처리는 닫기만 하고 끝난다.
- Risk: 사생활 보호 모드에서는 일주일 숨김이 다음 방문에 남지 않는다.
- Recommendation: 저장 실패 시 숨김 약속을 완료로 처리하지 말 것.

## 6. Verification Gaps
- Gap: `tests/unit/signup-benefit-popup.test.ts`는 소스 문자열 3건만 본다. KST 경계, 만료 시각 비교, 포커스 이탈, `/signup`의 `returnTo` 무시, 도착 페이지 재표시는 통과한 채로 남을 수 있다. 기록된 브라우저 확인은 `/cmdg/` 표시·비율뿐이다.
- Suggested check: 캠페인 시작 1ms 전·종료 시각·종료 1ms 후, 그리고 숨김 만료 전후를 `campaignIsActive` / `isHiddenForThisWeek`로 실행할 것. 팝업 CTA 클릭 후 `/signup` 로그인 폼이 가려지지 않는지, 가입 완료 뒤 주소가 `/today/free?start=1`인지, 이미지 클릭 후 Tab이 페이지 내비게이션으로 나가지 않는지를 브라우저에서 확인할 것.

## 7. Final Recommendation
- Next action: 도착 페이지 재표시를 막고, 가입 완료가 `/today/free?start=1`로 이어지게 한 뒤, 포커스가 대화상자 안에 남는지 실행 테스트로 확인하고 다시 리뷰할 것. KST 기간과 168시간 로컬 숨김 수식은 유지해도 된다.