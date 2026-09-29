# Review Report - love-signal-teaser

## 1. Scope

- Task id: `love-signal-teaser-20260929`
- Reviewed files: `src/love/signal-service.ts`, `src/server/app.ts`, `src/work/jobchoice-preview-quota.ts`, `사주/js/signal-service.js`, `사주/js/umsh-report-access.js`, 관계 신호 02·04·05·06 HTML, 관련 테스트·캐시 버전 변경.
- 리뷰 시점: `2026-09-29T09:54:32Z`
- 읽기 전용 검토. 파일 수정·보고서 저장 없음.

## 2. Verdict

- **Changes requested**
- Summary: 결제 후 티저 재열람 차단과 출생시간 미상 데이터 표시 오류가 남아 있어 전체 **PASS 불가**.
- 검증 **PASS**: 집중 회귀 141/141, TypeScript, 변경 JavaScript 구문 검사, `git diff --check`.

## 3. Critical Issues

- 확인된 Critical 결함 없음.

## 4. Major Issues

### P1 — 무료 조회를 소진한 구매자의 04 재열람 차단

- **[src/server/app.ts:4877, 4881; 동일 분기 :4195, 4199] Issue:** 구매·관리자 권한에서는 `servicePreviewStatus()`를 조회하지만, 이후 권한과 무관하게 `allowed === false`이면 429를 반환한다. `couple_signal`이 이번 변경으로 이 분기에 포함된다.
- **Risk:** 무료 조회 5회 후 구매한 회원도 04가 요청하는 `preview=1` 응답에서 `FREE_PREVIEW_LIMIT`을 받아 전체 목차 진입 대신 결제 안내를 보게 된다. 메모리 기반 재현에서 5회 소진 후 상태가 `{used:5, limit:5, allowed:false}`임을 확인했다.
- **Recommendation:** 구매·관리자 권한의 상태 조회는 사용량 표시용으로만 사용하고 한도 차단에서 제외한다. 5회 소진 → 구매 → 04 → 05 → 06 회귀 검증을 추가한다.

### P2 — 출생시간 미상을 실제 시주·오행 개수로 표시

- **[src/love/signal-service.ts:281, 289, 363] Issue:** 새 표와 차트가 `birthTimeKnown`을 확인하지 않고 시주와 전체 오행 개수를 표시한다. 상대 출생시간이 미상이면 파서는 12시를 사용한다(:169).
- **Risk:** `partnerBirthTimeKnown:false`로 재현했는데도 표에 ‘태어난 시간: 나무 · 불’, 차트에 시주를 포함한 합계 8개가 표시됐고, 캡션은 이를 ‘실제 개수’라고 설명했다. 입력하지 않은 시간이 확정된 개인 정보처럼 제시된다.
- **Recommendation:** 본인·상대 각각의 시간 확실성을 반영해 미상 시주는 미상으로 표시하고, 차트에서도 가정된 시주를 제외하거나 계산 범위를 명시한다.

## 5. Minor Issues

- 별도 지적 없음.

## 6. Verification Gaps

- **Gap:** 신규 관계 신호 테스트는 대부분 문자열 연결 검사이며, 위 두 경계 조건을 검증하지 않는다.
- **Suggested check:** 서비스별 한도 격리, 동일 입력 재조회, 여섯 번째 신규 입력 차단, 소진 후 구매자 재열람, 출생시간 미상 표·차트를 동작 테스트로 확인한다.
- **Gap:** 실제 브라우저의 모바일 표·차트, GNB, 로딩·오류 복구와 결제 완료 흐름은 이번 검토에서 실행하지 않았다.
- **Suggested check:** 390px 화면에서 실제 저장 리포트와 미결제·구매 계정별 흐름을 확인한다.
- **Gap:** `WIKI_UNAVAILABLE` — 지정 CLI에 인증 토큰이 없어 사전 지식 검색 실패.

## 7. Final Recommendation

- **Next action:** Major 2건을 수정하고 해당 회귀 검증 및 모바일 흐름을 확인한 뒤 재검토한다. 현재 판정은 **Changes requested**다.