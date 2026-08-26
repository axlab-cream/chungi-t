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
| UI | 확인됨 | `사주/사주/index.html` 기본 스펙/CTA, `사주/chat.html` 상담형 목차·클릭 해석, 설정의 풀이 보관함, `reportId` 직접 조회 링크, LLM 해석 로딩바 |
| 모델 분리 | 확인됨 | `data/runtime-config.json`의 `report.model = gpt-5.5` |

## 결정 사항

- `/api/saju/analyze`는 사주 분석과 함께 `reportId`, 목차, 진행 상태를 내려준다.
- 분석 직후 백엔드는 `startReportPreGeneration`을 호출해 1번 섹션부터 순차 생성한다.
- 고객이 다음 페이지를 누르면 `/api/report/section`이 저장된 섹션을 먼저 반환한다.
- 아직 생성되지 않은 섹션은 같은 API에서 즉시 생성 fallback을 수행한다.
- 결과 화면 진입 시 브라우저가 `/api/report/prewarm`을 비동기로 호출해 서버리스 함수가 열린 요청 안에서 순차 생성을 완료하도록 보강한다.
- 화면은 저장된 본문을 글자 단위 타자형으로 출력한다.
- 같은 생년월일·시간·성별·맥락·corpus fingerprint는 같은 `reportId`를 만든다.
- 공통 이미지는 임시로 `/assets/hero-mystic.png`를 사용하고, 향후 섹션별 `imageKey`에 맞춰 교체한다.
- 37개 섹션은 명식/기둥/일간/오행/십신/용신/관계/일/돈/인연/대운·세운/시기·장소/장문 읽는 법으로 나뉜다.
- RAG는 사용자가 고른 대상, 관계 기준, 관계 상태, 일상 상태, 고민 문장을 우선 핀 처리해 해당 입력 맥락 청크가 먼저 들어오도록 한다.
- RAG와 코퍼스는 `data/corpus/registry.json`을 단일 진입점으로 쓰는 living knowledge layer로 관리한다.
- 생성된 리포트 payload에는 당시 활성 corpus pack, pack version, contentHash, registryVersion, fingerprint를 저장한다.
- 첫 화면과 결과 화면 상단에는 `천기 선생님` 로고와 우측 설정 버튼을 둔다.
- 설정의 풀이 보관함은 브라우저 `localStorage`에 최근 풀이를 저장한다. 같은 기기에서는 서버 DB가 없거나 서버리스 memory가 사라져도 저장된 전체 리포트를 다시 열 수 있다.
- 보관함은 `reportId` 기준으로 중복 저장을 막고 최대 12개까지 보존한다.
- 저장된 섹션이 `status=complete`이면 `/api/report/section`을 다시 호출하지 않고 로컬 본문을 바로 타자형으로 출력한다.
- 결과 화면에는 짧은 `풀이 ID`와 링크 복사 버튼을 표시한다.
- `?reportId=<id>` URL로 진입하면 브라우저 보관함을 먼저 확인하고, 없으면 `GET /api/report/:reportId`로 서버 저장 데이터를 조회해 결과 화면을 복원한다.
- `GET /api/report/:reportId`는 리포트 본문뿐 아니라 `birth`, `context`, UI 복원용 `analysis`를 함께 반환한다.
- `reportId`는 랜덤 값이 아니라 생년월일·시간·성별·상담 맥락·현재 corpus fingerprint로 만든 안정형 고유 ID다. 같은 조건의 동일한 풀이를 중복 생성하지 않기 위한 결정이다.
- `/api/saju/analyze`와 `/api/report/section` 호출 중에는 정지 화면처럼 보이지 않도록 인디터미넌트 로딩바를 표시한다.
- 전체 분석 로딩은 `명식 정렬 → 근거 회수 → 풀이 작성` 단계감을 주고, 섹션별 생성 로딩은 해당 장의 해석문이 열리는 중임을 작은 상태 카드로 보여준다.
- 결과 화면에는 기본 스펙과 상담 CTA를 남기고, 2번 이후 상세 사주풀이 분류 목차와 각 장의 해석은 `chat.html` 상담 화면에서 제공한다.
- 상담 화면은 `sessionStorage.cheongi_analysis`의 report 섹션 전체를 목차로 뿌리고, 사용자가 목차를 클릭하면 `/api/report/section`으로 해당 장의 LLM 해석을 불러온다.
- 해석 본문은 3~5줄 단위로 읽히도록 화면에서 자동 문단 분리하고, 생성 프롬프트는 중학생도 이해할 수 있게 전문용어를 쉬운 말로 풀도록 요구한다.
- 결제성 상담 데이터는 `reportId` 기준으로 `localStorage` 보관함에 리포트와 상담 대화 `chatHistory`를 함께 병합 저장한다. 오래된 항목을 자동 삭제하지 않고, 저장 공간 부족 시 기존 데이터는 유지한다.
- 상담 대화는 `/api/report/chat-history`로 서버 리포트 payload에도 저장할 수 있게 했다. `DATABASE_URL`이 연결된 운영 환경에서는 reportId 재조회 시 상담 히스토리도 함께 복원된다.
- 보관함 삭제는 각 항목의 X 버튼으로만 수행하며, 삭제 전 “되돌릴 수 없음” 확인창을 띄운다. 전체 삭제 버튼은 실수 위험 때문에 제거한다.
- 장문 해석과 상담 답변은 `[주요 포인트]`, `[주목할 점]`, `[주의할 점]`, `[위험 신호]`, `[위기 신호]`, `[해법]` 표식을 일부 문단에 붙이고, UI는 이를 강조 박스로 렌더링한다.
- 사용자 화면의 로딩/상태 문구에는 `RAG`, `코퍼스`, `LLM`, `OpenAI` 같은 기술 용어를 노출하지 않는다. 대신 “명식의 결”, “지금의 기운”, “천년의 흐름”, “천기 선생님이 풀이를 여는 중”처럼 서비스 세계관 문구를 사용한다.

