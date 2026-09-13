---
wiki_type: knowledge
doc_type: work-log
topic: match-couple-corpus-snapshot
category: Engineering
tags:
  - CreamWIKI
  - AIOS
  - RAG
  - corpus-versioning
  - relationship-safety
routes:
  - 11 Ops
  - 12 QA/Evaluation
privacy_level: internal
created_at: 2026-09-13
updated_at: 2026-09-13
---

# 운명상회 궁합 코퍼스 관계 안전 검수와 스냅샷 전환

## Request Summary

`match_couple` 코퍼스 18개 블록을 실제 런타임용 검수 완료 버전으로 교체하면서 기존 리포트의 근거를 보존했다.

## KMS Queries

- `match_couple 궁합 코퍼스 의미 검수 상대 마음 안전 스냅샷`
- `궁합 관계 지속 확정 상대 심리 진단 안전 경계`

## Evidence Paths

- `data/tone-v2/corpus/releases/match-couple-service-2.1.0.json`
- `tone-v2/corpus-review/match-couple-2.1.0.json`
- `tone-v2/releases/match-couple-2.1.0.json`
- `tone-v2/evaluations/P05-match-couple-corpus-rag-release-candidate-20260913.json`
- `tests/unit/match-couple-corpus-release.test.ts`

## Changes

합·충, 오행, 일간, 십성, 운 흐름을 실제 관계 사실이 아닌 상징적 질문 후보로 제한했다. 상대 마음, 애정 수준, 의도, 관계 미래와 폭력 위험을 궁합으로 판단하지 않는다. 위협·통제·폭력은 일반 갈등과 분리해 안전 확보와 적절한 전문 지원으로 연결한다. 기존 2.0.0은 보존하고 신규 snapshot만 2.1.0을 사용한다.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| Semantic review | PASS | 18/18, 가상 사례 표지 |
| Snapshot isolation | PASS | retrieval, prompt, saved-attempt review |
| Hash mismatch | PASS | fail-closed |
| Provider output | NOT_RUN | 출력 품질을 주장하지 않음 |
| Production | NOT_RUN | 고객 데이터·배포 변경 없음 |

## Reusable Success Pattern

관계 코퍼스에서는 계산 기호, 사용자 입력, 상대가 확인한 사실과 가상 사례를 분리한다. 새 파일과 레지스트리 전환을 사용하고, 저장된 snapshot의 path/version/hash를 모든 후속 RAG 소비자에 전달하면 기존 결과를 다시 쓰지 않고 롤백할 수 있다.

## Failure or Risk Prevention Rule

상대 마음과 관계 미래는 사주로 확정하지 않는다. 위협·통제·폭력을 소통 궁합으로 축소하지 않는다. 실제 provider 출력 평가가 없으면 manifest에 null과 사유를 남긴다.

## Follow-Up

신규 `match_couple` 실제 출력 평가는 별도 승인 Task에서 격리 합성 입력으로 수행한다.

## Sensitive Data Handling

- Secrets stored: no
- Raw secret-bearing logs stored: no
- Customer or provider prose stored: no
