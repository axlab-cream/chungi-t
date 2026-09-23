리뷰 범위의 변경과 관련 테스트를 읽기 전용으로 대조하겠습니다. 구현은 하지 않습니다.범위 파일의 diff와 렌더·삼재 계산 경로를 대조합니다.주석 처리된 블루프린트가 있어, 이미지 인덱스가 실제 활성 섹션 순서와 맞는지 다시 세겠습니다.# Review Report - cmdg-production-template-20260922

## 1. Scope
- Task id: cmdg-production-template-20260922
- Reviewed files: `src/report/report-generator.ts`, `src/saju/fortune-cycle.ts`, `src/types/index.ts`, `사주/js/umsh-report-access.js`, `사주/css/umsh-verified-reader.css`, `사주/사주/assets/cmdg-review/*`, `tests/unit/saju-analyzer.test.ts`, `tests/unit/report-access-frontend.test.ts`, `tests/unit/saju-master-visual-contract.test.ts`. 호출 경로는 `src/server/app.ts`, `src/server/service-directory.ts`, `사주/cmdg/06-step-6_1-report-detail/index.html`, `사주/css/umsh-verified-inplace.css`.
- 리뷰 시점: 2026-09-22T07:22:24Z

## 2. Verdict
- Changes requested
- Summary: 회원 원문을 다른 리포트에 복사하지 않고, 16개 공용 썸네일은 정적 원본 `사주/사주/assets/cmdg-review`에 있으며 브라우저 삼재 재계산은 없습니다. 다만 대운·현실 기준 블록이 천명사주 밖으로 퍼지고, 보관함이 실제로 여는 천명사주 상세 화면에는 그 블록 스타일이 적용되지 않습니다.

## 3. Critical Issues
- 없음.

## 4. Major Issues
- [사주/js/umsh-report-access.js:434] `lifeFlowHtml`이 서비스 키를 보지 않습니다. `renderReportInPlace`가 `mountLifeFlow`를 모든 inplace 상세에 호출하고(`1091`), 공용 리더도 `showReport`에서 같은 HTML을 붙입니다(`1300`). `GET /api/report/:id`는 서비스와 무관하게 `memberContext`를 싣습니다(`src/server/app.ts:4702`).
- Risk: 대운 배열이 있는 퇴사운·올해운·직업 등 저장 리포트에도 "나의 대운 흐름"과 회원의 일·재물·관계·계획 문장이 나타납니다. 이미지 교체만 `saju_master`로 제한되어 있습니다(`사주/js/umsh-report-access.js:39`, `src/report/report-generator.ts:1978`).
- Recommendation: 대운 타임라인과 `memberContext` 렌더를 `saju_master`로 제한하세요. 다른 서비스 페이로드에서는 두 블록이 없다는 회귀 테스트를 추가하세요.

- [사주/css/umsh-verified-reader.css:76] 새 대운·삼재·현실 기준 규칙은 모두 `#umsh-verified-reading` 아래입니다. 천명사주 보관함은 `savedReadingHref`가 `/cmdg/06-step-6_1-report-detail/`를 엽니다(`src/server/service-directory.ts:189`). 그 페이지는 `data-umsh-verified-inplace`이고(`사주/cmdg/06-step-6_1-report-detail/index.html:2`) `ensureInPlaceStyles`는 `umsh-verified-inplace.css`만 로드합니다(`사주/js/umsh-report-access.js:841`). `umsh-verified-inplace.css`에는 `.umsh-life-flow` 규칙이 없습니다.
- Risk: 저장 리포트를 여는 운영 화면에서는 타임라인 HTML만 들어가고, 검토본과 같은 카드·현재 구간·인쇄 배색은 적용되지 않습니다. 공용 `/r/:id` 리더만 스타일이 맞습니다. 추가된 프런트 테스트는 `#umsh-verified-reading`만 검사합니다.
- Recommendation: 대운 블록 스타일을 inplace 상세와 인쇄 경로에도 적용하세요. 천명사주 06 상세 DOM에서 타임라인 클래스와 스타일시트 연결을 검증하세요.

## 5. Minor Issues
- [src/report/report-generator.ts:1979] 신규 리포트 이미지는 섹션 id가 아니라 활성 blueprint 인덱스입니다. 저장 리포트 표시는 id 맵입니다(`사주/js/umsh-report-access.js:20`). 지금 활성 16개 순서는 두 맵과 같습니다.
- Risk: 중간에 보류된 blueprint가 다시 켜지면 저장되는 `imageSrc`만 밀립니다. id 맵에 없는 섹션은 클라이언트 보정 없이 잘못된 썸네일을 유지합니다.
- Recommendation: 생성기도 `CMDG_TEMPLATE_IMAGES`와 같은 id로 경로를 정하고, 16개 id와 파일명이 양쪽에서 같다는 테스트를 두세요.

- [src/saju/fortune-cycle.ts:44] `currentYear`는 `Date.getFullYear()`이고, 삼재는 `currentIndices.pillarYear`입니다(`87`). 화면은 둘을 한 블록에 같이 그립니다(`사주/js/umsh-report-access.js:475`).
- Risk: 1월 1일부터 입춘 전에는 표시 연도와 삼재 창이 한 해 어긋날 수 있습니다.
- Recommendation: 화면의 "올해"와 삼재에 같은 절기 기준 해를 쓰세요. 입춘 직전·직후 테스트를 추가하세요.

## 6. Verification Gaps
- Gap: 이번 리뷰는 테스트를 다시 실행하지 않았습니다. 신규 테스트는 삼재가 이미 들어 있는 `saju_master` 페이로드와 파일 존재만 확인합니다.
- Suggested check: `fortune.samjae`가 없는 기존 저장 리포트를 조회해, 저장본을 쓰지 않은 채 서버가 그 리포트의 년주·절기 기준 해로 삼재를 만들어 보내는지 확인하세요. 현재 `toUiAnalysisFromRecord`는 저장된 `analysis`를 그대로 반환합니다(`src/server/app.ts:1565`).
- Gap: 다른 서비스에서 대운 블록과 천명사주 썸네일이 생기지 않는지, 그리고 천명사주 06 상세에서 스타일이 적용되는지는 자동 검증이 없습니다.
- Suggested check: `quit_fortune` 등 inplace 상세와 `/cmdg/06-step-6_1-report-detail/`를 각각 렌더하세요. `memberContext`, 간지, 나이 문자열에 `<`와 따옴표를 넣어 `escapeHtml` 결과를 확인하세요.
- Gap: 검토본 HTML의 특정 회원 문장은 범위 파일의 생성·렌더 코드에서 찾지 못했습니다. 이미지 16개는 `사주/사주/assets/cmdg-review`에 있고, 이 디렉터리가 `/assets` 정적 루트입니다(`src/server/app.ts:235`, `990`).

## 7. Final Recommendation
- Next action: 대운·현실 기준 블록을 천명사주만 그리도록 제한하고, 그 스타일을 보관함이 여는 06 상세에 연결한 뒤 위 회귀 테스트를 추가하고 재검토하세요.