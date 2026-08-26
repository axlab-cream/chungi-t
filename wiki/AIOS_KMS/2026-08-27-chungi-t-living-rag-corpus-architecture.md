# AIOS KMS 기록: chungi-t Living RAG/Corpus Architecture

작성일: 2026-08-27  
상태: 확인됨

## 핵심 원칙

천기 선생 RAG와 코퍼스는 고정 데이터가 아니라 계속 보정·강화되는 living knowledge layer다. 해석 품질은 코드만으로 완성되지 않으며, 사용자 피드백, 실제 상담 로그, 실패 질문, 부족한 항목 감사 결과를 코퍼스 pack으로 축적하고 회귀 테스트로 고정해야 한다.

## 구조

| 계층 | 책임 | 파일 |
|---|---|---|
| Corpus Registry | 활성 pack, version, role, retrievalBoost 관리 | `data/corpus/registry.json` |
| Corpus Pack | 주제별 chunk 묶음 | `data/corpus/*.json` |
| Structured Atom | 오행, 일간, 지장간 등 구조 데이터 | `data/corpus/saju-elements.json` |
| Intent Template | 상담 의도와 prompt frame | `data/corpus/consultation-templates.json` |
| Retriever | registry 기반 pack 로드, intent/keyword/context/vector 병합 | `src/rag/retriever.ts` |
| Vector Helper | registry 기반 chunk corpus TF vector 검색 | `src/rag/embedder.ts` |
| Corpus Snapshot | 활성 pack의 version/contentHash를 묶은 생성 지문 | `src/rag/corpus-registry.ts` |
| Report Persistence | reportId와 DB payload에 corpus fingerprint 저장 | `src/report/report-store.ts` |
| Regression Test | pack 누락, 의도별 회수 실패 방지 | `tests/unit/rag-retriever.test.ts` |

## 운영 규칙

1. 새 지식은 코드에 하드코딩하지 않고 `data/corpus/*.json` pack으로 추가한다.
2. pack을 추가하면 반드시 `data/corpus/registry.json`에 등록한다.
3. 품질 보정용 pack은 `role: quality_gap_patch`를 사용하고 `retrievalBoost`를 명시한다.
4. 사용자 선택지에 직접 대응하는 pack은 retrieval보다 우선 핀 처리한다.
5. 추가된 pack은 최소 하나 이상의 regression test로 특정 질문에서 회수되는지 검증한다.
6. 코퍼스가 과도하게 특정 pack으로 쏠리면 `retrievalBoost`를 낮추고 topK/섹션별 query를 조정한다.
7. RAG 점수는 실제 상담 로그와 실패 케이스를 기준으로 계속 재평가한다.
8. pack 내용 또는 registry 정책을 고쳤다면 pack `version` 또는 registry `version`을 갱신하고, report snapshot의 `fingerprint`가 바뀌는지 테스트한다.
9. 생성된 리포트에는 당시 활성 pack 목록, pack version, contentHash, registryVersion, fingerprint를 저장한다. 나중에 코퍼스가 강화되어도 과거 리포트가 어떤 근거로 만들어졌는지 추적 가능해야 한다.

## 현재 활성 pack

- `myeongri-basics`: 기본 명리 개념
- `deep-saju-interpretation`: 장문 리포트 심층 해석
- `input-context-interpretation`: 사용자가 누른 선택지 맥락
- `saju-95-quality-bundles`: 감사표 15개 부족 항목 보강
- `saju-elements`: 오행/일간 구조 데이터
- `consultation-templates`: 상담 intent와 prompt frame

## 결정 사항

- `CORPUS_FILES` 같은 코드 상수 목록은 폐기하고 registry를 단일 진입점으로 둔다.
- RAG 강화는 “pack 추가 → registry 등록 → retrievalBoost/핀 정책 조정 → regression test → WIKI 기록” 순서로 수행한다.
- 리포트 ID는 사주 입력값, 사용자 맥락, corpus fingerprint를 함께 해시해서 만든다. 같은 입력이라도 코퍼스가 바뀌면 새 리포트가 생성되고, 과거 리포트는 DB에 별도 payload로 남는다.
- 고객 재방문 시에는 같은 fingerprint의 리포트가 있으면 재생성하지 않고 저장본을 보여준다. 코퍼스가 보정된 뒤 새로 분석하면 최신 fingerprint 리포트를 생성한다.
- 이 구조는 향후 Postgres/vector DB 또는 embeddings를 붙일 때도 pack 단위 metadata를 그대로 사용할 수 있게 하기 위한 사전 설계다.

## 검증

- `npm test`: 34개 통과
- `npm run vercel-build`: 통과
- reportId 회귀 테스트: corpus fingerprint가 달라지면 같은 사주 입력과 맥락도 새 `reportId`를 만든다.
