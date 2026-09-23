# Review Report - all-service readable-copy R6

## 1. Scope

- Task id: `readable-copy-20260921-r6`
- Reviewed files: `src/report/{copy-guide,report-generator,report-preview,report-quality,tone-v2-review}.ts`, `src/server/app.ts`, 관련 변경 테스트 7개, Tone V2 컴파일러·source·generated·release 변경.
- 리뷰 시점: `2026-09-21T10:47:53Z`
- 읽기 전용 검토. 파일 수정·보고서 저장은 수행하지 않았습니다.

## 2. Verdict

- **Changes requested**
- Summary: R5의 어미 보정 및 비중복 문장 보존 테스트는 통과했습니다. 그러나 중복 제거 과정에서 **서로 다른 수치와 사용자 인용을 훼손하는 차단 결함 1건**이 남아 있습니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

### 1. 부분 문장 중복 판정으로 수치와 인용이 삭제됩니다

- [src/report/report-preview.ts:125] Issue: `splitSentences()`가 소수점과 인용 내부 마침표도 문장 경계로 취급합니다. 이어서 [src/report/report-preview.ts:129]에서 일치한 조각을 원문에서 삭제합니다. `guardPreview()` 직접 실행으로 다음을 재현했습니다.

| summary | 입력 insights | 반환 insights |
|---|---|---|
| `금리는 3.5%예요. 계약서에서 확인해요.` | `금리는 3.8%예요. 다른 계약서도 비교해요.` | `8%예요. 다른 계약서도 비교해요.` |
| `그는 “확인해요.”라고 말했어요.` | `그는 “확인해요. 그리고 비교해요.”라고 말했어요.` | `그리고 비교해요.` |

- Risk: 정상적인 `3.8%`가 `8%`로 바뀌고, 사용자 인용이 서술자의 지시처럼 변합니다. 두 결과 모두 예외 없이 최종 가드를 통과하므로 기존 티저 조회에서도 잘못된 내용이 반환됩니다.
- Recommendation: 소수점·인용 범위를 구분하는 완전한 문장 단위로만 중복을 제거하십시오. 인용과 수치의 일부를 삭제하지 않도록 원문 범위를 보존하고, 위 두 사례를 회귀 테스트에 추가하십시오.

## 5. Minor Issues

- 별도 지적 없음.

## 6. Verification Gaps

- `tsc --noEmit`: **PASS**.
- 관련 테스트 5개 파일 실행: **125개 중 124개 PASS**. 나머지 1개는 서버 전용 리포트 저장소 키 미설정으로 실패했습니다.
- Tone V2 컴파일러의 파일 쓰기를 메모리 비교로 대체한 검증: **생성 산출물 24개 모두 일치**.
- [tests/unit/report-content-guards.test.ts:157] Gap: 수치·인용·문단 보존 사례가 summary와 중복되는 조각을 포함하지 않아, 실제 삭제 분기의 훼손을 탐지하지 못합니다.
- Suggested check: 위 재현을 `guardPreview()`에 추가하고 신규 저장→조회 경로에서도 확인하십시오.
- 잔여 미검증: 저장·복구 통합 테스트 전체, 실제 모델을 사용하는 20개 서비스의 생성 완료율 및 가독성 게이트 재시도 영향.

## 7. Final Recommendation

- Next action: **부분 중복 삭제 결함 수정 후 재리뷰하십시오. 현재 변경은 배포 승인할 수 없습니다.**