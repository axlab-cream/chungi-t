# 카카오 챗봇 "상주 천명" AI 스킬 서버 (2026-10-14)

## 결정 (사용자, 2026-10-14)

- 10/12 "스킬 서버 연동 안 함" 결정을 뒤집는다. 챗봇이 자유대화(천명 페르소나)와 우리궁합 맛보기를 직접 한다.
- 모델: 웹 천명상담과 같은 제미나이(`GEMINI_API_KEY`, `GEMINI_CHAT_MODEL` 기본 `gemini-3.8-flash`). 카카오만 `KAKAO_CHAT_MODEL`로 따로 바꿀 수 있다. 5.6 Luna(OpenAI)는 쓰지 않는다.
- 생각 강도 low (`thinkingConfig.thinkingLevel = 'low'`).
- 무료: 카카오 손님마다 **매일 5번**(KST 자정 초기화. 2026-10-14 10번 → 2026-10-15 5번으로 줄임). 다 쓰면 "더 궁금해? 궁금하면 운명상회로 들어와봐." + 운명상회 버튼.
- 안전장치: 챗봇 전체 하루 2,000번 상한(같은 표의 고정 키 한 행).
- 말투: 카카오 채널 문구와 같은 반말("손님").

## 구조

| 파일 | 역할 |
|---|---|
| `src/kakao/skill.ts` | `POST /api/kakao/skill`. 비밀 헤더 확인 → 대화 처리 → 3.8초 안에 끝나면 바로, 아니면 `useCallback` 후 콜백 URL로 전송(Vercel `waitUntil`) |
| `src/kakao/birth-parse.ts` | "1995년 3월 2일 양력 여자 오후 3시" 같은 문장을 코드로 읽음(AI 호출 없음) |
| `src/kakao/chat-store.ts` | Supabase REST(service role) 저장소 + 테스트용 메모리 구현 |
| `supabase/migrations/20261014120000_kakao_chatbot_sessions.sql` | `kakao_chat_sessions` 표, `kakao_chat_claim`/`kakao_chat_refund` 함수 |
| `tests/unit/kakao-skill.test.ts` | 파서, 비밀 헤더, 하루 횟수, 실패 시 환원, 궁합 흐름, 콜백 |

### 대화 흐름

- 자유대화: 폴백 블록 → 스킬. 1번 답할 때마다 하루 횟수 1 차감. AI 실패 시 환원. 마지막(5번째) 답에는 운명상회 버튼을 붙인다.
- 우리궁합: "우리궁합" 발화/블록 → 본인 생일 요청 → 상대 생일 요청(여기까지 AI 호출·차감 없음) → 기본 궁합 300~450자(1회 차감) + "더 궁금해? 궁금하면 운명상회로 들어와봐." + [궁합 자세히 보기] → `https://umsh.kr/match/couple?utm_source=kakao&utm_medium=chatbot&utm_campaign=cheonmyeong`.
- 궁합 입력 중 "그만"이면 종료, 숫자 없는 말이면 궁합을 접고 자유대화로 받는다. 30분 지나면 입력 상태 만료.
- 손님 식별: 카카오 botUserKey의 sha256만 저장. 대화 기록은 그날 것만 최근 12턴. 회원 계정·결제·웹 천명상담 크레딧과 분리.

## 켜는 순서 (남은 일)

1. [GATE H1] 브랜치 `claude/kakao-chatbot-ai` 원격 push → PR → 머지(사용자 승인).
2. [GATE H2] 마이그레이션 `20261014120000_kakao_chatbot_sessions.sql` 운영 Supabase 적용(사용자 승인). 적용 전에는 스킬이 "천명이 잠깐 자리를 비웠어" 안내만 하고 AI를 부르지 않는다.
3. Vercel 환경변수 `KAKAO_SKILL_SECRET`(임의의 긴 문자열) 추가, 선택: `KAKAO_BOT_ID=6acc7d4974acc16f169bf6e6`. 없으면 스킬은 503.
4. 챗봇 관리자센터 > 스킬 > 스킬 추가: URL `https://umsh.kr/api/kakao/skill`, 헤더 `x-umsh-kakao-secret: <같은 값>`.
5. 폴백 블록: 파라미터에 시스템 엔티티 `@sys.text` 불필요(발화는 userRequest.utterance로 옴). 스킬 연결, 봇 응답 = 스킬데이터, 더보기 > Callback 설정 켜기(대기 문구 "잠깐, 명부 좀 펼쳐 볼게."). 콜백은 2026-10-14 기준 별도 신청 없이 블록에서 바로 켤 수 있음을 확인.
6. 우리궁합 블록: 기존 텍스트 응답 대신 스킬 연결 + 스킬데이터 응답.
7. 배포 후 운영 채널에서 실제 대화로 확인(봇테스트는 콜백을 완전히 지원하지 않음).

## 검증

- [NOT_RUN] `npm run typecheck`, `npm test`: 이 세션 샌드박스에서 node 실행 불가(`lstat C:\` EPERM, node_modules 비어 보임). PR CI에서 확인 필요.
- [DONE] 운영 서버에 제미나이 키 설정 확인: 비로그인 `GET /api/consultation/context` 가 503(키 없음)이 아니라 401(로그인 필요).

## 비용 메모

- gemini-3.8-flash 단가: 입력 $0.75 / 출력 $3.75 per 1M 토큰(2026-12-31까지 할인가), 2027-01-01부터 두 배. 생각 토큰은 출력 요금.
- 대화 1번(입력 4천, 출력 800 토큰 가정) 약 8원, 내년 약 17원. 손님 1명이 하루 5번 다 써도 약 40원(내년 약 85원).

## 2026-10-15 변경

- 말투: 채널 톤 '서늘한 가게 주인'(A안)으로 PERSONA 교체, 하루 한도 안내에서 무료·횟수 표현 제거.
- 천명사주 무료 미리보기·오늘의 운을 카톡에서 생일 한 줄로 확인. umsh.kr 무료 화면과 같은 코드(buildUiAnalysisPayload 주입, createSavedPreview, buildTodayFortune). AI·횟수 차감 없음.
- 하루 무료 자유대화 10번 → 5번. 모델은 gemini-3.8-flash 유지(더 싼 모델 검토 후 보류).
- 머지 후 챗봇 관리자센터에서 '천명사주'·'오늘의운' 블록을 스킬에 연결하고 배포해야 한다.
