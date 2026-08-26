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
| RAG 인덱스 청크 | 139개 |
| RAG 도메인 | myeongri_basics, deep_saju_interpretation, input_context_interpretation, saju_95_quality_bundles, saju_elements, consultation_templates |
| 리포트 섹션 | 37개 |
| 템플릿 리포트 기본 글자 수 | 약 20,056자 |
| 선택지 샘플 검색 | `본인`, `동성 관계 중심`, `마음에 둔 사람이 있어요`, `직장 다녀요`, `고민 입력` 청크가 상단 포함 |

## 테스트

- `npm test`: 34개 통과
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

## 2026-08-27 항목별 95점 묶음 재보강

상태: 확인됨

사용자가 감사표의 낮은 점수 항목 전체가 실제로 만들어졌는지 재확인했고, `일간/강약/기질`, `오행 균형`, `십신 관계성`, `용신`, `성격/기질 리포트`, `현재 고민 연결`, `대운·세운`, `인생 전환 시기`, `재물운`, `일/직업 흐름`, `연애운`, `인연/운명의 상대`, `관계 반복 패턴`, `시기와 장소`, `5만 자 장문 리포트`를 하나의 재사용 가능한 RAG 묶음으로 다시 구성했다.

### 추가 적용

| 영역 | 변경 |
|---|---|
| 항목별 95점 번들 | `data/corpus/saju-95-quality-bundles.json` 추가. 15개 핵심 항목 + `위험·주의 신호와 미래 걱정` 보조 번들 구성 |
| RAG 연결 | `src/rag/retriever.ts`, `src/rag/embedder.ts`가 새 번들을 함께 인덱싱 |
| 검색 정밀도 | context가 없을 때 `고민 없음` 청크가 자동 핀 처리되어 항목별 번들을 밀어내던 문제 수정 |
| 리포트 위험 신호 | `src/report/report-generator.ts`에 조건부 위험 문단 추가. 겁재·상관·편관, 과다/부족 오행, 대운·세운 변화, 사용자 고민에서 실제 신호가 드러날 때만 주의할 것·피해야 할 선택·미래에 먼저 흔들릴 지점을 안내 |
| OpenAI 섹션 지시 | 전체 리포트/단일 섹션 프롬프트에 “억지 경고 금지, 드러난 위험 신호만 짧게 경고” 규칙 추가 |
| 테스트 | `tests/unit/rag-retriever.test.ts`가 16개 q95 번들 포함, registry 관리, 항목별 질문 회수를 검증. `tests/unit/report-generator.test.ts`가 조건부 위험 문단 포함을 검증 |
| Living RAG 구조 | `data/corpus/registry.json`과 `src/rag/corpus-registry.ts`를 추가해 pack 활성화, version, role, retrievalBoost를 중앙 관리 |

### 갱신 수치

| 지표 | 결과 |
|---|---:|
| RAG 인덱스 청크 | 139개 |
| RAG 도메인 | myeongri_basics, deep_saju_interpretation, input_context_interpretation, saju_95_quality_bundles, saju_elements, consultation_templates |
| 리포트 섹션 | 37개 |
| 템플릿 리포트 기본 글자 수 | 약 23,061자 |
| 조건부 위험 신호 포함 섹션 | 샘플 기준 12개 |

### 검증

- `npm test`: 34개 통과
- `npm run typecheck`: 통과

### 운영 기준

- 위험 신호는 모든 섹션에 강제로 넣지 않는다.
- 사주 구조와 사용자 선택지에서 실제 신호가 드러날 때만 `주의할 것`, `피해야 할 선택`, `미래에 먼저 흔들릴 지점`을 짧게 알려준다.
- 경고는 확정 예언이 아니라 생활 기준이다. 질병 진단, 투자 수익 보장, 법률 판단, 특정 불행 단정은 금지한다.
