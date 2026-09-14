---
wiki_type: knowledge
doc_type: work-log
topic: saju-master-corpus-snapshot
category: Engineering
tags:
  - CreamWIKI
  - AIOS
  - RAG
  - corpus-versioning
  - evidence-boundary
routes:
  - 11 Ops
  - 12 QA/Evaluation
  - 14 Memory/KMS
privacy_level: internal
created_at: 2026-09-13
updated_at: 2026-09-13
---

# 운명상회 천명사주 코퍼스 근거 경계와 스냅샷 전환

## Observation

`saju_master` 2.0.0은 한 블록의 조건과 금지선에 자동 이관 문구가 중복되고, 실제처럼 보이는 사례 세 문장이 가상 사례로 표시되지 않았다. 원국·십신·대운 계산값과 실제 생활 사실의 경계도 명시적이지 않았다.

## Decision

사용자가 입력하거나 확인한 사실, 서버가 계산한 원국·십신·대운, 상징적 검토 질문, 가상 사례를 분리했다. 성격·직업·재물·관계·건강·미래 사건·타인의 마음을 원국이나 대운만으로 단정하지 않으며 의료·법률·투자·계약 판단은 객관 자료와 전문가를 우선한다. 기존 2.0.0은 보존하고 신규 snapshot만 2.1.0을 사용한다.

## Artifact

- `data/tone-v2/corpus/releases/saju-master-service-2.1.0.json`
- `tone-v2/corpus-review/saju-master-2.1.0.json`
- `tone-v2/releases/saju-master-2.1.0.json`
- `tests/unit/saju-master-corpus-release.test.ts`

## QA Result

| Check | Result |
| --- | --- |
| Semantic review | 1/1 PASS |
| Snapshot isolation | retrieval, prompt, saved-attempt review PASS |
| Hash mismatch | fail-closed PASS |
| Related | 98/98 PASS |
| Full regression | 767/767 across 107 suites PASS |
| Provider output | NOT_RUN |
| Production | NOT_RUN |

## Lesson

상징 체계의 계산 정확성과 현실 주장 정확성은 다른 층이다. 계산값은 서버 근거로 고정하고 현실 사건과 개인 특성은 사용자 확인 사실로만 다루며, 상징 해석은 검토 질문으로 한정해야 한다.

## Next Patch

남은 서비스 코퍼스는 registry 순서로 별도 Task에서 검수한다. 실제 provider 또는 Production 부착은 별도 승인 범위다.

## Sensitive Data Handling

- Secrets stored: no
- Raw secret-bearing logs stored: no
- Customer or provider prose stored: no
