# AIOS KMS 기록: chungi-t 사주 RAG/코퍼스 품질 감사

작성일: 2026-08-27  
상태: 부분 확인됨

## 요청

사주팔자, 일간, 오행, 십신, 용신, 성격, 고민, 대운·세운, 재물운, 직업운, 연애운, 인연, 관계 패턴, 시기/장소, 장문 리포트 항목을 기준으로 현재 RAG와 코퍼스가 해석 품질을 얼마나 받쳐주는지 점수화한다.

## 확인 결과

| 영역 | 상태 | 근거 |
|---|---|---|
| 코퍼스 규모 | 확인됨 | `data/corpus/myeongri-basics.json` 10개 청크 + `data/corpus/deep-saju-interpretation.json` 65개 청크 + `data/corpus/input-context-interpretation.json` 22개 청크 |
| 실제 RAG 인덱스 | 확인됨 | `data/corpus/registry.json` 기준 총 139개 청크. 기본 청크, deep corpus, 입력 맥락 corpus, 95점 번들, 사주 요소, 상담 템플릿을 함께 검색 |
| 사주 요소 데이터 | 확인됨 | `data/corpus/saju-elements.json`에 천간 10개, 지지 12개, 오행 프로필 5개, 일간 조언 10개 |
| 상담 템플릿 | 확인됨 | `data/corpus/consultation-templates.json`에 target/relationship/work/career/wealth/love/fortune/personality/health/report/general 11개 intent |
| 리포트 섹션 | 확인됨 | `src/report/report-generator.ts` 37개 상세 섹션 |
| 장문 리포트 준비도 | 부분 확인됨 | 템플릿 리포트는 37개 페이지를 제공하고, OpenAI 보강 지시는 섹션당 1200~1800자 |

## 품질 평가

종합 해석 준비도: 68%

| 평가축 | 점수 | 판단 |
|---|---:|---|
| 구현 안정성 | 95% | `npm test` 34개 통과, `npm run typecheck` 통과 |
| RAG 검색 정밀도 | 78% | registry 기반 pack 관리, TF/intent/vector 병합, 입력 맥락 핀 처리, q95 항목별 회수 테스트 통과 |
| 코퍼스 깊이 | 64% | deep corpus, 입력 맥락 corpus, 95점 번들이 추가됐으나 항목별 실제 상담 사례·반례·격국 자료는 더 필요 |
| 사주 계산/분석 근거성 | 68% | 음력 변환, 입춘 기준 년주, 절기 기준 월주, 지장간 가중 오행, 합충형파해, 대운 시작 나이 근사 반영 |
| 리포트 말투/UX 적합성 | 82% | 천기 선생님 톤, 37개 페이지 구조, 타자형 UI가 잡힘. 실제 이미지와 고급 코퍼스는 추가 필요 |

## 항목별 점수

| 항목 | 점수 |
|---|---:|
| 명식/사주 구조 | 70% |
| 일간/강약/기질 | 62% |
| 오행 균형 | 65% |
| 십신 관계성 | 48% |
| 용신 | 50% |
| 성격/기질 리포트 | 55% |
| 현재 고민 연결 | 68% |
| 대운·세운 | 62% |
| 인생 전환 시기 | 58% |
| 재물운 | 62% |
| 일/직업 흐름 | 66% |
| 연애운 | 64% |
| 인연/운명의 상대 | 55% |
| 관계 반복 패턴 | 60% |
| 시기와 장소 | 58% |
| 5만 자 장문 리포트 | 66% |

## 주요 리스크

1. 현재 RAG 검색은 registry 기반 TF/intent/vector 병합이지만 OpenAI embeddings나 별도 벡터 DB는 사용하지 않는다.
2. 입력 맥락 핀 처리는 정확도를 올리지만 topK가 작을 때 일반 명리 청크가 밀릴 수 있으므로 섹션별 topK 조정이 필요하다.
3. `consultation-templates.json` intent는 확장됐지만 실제 리포트 품질은 corpus 본문 밀도에 좌우된다.
4. 용신 판단은 지장간·월령 보정이 들어갔지만 조후, 격국, 통관은 아직 corpus/계산 모두 더 필요하다.
5. 대운 시작 나이는 절기 간격 기반 근사값이며 전문 만세력 검산이 필요하다.
6. 운명의 상대, 장소, 특정 전환 연도, 돈구멍 같은 상품형 카피는 보강됐지만 실제 사례형 근거는 계속 축적해야 한다.

## 개선 우선순위

1. 새 지식은 `data/corpus/registry.json`에 pack으로 등록하고 regression test를 추가한다.
2. 코퍼스를 항목별로 최소 15~30개 청크씩 확장한다.
3. 격국, 조후, 통관, 십신 위치별 실제 상담 사례 자료를 추가한다.
4. 섹션별 이미지 키와 생성 예정 이미지를 매핑한다.
5. 실제 사용자 선택지/질문 로그가 쌓이면 retrieval regression 테스트를 더 늘린다.
6. OpenAI embeddings 또는 DB 기반 vector store 도입 여부를 결정한다.
