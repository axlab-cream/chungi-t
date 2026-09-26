요청 범위는 money_save 요약 이미지와 공유 캐시 버전 동기화 리뷰입니다. 관련 스킬·계약·git diff부터 확인하겠습니다.캐시 버전 동기화와 `summaryImage` 경로가 핵심입니다. 관련 소스·테스트·프롬프트부터 대조하겠습니다.문서 주장과 실제 폴백·캐시 버전을 대조합니다. 테스트와 이미지 경로, 미동기화 페이지를 확인하겠습니다.캐시 버전을 고정한 테스트가 남아 있는지, 이미지 자산과 누락된 HTML 참조를 확인하겠습니다.캐시 버전 누락 페이지와 깨진 테스트가 보입니다. 이미지 크기와 실제 테스트 결과까지 확인하겠습니다.직장 선택 테스트가 통과한 이유를 확인합니다. 정규식이 옛 버전 문자열을 부분 일치하는 건지 페이지에 잔여 문자열이 있는지 보겠습니다.테스트 파일이 리뷰 중에 바뀐 것 같습니다. 현재 diff와 캐시 버전 고정 테스트를 다시 확인합니다.# Review Report - money_save summary image

## 1. Scope
- Task id: `task-money-save-summary-20260926`
- Reviewed files: `사주/data/longform-blocks.json`, `사주/js/umsh-report-access.js`, `사주/money/save/assets/save/reading-v2/00-money-save-summary-v2.webp`, `tests/unit/all-service-reading-template.test.ts`, `tests/unit/job-choice-reading-visuals.test.ts`, `tests.md`, `status.md`, versioned `사주/**/*.html` cache bumps, plus unchanged portal/thumbnail surfaces (`사주/portal.html`, `src/server/service-directory.ts`, `사주/js/service-public-detail.js`)
- Review time: 2026-09-26T02:05:15Z
- KMS: `personal/carrotcap/notes/umsh-money-save-reader-20260923.md`

## 2. Verdict
- Changes requested
- Summary: 저장 리포트 요약만 `summaryImage`를 쓰고 메인 썸네일은 그대로인 구조는 맞다. `summaryImage`가 없는 서비스는 기존 `thumbnail || cutA`로 떨어진다. 다만 전용 21:9 파일이 아직 untracked라 현재 diff만 커밋하면 요약 이미지가 404가 된다. `tests.md`의 전수 캐시·QA 기록도 실제 검증 범위보다 넓게 적혀 있다.

## 3. Critical Issues
- None

## 4. Major Issues
- [`사주/data/longform-blocks.json:324`] Issue: `summaryImage`가 `/money/save/assets/save/reading-v2/00-money-save-summary-v2.webp`를 가리키는데, 해당 파일은 working tree에만 있고 git untracked다. `git diff`/`git commit -a`에는 포함되지 않는다.
- Risk: 설정만 올라가면 저장 리포트 요약 `<img>`가 운영에서 깨진다. 로컬 `existsSync` 테스트는 untracked 파일이 있어도 통과한다.
- Recommendation: 같은 커밋에 webp를 `git add`하고, 배포 산출물에 해당 경로가 실리는지 확인한다.

## 5. Minor Issues
- [`tests.md:1003`] Issue: MONEY-SUMMARY-04가 `2020개 서비스 QA`로 적혀 있다. `status.md:2343`은 `20개 서비스 QA`다.
- Risk: 검증 규모가 실제보다 100배처럼 읽힌다.
- Recommendation: `20개`로 고친다.

- [`tests.md:1002`] Issue: MONEY-SUMMARY-03은 “모든 참조 페이지가 동일 캐시 버전”을 집중 테스트 2/2로 PASS 처리한다. 실제로는 `all-service-reading-template.test.ts`가 저축운 요약 계약만, `job-choice-reading-visuals.test.ts:43`이 직장 선택 06-1 한 페이지의 `?v=20260926-money-summary-v2`만 고정한다.
- Risk: 버전 없는 페이지(`사주/me/pass-angle/06-step-6_1-report-detail/index.html:3`, `사주/me/lucky/06-step-6_1-report-detail/index.html:3`, `사주/flow/newyear/06-step-6_1-report-detail/index.html`)는 이번 동기화 밖인데도 전수로 읽힌다. 이전에 `?v=20260923-list-number-v1`이던 HTML에는 옛 토큰이 남아 있지 않다.
- Recommendation: 주장을 “기존 버전 쿼리를 쓰던 페이지”로 좁히거나, 전수 스캔 테스트를 추가한다.

## 6. Verification Gaps
- Gap: `summaryBlock` 렌더 결과를 실행해 `src`가 thumbnail이 아니라 `summaryImage`인지 확인하는 테스트가 없다. 정적 정규식만 있다 (`tests/unit/all-service-reading-template.test.ts:73`, `사주/js/umsh-report-access.js:418`).
- Suggested check: `summaryImage` 있음/없음 fixture로 `summaryImage || thumbnail || cutA` 분기를 단언한다.

- Gap: 로그인된 저축운 저장 리포트에서 21:9 `contain` 요약과 포털 카드가 갈라지는지 브라우저로 보지 못했다. MONEY-SUMMARY-05도 NOT_RUN이다.
- Suggested check: 권한 있는 06-1에서 요약 figure `src`와 `is-wide-summary`를 확인하고, 포털 카드는 `/assets/umsh-money-card-bg.png`인지 본다.

- Gap: `npm run check:save`는 라우트·목차 계약만 보고 `summaryImage`를 보지 않는다.
- Suggested check: `scripts/check-save.mjs`에 전용 자산 경로 존재 검사를 넣는다.

## 7. Final Recommendation
- Next action: 전용 webp를 커밋 대상에 넣고, `tests.md`의 2020/전수 캐시 문구를 실제 검증에 맞게 고친 뒤 재리뷰한다. 코드 분기·썸네일 분리·이미지 1536×658은 이 범위에서 추가 수정이 필요 없다.

## 8. Integration Resolution
- 신규 WebP를 같은 커밋 대상에 포함했다.
- `tests.md`의 `2020개` 오타를 `20개`로 수정했다.
- 캐시 쿼리를 사용하는 모든 HTML을 재귀 스캔해 단일 최신 버전인지 단언하는 회귀 테스트를 추가했다. 쿼리 없는 기존 참조는 이 검증의 범위에서 명시적으로 제외된다.
