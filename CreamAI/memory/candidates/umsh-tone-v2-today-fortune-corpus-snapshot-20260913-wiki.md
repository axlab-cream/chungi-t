---
wiki_type: knowledge
doc_type: work-log
topic: today-fortune-corpus-snapshot
category: Engineering
tags:
  - CreamWIKI
  - AIOS
  - RAG
  - corpus-versioning
  - daily-fortune
routes:
  - 11 Ops
  - 12 QA/Evaluation
  - 14 Memory/KMS
privacy_level: internal
created_at: 2026-09-13
updated_at: 2026-09-13
---

# 운명상회 오늘운 코퍼스 근거 검수와 결정적 렌더러 경계

## Observation

`today_fortune` 2.0.0은 한 블록뿐이지만 실제 상황 세 문장이 가상 사례로 표시되지 않았고, 조건과 금지선에 자동 이관 정책이 중복됐다. 오늘운 v3 본문은 별도 결정적 계산기로 생성되므로 RAG 코퍼스 변경과 렌더러 변경을 같은 것으로 주장하면 안 된다.

## Decision

서버가 계산한 기준일 일주, 사용자 원국, 사용자가 확인한 실제 일정과 상징적 질문을 분리했다. 모든 사례를 가상 사례로 표시하고 날짜·시각·사건·성과·타인의 반응 확정을 금지했다. 2.0.0은 보존하고 신규 RAG snapshot만 2.1.0을 사용한다. 결정적 렌더러는 변경하지 않았다.

## Artifact

- `data/tone-v2/corpus/releases/today-fortune-service-2.1.0.json`
- `tone-v2/corpus-review/today-fortune-2.1.0.json`
- `tone-v2/releases/today-fortune-2.1.0.json`
- `tone-v2/evaluations/P05-today-fortune-corpus-rag-release-candidate-20260913.json`
- `tests/unit/today-fortune-corpus-release.test.ts`

## QA Result

| Check | Result |
| --- | --- |
| Semantic review | 1/1 PASS |
| Snapshot isolation | retrieval, prompt, saved-attempt review PASS |
| Hash mismatch | fail-closed PASS |
| Related including daily renderer | 82/82 PASS |
| Full regression | 759/759 across 106 suites PASS |
| Provider output | NOT_RUN |
| Production | NOT_RUN |

## Lesson

한 서비스가 RAG 근거와 결정적 렌더러를 함께 가지면 두 경로를 따로 검증하고 결과도 분리해 보고한다. 코퍼스 registry 전환은 신규 snapshot의 검색 근거만 바꾸며, 별도 계산기를 변경하거나 평가했다는 뜻이 아니다.

## Relation

- `personal/carrotcap/notes/umsh-tone-v2-evidence-layers-20260912.md`
- `personal/carrotcap/notes/umsh-tone-v2-marry-match-corpus-snapshot-20260913.md`

## Next Patch

남은 서비스 코퍼스는 registry 순서로 별도 Task에서 검수한다. 실제 provider 또는 Production 부착은 별도 승인 범위다.

## Sensitive Data Handling

- Secrets stored: no
- Raw secret-bearing logs stored: no
- Customer or provider prose stored: no
