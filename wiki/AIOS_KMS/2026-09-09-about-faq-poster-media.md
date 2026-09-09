# 소개·FAQ 최신 시안 구현
- Reference: docs/design/umsh-about-faq-20260909/ (원본 Main.dc.html, Faq.dc.html, canvas.json, canvas와 아트 포함).
- 기존 공개 MY/인증 로직 보존. /about 포스터 14종, 기존 카드 원본 경로, 기존 chungi-landing-story.mp4 재사용.
- 영상: 음소거·인라인, 화면 밖/탭 비활성 시 중지, 사용자 일시정지, reduced-motion이면 자동 재생 안 함. 텍스트는 영상 밖에 정의문으로 보존.
- FAQ: /faq는 분류 허브. /faq/use, payment, report, reading은 각 6개 답변을 HTML에 포함하고 해당 질문만 FAQPage 스키마로 제공.
- 접근성: 기본 HTML details, 질문 고유 앵커, 실제 링크, JS 비활성 시 상담 전체 목차 열람 가능.
- 공용 policy.css의 새 포스터 규칙은 .brand-public에 한정해 기존 정책 문서 스타일 오염 방지.
- 카드 가격/링크 원본: src/server/service-directory.ts 및 src/payment/catalog.ts. 풍수는 현재 운영 중이므로 제거하지 않음.
- 검색 노출이나 AI 인용은 보장되지 않음. 이번 구현은 검색 가능한 페이지와 구조화 데이터 기반 마련.
