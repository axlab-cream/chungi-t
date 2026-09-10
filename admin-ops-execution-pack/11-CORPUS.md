# 코퍼스·프롬프트 관리 PRD
근거: 현재 registry의 chunks/structured/templates, active/paused/deprecated 및 fingerprint. 신규 편집 라이프사이클은 draft/in_review/approved/released/retired이며 런타임 status와 별개다.

## 편집 객체
Pack: id, domain, kind, role, version, retrievalBoost, sourceIds, serviceKeys, runtimeStatus.
KnowledgeBlock: id, topic, keywords, concept, condition, interpretation, real_world_pattern, risk, opportunity, advice, confidence, forbidden_generalization.
신규 관리 metadata: schemaVersion, sourceIds, reviewer, reviewedAt, checksum, parentVersion, changeReason.
기존 confidence 타입·structured/templates 구조는 실제 src/types 및 각 JSON을 읽고 별도 schema로 정의한다. 모든 팩을 knowledgeBlocks 하나로 강제 변환하지 않는다.

## 필수 관리 기능
- 파일 import: UTF-8 JSON, 크기 제한, 중복 ID, 빠진 필드, 참조 오류, 금지 원문 탐지. 오류를 행·필드 단위로 반환.
- 출처: 제목·위치·권리 근거·적용 범위·검수 상태. 근거 없으면 approved로 이동 불가.
- 편집: 필드별 diff, 초안 저장, 버전 복원, 충돌 revision 안내.
- 연결: 서비스키와 domain 매핑, 활성 팩 수, 미연결 서비스, deprecated 참조 탐지.
- 검색 실험: 합성 질문·Feature JSON 입력, 후보 ID·적용조건·필터링 결과. 실제 retriever와 동일 경로로 실행.
- 품질 신고 연결: caseId→reportId→snapshot→block. 연결 데이터가 없으면 미기록으로 표시.
- export: 승인 버전만 배포 bundle에 포함, checksum 검증.

## 내용 원칙
코퍼스는 내부 판단 재료다. 사용자용 완성 상담문·고전 원문·개인 상담사례를 그대로 적재하지 않는다. 없는 사건·직업·상대 마음을 사실로 단정하지 않는다. 생시 미상, 입력 정보 부족, 관계 안전 이슈, 평온한 상태를 분리한다. 실제 사용자 입력을 자동으로 평가셋·코퍼스에 편입하지 않는다.

## 평가 설계
20종 각 최소 10개 합성 사례: 보통 입력 3, 생시 미상 2, 정보 부족 1, 상충 맥락 1, 긴 입력 1, 도메인 위험 1, 회귀 사례 1. 서비스 특성에 맞게 위험 사례를 바꾼다.
기준 버전과 후보에 동일 입력·seed 지원 여부·모델 설정·검색 조건을 기록한다. 결정성이 보장되지 않으면 반복 결과와 분산도 기록한다.

| 평가 항목 | 방식 | 초기 통과안 |
|---|---|---|
| 스키마·참조 | 자동 | 오류 0 |
| 중대 위반 | 자동 탐지 + 인간 검수 | 허구 사실 단정·개인정보 누출 등 0 |
| 검색 적합성 | 라벨된 관련 블록 top-k | 기준 대비 하락 2%p 초과 시 반려 검토 |
| 맥락 부합·가독성 | 1~5 인간 루브릭 | 각 평균 4 이상, 낮은 사례 재검수 |
| 복사·중복 | 유사도·반복 검사 | 임계값은 기준셋으로 보정, 수치만으로 승인 금지 |
| 비용·지연 | 사용량·실측 | 기준 대비 20% 증가 시 사유·승인 필요 |
| 완료 불변 | 기존 report 재조회 | 본문·ID 불변 |

품질 목표는 제안값이며 첫 기준셋 실행 후 ADR로 확정한다. 평가 점수를 서비스의 과학적 정확도 수치로 표시하지 않는다.

## 프롬프트 버전
공통 시스템, 서비스 프롬프트, voice contract, 모델 설정, 코퍼스 fingerprint를 release manifest에서 묶는다. 공통 변경은 20종 회귀, 단일 서비스 변경은 해당 서비스 전체+공통 smoke. API key는 편집 대상이 아니다.

## 배포·복구
승인 hash와 평가 hash 일치 → artifact checksum → runtime loader 호환성 검사 → 환경별 activate → 신규 생성 fingerprint 확인.
문제 발생 시 직전 manifest로 active pointer를 CAS 복구한다. 파일 bundle 배포 방식이면 이전 배포로 복구하는 절차를 사용한다. active pointer 방식과 파일 배포 방식을 동시에 진실의 원천으로 쓰지 않는다.
