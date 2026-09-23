# Review Report - all-service readable-copy R4

## 1. Scope

- Task id: `readable-copy-20260921-r4`
- Reviewed files: `src/report/{copy-guide,report-generator,report-preview,report-quality,tone-v2-review}.ts`, `src/server/app.ts`, 관련 변경 테스트 7개, Tone V2 컴파일러 및 source/generated/release 변경.
- 리뷰 시점: `2026-09-21T10:37:19Z`
- 읽기 전용 검토. 파일 수정·보고서 저장은 수행하지 않았습니다.

## 2. Verdict

- **Changes requested**
- Summary: 정규화로 한국어 어미와 소수 표기가 손상되는 **배포 차단 사항 2건**을 재현했습니다. 이전에 지적한 기존 레코드 fallback과 인용 주변 공백 문제는 수정됐습니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

### 1. 조사 보정이 서술 어미를 훼손합니다

- [src/report/copy-guide.ts:105] Issue: `이`를 독립 조사인지 확인하지 않고 치환하여 뒤에 이어지는 어미까지 손상시킵니다. `과/와` 보정도 빠져 있습니다.
- 재현:
  - `명식이라고 불러요.` → `태어난 때의 기본 구조가라고 불러요.`
  - `컨디션이어서 쉬어야 해요.` → `상태가어서 쉬어야 해요.`
  - `컨디션과 일정을 확인해요.` → `상태과 일정을 확인해요.`
- Risk: 신규 저장과 기존 티저 조회에서 정상 한국어가 잘못된 문장으로 바뀝니다. 첫 번째와 세 번째 사례는 `guardPreview()`를 통과합니다.
- Recommendation: 조사와 서술 어미를 구분하고, 치환한 명사에 필요한 조사·어미만 보정하십시오. 위 사례를 최종 티저 경로의 회귀 테스트에 추가해야 합니다.

### 2. 문장 분리가 소수점을 문장 종결로 처리합니다

- [src/report/copy-guide.ts:165] Issue: 모든 마침표에서 문장을 분리한 뒤 166행에서 공백을 삽입합니다.
- 재현: `금리는 3.5%예요. 계약서에서 확인해요.` → `금리는 3. 5%예요. 계약서에서 확인해요.`
- Risk: 길이 제한 이내의 정상 문장도 변경하며, 사용자에게 표시되는 수치의 정확성을 훼손합니다.
- Recommendation: 숫자 내부 소수점을 보존하는 문장 분리를 사용하십시오. 소수·날짜 표기가 정규화 전후 유지되는지 검사해야 합니다.

## 5. Minor Issues

- 별도 지적 없음.

## 6. Verification Gaps

- `tsc --noEmit`: **PASS**.
- `report-content-guards`, `tone-v2-generation`: **107개 중 106개 통과**, 저장소 키 미설정으로 1개 실패.
- 나머지 관련 테스트 5개도 실행했으나 저장·복구 테스트에서 서버 전용 저장소 키 미설정 오류가 발생했습니다. 저장 경로 검증은 완료되지 않았습니다.
- Tone V2 컴파일러의 쓰기를 메모리 비교로 대체하여 **생성 산출물 24개 일치**를 확인했습니다. 릴리스의 `sourceFingerprint` 21개도 manifest와 일치합니다.
- [tests/unit/report-content-guards.test.ts:127] Gap: 조사·조건 어미 일부와 인용·문단 보존은 검사하지만, 위 서술 어미 및 소수점 보존 사례는 누락됐습니다.
- Suggested check: 두 결함의 회귀 테스트와 격리 저장소에서의 저장·조회 검증을 완료하십시오.
- 잔여 위험: 실제 모델 출력에 대한 20개 서비스의 생성 완료율과 새 가독성 게이트의 재시도 영향은 미검증입니다.

## 7. Final Recommendation

- Next action: **차단 사항 2건 수정 후 재리뷰하십시오. 현재 변경은 배포 승인할 수 없습니다.**