# Review Report - readable-copy-20260921-r11

## 1. Scope
- Task id: readable-copy-20260921-r11
- Reviewed files: `src/report/report-preview.ts`, `tests/unit/report-content-guards.test.ts`, 관련 문장 정규화·저장 호출·프런트 표시 코드
- 리뷰 시점: 2026-09-21T11:05:16Z

## 2. Verdict
- **Changes requested**
- Summary: 두 문장 헤드라인과 긴 요약 때문에 발생하던 신규 생성 실패는 회귀 테스트에서 해소됐습니다. 레거시 보존 및 기존 안전 검사도 확인했습니다. 다만 실제 표시되는 `signals`의 길이 제한 누락과 근거 없는 대체 헤드라인이 남아 있습니다.

## 3. Critical Issues
- 없음.

## 4. Major Issues
- **[src/report/report-preview.ts:174] 실제 표시 필드인 `signals`에는 길이 보정이 적용되지 않습니다.**
  - Risk: 두 번째 섹션에 88자 문장을 넣으면 `insights`는 짧은 대체문으로 바뀌지만 `signals`에는 88자 문장이 그대로 남습니다. `public/js/umsh-report-access.js:1181` 등은 `signals`를 우선 표시하므로 신규 미리보기의 65자 제한이 사용자 화면에서 지켜지지 않습니다.
  - Recommendation: 신규 strict 경로에서 `signals`도 검수된 통찰과 일치시키고, 두 번째 섹션의 긴 문장이 실제 표시 필드에서도 보정되는 회귀 테스트를 추가하세요. 레거시 경로는 보존하세요.

- **[src/report/report-preview.ts:56] 최종 대체 헤드라인이 원문 근거 없이 저장됩니다.**
  - Risk: 첫 hook과 제목이 모두 65자를 넘으면 원문에 없는 `확인할 기준을 정리했습니다.`가 생성됩니다. 직접 재현에서 `reviewTeaser`는 근거 누락을 보고하지만 저장 가드가 해당 문제를 차단하지 않아 반환이 성공했습니다.
  - Recommendation: 원문에서 짧은 근거 문장을 선택하거나, 해석 판정과 구별되는 중립적 대체 문구 계약을 명시적으로 처리하세요. 긴 hook·긴 제목 조합에서도 근거 검증을 만족하는 테스트가 필요합니다.

## 5. Minor Issues
- 없음.

## 6. Verification Gaps
- 직접 실행: 캐시를 비활성화한 관련 테스트 **9/9 PASS**. 신규 회귀, 레거시 긴 문장 보존, 기존 안전 검사 포함.
- 직접 재현: `signals`의 88자 문장 잔존 및 대체 헤드라인의 근거 검증 실패 확인.
- 신규 테스트는 `summary`·`insights`만 검사하고 실제 표시되는 `signals`는 검사하지 않습니다.
- PM 제공 통합 테스트 및 typecheck 결과는 이번 리뷰에서 재실행하지 않았습니다. 서버 전용 키가 필요한 저장 경로는 검증 범위 밖입니다.

## 7. Final Recommendation
- Next action: 위 두 결함을 수정하고 해당 회귀 테스트를 추가한 뒤 재검토하세요.
- 파일 변경 없이 보고서만 반환합니다.