## DB 운영 조건

- 재방문 보존을 위해 Vercel Production에는 `DATABASE_URL` 환경변수가 필요하다.
- `DATABASE_URL`이 없으면 `storage: memory`로 표시되며, 서버 재시작/서버리스 콜드 스타트 이후 리포트가 보존되지 않는다.
- Postgres 사용 시 `cheongi_reports` 테이블은 앱이 자동 생성한다.
- 같은 브라우저에서는 localStorage 보관함으로 재열람 가능하지만, 다른 기기/브라우저에서 `reportId`만으로 다시 열려면 Vercel Production의 `DATABASE_URL` 연결이 필수다.

## 검증

- `npm test`: 34개 통과 (`--test-concurrency=1`)
- `npm run typecheck`: 통과
- `npm run vercel-build`: 통과
- 템플릿 리포트 단위 검증: 37개 섹션 생성, `target`, `relationship`, `work` 패턴키 포함
- RAG registry 검증: 6개 활성 pack, 139개 인덱스 청크, q95 항목별 질문 회수 테스트 통과
- 로컬 섹션 API: `/api/report/section`에서 `profile` 섹션 `status=complete`, `generatedBy=template`
- 로컬 prewarm API: fallback 모드에서 37/37 섹션 complete, `storage=memory`, corpus fingerprint와 활성 pack 6개 payload 저장 확인
- 브라우저 검증: 리포트 목차, 공통 이미지 로드, 첫 페이지 본문 표시, 다음 페이지 버튼 동작, 타자형 완료 확인
- 로컬 상단 바 검증: 첫 화면에서 `천기 선생님` 로고와 우측 설정 버튼 표시 확인, 스크린샷 `qa-settings-top-local.png`
- 스크린샷: `qa-report-reader-local.png`
- Production 배포: `dpl_4nnLrs6dVuBKY8XWHN4MWRBGgQPh`
- Production 확인: `/api/health`는 `openai=true`, `DATABASE_URL` 미설정 시 `storage=memory`
- Production 리스크 확인: `DATABASE_URL` 미설정으로 `/api/report/:reportId` 재조회는 404가 날 수 있음

## 남은 과제

- Vercel에 실제 Postgres/Neon/Supabase 연결 후 `DATABASE_URL` 설정.
- Vercel serverless에서 장시간 OpenAI 생성이 더 길어질 경우 Vercel `waitUntil`, Queue, Cron, 또는 별도 worker로 보강.
- 현재 코퍼스는 확장됐지만, 섹션별 실제 상담 사례/반례/격국·조후 자료는 계속 보강 필요.
- gpt-5.5 API 모델 사용 가능 여부와 비용/토큰 한도를 운영 환경에서 확인.
