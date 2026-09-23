# Review Report - all-service readable-copy R5

## 1. Scope

- Task id: `readable-copy-20260921-r5`
- Reviewed files: `src/report/{copy-guide,report-generator,report-preview,report-quality,tone-v2-review}.ts`, `src/server/app.ts`, 관련 변경 테스트 7개, Tone V2 컴파일러·source·generated·release 변경.
- 리뷰 시점: `2026-09-21T10:45:19Z`
- 읽기 전용 검토. 파일 수정·보고서 저장은 수행하지 않았습니다.

## 2. Verdict

- **Changes requested**
- Summary: 최종 `guardPreview()` 경로에서 **배포 차단 회귀 2건**을 재현했습니다. R4 수정은 일부 사례를 해결했지만, 서술 어미 손상과 `insights`의 수치·인용·문단 변형이 남아 있습니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

### 1. 조사 보정이 아직 서술 어미의 일부를 치환합니다

- [src/report/copy-guide.ts:113] Issue: 열거하지 않은 서술 어미의 첫 `이`를 독립 조사로 처리하고, 115행에서 `가`로 바꿉니다.
- `guardPreview()` 재현:
  - `컨디션이에요.` → `상태가에요.`
  - `명식이었어요.` → `태어난 때의 기본 구조가었어요.`
  - `컨디션이라도 확인해요.` → `상태가라도 확인해요.`
- Risk: 정상 한국어가 신규 저장 및 기존 티저 조회에서 잘못된 문장으로 바뀌며, 최종 검수도 통과합니다.
- Recommendation: 독립 조사와 서술 어미를 구분하고, 식별하지 못한 어미를 단일 `이` 규칙으로 치환하지 않도록 수정하십시오. 위 사례를 최종 티저 경로에서 검증해야 합니다.

### 2. 근거 중복 제거가 정규화된 수치·인용·문단을 다시 훼손합니다

- [src/report/report-preview.ts:124] Issue: `normalizeTeaserCopy()` 결과를 기존 `splitSentences()`로 다시 분리한 뒤, 130행에서 공백으로 결합합니다. 이 분리는 소수점·인용 범위를 구분하지 않으며 문단 구분도 보존하지 않습니다.
- `guardPreview()`의 `insights` 재현:
  - `금리는 3.5%예요. 계약서에서 확인해요.` → `금리는 3. 5%예요. 계약서에서 확인해요.`
  - `그는 “확인해요.”라고 말했어요.` → `그는 “확인해요. ”라고 말했어요.`
  - `첫 문단입니다.\n\n둘째 문단입니다.` → `첫 문단입니다. 둘째 문단입니다.`
- Risk: 소수점 보존 수정이 최종 반환 경로에서는 무효화됩니다. 사용자 인용과 문단 경계도 변경됩니다.
- Recommendation: 중복 비교용 표현과 반환할 원문을 분리하십시오. 중복되지 않은 내용은 수치·인용·문단 경계를 그대로 유지해야 합니다.

## 5. Minor Issues

- 별도 지적 없음.

## 6. Verification Gaps

- `tsc --noEmit`: **PASS**.
- `report-content-guards`, `tone-v2-generation`: **107개 중 106개 통과**. 나머지 1개는 서버 전용 저장소 키 미설정으로 실패했습니다.
- `practical-service-reading`, `service-system-prompt`, `work-jobchoice-service`: **18/18 PASS**.
- 컴파일러 쓰기를 메모리 비교로 대체하여 **Tone V2 생성 산출물 24개 일치**를 확인했습니다. 릴리스의 `sourceFingerprint` 21개도 manifest와 일치합니다.
- [tests/unit/report-content-guards.test.ts:142] Gap: 추가된 어미 테스트가 위의 `이에요·이었어요·이라도`를 포함하지 않습니다.
- [tests/unit/report-content-guards.test.ts:149] Gap: 소수점·인용·문단 검증은 `normalizeTeaserCopy()` 직접 호출에 집중되어 있어, 이후 `insights` 재조립 회귀를 탐지하지 못합니다.
- Suggested check: 위 재현을 `guardPreview()` 및 신규 저장 경로의 회귀 테스트에 추가하고, 격리 저장소에서 저장·조회 검증을 완료하십시오.
- 잔여 위험: 실제 모델 출력에 대한 20개 서비스의 생성 완료율과 새 가독성 게이트의 재시도 영향은 미검증입니다.

## 7. Final Recommendation

- Next action: **차단 사항 2건 수정 후 재리뷰하십시오. 현재 변경은 배포 승인할 수 없습니다.**