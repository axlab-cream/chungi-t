---
wiki_type: knowledge
doc_type: work-log
topic: money-save-corpus-snapshot
category: Engineering
tags:
  - CreamWIKI
  - AIOS
  - RAG
  - corpus-versioning
  - financial-safety
routes:
  - 11 Ops
  - 12 QA/Evaluation
privacy_level: internal
created_at: 2026-09-13
updated_at: 2026-09-13
---

# 운명상회 돈관리 코퍼스 의미 검수와 스냅샷 전환

## Date

2026-09-13

## Request Summary

`money_save`의 기존 코퍼스를 실제 런타임에 연결된 검수 완료 버전으로 교체하되, 기존 리포트의 근거는 바꾸지 않는 로컬 릴리스 후보를 만들었다.

## KMS Queries

- `money_save corpus semantic review 숫자 경계 RAG snapshot rollback`
- `운명상회 코퍼스 스냅샷 신규 리포트 롤백`

## Evidence Paths

- `data/tone-v2/corpus/releases/money-save-service-2.1.0.json`
- `tone-v2/corpus-review/money-save-2.1.0.json`
- `tone-v2/releases/money-save-2.1.0.json`
- `tone-v2/evaluations/P05-money-save-corpus-rag-release-candidate-20260913.json`
- `tests/unit/money-save-corpus-release.test.ts`

## Changes

기존 `2.0.0` 파일은 보존하고 열두 블록을 입력 사실, 서버 계산값, 상징적 후보, 가상 사례로 분리했다. 임의 금액·기간·개수·수익 처방과 실제 내역 없는 습관 단정을 제거했다. 신규 snapshot만 `2.1.0`을 선택하고 저장된 구버전 snapshot은 검색, 프롬프트, 저장 응답 검수에서 계속 `2.0.0`을 사용한다.

## Verification

| Check | Command or Method | Result | Notes |
| --- | --- | --- | --- |
| Semantic review | executable twelve-block assertions | PASS | sample output ingestion 없음 |
| Snapshot isolation | active/old retrieval, prompt and saved-attempt tests | PASS | hash mismatch fail-closed |
| Determinism | builder output hashes repeated | PASS | corpus/review/manifest 동일 |
| Provider output | evidence search and execution count | NOT_RUN | 실제 출력 품질을 주장하지 않음 |
| Production | mutation audit | NOT_RUN | 배포·고객 데이터 변경 없음 |

## Reusable Success Pattern

활성 파일을 덮어쓰지 말고 새 버전을 생성한다. 레지스트리 변경 전에 각 블록의 의미 경계를 실행 가능한 테스트로 고정한다. 보고서가 생성 시점의 코퍼스 snapshot과 content hash를 저장하고 모든 후속 검색·생성·재검수에 전달해야 레지스트리 롤백만으로 신규 보고서 경로를 되돌릴 수 있다.

## Failure or Risk Prevention Rule

재무 코퍼스에서 보편적인 기간·금액·비율·항목 수를 처방하지 않는다. 실제 출력 평가가 없으면 릴리스 manifest에 `generationEvidence: null`과 사유를 남기며 코퍼스 검수 결과를 출력 품질 평가로 바꾸어 말하지 않는다.

## Follow-Up

실제 `money_save` provider 출력 평가는 별도 승인 Task에서 격리 합성 입력으로 수행한다.

## Sensitive Data Handling

- Secrets stored: no
- Raw secret-bearing logs stored: no
- Redactions applied: provider prose and customer data were not collected
