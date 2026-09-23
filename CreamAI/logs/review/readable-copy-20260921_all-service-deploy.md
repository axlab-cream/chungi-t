# Review Report - all-service readable-copy

## 1. Scope

- Task id: `readable-copy-20260921`
- Reviewed files: `src/report/{copy-guide,report-generator,report-preview,report-quality,tone-v2-review}.ts`, 관련 변경 테스트 7개, `tone-v2/compile.mjs`, 변경된 source/generated/release 파일.
- 리뷰 시점: `2026-09-21T10:27:02Z`
- 읽기 전용으로 검토했으며 파일은 수정하지 않았습니다.

## 2. Verdict

- **Changes requested**
- Summary: 안전 검사 우회, 일반 한국어 훼손, 사용자 인용문 변형을 재현했습니다. 운영 회귀에 해당하므로 아래 Major Issues는 배포 차단 사항입니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

### 1. 정규화가 결제 압박 검사 우회를 만듭니다

- [src/report/report-preview.ts:122] Issue: 원문을 검사하지 않고 문장 분할 이후에만 안전 검사를 실행합니다. `copy-guide.ts:103`에서 삽입하는 마침표가 안전 정규식의 문장 경계를 바꿉니다.
- 재현: 요약에 `'가'.repeat(58) + ' 결제하지 않으면 손해입니다.'`를 넣으면 원문 `reviewTeaser()`는 공포·결제 압박을 검출하지만, `guardPreview()`는 `… 결제하지. 않으면 손해입니다.`로 바꾸어 통과시킵니다.
- Risk: 기존에 차단하던 결제 압박 문구가 저장·노출됩니다.
- Recommendation: 원문과 최종 출력 모두 안전 검사를 통과하도록 하고, 부정·조건 표현 중간에 마침표를 삽입하지 않도록 수정하십시오.

### 2. 전문용어 치환이 일반 단어와 조사를 훼손합니다

- [src/report/copy-guide.ts:74] Issue: 용어 치환이 문맥이나 단어 경계를 확인하지 않습니다.
- 재현: `상관없이 인성검사 결과를 확인해요.` → `표현과 결과의 흐름없이 배움과 도움의 흐름검사 결과를 확인해요.`
- Risk: 정상적인 고객 문장이 의미가 다른 문장으로 저장됩니다. 명리 용어가 아닌 동음이의어도 영향을 받습니다.
- Recommendation: 명확한 전문용어 사용만 치환하고, 일반 단어·합성어를 보존하십시오. 치환 후 조사도 검증해야 합니다.

### 3. 긴 인용문을 분할하고 원래 문단 경계를 제거합니다

- [src/report/copy-guide.ts:113] Issue: 앞 단계에서 보호했던 인용문을 다시 일반 문장으로 분리하고 길이 기준으로 자릅니다. 마지막 `join(' ')`은 문단 경계도 제거합니다.
- 재현: `“` + `'회사에서 맡은 역할과 실제 업무 조건을 함께 확인하고 '.repeat(3)` + `싶어요.”라고 적었어요.`의 인용문 내부에 `회사에서. 맡은`이라는 새 마침표가 삽입됩니다. `첫 문단입니다.\n\n둘째 문단입니다.`도 한 문단이 됩니다.
- Risk: 사용자 원문 인용이 변조되고 문단별 의미 구분이 사라집니다.
- Recommendation: 인용 구간과 문단 경계를 전체 정규화 과정에서 보존하고, 서술자 문장에만 분할을 적용하십시오.

## 5. Minor Issues

- [tone-v2/releases/all-service-corpus-2.1.0.json:854] Issue: 변경된 서비스 프롬프트 SHA는 갱신했지만 `sourceFingerprint`는 이전 값 `1a558d8b…`입니다. 현재 생성 manifest는 `8ce36476…`입니다. 같은 불일치가 `saju_master`, `wedding_day`에도 있습니다.
- Risk: 릴리스 기록의 프롬프트와 원본 출처가 일치하지 않아 검증 이력 추적이 부정확합니다.
- Recommendation: 새 후보의 출처 정보를 일관되게 갱신하고, 과거 검증 근거와 구분하십시오.

## 6. Verification Gaps

- 직접 실행: 변경 관련 6개 테스트 파일에서 **125개 통과, 7개 실패**. 실패는 모두 서버 전용 리포트 저장소 키 미설정입니다. `tsc --noEmit`은 통과했습니다.
- Gap: `tests/unit/report-content-guards.test.ts:107`의 추가 검사는 정규화 전 검증기 중심이며, 위 정규화 회귀를 잡지 못합니다.
- Suggested check: 실제 `guardPreview()` 경로로 안전 문구 분할, 일반 단어, 긴 인용문, 문단 보존 회귀를 추가하십시오.
- Gap: 저장·복구 통합 경로와 실제 모델 출력의 새 차단 규칙 통과 여부는 확인하지 못했습니다.
- Suggested check: 격리된 저장소에서 실패한 테스트를 재실행하고, 서비스별 표본 생성에서 완료율과 재시도 횟수를 확인하십시오.

## 7. Final Recommendation

- Next action: Major Issues 3건을 수정하고 회귀 테스트를 통과한 뒤 재리뷰하십시오. 현재 변경은 배포 승인할 수 없습니다.