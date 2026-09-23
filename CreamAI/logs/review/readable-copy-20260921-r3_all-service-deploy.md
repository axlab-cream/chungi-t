# Review Report - all-service readable-copy R3

## 1. Scope

- Task id: `readable-copy-20260921-r3`
- Reviewed files: `src/report/{copy-guide,report-generator,report-preview,report-quality,tone-v2-review}.ts`, 관련 변경 테스트 7개, `tone-v2/compile.mjs`, 변경된 source/generated/release 파일.
- 리뷰 시점: `2026-09-21T10:34:37Z`
- 읽기 전용 검토. 파일 수정·보고서 저장은 수행하지 않았습니다.

## 2. Verdict

- **Changes requested**
- Summary: 배포 차단 사항 2건이 남아 있습니다. 기존 티저가 없는 레코드의 조회 실패와 한국어 정규화 오류를 재현했습니다. 이전 헤드라인 조건 삭제는 수정됐으며, Tone V2 생성 산출물 정합성은 통과했습니다.

## 3. Critical Issues

- 없음.

## 4. Major Issues

### 1. 티저가 없는 기존 레코드에는 신규 가독성 게이트가 계속 적용됩니다

- [src/report/report-preview.ts:221] Issue: `createSavedPreview()`는 엄격한 신규 저장 검사를 실행합니다. 기존 레코드 조회도 `record.preview`가 없으면 이 함수를 호출합니다(`src/server/app.ts:1623`, `src/server/app.ts:3965`). 바깥쪽 `guardPreview()`의 완화 옵션에 도달하기 전에 예외가 발생합니다.
- 재현: 기존 본문에 `회사에서 맡을 업무 범위와 출근 시간에 따른 생활 변화까지 충분히 확인한 다음 실제 서면 계약서에 적힌 조건을 기준으로 선택을 비교해요.`가 있으면 fallback 생성에서 65자 제한 예외가 발생합니다.
- Risk: 기존 결과의 보관함·미리보기 조회가 실패할 수 있습니다.
- Recommendation: 기존 레코드의 fallback 생성에도 조회용 정책을 적용하십시오. `preview`가 없는 이전 레코드로 실제 조회 경로를 검증해야 합니다.

### 2. 쉬운말 치환이 조사와 조건 어미를 손상시킵니다

- [src/report/copy-guide.ts:92] Issue: 단어만 치환하고 뒤의 조사를 유지합니다.
- [src/report/copy-guide.ts:96] Issue: `/상태이/g` 보정은 주격 조사와 조건 어미를 구분하지 않습니다.
- 실제 `guardPreview()` 재현:
  - `컨디션은 좋아요.` → `상태은 좋아요.`
  - `현재 컨디션이면 충분해요.` → `현재 상태가면 충분해요.`
  - `명식이 기준이에요.` → `태어난 때의 기본 구조이 기준이에요.`
- Risk: 신규·기존 티저에 잘못된 한국어가 노출됩니다. 조건 어미까지 훼손하므로 단순한 문체 문제가 아닙니다.
- Recommendation: 조사·어미를 구분하는 치환으로 수정하고, 위 사례를 최종 티저 경로의 회귀 테스트에 추가하십시오.

## 5. Minor Issues

- [src/report/copy-guide.ts:136] Issue: 인용 앞뒤 토큰을 각각 trim한 뒤 137행에서 빈 문자열로 연결하여 공백을 잃습니다. `그는 “확인해요.”라고 말했어요.`가 `그는“확인해요.”라고 말했어요.`로 바뀝니다.
- Risk: 인용 내부는 보존되지만 주변 띄어쓰기가 손상됩니다.
- Recommendation: 인용 토큰 경계의 원래 공백을 보존하십시오.

## 6. Verification Gaps

- 실행 결과: 관련 테스트 7개 파일에서 **151개 중 128개 통과, 23개 실패**. 실패 원인은 모두 서버 전용 리포트 저장소 키 미설정입니다.
- `tsc --noEmit`: **PASS**.
- 컴파일 쓰기를 메모리 비교로 대체한 검증: **24개 생성 산출물 모두 일치**, 릴리스 `sourceFingerprint` 21개도 manifest와 일치.
- [tests/unit/report-content-guards.test.ts:127] Gap: 기존 preview 객체의 완화 처리는 검사하지만, preview가 없는 레코드의 fallback과 다양한 조사·조건 어미는 검사하지 않습니다.
- Suggested check: Major Issues의 재현을 추가하고, 격리된 저장소에서 저장·복구·조회 테스트를 완료하십시오.
- 잔여 위험: 실제 모델 출력에 대한 20개 서비스의 생성 완료율과 새 가독성 게이트의 재시도 영향은 미검증입니다.

## 7. Final Recommendation

- Next action: Major Issues 2건 수정 후 재리뷰하십시오. **현재 변경은 배포 승인할 수 없습니다.**