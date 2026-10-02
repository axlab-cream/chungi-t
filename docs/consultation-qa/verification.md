# CONSULTATION-01 — 2026-10-02 검증 및 인계

## 구현
- 홈 기존 테스트와 천명상담 롤링, 회원 전용 텍스트/녹음 상담, 사주 프로필·실제 RAG 연결.
- 상담 및 상대 정보는 회원 소유 report auxiliary에 저장. 보관함 → 추가 풀이에서 목록/다시 열기/이어가기.
- 관리자 고객·콘텐츠 → 천명상담: 이름, 소개, 퍼소나, 말투, 추가정보 질문 규칙, 음성/속도, 배너 제목/문구/이미지/노출. 기존 콘텐츠 초안 저장·게시·권한·revision 사용. 게시된 설정만 실행에 반영.
- 배너 설정 조회 실패 시 새 상담 배너를 숨긴다. 저장 실패 시 저장 완료로 표시하지 않는다.

## 원본 근거
- 원본 C:/Users/user/Desktop/AIOS/Workspaces/aitalk: api/_neural_voice.py, api/chat.py, api/talk.py, api/_cloud.py, ui/cloud-client.entry.js, assets/generated/cheonmyeong-scenes.
- edge-tts/InJoon 및 원본 캐릭터 이미지 재사용. Gemini 기본 chat 모델 gemini-3.8-flash 유지; 원본 Vercel 모델 override 없음 확인.
- 현재 음성은 녹음 종료 후 답변하는 방식이다. 원본 Live WebSocket 양방향 스트리밍 전체를 이식한 상태는 아니다.
- 원본 Studio의 실시간 설정 공유가 아니라 운명상회 전용 콘텐츠 버전으로 관리한다.

## PASS
- npx tsx --test tests/unit/consultation-*.test.ts tests/unit/saved-chat.test.ts: 38/38 (답변 규격 추가 후 재검증).
- Python 음성 엔드포인트 HMAC/만료·음성 계약: 2/2.
- 실제 원본 InJoon 음성 생성: 48,672 bytes MP3. Gemini 대화 성공을 의미하지 않는다.
- 정적 배포 파일 생성/SEO 통과. assets 복사 순서 수정 후 캐릭터 이미지 5개 모두 public에 존재.
- 브라우저: 홈 2번 배너 → 상담 진입, 비회원 게이트, 보관함 추가 풀이 탭, 모바일 375px 화면 검증.
- 관리자 VM 테스트: revision 0 저장 후 게시, 변경 시 게시 차단, 실패 시 입력/요청 ID 보존, 권한 오류, 저장된 revision/checksum만 게시.

## 미완료 및 제한
- 실제 Gemini 호출/음성 전사/실제 회원 상담→재접속 조회 E2E: Gemini 키 미설정으로 NOT_RUN. 키를 채팅으로 요청하지 않고 로컬 환경 설정 안내.
- 운영 관리자 실제 초안 저장·게시: NOT_RUN. 운영 콘텐츠 변경 없음.
- 전체 build/typecheck: 기존 calculateLoveMonthlySignals export, work/jobchoice-preview-quota 모듈, workAlternative 타입의 3건 오류로 BLOCKED. 새 상담 파일 타입 오류는 관찰되지 않음.
- 운영 배포, DB migration, 원격 push 없음. Vercel Python 패키징 및 배포 보호 환경에서 내부 음성 호출은 배포 환경 검증 필요.
- 상담 생성은 회원당 일 40회, 최대 20세션/세션당 40회 한도. 원본 전역 비용 한도 시스템과 동등하다고 주장하지 않는다.
- 과거 상담 텍스트는 모두 저장하되 모델 문맥에는 최근 상담 일부만 공급한다. 모든 과거 상대를 자동 재호출하는 검색 메모리는 별도 보강 대상.
- 로컬 8821 전용 실행기는 실제 회원 인증을 쓰되 파일 저장/코드 기본 설정을 사용한다. 운영 관리자 설정 저장소 검증 서버가 아니다.

## 수정 교훈
전체 assets 디렉터리를 재생성하는 빌드 단계 뒤에 신규 이미지 폴더를 복사해야 한다. 게시 설정 오류와 과거 archived 설정은 기본 활성화로 되살리지 않는다. 캐릭터 이름/말투를 관리자 설정으로 제공하면서 시스템 프롬프트에 고정 이름을 다시 쓰지 않는다.

## 답변 분량 추가 요청
docs/consultation-response-policy.md의 6유형 분량/해석 패턴을 시스템 프롬프트에 연결했다. 생성 상한 4096은 유지하며 실제 길이 준수율은 모델 연결 후 평가한다. 음성의 조용한 2000자 절단을 제거했다.

## 결제·대기 안내 후속
docs/consultation-payment-plan.md 참조. 무료 1회/질문권 5회 4,900원/결제 모달/대기 게이지 및 복귀 구현. 결제 예약·insert-only 생성·환불 보류·DB 장부 보호 포함. 119개 회귀 및 보호 guard 1개, Python 2개 PASS. 운영 DB 보호 migration은 준비만 했고 적용하지 않았다. 해당 보호 확인이 없으면 운영 상담/구매를 열지 않는다.

외부 Grok 01 리뷰의 주요 4건: 일반 리포트/추가풀이/삭제로 장부를 건드리는 경로 차단, 실패한 빈 세션 정리, TTS 응답 필드 제한, 전용 CONSULTATION_VOICE_SECRET 분리로 수정. 02 결제 리뷰는 별도 진행.

## 2026-10-02 최종 재검증
- 상담·기존 결제·저장·서비스 경로 집중 회귀 122/122 PASS (NODE_ENV=test, 순차 실행). Python 음성 2/2 및 격리 PostgreSQL 보호 검증 PASS는 앞선 실행 근거 유지.
- 외부 CONSULTATION-02 리뷰: Critical/Major 없음, Approved with comments. Minor 2건(ready 주문 재사용 연락처 갱신, 결제 오류 안내 구분) 수정. 앱 HTTP 통합 재검증은 기존 import 오류로 실행하지 못했다.
- 순수 인사·감사·확인은 모델 해석 호출과 질문권 차감 없이 응답. 실제 질문이 섞이면 정상 해석한다. 저장/일 요청 한도는 유지한다.
- 로컬 프리뷰를 최신 코드로 재시작했다. 운영 배포 및 운영 DB 적용은 하지 않았다. 실제 Gemini·회원·PG 전체 흐름은 미검증 상태다.
