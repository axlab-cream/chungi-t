# 운명상회 Tone V2 재시도 다음 판단 기준 보존

## Observation

재시도 안내가 다음 판단 기준을 요구하더라도 출력 위치와 문장 역할이 열려 있으면, 모델은 문단 구조를 고치는 동안 그 요소를 다시 빠뜨릴 수 있다.

## Decision

repair 전용 마지막 지시에서 최종 의미 단락을 2~4문장으로 예약한다. 첫 문장에는 구체적인 확인 대상을, 이어지는 문장에는 그 대상을 기록·비교·확인하는 행동을 쓰게 한다. 모호한 격려와 대상 없는 행동을 반례로 밝히고 JSON 반환 전에는 이 요소를 내부 자기검사하되 검사표는 출력하지 않는다. 검수기·모델·2회 재시도 한도는 바꾸지 않는다.

## QA result

결정적 계약은 RED 9/10에서 GREEN 10/10, 관련 48/48, 전체 682/682로 통과했다. 고유 합성 `pass_angle` 첫 항목은 첫 시도에서 전 검수를 통과해 1/52가 됐다. 따라서 첫 항목 경로는 PASS지만 실제 repair 경로는 NOT_RUN이며, 이를 별도로 기록한다.

## Lesson

필수 출력 요소에는 내용뿐 아니라 위치·문장 역할·반례·반환 전 자기검사를 함께 주는 편이 회귀 방지에 유리하다. 다만 첫 시도가 통과했다면 repair 효과를 증명했다고 말하지 않는다. 증거를 만들기 위해 불필요한 모델 호출을 강제하지 않고 다음 자연 발생 repair에서 검증한다.

## Relation

- `personal/carrotcap/notes/umsh-tone-v2-repair-invariant-preservation-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-adjacent-next-criterion-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-pass-angle-next-criterion-20260912.md`
