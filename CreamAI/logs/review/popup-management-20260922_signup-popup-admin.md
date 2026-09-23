팝업·콘텐츠 스토어·서버·관리자 셸의 변경분만 읽고, 공개 설정과 종료 시각 동작부터 대조하겠습니다.변경된 팝업·스토어·서버·관리자 셸을 기준으로, 공개 API가 기간 밖 캠페인과 잘못된 이미지 주소를 거르는지 확인합니다.# Review Report - popup-management-20260922

## 1. Scope
- Task id: popup-management-20260922
- Reviewed files: `src/marketing/signup-popup.ts`, `src/admin/content-store.ts`, `src/server/app.ts`, `admin-ui/index.html`, `사주/js/umsh-signup-benefit-popup.js`, `사주/js/umsh-chrome.js`, `사주/사주/index.html`, `사주/portal.html`, `tests/unit/signup-benefit-popup.test.ts`, `tests/unit/content-store.test.ts`, `tests/unit/admin-shell.test.ts`
- Review time: 2026-09-22T06:40:59Z

## 2. Verdict
- Changes requested
- Summary: 회원가입 CTA는 서버 `normalizeSignupPopupPayload`와 클라이언트 `signupHref()`가 모두 `/signup?entry=today&returnTo=/today/free?start=1#login`으로 고정되어 있다. 다만 레이어는 실제 첫 화면인 `/cmdg/`에 뜨지 않고, 공개 API는 기간이 끝난 게시본·즉시 내리기를 기본 캠페인으로 다시 채운다. 공개 응답은 `..` 이미지 경로와 따옴표가 들어 있는 `ctaLabel`을 막을 수 없다.

## 3. Critical Issues
- [사주/js/umsh-signup-benefit-popup.js:31] Issue: `isLandingPage()`가 `pathname === '/'` 또는 `'/index.html'`일 때만 참이고, `start()`(123행)는 그 경로에서만 `loadPopup()`을 호출한다. `src/server/app.ts:315`는 그 두 경로에 `사주/portal.html`을 보낸다. 포탈 스크립트는 `사주/portal.html:12`, `:472`, `:473`의 analytics·Supabase·`portal.js`뿐이며 `umsh-chrome.js`가 없다. 운명상회 첫 화면인 `/cmdg/`와 `/cmdg/index.html`은 `src/server/app.ts:803`에서 `사주/사주/index.html`을 보내고, 그 문서는 `사주/사주/index.html:5`에서 chrome을, `:3431`에서 `header.appbar`를 올린다. chrome이 `loadSignupBenefitPopup()`을 호출해도 경로가 `/cmdg/`라 `show()`가 바로 반환한다. `/signup`도 같은 HTML이라 동일하다.
- Risk: 가입 혜택 레이어가 포탈에도, 천명사주 첫 화면에도 나타나지 않는다. 관리자가 게시한 이미지·기간은 공개 화면에 도달하지 않는다.
- Recommendation: 레이어를 여는 경로를 `사주/사주/index.html`이 실제로 열리는 `/cmdg/`와 `/cmdg/index.html`에 맞춘다. `/`는 포탈이므로 chrome을 넣지 않는 한 게이트로 쓰면 안 된다. 경로를 문자열 포함 여부가 아니라 `location.pathname`으로 단언하는 테스트를 둔다.

- [src/server/app.ts:829] Issue: 조회가 성공해도 `getActiveSignupPopup()`이 `null`이면 기본 팝업 기간 안에서 `DEFAULT_SIGNUP_POPUP`을 200으로 보낸다. `src/admin/content-store.ts:213`은 시작 전·종료 후 게시본을 건너뛰고 `:218`에서 `null`을 반환한다. 저장소 예외와 같은 분기다. `admin-ui/index.html:1170`의 즉시 내리기는 게시본을 `archived`로 바꿔 같은 `null`을 만든다. 기본 종료 시각은 `src/marketing/signup-popup.ts:30`의 `2026-10-01T23:59:59.999+09:00`이다.
- Risk: 운영자가 종료 시각을 당기거나 즉시 내려도, 2026-10-01 23:59 KST 이전에는 기본 레이어가 다시 노출된다. 기간 밖 게시 내용은 응답에 없지만 팝업 자체는 내려가지 않는다.
- Recommendation: 저장소 조회가 성공하고 활성 게시본이 없으면 204를 반환한다. `DEFAULT_SIGNUP_POPUP`은 저장소를 쓸 수 없거나 조회가 throw 할 때만 사용한다. 기본 기간이 아직 유효한 시각에 종료·보관된 캠페인이 204가 되는지 라우트 테스트를 추가한다.

