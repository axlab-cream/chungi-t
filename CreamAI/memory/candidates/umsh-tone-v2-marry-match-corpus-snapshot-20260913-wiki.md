---
wiki_type: knowledge
doc_type: work-log
topic: marry-match-corpus-snapshot
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

# 운명상회 결혼궁합 코퍼스 자율성·안전 검수와 스냅샷 전환

## Request Summary

`marry_match` 코퍼스 20개 블록을 실제 런타임용 검수 완료 버전으로 교체하면서 기존 리포트의 근거를 보존했다.

## KMS Queries

- `marry_match 결혼 궁합 코퍼스 의미 검수 결혼 시기 상대 가족 안전`
- `결혼 가능성 시기 상대 의도 가족 반응 확정 금지`

## Evidence Paths

- `data/tone-v2/corpus/releases/marry-match-service-2.1.0.json`
- `tone-v2/corpus-review/marry-match-2.1.0.json`
- `tone-v2/releases/marry-match-2.1.0.json`
- `tone-v2/evaluations/P05-marry-match-corpus-rag-release-candidate-20260913.json`
- `tests/unit/marry-match-corpus-release.test.ts`

## Changes

합·충, 오행, 일간, 십성, 운 흐름을 실제 결혼 사실이 아닌 상징적 질문 후보로 제한했다. 상대와 가족의 마음, 결혼 시기와 성사 여부, 주거·재무·직업·자녀 선택을 추정하지 않는다. 위협·통제·폭력과 연락 거절은 일반 갈등과 분리해 안전과 적절한 지원을 우선한다. 기존 2.0.0은 보존하고 신규 snapshot만 2.1.0을 사용한다.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| Semantic review | PASS | 20/20, 가상 사례 표지 |
| Snapshot isolation | PASS | retrieval, prompt, saved-attempt review |
| Hash mismatch | PASS | fail-closed |
| Full regression | PASS | 751/751, 105 suites |
| Provider output | NOT_RUN | 출력 품질을 주장하지 않음 |
| Production | NOT_RUN | 고객 데이터·배포 변경 없음 |

## Reusable Success Pattern

결혼 코퍼스에서는 계산 기호, 사용자 입력, 당사자가 확인한 사실과 가상 사례를 분리한다. 새 파일과 레지스트리 전환을 사용하고 저장된 snapshot의 path/version/hash를 모든 후속 RAG 소비자에 전달하면 기존 결과를 다시 쓰지 않고 롤백할 수 있다.

## Failure or Risk Prevention Rule

상대·가족의 마음, 결혼 미래와 임신·출산 선택은 사주로 확정하지 않는다. 위협·통제·폭력을 소통 궁합으로 축소하지 않는다. 실제 provider 출력 평가가 없으면 manifest에 null과 사유를 남긴다.

## Follow-Up

신규 `marry_match` 실제 출력 평가는 별도 승인 Task에서 격리 합성 입력으로 수행한다.

## Sensitive Data Handling

- Secrets stored: no
- Raw secret-bearing logs stored: no
- Customer or provider prose stored: no
