# 운명상회 Tone V2 전문용어 경계 게이트

## observation

한자 단독 표기 검사는 이미 있었지만 리포트 전체에서 전문용어의 첫 등장 여부를 알지 못했다. 또한 오행·용신, 신강·신약, 합·충의 의미를 잘못 등치하는 문장은 한자 형식만 검사해서는 막을 수 없었다.

## decision

- 완료된 이전 항목, 현재 hook, 현재 본문 순서로 용어 이력을 판정한다.
- 원문 §7이 직접 명시한 오행·용신·신강·신약·합·충만 최소 사전으로 둔다.
- 첫 사용은 `한글(한자, 쉬운 뜻)`을 요구하고 이후 한글-only 사용은 허용한다.
- 문장당 복수 한자 설명과 중첩 괄호를 거부한다.
- 오행 개수→용신, 신강·신약→인간 능력 등급, 합·충→확정 사건의 등치를 거부한다.
- `합격`, `충분`은 단음절 전문용어로 오인하지 않는다.

## artifact

- `src/report/tone-v2-review.ts`
- `src/report/report-generator.ts`
- `tests/unit/tone-v2-generation.test.ts`
- `tone-v2/reviews/P01-common-7.md`

## QA result

- 최초 RED: `reviewTechnicalTerms` export 부재로 실패.
- 오탐 RED: `합격·충분`이 `합·충`으로 검출되는 실패를 재현한 뒤 경계를 좁힘.
- focused GREEN과 전체 회귀 결과는 Task 종료 기록에 보존한다.

## lesson

‘첫 등장’ 규칙은 필드별 검사가 아니라 사용자가 읽는 리포트 순서로 검사해야 한다. 한 글자 도메인 용어는 일반 단어 내부 부분 문자열을 반드시 반례로 둔다.

## relation

- `personal/carrotcap/notes/umsh-tone-v2-voice-character-gate-20260912.md`

## next_patch

실제 모델 출력에서 쉬운 뜻의 정확성과 20개 서비스 전체 용어 분포를 의미 평가해야 한다. 서버 측 CreamWIKI reindex는 현재 클라이언트에서 실행할 수 없다.
