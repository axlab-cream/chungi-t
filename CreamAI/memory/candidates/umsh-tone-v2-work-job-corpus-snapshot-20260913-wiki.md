---
wiki_type: knowledge
doc_type: work-log
topic: work-job-corpus-snapshot
category: Engineering
tags: [CreamWIKI, AIOS, RAG, corpus-versioning, career-evidence]
routes: [11 Ops, 12 QA/Evaluation, 14 Memory/KMS]
privacy_level: internal
created_at: 2026-09-13
updated_at: 2026-09-13
---

# 운명상회 직업운 코퍼스 실제 업무 근거와 스냅샷 전환

## Observation

`work_job` 2.0.0은 이관 정책이 중복되고 업무 장면이 가상 사례로 표시되지 않았다. 월주·십성 계산값과 실제 직무·업무·에너지·권한 조건의 경계도 명시적이지 않았다.

## Decision

사용자 확인 업무 사실, 서버 계산값, 상징적 질문, 가상 사례를 분리했다. 직업명·채용·승진·소득·성과·퇴사 결과·동료 의도는 예측하지 않는다. 계약·건강·재무 판단은 실제 기록과 적절한 전문 근거를 우선한다. 2.0.0은 보존하고 신규 snapshot만 2.1.0을 사용한다.

## QA Result

| Check | Result |
| --- | --- |
| Semantic review | 1/1 PASS |
| Snapshot isolation and hash mismatch | PASS |
| Related | 100/100 PASS |
| Full regression | 775/775 across 108 suites PASS |
| Typecheck / build | PASS |
| Provider / Production | NOT_RUN |

## Lesson

직업 적성은 직업명 예측이 아니라 확인된 업무 기록을 비교하는 구조로 다뤄야 한다. 테스트 fixture도 제품의 `SajuReportContext.work` 계약을 따라야 하며 타입 검사를 독립 게이트로 유지한다.

## Sensitive Data Handling

- Secrets stored: no
- Customer or provider prose stored: no
