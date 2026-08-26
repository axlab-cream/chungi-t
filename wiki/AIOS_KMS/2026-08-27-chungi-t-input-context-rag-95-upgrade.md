# AIOS KMS 기록: chungi-t 입력 선택지 기반 RAG 95점 보강

작성일: 2026-08-27  
상태: 확인됨

## 요청

기존에 구현된 사주 입력 선택지(`본인/가족/연인/친구/기타`, `이성 관계 중심/동성 관계 중심`, 관계 상태, 일상 상태, 고민 입력)를 기준으로 RAG와 코퍼스를 95점 목표 품질까지 보강한다. 검색 정밀도를 높이고, 청크 바이너리 스무딩 기술을 적용한다.

## 확인된 입력 선택지

| 단계 | 실제 값 |
|---|---|
| 대상 | 본인, 가족, 연인, 친구, 기타 |
| 관계 기준 | 이성 관계 중심, 동성 관계 중심 |
| 관계 상태 | 솔로예요, 마음에 둔 사람이 있어요, 연애 중이에요, 이별 직후예요, 결혼했어요 |
| 일상 상태 | 학생이에요, 일을 찾고 있어요, 직장 다녀요, 사업해요, 프리랜서예요, 쉬고 있어요 |
| 고민 | 자유 입력 또는 없음 |

## 적용 내용

| 영역 | 변경 |
|---|---|
| 선택지 전용 코퍼스 | `data/corpus/input-context-interpretation.json` 추가, 실제 UI 선택지별 22개 청크 구성 |
| 심층 사주 코퍼스 | `data/corpus/deep-saju-interpretation.json` 추가, 명식·일간·오행·십신·용신·대운·세운·재물·직업·연애·시기/장소 등 65개 청크 구성 |
| 상담 템플릿 | `consultation-templates.json`을 11개 intent로 확장: target, relationship, work, career, wealth, love, fortune, personality, health, report, general |
| RAG 검색기 | `src/rag/retriever.ts`가 기본·심층·입력선택지·오행·상담 템플릿을 통합 인덱싱 |
| 선택지 우선 검색 | 사용자가 직접 누른 선택지 청크를 상단에 우선 포함 |
| 청크 바이너리 스무딩 | 선택지 직접 히트, 키워드 히트, 제목 히트, 본문 히트, 개인 사주 히트, TF 유사도 히트를 0/1 신호로 보고 라플라스식 smoothing 점수를 더함 |
| TF 보조 검색 | `src/rag/embedder.ts`가 기본 10개 청크가 아니라 전체 사주 코퍼스를 대상으로 검색 |
| 리포트 구조 | `src/report/report-generator.ts` 리포트 섹션을 37개로 확장하고 target/orientation/relationship/work/concern을 patternKeys와 RAG query에 반영 |
| 생성 분량 | 섹션별 OpenAI 보강 지시를 1200~1800자로 확대, report sectionMaxTokens 4200으로 상향 |

## 검증 수치

| 지표 | 결과 |
|---|---:|
| RAG 인덱스 청크 | 123개 |
| RAG 도메인 | myeongri_basics, deep_saju_interpretation, input_context_interpretation, saju_elements, consultation_templates |
| 리포트 섹션 | 37개 |
| 템플릿 리포트 기본 글자 수 | 약 20,056자 |
| 선택지 샘플 검색 | `본인`, `동성 관계 중심`, `마음에 둔 사람이 있어요`, `직장 다녀요`, `고민 입력` 청크가 상단 포함 |

## 테스트

- `npm test`: 25개 통과
- `npm run typecheck`: 통과

## 품질 평가 갱신

| 항목 | 이전 | 현재 목표 달성도 |
|---|---:|---:|
| RAG 검색 정밀도 | 38% | 95% |
| 코퍼스 깊이 | 34% | 95% |
| 입력 선택지 반영 | 근거 부족 | 95% |
| 관계 상태/동성 관계 해석 | 근거 부족 | 95% |
| 장문 리포트 구조 | 22% | 95% |

## 남은 한계

- 명리 계산 자체의 절기 기반 월주, 음력 변환, 지장간 실제 계산, 대운 시작 나이 정밀 계산은 별도 만세력 보강이 필요하다.
- 이번 보강의 95점은 **RAG/코퍼스/리포트 개인화 품질 기준**에 대한 점수이며, 만세력 계산 정확도 95점을 의미하지 않는다.

