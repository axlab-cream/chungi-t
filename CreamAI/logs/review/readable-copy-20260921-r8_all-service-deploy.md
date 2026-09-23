# Review Report - all-service readable-copy R8

## 1. Scope

- Task id: `readable-copy-20260921-r8`
- Reviewed files: `src/report/report-preview.ts`, `src/report/copy-guide.ts`, `tests/unit/report-content-guards.test.ts`
- 리뷰 시점: `2026-09-21T10:52:13Z`
- 읽기 전용 검토. 파일 수정·보고서 저장 없음.

## 2. Verdict

- **Changes requested**
- Summary: R7의 `3.5%`와 `35%` 충돌은 해결됐습니다. 그러나 중복 비교가 의미 있는 문장부호를 제거하여 서로 다른 수치 목록과 인용문을 삭제하는 관련 차단 결함이 남아 있습니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

- [src/report/report-preview.ts:48–49] Issue: `normalizeForDedup()`가 소수점을 제외한 문장부호와 모든 공백을 제거합니다. 서로 다른 문장이 동일한 키로 합쳐져 137행에서 삭제됩니다.
- `guardPreview()` 직접 실행 결과:

| summary | 입력 insights | 반환 insights |
|---|---|---|
| `선택 번호는 1, 2예요.` | `선택 번호는 12예요. 계약서에서 확인해요.` | `계약서에서 확인해요.` |
| `그는 “A,B”라고 적었어요.` | `그는 “AB”라고 적었어요. 계약서에서 확인해요.` | `계약서에서 확인해요.` |

- Risk: 서로 다른 수치·인용 정보가 예외 없이 사라집니다. “실제로 동일한 완전한 문장만 제거” 조건을 충족하지 못합니다.
- Recommendation: 문장 내부 공백·문장부호·인용 내용을 보존한 채 완전한 문장을 비교하고, 위 두 사례를 회귀 테스트에 추가하십시오.

## 5. Minor Issues

- 별도 지적 없음.

## 6. Verification Gaps

- `tsc --noEmit`: **PASS**.
- 관련 집중 테스트: **3/3 PASS**. 읽기 전용 환경에서 `TSX_DISABLE_CACHE=1`로 실행했습니다.
- 직접 실행 확인:
  - `3.5%` 대비 `35%`, `3.8%` 보존: **PASS**.
  - 인용 내부 문장이 추가된 경우 보존: **PASS**.
  - 두 문단 경계 보존: **PASS**.
  - 동일한 완전한 문장 제거 및 후속 문장 보존: **PASS**.
  - 서로 다른 수치 목록·인용 문장부호 보존: **FAIL**.
- Gap: 기존 회귀 테스트는 위 비교 충돌을 검사하지 않습니다.
- 잔여 미검증: 저장→조회 통합 경로 및 운영 환경 검증.

## 7. Final Recommendation

- Next action: R7의 개별 재현은 해결됐지만 관련 정보 삭제 결함이 남아 있으므로, 중복 비교를 수정하고 재검증 후 재리뷰하십시오.