## 4. Major Issues
- [사주/js/umsh-signup-benefit-popup.js:75] Issue: `ctaLabel`을 이스케이프 없이 `aria-label="..."`에 이어 붙인다. `src/marketing/signup-popup.ts:43`은 `<>`만 거절하고 `"`는 허용한다. `content:publish` 직원이 `x" onfocus="alert(1)" autofocus=` 형태(80자 이하)를 게시하면 공개 JSON에 그대로 실리고, 첫 화면 `innerHTML`이 속성 밖으로 해석한다.
- Risk: 첫 화면을 연 방문자에게 저장된 HTML 주입이 실행된다. 이미지 `src`는 따옴표를 거절하지만 버튼 문구는 그렇지 않다.
- Recommendation: `ctaLabel`은 `setAttribute`로 넣거나 `"` `'`, `` ` ``, `&`를 저장 시점에 거절한다. 해당 문자열을 거절하는 단위 테스트를 추가한다.

- [src/marketing/signup-popup.ts:64] Issue: 이미지 허용식이 `/assets/` 뒤로 `.`과 `/`를 포함한다. `/assets/../secret.png`, `/assets/foo/../../bar.png`가 `SIGNUP_POPUP_PAYLOAD_INVALID` 없이 통과한다. `getActiveSignupPopup`(`src/admin/content-store.ts:211`)이 같은 함수로 다시 정규화하므로 공개 API가 그 주소를 내보내고, 클라이언트는 `:73`에서 `<img src>`에 넣는다. `https:`, `javascript:`는 기각된다.
- Risk: 공개 페이지가 `/assets/` 밖 같은 출처 경로를 이미지 요청으로 연다. 잘못된 이미지 주소를 공개 설정이 막지 못한다.
- Recommendation: 경로 세그먼트에 `..`와 빈 세그먼트를 거절하고, 확장자를 png·webp·jpe?g·gif·avif로 제한한다. `..`, 절대 URL, `javascript:` 거절 테스트를 추가한다.

- [사주/js/umsh-signup-benefit-popup.js:71] Issue: 공개 팝업에서 화면에 반영하는 운영 필드는 `imageSrc`와 링크 `aria-label`용 `ctaLabel`뿐이다. `title`, `headline`, `subheadline`, `body`는 저장·공개 JSON에는 있으나 대화상자 문구, `img alt`, 다이얼로그 `aria-label`(`:70`, `:73`)은 하드코드다. CTA는 빈 `<a>`라 `ctaLabel`도 보이지 않는다.
- Risk: 관리자 폼에서 문구만 바꿔 게시해도 방문자는 이미지에 구워진 이전 문구를 본다. 스크린리더도 게시본이 아닌 고정 대체 텍스트를 읽는다.
- Recommendation: 게시된 문구를 대체 텍스트와 대화 라벨에 반영하거나, 이미지 전용이라는 점을 관리자 화면에 밝히고 반영되지 않는 입력은 제거한다.

## 5. Minor Issues
- [src/server/app.ts:2571] Issue: `CONTENT_FAILURES`에 `SIGNUP_POPUP_PAYLOAD_INVALID`, `SIGNUP_POPUP_PERIOD_INVALID`가 없다. `respondContentFailure`(`:2584`)는 알 수 없는 코드를 500과 `요청을 처리하지 못했습니다.`로 바꾼다. 초안 insert 전에 throw되므로 잘못된 값은 저장되지 않는다.
- Risk: 경로·기간 오류가 저장소 장애처럼 보인다. 관리자는 수정할 필드를 알 수 없다.
- Recommendation: 두 코드를 422로 매핑하고, 이미지 경로와 종료 시각을 구분한 메시지를 반환한다.

- [src/server/app.ts:830] Issue: `/api` 미들웨어(`:283`)가 `private, no-store`를 붙인 뒤, 이 라우트가 `public, max-age=60, s-maxage=60`으로 덮어쓴다. 클라이언트 fetch는 `cache: 'no-store'`이지만 공유 캐시는 응답을 60초 보관할 수 있다.
- Risk: 종료 시각 이후에도 최대 60초 동안 이전 200 응답이 레이어를 유지할 수 있다.
- Recommendation: 이 응답은 `private, no-store`로 둔다.

## 6. Verification Gaps
- Gap: `tests/unit/signup-benefit-popup.test.ts:19`는 `path === '/' || path === '/index.html'` 문자열만 확인한다. `/cmdg/`에서 레이어가 열리는지, `/` 포탈에 스크립트가 없는지는 검사하지 않는다.
- Suggested check: `location.pathname`이 `/cmdg/`, `/cmdg/index.html`, `/`, `/signup`일 때 `isLandingPage()`와 실제 마운트 결과를 단언한다.

- Gap: `tests/unit/content-store.test.ts:139`는 종료 후 `getActiveSignupPopup`이 `null`인지만 본다. `src/server/app.ts:829`의 기본 팝업 치환, 보관 후 204, 잘못된 이미지·`ctaLabel`은 없다. `tests/unit/admin-shell.test.ts:274`는 `loadPopupManager`와 placement 문자열만 본다.
- Suggested check: 기본 기간 도중인 시각에 종료된 게시본과 archived 게시본이 공개 라우트에서 204인지, `/assets/../x.png`와 따옴표 `ctaLabel`이 422로 거절되는지 라우트 테스트를 추가한다.

## 7. Final Recommendation
- Next action: 공개 전에 레이어 경로를 `/cmdg/`로 고치고, 조회 성공 시 활성 게시본이 없으면 기본 팝업으로 대체하지 않는다. 이어서 `ctaLabel` 속성 주입과 `/assets/..` 경로를 거절한 뒤, 위 두 테스트를 통과시키기 전에는 종료 시각 자동 내림과 첫 화면 노출을 완료로 보지 않는다.