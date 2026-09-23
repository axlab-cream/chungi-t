# Review Report - all-service readable-copy R2

## 1. Scope

- Task id: `readable-copy-20260921-r2`
- Reviewed files: `src/report/{copy-guide,report-generator,report-preview,report-quality,tone-v2-review}.ts`, 관련 변경 테스트 7개, `tone-v2/compile.mjs`, 변경된 source/generated/release 파일.
- 리뷰 시점: `2026-09-21T10:31:04Z`
- 읽기 전용 검토. 파일 수정 및 보고서 파일 저장은 수행하지 않았습니다.

## 2. Verdict

- **Changes requested**
- Summary: 이전 결제 압박 우회 재현은 차단되며, 긴 인용문·빈 줄 문단 보존과 생성 산출물 정합성도 확인했습니다. 그러나 기존 저장 결과 조회 실패, 한국어 의미 변형, 헤드라인 조건 삭제가 남아 있어 배포를 차단합니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

### 1. 신규 가독성 게이트가 기존 저장 결과 조회에도 적용됩니다

- [src/report/report-preview.ts:129] Issue: 새 가독성 위반을 예외로 처리하는 `guardPreview()`가 기존 저장 티저 조회에도 실행됩니다. 호출 위치는 `src/server/app.ts:1623`, `src/server/app.ts:3965`입니다.
- 재현: 요약이 `회사에서 맡을 업무 범위와 출근 시간에 따른 생활 변화까지 충분히 확인한 다음 실제 서면 계약서에 적힌 조건을 기준으로 선택을 비교해요.`인 티저는 `guardPreview()`에서 65자 제한 예외가 발생합니다.
- Risk: 종전에 저장된 정상 결과가 보관함·미리보기 응답 구성 중 실패합니다. 기존 결과에 대한 읽기 동작까지 변경됩니다.
- Recommendation: 신규 저장 검증과 기존 결과 조회를 분리하십시오. 기존 티저에 새 문체 기준을 적용해 조회를 실패시키지 않도록 하고, 이전 형식의 저장 결과로 조회 회귀를 검증하십시오.

### 2. 일반 한국어를 변형하거나 전문용어로 오인하여 차단합니다

- [src/report/copy-guide.ts:82] Issue: 단어 경계 추가만으로 동음이의어를 구분하지 못합니다. 실제 `guardPreview()`에서 `상관이 없어요.`가 `표현과 결과의 흐름이 없어요.`로 바뀌어 통과합니다.
- [src/report/copy-guide.ts:73] Issue: 조사 보정 없이 치환하여 `컨디션이 좋아요.`가 `상태이 좋아요.`로 저장됩니다.
- [src/report/tone-v2-review.ts:257] Issue: 전문용어 개수는 여전히 부분 문자열로 셉니다. `세운 계획과 상관없이 인성검사를 확인해요.`는 정규화에서 보존되지만, 실제 `guardPreview()`에서는 전문용어 과밀로 거절됩니다.
- Risk: 정상 문장의 뜻과 문법이 손상되거나 정상 결과 생성·조회가 차단됩니다.
- Recommendation: 명확한 명리 문맥에서만 치환·집계하고 일반어는 보존하십시오. 치환 후 조사까지 검증하며, 위 사례를 실제 게이트 경로의 회귀 테스트에 추가하십시오.

### 3. 헤드라인을 분할한 뒤 나머지 조건을 삭제합니다

- [src/report/copy-guide.ts:130] Issue: `singleSentence=true`이면 분할된 첫 문장만 반환합니다. `src/report/report-preview.ts:123`이 모든 헤드라인에 이 옵션을 적용합니다.
- 재현: `지금 제안받은 회사의 업무 범위와 출근 조건을 먼저 살펴보세요, 다만 서면 계약을 확인하기 전에는 옮기겠다고 약속하지 마세요.`가 `지금 제안받은 회사의 업무 범위와 출근 조건을 먼저 살펴보세요.`로 바뀌어 `guardPreview()`를 통과합니다.
- Risk: 판단의 제한 조건이나 주의사항이 사용자에게 전달되지 않습니다. 원문 안전 검사를 통과해도 정규화에서 의미가 손실됩니다.
- Recommendation: 첫 문장 절단 대신 조건을 보존하는 재작성을 요청하거나 검증 실패로 처리하십시오. 삭제된 내용을 다른 필드가 보존한다고 가정하지 마십시오.

## 5. Minor Issues

- 별도 비차단 개선 사항 없음.

## 6. Verification Gaps

- 직접 실행: 관련 테스트 6개 파일에서 **133개 중 126개 통과, 7개 실패**. 실패 원인은 모두 서버 전용 리포트 저장소 키 미설정입니다. `tsc --noEmit`은 통과했습니다.
- 생성 정합성: 컴파일 쓰기를 메모리로 대체하여 비교한 **24개 산출물 모두 일치**. 릴리스의 `sourceFingerprint` 21개도 현재 manifest와 일치합니다.
- Gap: `tests/unit/report-content-guards.test.ts:127`의 정규화 회귀는 일반어 보존을 검사하지만, 동일 문장이 최종 게이트에서 차단되는 경우와 헤드라인 조건 삭제는 검증하지 않습니다.
- Suggested check: 위 재현을 `guardPreview()` 통합 테스트에 추가하고, 기존 저장 티저의 보관함·미리보기 조회를 검증하십시오.
- Gap: 저장·복구 통합 테스트와 실제 모델 출력의 새 차단 기준 통과율은 미확인입니다.
- Suggested check: 격리된 저장소에서 실패 테스트를 재실행하고 서비스별 생성 완료율·재시도 횟수를 확인하십시오.
- `WIKI_UNAVAILABLE`: 인증 토큰이 없어 CreamWIKI 조회를 수행하지 못했습니다.

## 7. Final Recommendation

- Next action: Major Issues 3건을 수정하고 실제 저장·조회 경로의 회귀 테스트를 통과한 뒤 재리뷰하십시오. **현재 변경은 배포 승인할 수 없습니다.**