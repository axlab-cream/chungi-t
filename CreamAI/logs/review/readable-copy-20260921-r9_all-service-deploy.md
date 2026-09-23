# Review Report - readable-copy R9

## 1. Scope

- Task id: `readable-copy-20260921-r9`
- Reviewed files: `src/report/report-preview.ts`, `src/report/copy-guide.ts`, `tests/unit/report-content-guards.test.ts`
- 리뷰 시점: `2026-09-21T10:54:08Z`
- 읽기 전용 검토. 파일 수정·저장 없음.

## 2. Verdict

- **Changes requested**
- Summary: `3.5%`/`35%`, `1, 2`/`12`, `A,B`/`AB` 구분과 동일 문장 제거는 통과했습니다. 그러나 인용문 내부 공백 차이가 있는 정보를 삭제하는 관련 차단 결함이 남아 있습니다. 중복 제거 시 문단 경계 소실도 재현됩니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

- [src/report/report-preview.ts:48] Issue: 중복 비교에서 모든 공백을 제거하여 서로 다른 인용문을 동일하게 취급합니다.
- 직접 실행 재현:
  - summary: `그는 “A B”라고 적었어요.`
  - insights: `그는 “AB”라고 적었어요. 계약서에서 확인해요.`
  - 반환 insights: `계약서에서 확인해요.`
- Risk: 정확히 동일하지 않은 인용 정보가 조용히 삭제됩니다.
- Recommendation: 문장 내부 공백과 인용 내용을 보존하여 비교하고, 위 사례를 회귀 테스트에 추가하십시오.

## 5. Minor Issues

- [src/report/copy-guide.ts:193], [src/report/report-preview.ts:138] Issue: 토큰에 선행 문단 구분자가 포함되어 중복 문장과 함께 삭제됩니다.
- 직접 실행 재현:
  - summary: `중복 문장입니다.`
  - insights: `첫 문단입니다.\n\n중복 문장입니다. 둘째 문단입니다.`
  - 반환 insights: `첫 문단입니다. 둘째 문단입니다.`
- Risk: 남아 있는 두 문단이 합쳐져 요청된 문단 경계 보존을 충족하지 못합니다.
- Recommendation: 문장 제거와 문단 구분자 보존을 분리하고 해당 사례를 검증하십시오.

## 6. Verification Gaps

- `tsc --noEmit`: **PASS**.
- 관련 집중 테스트: **3/3 PASS** (`TSX_DISABLE_CACHE=1`).
- 직접 실행:
  - 소수·수치 목록·쉼표 인용 구분: **PASS**.
  - 동일한 완전한 문장 제거와 후속 문장 보존: **PASS**.
  - 인용 내부 공백 차이 보존: **FAIL**.
  - 중복 제거가 발생하는 문단 경계 보존: **FAIL**.
- Gap: 추가된 테스트는 마지막 두 실패 사례를 포함하지 않습니다.
- 잔여 미검증: 저장·조회 통합 경로와 운영 환경.

## 7. Final Recommendation

- Next action: 내부 공백으로 구분되는 인용 정보 삭제를 수정하고 문단 경계 회귀 사례를 추가한 뒤 재검증하십시오. 기존 R8의 명시적 사례는 해결됐지만 관련 정보 소실이 남아 승인할 수 없습니다.