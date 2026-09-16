# Tone V2 P04 재시도 품질 불변식 보존 계획

## Task

`task-tone-v2-p04-repair-invariant-preservation`

첫 `pass-angle-verdict` 실제 실행에서 두 번째 시도가 첫 시도의 통과 규칙을 회귀한 결함만 다룬다. 품질 gate, 모델, 재시도 횟수는 변경하지 않는다.

## Vertical slice

- [x] 상호 보완적인 실제 두 실패의 차이를 회귀 fixture로 고정한다.
- [x] RED: repair 메시지가 현재 실패 목록뿐 아니라 전체 품질·안전·구조·말투·근거 불변식을 보존하도록 요구한다.
- [x] 공용 repair 계약을 최소 수정하고 거부 원문·자격증명이 메시지에 포함되지 않음을 유지한다.
- [x] focused/related/full/typecheck/build/diff를 검증한다.
- [x] 고유 version의 첫 항목만 실제 provider로 재검증하고 제한 밖 호출 0건을 확인한다.
- [x] 성공 또는 실패를 sanitized 평가·리뷰·ProjectOps·CreamWIKI에 기록한다.

## Outcome

repair 불변식 계약 자체는 구현됐지만 실제 provider acceptance는 실패했다. 첫 시도는 문단 구조만 실패했고 두 번째 시도는 nextCriterion만 실패하여, 긴 공용 체크리스트만으로는 이전 통과 항목 보존을 보장하지 못했다. 다음에는 최종 판단 기준의 출력·자기검사 계약만 별도 Task로 다룬다.

## Stop conditions

- 결정적 검수 기준, 모델, 최대 2회 재시도를 완화하지 않는다.
- 첫 항목이 실패하면 2~52항목을 호출하지 않는다.
- 거부된 원문, API 키, 사용자 실데이터를 증적에 저장하지 않는다.
- 운영 DB·인증·결제·관리자·Production·배포·커밋·push를 변경하지 않는다.

## AIOS routes

`04 Workflows`, `11 Ops`, `12 QA/Eval`, `14 Memory/KMS`.
