# 운명상회 Tone V2 P01 퍼소나 계약·첫 답변 게이트

## observation

원본 퍼소나 문서는 과거 20개 필드가 비어 있던 문제를 설명한 뒤 20개 서비스의 13개 필드를 채운다. 컴파일 산출물에는 20개 서비스와 18개 인물이 있었지만 런타임 계약에는 독립 displayName과 정의 상태가 없었고 이름은 `이름(초안)` 문자열 안에만 있었다. 포크는 releaseReady=false라 운영 서비스에 아직 부착되지 않았다.

## decision

퍼소나 자체의 규격 상태와 이름의 승인 상태를 분리한다. 각 퍼소나는 `definitionStatus=specified`, `displayNameStatus=draft`로 기록한다. 런타임은 20개 수, 13개 필수 필드, 어휘와 rhythm/null 계약을 검증하고 불완전하면 실패한다. hook은 고객 화면에서 본문보다 먼저 보이는 직접 답으로 취급한다.

## artifact

- `tone-v2/compile.mjs`
- `src/prompt/tone-v2.ts`
- `src/report/tone-v2-review.ts`
- `tests/unit/tone-v2.test.ts`
- `tests/unit/tone-v2-generation.test.ts`
- `tone-v2/task-progress.json`
- `tone-v2/reviews/P01-common-1-3.md`

## QA result

- RED: focused 8개 중 6 PASS, 신규 결함 2 FAIL.
- GREEN: persona/generation 8/8, persistence 포함 16/16.
- compiler/task coverage 7/7, regenerated task-index 3/3.
- typecheck, Vercel build PASS.
- full regression 636/636 PASS.
- live OpenAI 의미 감수, 최종 이름 승인, Production 부착은 NOT_RUN.

## lesson

JSON에 값이 우연히 존재하는 것과 런타임 계약으로 정의된 것은 다르다. 퍼소나 완성 상태와 이름의 브랜드 승인 상태도 한 값으로 뭉개면 안 된다. 생성 프롬프트에 직접 답 규칙이 있어도 실제 출력 PASS는 아니므로 정적 게이트와 라이브 의미 평가를 분리한다.

## relation

- `personal/carrotcap/notes/umsh-tone-v2-20260912.md`
- ZIP-003-008, ZIP-003-009, ZIP-003-032

## next_patch

ZIP-003-011~017의 입력 반복과 사용자 사실·계산값·상징·가상 장면 경계를 검수한다. 이후 TV03 코퍼스 교체, TV04 실제 생성, TV05 release attachment 순으로 진행한다.

비밀번호, 키, 토큰, 쿠키, 고객 입력 원문은 기록하지 않았다.
