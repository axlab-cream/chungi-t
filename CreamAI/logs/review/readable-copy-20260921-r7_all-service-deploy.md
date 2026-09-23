# Review Report - all-service readable-copy R7

## 1. Scope

- Task id: `readable-copy-20260921-r7`
- Reviewed files: `src/report/{copy-guide,report-generator,report-preview,report-quality,tone-v2-review}.ts`, `src/server/app.ts`, 관련 변경 테스트, Tone V2 컴파일러·생성물.
- 리뷰 시점: `2026-09-21T10:49:57Z`
- 읽기 전용 검토. 파일 수정·보고서 저장 없음.

## 2. Verdict

- **Changes requested**
- Summary: R6의 소수점·인용 내부 문장 분리 수정은 확인했습니다. 그러나 중복 비교가 서로 다른 수치를 동일하게 취급하여 정보를 삭제하는 **차단 결함 1건**이 남아 있습니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

### 1. 소수점 제거로 서로 다른 수치의 문장이 삭제됩니다

- [src/report/report-preview.ts:126] Issue: 새 중복 제거 경로가 `normalizeForCompare()`를 사용합니다. 이 함수는 소수점까지 제거하므로 `3.5%`와 `35%`를 같은 값으로 비교합니다. 이후 [src/report/report-preview.ts:129]에서 해당 문장을 삭제합니다.
- 재현: `guardPreview()`에 다음 값을 전달하면 예외 없이 잘못된 결과가 반환됩니다.

| 필드 | 값 |
|---|---|
| summary | `금리는 3.5%예요.` |
| 입력 insights | `금리는 35%예요. 계약서에서 확인해요.` |
| 반환 insights | `계약서에서 확인해요.` |

- Risk: 기존 저장 티저 조회에서도 서로 다른 수치가 담긴 근거가 사라집니다. 문장 분리에서 소수점을 보존해도 비교 단계에서 다시 의미를 잃습니다.
- Recommendation: 중복 비교에서 숫자 내부 소수점 등 의미 있는 문장부호를 보존하십시오. 서로 다른 수치의 문장은 유지하고, 실제 동일 문장만 제거하도록 회귀 테스트를 추가하십시오.

## 5. Minor Issues

- 별도 지적 없음.

## 6. Verification Gaps

- `tsc --noEmit`: **PASS**.
- 관련 테스트 6개 파일: **133개 중 126개 PASS**. 7개는 서버 전용 저장소 키 미설정으로 실패했습니다.
- Tone V2 컴파일러의 쓰기를 메모리 비교로 대체한 검증: **생성 산출물 24개 모두 일치**.
- [tests/unit/report-content-guards.test.ts:162] Gap: 현재 수치 보존 검사는 `3.5%`와 `3.8%`만 비교하여, 소수점 제거 후 같은 문자열이 되는 경우를 탐지하지 못합니다.
- Suggested check: `3.5%`와 `35%` 보존 사례를 추가하고 저장→조회 경로에서도 확인하십시오.
- 잔여 미검증: 저장·복구 통합 검증 완료, 실제 모델을 사용하는 전체 서비스의 생성 완료율과 가독성 게이트 재시도 영향.

## 7. Final Recommendation

- Next action: **수치 비교에 따른 정보 삭제 결함을 수정하고 재리뷰하십시오. 현재 변경은 배포 승인할 수 없습니다.**