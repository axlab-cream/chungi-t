# AIOS KMS 기록: chungi-t 리포트 페이지네이션·사전 생성·DB 저장 구조

작성일: 2026-08-27  
상태: 확인됨

## 요청

사주 기둥과 패턴에 따라 이미지, 분류, 풀이 순서로 장문 해석을 제공한다. 토큰 한계와 레이턴시를 고려해 전체 리포트를 한 번에 생성하지 않고, 목차/페이지네이션 구조로 나누며, 고객이 클릭하기 전에 백엔드에서 순차 생성해 DB에 저장한다.

## 적용 구조

| 영역 | 상태 | 근거 |
|---|---|---|
| 리포트 목차 | 확인됨 | `src/report/report-generator.ts` 37개 상세 섹션 |
| 패턴키 | 확인됨 | `yearPillar`, `monthPillar`, `dayPillar`, `hourPillar`, `dayMaster`, `dominantElement`, `weakElement`, `usefulGod`, `tenGod`, `target`, `orientation`, `relationship`, `work`, `concern` |
| 사전 생성 | 확인됨 | `src/report/report-queue.ts`에서 분석 직후 섹션을 순차 생성 |
| 저장소 | 확인됨 | `src/report/report-store.ts`에서 `DATABASE_URL` 있으면 Postgres, 없으면 memory fallback |
| 페이지 조회 | 확인됨 | `GET /api/report/:reportId`, `POST /api/report/section`, `POST /api/report/prewarm` |
| UI | 확인됨 | `사주/사주/index.html` 목차, 이전/다음 페이지, 타자형 출력 |
| 모델 분리 | 확인됨 | `data/runtime-config.json`의 `report.model = gpt-5.5` |

## 결정 사항

- `/api/saju/analyze`는 사주 분석과 함께 `reportId`, 목차, 진행 상태를 내려준다.
- 분석 직후 백엔드는 `startReportPreGeneration`을 호출해 1번 섹션부터 순차 생성한다.
- 고객이 다음 페이지를 누르면 `/api/report/section`이 저장된 섹션을 먼저 반환한다.
- 아직 생성되지 않은 섹션은 같은 API에서 즉시 생성 fallback을 수행한다.
- 결과 화면 진입 시 브라우저가 `/api/report/prewarm`을 비동기로 호출해 서버리스 함수가 열린 요청 안에서 순차 생성을 완료하도록 보강한다.
- 화면은 저장된 본문을 글자 단위 타자형으로 출력한다.
- 같은 생년월일·시간·성별·맥락은 같은 `reportId`를 만든다.
- 공통 이미지는 임시로 `/assets/hero-mystic.png`를 사용하고, 향후 섹션별 `imageKey`에 맞춰 교체한다.
- 37개 섹션은 명식/기둥/일간/오행/십신/용신/관계/일/돈/인연/대운·세운/시기·장소/장문 읽는 법으로 나뉜다.
- RAG는 사용자가 고른 대상, 관계 기준, 관계 상태, 일상 상태, 고민 문장을 우선 핀 처리해 해당 입력 맥락 청크가 먼저 들어오도록 한다.

## DB 운영 조건

- 재방문 보존을 위해 Vercel Production에는 `DATABASE_URL` 환경변수가 필요하다.
- `DATABASE_URL`이 없으면 `storage: memory`로 표시되며, 서버 재시작/서버리스 콜드 스타트 이후 리포트가 보존되지 않는다.
- Postgres 사용 시 `cheongi_reports` 테이블은 앱이 자동 생성한다.

## 검증

- `npm test`: 25개 통과
- `npm run typecheck`: 통과
- `npm run vercel-build`: 통과
- 템플릿 리포트 단위 검증: 37개 섹션 생성, `target`, `relationship`, `work` 패턴키 포함
- 로컬 섹션 API: `/api/report/section`에서 `profile` 섹션 `status=complete`, `generatedBy=template`
- 로컬 prewarm API: fallback 모드에서는 섹션을 순차 complete 처리하며, OpenAI 키가 있으면 섹션별 OpenAI 보강을 수행한다.
- 브라우저 검증: 리포트 목차, 공통 이미지 로드, 첫 페이지 본문 표시, 다음 페이지 버튼 동작, 타자형 완료 확인
- 스크린샷: `qa-report-reader-local.png`
- Production 배포: `dpl_Hf9SJQTAWL75HMzAGHamYaoJzzbK`
- Production 확인: `/api/health`는 `openai=true`, `DATABASE_URL` 미설정 시 `storage=memory`
- Production 리스크 확인: `DATABASE_URL` 미설정으로 `/api/report/:reportId` 재조회는 404가 날 수 있음

## 남은 과제

- Vercel에 실제 Postgres/Neon/Supabase 연결 후 `DATABASE_URL` 설정.
- Vercel serverless에서 장시간 OpenAI 생성이 더 길어질 경우 Vercel `waitUntil`, Queue, Cron, 또는 별도 worker로 보강.
- 현재 코퍼스는 확장됐지만, 섹션별 실제 상담 사례/반례/격국·조후 자료는 계속 보강 필요.
- gpt-5.5 API 모델 사용 가능 여부와 비용/토큰 한도를 운영 환경에서 확인.
