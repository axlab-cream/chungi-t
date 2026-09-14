# 운명상회 Tone V2 비교형 nextCriterion 판별 보강

## Observation

비교·확인 행동의 안전한 시도형 활용과 주격 관찰절 대상이 결합된 실제 합성 응답을 기존 판별기가 놓쳤다. 두 조건을 각각 RED fixture로 분리했을 때 둘 다 독립적으로 실패했다.

## Decision

- `해봐` 활용은 기존 안전 행동 중 비교와 확인에만 좁게 허용한다.
- 주격 대상은 남음·감소·변화·반복·지속·준수·개선처럼 관찰 가능한 결과 술어가 붙은 절만 허용한다.
- 대상 없음, 모호한 격려, 부정, 과거완료, 시험·공부 포기 행동은 계속 거부한다.
- `앞으로`와 `다음 실모부터` 같은 시간·기점 표현은 비교 대상이 아니며, 띄어 쓴 `해 봤어`·`해 본`·`해 보았어`도 과거/완료로 거부한다.
- 저장된 과거 실패 응답은 읽기 전용으로 재평가하고 상태나 시도 횟수를 고치지 않는다.

## Result

독립 RED는 35 PASS / 3 FAIL이었다. 첫 독립 리뷰가 시간 표현 대상화와 띄어 쓴 과거 보조용언 오탐을 찾아 추가 RED 38 PASS / 2 FAIL로 고정했다. 경계 수정 뒤 focused 40/40, related 45/45, compiler/task 7/7, full 687/687(101 suites), typecheck와 Vercel build가 PASS했다. 저장 attempt는 density 4/4 PASS로 재평가됐고 record/section `failed`, attempts 2, raw-file SHA-256은 그대로다. Provider 호출과 Production 변경은 0이다.
