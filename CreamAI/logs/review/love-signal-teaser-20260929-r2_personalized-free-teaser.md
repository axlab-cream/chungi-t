# Review Report - love-signal-teaser

## 1. Scope

- Task id: `love-signal-teaser-20260929-r2`
- Reviewed files: `src/love/signal-service.ts`, `src/server/app.ts`, `src/work/jobchoice-preview-quota.ts`, `사주/js/signal-service.js`, `사주/js/umsh-report-access.js`, 관계 신호 02·04·05·06 HTML, 관련 테스트와 공용 캐시 버전 변경.
- 리뷰 시점: `2026-09-29T10:03:52Z`
- 읽기 전용 검토. 파일 수정·보고서 저장 없음.

## 2. Verdict

- **Approved with comments — PASS**
- Summary: 이전 Major 2건의 수정과 회귀 검증을 확인했다. 검토 범위에서 차단 결함은 없으며, 입력 오류 복구의 Minor 1건이 남아 있다.
- 검증 **PASS**: 집중 회귀 **157/157**, TypeScript, 변경 JavaScript 구문 검사, 관계 신호 계약 20건, `git diff --check`.
- 추가 동작 검증 **PASS**: `couple_signal` 5회 허용·동일 입력 재열람·6번째 신규 입력 차단·서비스별 한도 격리·소진 후 권한 보유자 차단 제외.
- 출생시간 미상 시 표의 시간 기둥과 차트의 가정된 시주 제외 테스트 **PASS**.

## 3. Critical Issues

- 확인된 결함 없음.

## 4. Major Issues

- 확인된 결함 없음.
- 이전 구매자 재열람 차단은 `previewQuotaBlocksAccess()`의 권한 확인으로 해소됐다.
- 이전 출생시간 미상 표·차트 오류는 본인과 상대의 시간 확실성을 각각 반영하도록 수정됐다.

## 5. Minor Issues

### P3 — 입력 저장 실패 후 제출 버튼이 복구되지 않음

- **[사주/love/signal/02-step-2-saju-input/index.html:1456, 1395–1397] Issue:** 제출 버튼을 비활성화한 뒤 `writeSession()`이 실패하면 재활성화 없이 반환한다. 버튼 복구는 API 호출의 `catch`에만 있어 이 경로에서는 실행되지 않는다.
- **Risk:** 저장 공간 부족 등의 오류를 해결해도 안내대로 다시 제출할 수 없다. 해당 함수를 저장 실패 조건으로 실행해 `submit.disabled === true`가 유지됨을 확인했다.
- **Recommendation:** 저장 실패 반환 시 버튼을 복구하거나 제출 처리 전체에 `finally`를 적용한다. 저장 실패 후 재시도 가능 여부를 검증한다.

## 6. Verification Gaps

- **Gap:** 실제 모바일 브라우저의 표·차트·GNB·로딩 표시와 결제 완료 후 04 → 05 → 06 흐름은 이번 검토에서 실행하지 않았다.
- **Suggested check:** 390px 화면에서 실제 저장 리포트와 미결제·구매 계정으로 확인한다.
- **Gap:** 한도 검증은 테스트용 메모리 저장소 기준이다.
- **Suggested check:** 운영과 같은 영속 저장소에서 중복 요청·동시 요청 및 소진 후 구매자 재열람을 확인한다.
- **Gap:** `WIKI_UNAVAILABLE` — 지정 CLI의 인증 토큰 부재로 사전 검색 실패.

## 7. Final Recommendation

- **Next action:** 재검토 판정은 **PASS**다. Minor 오류 복구를 보완하고, 배포 전 실제 모바일·결제·영속 한도 검증을 완료한다.