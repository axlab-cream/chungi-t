# 현황 및 근거
기준: 2026-09-10 로컬 배포 소스 사본. 실서비스 운영 데이터 조회·PG 거래·운영 DB 변경 없음.

## 기준 저장소
조사 루트: vercel-source-dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ.
경로는 모두 이 루트 기준이다. 상위 폴더에도 별도 소스가 있으므로 혼합하지 않는다.

| ID | 상태 | 확인 내용 | 코드·WIKI 근거 | 설계 영향 |
|---|---|---|---|---|
| E01 | 확인됨 | Express 4, TypeScript, tsx, pg, OpenAI 의존성 | package.json | 기존 서버 확장 |
| E02 | 확인됨 | API·고객 정적 페이지 라우트 집중 | src/server/app.ts | 관리자 Router 분리 |
| E03 | 확인됨 | 이메일 목록 기반 관리자 유료 리포트 unlock | src/auth/admin.ts | 직원 RBAC와 별개 |
| E04 | 확인됨 | 주문 ready/approving/paid/viewed/cancelled/failed | src/payment/order-store.ts | 조회 상태와 금융 상태 분리 |
| E05 | 확인됨 | INICIS 결제 설정·승인 모델, return 엔드포인트 | src/payment/inicis.ts, src/server/app.ts | PG 교체 없이 연결 |
| E06 | 확인됨 | 주문 Postgres/Supabase REST/memory 저장 경로 | src/payment/order-store.ts | 관리자 운영에서는 영속성 검사 |
| E07 | 확인됨 | 생년월일·시간·맥락 프로필 저장 | src/user/profile-store.ts | 필드별 마스킹·권한 필요 |
| E08 | 확인됨 | 보고서 revision·generation ID·조건부 갱신 | src/report/report-store.ts | 완료 본문 직접 수정 금지 |
| E09 | 확인됨 | 레지스트리·active/paused/deprecated·fingerprint·메모리 캐시 | src/rag/corpus-registry.ts | immutable 버전 배포 필요 |
| E10 | 확인됨 | knowledgeBlocks와 legacy chunks 변환 | src/rag/knowledge-block.ts | 레거시 코퍼스 읽기 호환 |
| E11 | 확인됨 | 프롬프트 20키, 유료 catalog 19키 | prompts/services-manifest.json, src/payment/catalog.ts | 무료 1종·유료 19종 매핑 |
| E12 | 확인됨 | 4개 directory seed hidden | src/server/service-directory.ts | 노출과 기존 결과 접근 분리 |
| E13 | 확인됨 | FAQ 데이터·runtime config 파일 | data/public-faq.json, data/runtime-config.json | CMS 연결 후보, 계약 재확인 |
| E14 | 부분 확인됨 | 9/7 운영 DB 장애 복구·보고서·주문 조회 기록 | wiki/AIOS_KMS/2026-09-07-production-deploy-db-verification.md | health 200만으로 출시 통과 금지 |
| E15 | 확인됨 | 판단 블록 중심 RAG 원칙 | wiki/AIOS_KMS/2026-08-31-chungi-t-rag-corpus-knowledge-block-refactor.md | 코퍼스에 완성 상담문 복사 금지 |
| E16 | 부분 확인됨 | 결과 UUID·완료 불변·재시도 검수 기록 | wiki/AIOS_KMS/2026-09-07-interpretation-quality-and-result-persistence.md | 기존 고객 결과 회귀 중요 |

## 현재 확인된 API
POST /api/payment/orders, POST /api/payment/inicis/return, GET /api/payment/orders/:orderId, POST /api/payment/orders/:orderId/viewed, GET /api/user/orders, GET/POST/PUT /api/user/profile, GET /api/user/reports, DELETE /api/user/reports/:reportId, GET /api/services, GET /api/report/:reportId, POST /api/report/section, POST /api/report/prewarm, POST /api/chat.
위 경로는 고객용이다. 관리자가 임의 ownerId를 붙여 재사용하지 않는다.

## 신규 개발 또는 근거 부족
이번 조사에서 종합 관리자 UI/API, 직원 RBAC, 환불 원장·취소 실행 API, 거래 대사, 분석 이벤트 수집체계, CMS 발행 워크플로우, 코퍼스 온라인 편집·승인·배포 기능은 확인하지 못했다. 완전 부재를 단정하지 말고 구현 전 전체 라우트·스크립트·운영 연동을 다시 검색한다.

## 충돌과 최신화
- 과거 문서의 18종 또는 사례 페이지의 14는 현재 manifest 20과 범위가 다르다.
- 20종이 모두 현재 공개·판매 가능하다는 뜻은 아니다. hidden 4종 및 개별 라우트 가드를 대조한다.
- 9/7 배포 기록은 9/10 운영 배포의 증명이 아니다.
- 프로필은 사용자 토큰 기반 REST 경로가 있고, 주문·보고서와 저장소 접근 방식이 다르다. 동일 접근 정책으로 일괄 변경하지 않는다.
