# 운명상회 Tone V2 점수·시각화 근거 게이트

## observation

기존 숫자 검수는 근거 없는 ‘처방 숫자’와 산술 오류에 집중해, 생성문이 임의 점수·확률·날짜·그래프 모양을 개인 결과처럼 제시하는 경우를 막지 못했다. 점수가 있어도 사건 확률인지 해석 축인지, 비교 대상과 의미 설명이 있는지 검증하지 않았다.

## decision

- 기존 서버 유래 `numericEvidence`를 점수·퍼센트·연월일 검수에도 재사용한다.
- 해석 점수는 적합도·주의도·우선순위로만 이름 붙이고 산정 축 및 높고 낮음의 의미를 요구한다.
- 실제 시험/성적 점수는 해석 점수와 구분하지만 수치 근거는 동일하게 검증한다.
- 비교 점수는 sanitized context에 실제 비교 대상이 있을 때만 허용한다.
- 장식 차트, 근거 없는 그래프 모양, 표와 차트의 동일 수치 반복을 거부한다.

## artifact

- `src/report/tone-v2-review.ts`
- `src/report/report-generator.ts`
- `tests/unit/tone-v2-generation.test.ts`
- `tone-v2/reviews/P01-common-8.md`

## QA result

- 최초 RED: `reviewScoreVisuals` export 부재로 실패.
- 첫 GREEN 시도: 테스트가 입력 대신 review 결과를 전달한 fixture 오류를 발견해 fixture를 분리함.
- focused/integration/전체 회귀 결과는 Task 종료 기록에 보존한다.

## lesson

생성문 수치 검수는 새 계산기를 만들지 말고 검증된 서버 숫자 집합을 재사용해야 한다. ‘점수 값이 근거에 있다’와 ‘그 점수의 이름·산정 축·높고 낮음의 의미가 정직하다’는 별도 조건이다.

## relation

- `personal/carrotcap/notes/umsh-tone-v2-evidence-layers-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-numeric-gate-20260912.md`

## next_patch

실제 모델 출력과 구조화 시각화 payload에서 산정 축의 정확성, 비교 대상, 표·차트 의미 중복을 평가해야 한다. 서버 측 CreamWIKI reindex는 현재 클라이언트에서 실행할 수 없다.
