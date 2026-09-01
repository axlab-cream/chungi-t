# Chungi-T RAG/Corpus Knowledge Block Refactor

## Context

기존 RAG 코퍼스 일부가 완성된 사주 답변에 가까운 설명문으로 저장되어 있어,
생성 모델이 전문용어와 문장 리듬을 그대로 복사할 위험이 있었다.

목표는 사주 원문과 전문가 해석을 보존하는 것이 아니라, LLM이 검색했을 때
실제 상담에 필요한 의미 단위만 꺼낼 수 있도록 코퍼스를 정제하는 것이다.

## Decision

아키텍처 기준을 다음 5단계로 고정했다.

1. 명식 계산
2. Feature JSON
3. RAG 검색
4. Interpretation
5. User Copy

RAG/Corpus는 최종 사용자 문장이 아니라 내부 판단 재료로만 사용한다.

## Implementation

- `RagKnowledgeBlock` 타입 추가
- `buildSajuFeatureJson()` 추가
- `knowledgeBlocks` 기반 코퍼스 로딩 지원
- 기존 `chunks`는 검색 호환용으로 유지하되 프롬프트에는 복사 금지 내부 근거로 변환
- `saju-95-quality-bundles.json`과 `paid-report-scene-corpus.json`을 완성 문장형에서 판단 블록형으로 교체
- 시스템 프롬프트와 리포트 프롬프트에 RAG/Corpus 문장 복사 금지, 전문용어 사용자 언어 번역 원칙 반영

## Reuse Rule

새 코퍼스 항목은 반드시 다음 필드를 가진다.

- `concept`
- `condition`
- `interpretation`
- `real_world_pattern`
- `risk`
- `opportunity`
- `advice`
- `confidence`
- `forbidden_generalization`

사용자에게 그대로 보여줄 완성 문장, 고전 원문, 특정 상담자의 개인 사례는 저장하지 않는다.

## Verification

- `npm run typecheck`
- `npm test`
