ADMIN-DATA-01 리뷰를 시작합니다. git diff와 관련 코드만 읽고, 구현은 하지 않습니다.변경 diff와 팝업 검증·히스토리·analytics 관련 코드를 대조해 결함을 확인합니다.핵심 검증 경로와 기본값·에러 매핑을 파일 단위로 대조합니다.커밋된 테스트와 422 매핑 경로를 실행해, 검증 공백이 실제인지 확인합니다.테스트 파일이 리뷰 중에 더 바뀐 것 같습니다. 현재 diff를 다시 읽습니다.diff가 늘어났습니다. 팝업 폴백·공개 API·콘텐츠 스토어 변경을 다시 대조합니다.# Review Report - ADMIN-DATA-01

## 1. Scope
- Task id: ADMIN-DATA-01
- Reviewed files: `admin-ui/index.html`, `src/admin/content-store.ts`, `src/server/app.ts`, `사주/js/umsh-signup-benefit-popup.js`, `tests/unit/content-store.test.ts`, `tests/unit/admin-popup-repair.test.ts` (untracked), `status.md`, `tests.md`, `plan.md`, `ROADMAP.md`
- Review time: 2026-10-01T08:47:38Z

## 2. Verdict
- Approved with comments
- Summary: 기본 폼 `body`→`bodyText` 매핑, `SIGNUP_POPUP_*` 422 매핑, 팝업 이력 `includeArchived`+placement, 퍼널 `available !== true` 가드, 내린 캠페인의 builtin 재노출 차단은 의도에 맞다. `NODE_ENV=test`에서 집중 테스트 17/17 PASS. 이력 조회 실패가 게시 버튼을 잠그고, archived 포함 목록의 `items[0]`이 편집 폼을 채우며, 커밋 diff에는 기본 폼/422/unavailable UI 테스트가 없다.

## 3. Critical Issues
- 없음. 빈 설명은 더 이상 설명 없는 500으로 가지 않고, 공개 캠페인을 테스트로 게시하는 코드도 없다.

## 4. Major Issues
- [admin-ui/index.html:1175] Issue: `includeArchived=1` 이후 목록은 `updated_at.desc`라 `items[0]`이 보관본일 수 있다. 같은 블록이 그 행의 payload로 저장 폼을 덮는다. 게시본이 남아 있어도 최근 보관한 초안/이전 캠페인 문구가 편집 값이 된다.
- Risk: 운영자가 현재 노출 중이 아닌 보관본을 다시 게시할 수 있다.
- Recommendation: 폼 채움은 `state === 'published'`(없으면 최신 draft)만 쓰고, archived는 이력 테이블에만 쓴다.

- [admin-ui/index.html:1194] Issue: 이력 조회·렌더 `catch`가 `button[type="submit"]`을 잠근다. 퍼널 실패는 안쪽 `catch`로 분리돼 있으나, `item.payload.title` 접근(1188) 등 이력 렌더 예외도 저장·게시를 막는다.
- Risk: 저장소 쓰기와 무관한 이력/행 오류 때문에 첫 팝업을 올리지 못한다. 조회 실패 안내와 게시 가능 여부가 한 묶음이다.
- Recommendation: 이력 실패는 목록 문구만 바꾸고, 제출 잠금은 `versionStore !== 'ready'`처럼 쓰기가 불가능한 경우에만 적용한다.

## 5. Minor Issues
- [admin-ui/index.html:1152] Issue: 기본 시작/종료가 `2026-09-22T00:00` / `2026-10-01T23:59`로 고정이다. 매핑 수정 후 기본값 제출이 통과하므로, 리뷰 시점 당일 종료 캠페인이 바로 게시된다.
- Risk: 저장은 성공하고 공개 화면은 당일 23:59 이후 `기간 종료`로 비어 보인다.
- Recommendation: 기본 종료를 저장 시각 기준 앞으로 두거나, 종료가 과거면 제출 전에 막는다.

- [src/admin/content-store.ts:206] Issue: `useDefaultWhenUnmanaged`일 때 `state=in.(published,archived)`이고 `limit`이 없다.
- Risk: 보관 이력이 늘면 공개 GET이 archived 전량을 읽는다.
- Recommendation: published 우선 조회 후, 0건일 때만 archived 존재 여부(`limit=1`)를 본다.

- [src/server/app.ts:2614] Issue: 잘못된 `placement`는 `normalizePlacement`이 `CONTENT_PLACEMENT_INVALID`를 던지고 GET `catch`가 503 `CONTENT_LOOKUP_FAILED`로 바꾼다.
- Risk: 팝업 UI는 고정 placement라 실사용 영향은 작다. 쿼리 오류가 저장소 장애로 보인다.
- Recommendation: 해당 코드는 422로 매핑한다.

- [admin-ui/index.html:1078] Issue: 일반 콘텐츠 목록은 `versionStore !== 'ready'`여도 `등록된 실제 콘텐츠 초안·게시본이 없습니다`를 같이 그린다. 이번 diff 밖이지만 같은 거짓말 패턴이다.
- Risk: 팝업 화면만 고치면 콘텐츠 메뉴는 여전히 빈 저장과 조회 실패를 구분하지 못한다.
- Recommendation: 팝업과 같이 `versionStore !== 'ready'`면 빈 목록 문장을 쓰지 않는다.

## 6. Verification Gaps
- Gap: 기본 폼→`normalizeSignupPopupPayload`, 422 매핑, `available !== true` 가드는 `tests/unit/admin-popup-repair.test.ts`에만 있고 이 파일은 untracked다. 현재 git diff의 `content-store.test.ts`는 이력 필터/builtin 재노출만 본다. GET 목업(31–37)은 `placement`를 적용하지 않아 URL 파라미터만 단언한다.
- Suggested check: 해당 테스트 파일을 커밋하고, 목업에 `placement=eq.` 필터를 넣는다. Express POST로 빈 `body`가 422, 유효 payload가 202인지 라우트 테스트를 남긴다.

- Gap: `tests.md`는 Express 생명주기(422→202→200→204)와 브라우저에서 보관됨 표시, 집중 45/45를 적는다. 첨부 스크린샷은 게시 성공·`집계 불가`·`노출 중`만 보여 보관 이력/`보관됨`은 확인되지 않는다. `status.md`의 집중 17/17과 불일치한다.
- Suggested check: 즉시 내리기 후 이력이 `보관됨`이고 공개 GET이 204인지 스크린샷/로그를 남긴다. 커밋 범위의 테스트 개수를 `tests.md`와 맞춘다.

- Gap: 계획의 관리자 메뉴 22개 가드는 팝업·퍼널만 코드가 바뀌었다. `docs/admin-menu-audit-20261001.json`은 운영 UI 읽기 기록이다.
- Suggested check: 콘텐츠 목록처럼 `versionStore`/`available`이 false인데 0건 문구를 그리는 로더를 코드에서 한 번 더 대조한다.

## 7. Final Recommendation
- Next action: `items[0]` 폼 채움과 이력 실패 시 submit 잠금을 고치고, untracked `admin-popup-repair.test.ts`를 커밋한 뒤 422 HTTP와 archived 이력 UI를 확인하면 이 슬라이스는 통과로 보면 된다. 공개 builtin 재노출 차단과 퍼널 0건 가드는 유지한다.