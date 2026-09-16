# 운명상회 Tone V2 티저 신뢰 게이트

## observation

저장 레코드는 유료 본문 노출을 막기 위해 섹션 hook과 interpretation을 비운 뒤 보관한다. 그 빈 객체로 티저까지 조립하면 제목과 결제 범위만 남고, 실제 판정 근거와 생활 장면이 사라진다. 반대로 빈 객체에 구조 검수를 즉시 강제하면 정상 레코드 생성 전체가 500으로 실패한다.

## decision

- 유료 저장 본문은 계속 비워 두되 무료 티저만 입력별 결정론적 템플릿에서 먼저 조립한다.
- 티저의 첫 판정은 조립 원천에 실제로 존재해야 한다.
- 대표 근거는 최대 두 개로 줄이고, 생활 장면 및 구체적인 전체 해석 범위를 검수한다.
- 로그인·결제·서버·생성 상태, 잠긴 본문의 가짜 인용, 공포·손실 압박, 확정 예언은 저장 및 읽기 경로에서 차단한다.
- 구조 검수는 release/eval 증거로 남기고, 안전 위반만 런타임에서 fail closed 한다. 초기 합성 레코드처럼 조립 시점에 내용이 부족한 내부 흐름까지 구조 부족으로 중단하지 않는다.

## artifact

- `src/report/report-preview.ts`
- `src/report/report-store.ts`
- `src/flow/newyear-service.ts`
- `src/report/tone-v2-review.ts`
- `tests/unit/report-content-guards.test.ts`
- `tests/unit/tone-v2-generation.test.ts`
- `tone-v2/reviews/P01-common-9.md`

## QA result

- RED 1: `reviewTeaser` export 부재.
- GREEN 1: 장면 없음 fixture의 summary에 `출근`이 남아 있던 테스트 오류를 수정.
- Integration RED: 비워진 pending report를 검수해 15개 흐름 실패. 결정론적 template에서 티저만 먼저 만들도록 수정.
- Integration RED 2: wedding 근거 제한이 길흉 비확정 문구를 잘라냄. 해당 경계를 paid scope로 이동.
- Read-path RED: 기존 `guardPreview`가 압박 문구를 통과시킴. 안전 검수를 읽기 경로에도 적용.
- Final: focused §9 prompt 1/1, teaser review 3/3, related integration 69/69, compiler/task 7/7, regenerated task index 3/3, and full regression 657/657 PASS. Typecheck, Vercel build, and diff check PASS.

## lesson

무료 티저와 유료 본문이 같은 리포트 원천을 써도 저장 시점은 다르다. 유료 본문 redaction 전에 제한된 티저를 동결하고, redaction 이후 객체로 티저를 재생성하지 않아야 근거와 접근권한을 동시에 지킬 수 있다.

## relation

- `personal/carrotcap/notes/umsh-tone-v2-evidence-layers-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-score-visual-evidence-gate-20260912.md`

## next_patch

20개 서비스 실제 티저와 기존 저장 레코드를 구조·자연스러움·근거 정확성 기준으로 평가하고, 실패 레코드의 안전한 재생성/마이그레이션 정책을 별도 승인해야 한다. 서버 CreamWIKI reindex는 현재 클라이언트에서 실행할 수 없다.
