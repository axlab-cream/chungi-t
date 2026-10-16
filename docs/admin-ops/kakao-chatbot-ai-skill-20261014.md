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

## 2026-10-16 회원 연결 + 보관함 저장 (브랜치 `claude/kakao-member-link`)

카톡 손님(user_key = botUserKey sha256)과 운명상회 회원을 이어, 카톡에서 본 천명사주 무료 미리보기·오늘의 운을 그 회원 보관함(umsh.kr/vault)에 남긴다.

| 파일 | 역할 |
|---|---|
| `src/kakao/member-link.ts` | 연결 저장소(REST·메모리), 일회용 토큰, `POST /api/kakao/link` 처리 |
| `src/kakao/skill.ts` | 결과 뒤 연결 분기(`deliverResult`), "남겨 줘"/"괜찮아"/"연결 끊기"(`memberTurn`), appUserId 로그(true/false만) |
| `src/server/app.ts` | 라우트 등록, `saveKakaoResultToVault`(사이트 저장 경로 재사용), `/kakao/link` 화면 |
| `사주/kakao-link.html`, `사주/js/kakao-link.js` | 로그인 후 연결 API 호출 화면 |
| `supabase/migrations/20261016120000_kakao_member_links.sql` | `kakao_member_links`, `kakao_link_tokens`, `kakao_chat_sessions` 열 3개, `kakao_link_consume`·`kakao_member_by_app_user` 함수 |
| `tests/unit/kakao-member-link.test.ts` | 토큰 만료·재사용, 비회원 거절, 자동 연결 질문·동의·거절·30일, 보관함 저장 호출, 연결 해제, appUserId 없음 |

### 흐름

- 결과(천명사주·오늘의 운)를 보낼 때만 연결 상태를 본다. 보통 대화에는 조회를 더하지 않는다.
  - 이어진 손님: 사이트와 같은 경로로 보관함에 저장하고 카드에 "네 보관함에도 꽂아 뒀어." + [보관함 열기].
  - appUserId 가 오고 같은 카카오 계정 회원이 있으며 30일 안에 거절하지 않았으면: 결과 두 말풍선 + "운명상회에 같은 카카오 계정이 있네.\n여기서 본 명부, 네 보관함에도 남겨 둘까?" + [남겨 줘] [괜찮아]. 30분 안의 답만 받는다.
  - 그 밖: 카드에 [보관함에 저장하기] → `https://umsh.kr/kakao/link#t=<토큰>`.
- 연결 전 마지막 결과는 `kakao_chat_sessions.last_result`(종류·카톡 입력 생일·시각)에 두고, 연결 순간 그 결과를 저장한다.
- 저장 경로: 천명사주 = `/api/saju/analyze` 미리보기와 같은 `createOrGetReportRecord`(같은 ID·계보 규칙), 오늘의 운 = `savedDailyFortune`(카톡에서 본 날짜). 회원 기본 사주 프로필은 이름만 읽고 덮어쓰지 않는다(이름 없으면 "손님").
- "연결 끊기"/"연결 해제": 연결을 지우고, 끊자마자 다시 묻지 않게 30일 거절로 둔다.
- 연결 쪽이 실패해도 결과는 그대로 나간다(버튼만 빠짐).

### 보안

- 토큰: 32바이트 난수(base64url 43자), DB에는 sha256만, 10분 만료, `kakao_link_consume` 한 번에 사용 표시+연결(재사용 불가). 토큰은 주소 `#` 뒤에만 실어 서버 요청 기록에 남지 않고, 로그인으로 넘어갈 때는 sessionStorage 에만 둔다.
- `/api/kakao/link` 는 `requireMemberUser`(SNS 로그인 회원만, 익명 비회원 거절).
- appUserId → 회원 조회는 `kakao_member_by_app_user`(security definer, service role 전용)가 user_id 만 돌려준다. provider 는 `SUPABASE_KAKAO_PROVIDER`(기본 `kakao`).
- 원본 botUserKey·appUserId 는 URL·DB·로그에 남기지 않는다. 로그에는 `{"appUserId":true|false}` 만.

### 켜는 순서

1. [GATE H2] 마이그레이션 `20261016120000_kakao_member_links.sql` 운영 적용 → 그다음 PR 머지(순서를 바꿔도 결과는 나가지만 연결 버튼이 빠진다).
2. 개인정보처리방침(/privacy) "카카오 챗봇과 회원 계정 연결" 항목(초안 대기).
3. 방법 2를 쓰려면 카카오 디벨로퍼스의 카카오 로그인 앱(운명상회 로그인에 쓰는 앱)을 챗봇 채널에 연결해야 appUserId 가 온다. 연결 후 로그에서 `"appUserId":true` 확인.
4. 챗봇 관리자센터 블록 설정은 바꿀 것 없음(같은 스킬 주소).
