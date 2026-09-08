# 집 풍수 12장 생성 가이드 v3 적용

## 목적

`umsh_fengshui_llm_prompt_guide.md` 기준으로 집 풍수 서비스를 12장 구조로 확장하고, 반복 입력 요약·제작용 제목·내부 운영 문구가 고객 화면과 생성 본문에 남지 않도록 정리했다.

## 적용 범위

- 서비스 키: `home_fit`
- 코퍼스: `data/corpus/home-fit-service.json` 3.0.0, 12개 블록 `hfit-001`~`hfit-012`
- 상세 섹션:
  1. 이 집, 나랑 찐으로 결 맞아?
  2. 터가 나를 받치나, 밀어내나
  3. 물길·도로·바람, 뭐가 치고 들어오나
  4. 빛은 약인가, 알람 폭탄인가
  5. 건물과 세대의 기본 체력
  6. 현관에서 이미 기 빨리나
  7. 침실은 쉬는 방인가, 야근 2차전인가
  8. 책상은 집중석인가, 알림 콜로세움인가
  9. 돈이 새나, 동선이 새나
  10. 같이 살면 케미, 아니면 소음 협약
  11. 내 사주 × 집 오행 핏
  12. 그래서 뭘 하면 되는데?

## 구현 내용

- `src/report/home-reading-corpus.ts`: 12장 전용 섹션 계약, 생성 지침, 리뷰 게이트 추가.
- `prompts/services/home_fit.md`: 12장 역할, 근거 라벨, 행동 메타, 중복 방지, 미측정값 처리 규칙 반영.
- `src/report/report-generator.ts`, `src/report/standard-reading.ts`, `src/rag/retriever.ts`: home_fit 섹션·코퍼스 라우팅을 12장으로 정렬.
- `사주/place/home/01~06` 화면: 티저/유료 예고/목록/상세 이동을 12장 기준으로 정리.
- `사주/js/home-dashboard.js`: 전체 판정에만 대시보드·점수판을 두고, 개별 상세는 주제별 본문에 집중하도록 분리.
- 05/06 화면의 고객 불필요 내부 문구(`서버 권한 확인`, `운영 환경`) 제거.
- 이전 섹션 ID `house-energy`, `spatial-fix`는 기존 URL 호환용 alias로만 유지하고, 새 화면 표시는 12장 ID를 기준으로 처리한다.

## 2026-09-07 추가 보정: 터 유사도 고객 표현

- 고객 화면과 PDF에는 `측정 전`, `DEM`, `자료 없음` 같은 내부 데이터 결손·원천명 표현을 노출하지 않는다.
- 터 관련 장은 `터 유사도`, `터 타입`, `비슷한 터의 생활 패턴`, `도착 전후의 몸 반응`으로 설명한다.
- 풍수 API 응답에서 `siteSimilarityScore`, `siteSimilarityLabel`, `siteArchetype`, `similarCases`를 받아 상세/대시보드/생성 문장에 연결한다.
- API 유사도 점수가 있으면 점수로 표시하고, 없으면 점수를 만들지 않는다. 대신 “비슷한 생활 패턴 기준”처럼 고객이 이해할 수 있는 표현으로 대체한다.
- 예외/fallback 문장과 정적 산출물의 예전 `집의 기본 기운` 제목을 12장 기준의 `터가 나를 받치나, 밀어내나`로 교체했다.

## 생성 검수

- 실제 모델 생성 QA: `npx tsx scripts/qa-home-generation.ts`
- 결과 경로: `output/home-generation-qa-v9-site-similarity/generated.json`
- 완료: 12/12
- 12장은 1차 생성에서 소제목 형식 검수 실패 후 재생성되어 최종 통과.
- 편집 검수: `node scripts/qa-home-editorial-review.mjs`
  - 입력 반복: 기존 8건 → 0건
  - 고객용 근거 라벨: 12/12
  - 행동 메타: 12/12
  - 고객 노출 부적합 데이터 문구: 0건
  - 긴 문장 중복: 0건

## PDF 산출

- 생성 명령: `python scripts/qa-home-pdf.py`
- PDF: `output/pdf/home-reading-generation-qa-v9-site-similarity.pdf`
- 검증:
  - `pdfinfo`: A4 27페이지, 암호화 없음, JS 없음
  - `pypdf`: 12장 제목, `터 유사도`, `고객 노출 부적합 데이터 문구 0건` 추출 확인
  - `pypdf`: `측정 전`, `DEM`, `자료 없음` 미노출 확인
  - `pdftoppm`: 27페이지 PNG 렌더링
  - 표지/검수/터 유사도 본문 육안 확인: 잘림·겹침·폰트 깨짐 없음

## 테스트와 배포

- `npm test`: 370개 통과
- 집 풍수 대상 회귀: 15개 통과
- `npm run check:prompt-guide`: 통과
- `npm run check:polish`: 통과
- `npm run typecheck`: 통과
- `npm run vercel-build`: 통과
- Production 배포:
  - Deployment: `https://chungi-d0z4g23b4-ax-lab-cream.vercel.app`
  - Alias: `https://umsh.kr`, `https://www.umsh.kr`
  - Vercel status: Ready

## 공개 URL QA

- `https://umsh.kr/place/home/01-step-1-story/index.html`: 200, 공통 셸 호스트 확인, 12장 문구 확인, 내부 문구 없음
- `https://umsh.kr/place/home/04-step-4-report/index.html`: 200, 공통 셸 호스트 확인, 내부 문구 없음
- `https://umsh.kr/place/home/05-step-5-chat/chat.html`: 200, 공통 셸 호스트 확인, 내부 문구 없음
- `https://umsh.kr/place/home/06-step-6_1-report-detail/index.html?section=terrain-support`: 200, 공통 셸 호스트 확인, 내부 문구 없음
- `https://umsh.kr/place/home/06-step-6_1-report-detail/index.html?section=home-fit-overall`: 200, 공통 셸 호스트 확인, 내부 문구 없음

## 한계와 운영 메모

- QA PDF는 합성 검수 입력으로 생성한 샘플이다. 특정 고객 저장 리포트를 덮어쓰거나 DB 데이터를 변경하지 않았다.
- 풍수 지리 API 값이 실제 요청에 포함되면 터 유사도, 터 타입, 유사 생활 사례, 점수 산정에 반영된다. 값이 없더라도 고객에게 데이터 결손 문구를 노출하지 않는다.
- “단정적인 공포/확신”은 고객 설득력을 위해 쓰지 않는다. 대신 계산·측정·사용자 체감에 근거한 선명한 우선순위와 생활 장면 중심의 확정 표현을 쓴다.
