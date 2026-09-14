# 운명상회 Tone V2 서비스 RAG·코퍼스 비복사 경계

## Observation

전용 코퍼스 팩 20개가 registry에 있어도 런타임의 별도 서비스-도메인 상수에서 `wedding_day`가 빠져 있었다. 따라서 “팩 존재” 테스트만으로는 실제 검색 연결을 증명하지 못했다. 또한 프롬프트의 복사 금지 지시만 있고 생성 후 실제 검색 청크와 출력 문장을 대조하지 않았다.

## Decision

코퍼스 registry를 서비스 라우팅의 단일 정본으로 사용한다. 각 전용 팩이 `serviceKey`를 선언하고 retriever가 이 필드로 전용 domain을 찾는다. 생성 후에는 동일 요청에서 회수되는 청크의 의미 필드와 hook/body를 대조해 18자 이상 정규화 문장의 그대로 복사를 실패시킨다.

행동은 숫자로 꾸미지 않고 대상이 분명해야 한다. 자료가 없는 경우에는 개인 사실을 만들지 않고 지금 확인할 수 있는 현실 조건을 제시한다.

## Artifact

- `data/tone-v2/corpus/registry.json`: 20개 서비스의 명시적 `serviceKey`
- `src/rag/corpus-registry.ts`: registry 기반 `getServiceCorpusDomain()`
- `src/rag/retriever.ts`: 별도 하드코딩 표 제거
- `src/report/tone-v2-review.ts`: corpus copy/action target/missing-data 계약
- `src/report/report-generator.ts`: 실제 검색 청크를 생성 후 검수에 연결

## QA

- TDD RED: 39/42 PASS, 3 expected failures
- Focused GREEN: 93/93 PASS
- Compiler/task coverage: 7/7 PASS
- Full regression: 640/640 PASS
- Typecheck, Vercel build, diff check: PASS
- Live provider output evaluation: NOT_RUN

## Lesson

코퍼스 파일의 존재와 검색 연결은 다른 검증이다. 서비스-팩 매핑이 코드와 registry 두 곳에 있으면 한 서비스만 조용히 일반 검색으로 떨어질 수 있다. 또한 복사 방지는 프롬프트 지시뿐 아니라 “그 요청에서 실제 회수한 문장”을 생성 후 검수에 전달해야 재현 가능한 게이트가 된다.

## Relation

선행 기록: `umsh-tone-v2-evidence-layers-20260912.md`. AIOS route는 00 Context, 04 Workflows, 11 Ops, 12 QA/Eval, 14 Memory/KMS다.

## Next patch

공통 규칙 4의 유료 해석 밀도를 평가 계약으로 만든 뒤 `pass_angle`의 코퍼스 검색·생성·평가 vertical slice를 실행한다.
