---
wiki_type: knowledge
doc_type: work-log
topic: quit-fortune-corpus-snapshot
category: Engineering
tags:
  - CreamWIKI
  - AIOS
  - RAG
  - corpus-versioning
  - immutable-reports
routes:
  - 11 Ops
  - 12 QA/Eval
  - 14 Memory/KMS
privacy_level: internal
created_at: 2026-09-13
updated_at: 2026-09-13
---

# 운명상회 퇴사운 코퍼스 스냅샷 고정과 롤백 가능한 릴리스 후보

Task ID: `task-tone-v2-p05-quit-fortune-corpus-rag-release-candidate`

## Date

2026-09-13

## Request Summary

퇴사운 전용 코퍼스를 의미 검수한 별도 버전으로 교체하고, 이미 생성 중인 리포트는 생성 당시 코퍼스를 계속 사용하도록 RAG를 고정했다.

## KMS Queries

- quit_fortune corpus semantic review RAG version release manifest rollback
- Tone V2 service corpus source hash future generated reports version attachment
- local ProjectOps snapshot and corpus history

## Evidence Paths

- `tone-v2/corpus-review/quit-fortune-2.1.0.json`
- `tone-v2/releases/quit-fortune-2.1.0.json`
- `tone-v2/evaluations/P05-quit-fortune-corpus-rag-release-candidate-20260913.json`
- `CreamAI/logs/review/task-tone-v2-p05-quit-fortune-corpus-rag-release-candidate_closure-review.md`

## AIOS Routes

- 11 Ops: registry-only attachment and rollback.
- 12 QA/Eval: active/old snapshot comparison, hash mismatch fail-closed and full regression.
- 14 Memory/KMS: reusable version-pinning prevention rule.

## Changes

- `quit_fortune` 2.1.0의 12개 블록을 입력 사실, 계산값, 상징 해석, 가상 사례 경계로 검수했다.
- 새 파일만 활성 registry에 연결하고 2.0.0은 롤백 대상으로 보존했다.
- 저장된 `CorpusSnapshot`을 검색, 생성 프롬프트, 저장 실패본 재검수까지 전달했다.
- 현재 vector index는 현재 snapshot에만 사용하고 과거 snapshot에는 섞지 않았다.
- snapshot 파일의 기록 해시가 실제 내용과 다르면 즉시 실패하도록 했다.

## Verification

| Check | Command or Method | Result | Notes |
| --- | --- | --- | --- |
| Task tests | `npx tsx --test tests/unit/quit-fortune-corpus-release.test.ts` | PASS | 8/8 |
| Related RAG tests | focused unit run | PASS | 41/41 |
| Full regression | `npm test` | PASS | 727/727, 102 suites |
| Build | `npm run vercel-build` | PASS | typecheck and SEO preparation |
| Codex review | closure review | PASS | Critical/Major/Minor 0 |

## Reusable Success Pattern

버전을 저장하는 것만으로는 과거 결과가 고정되지 않는다. 저장한 snapshot을 모든 후속 검색·생성·repair·review 경로에 전달하고, 현재 전용 vector 순위를 과거 snapshot에서 차단하며, 파일 해시까지 검증해야 한 리포트 안의 버전 혼합을 막을 수 있다.

## Failure or Risk Prevention Rule

활성 registry를 바꾸기 전에 기존 레코드 snapshot A와 신규 snapshot B를 같은 프로세스에서 검색해 서로의 고유 문장이 섞이지 않는지 검증한다. 롤백은 이전 파일을 덮어쓰지 않고 registry path/version만 되돌리는 방식으로 설계한다.

## Follow-Up

- Production 배포와 고객 데이터 변경은 별도 승인 전까지 실행하지 않는다.
- 다른 서비스 코퍼스도 동일한 의미 검수와 snapshot 테스트를 서비스별로 반복한다.

## Sensitive Data Handling

- Secrets stored: no
- Raw secret-bearing logs stored: no
- Redactions applied: provider prose and personal data are represented by hashes and counts only.
