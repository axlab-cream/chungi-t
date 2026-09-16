# Tone V2 P04 pass_angle 첫 항목 품질 교정 계획

## Task

`task-tone-v2-p04-pass-angle-first-section-quality`

52항목 전체 실행에서 최초 실패한 `pass-angle-verdict` 하나만 다룬다. 저장된 두 실패 응답은 원문을 노출하거나 재사용하지 않고 결정적 검수 신호로만 진단한다.

## Vertical slice

- [x] 실패 시도 두 건의 검수 항목을 구조화해 겹치는 원인을 확정한다.
- [x] RED: 첫 항목 생성 안내가 상징과 현실 판단을 구분하고 구체 장면·다음 기준·한자 분리를 동시에 요구하는 계약을 추가한다.
- [x] `pass_angle`의 첫 항목에만 적용되는 최소 안내를 구현한다. 공용 검수 기준은 완화하지 않는다.
- [x] focused/related/full/typecheck/build/diff를 검증한다.
- [x] 고유 version 사전 `not-generated` 확인 뒤 첫 항목만 실제 provider로 실행한다.
- [x] 완료 또는 최초 실패를 sanitized 평가에 남기고 독립 리뷰·ProjectOps·CreamWIKI를 닫는다.

## Outcome

구조와 격리 하네스는 통과했으나 실제 첫 항목은 두 시도 후에도 실패했다. 첫 시도는 문단 문장 수와 상징 경계, 두 번째 시도는 다음 기준과 한자 설명 분리에서 실패하여, 재시도가 이미 통과한 품질 불변식을 보존하지 못하는 별도 결함으로 분리했다.

## Stop conditions

- 기존 검수 gate, 모델 또는 2회 재시도를 완화하지 않는다.
- 첫 항목이 실패하면 2~52항목은 호출하지 않는다.
- 기존 version이나 과거 완료 결과를 변경하지 않는다.
- 운영 DB·고객 데이터·인증·결제·Production·배포에 접근하지 않는다.
