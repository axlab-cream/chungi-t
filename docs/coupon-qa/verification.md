# COUPON-01 — 쿠폰 및 상담 공통 내비게이션 (2026-10-02)

## observation
요청: 관리자에서 서비스 무료권/상담 질문권/금액·비율 할인 발급, MY 쿠폰 등록·사용. 후속 요청: 상담 GNB·푸터 누락 수정.
기존 쿠폰 저장소가 없으며 일반 리포트 고객 RLS는 권한 장부에 사용할 수 없다. 별도 service-role-only 쿠폰 상태 및 CAS가 필요했다. 기존 전체 앱에는 calculateLoveMonthlySignals export, jobchoice-preview-quota 누락, workAlternative 타입 오류 3건이 있다.

## decision / artifact
- 관리자 고객·콘텐츠 → 쿠폰 관리: 발급명/코드/종류/서비스/혜택/수량/기간, 발급 이력, 중단. 발급 후 혜택 수정 없음. content:publish 권한, 발급·중단 actor 감사 이력.
- MY의 실제 정본은 사주/my.html. 레거시 cmdg/#my도 쿠폰함 링크를 제공. 고객 /coupons.html은 회원 소유 쿠폰만 읽고 계정 변경 시 지운다.
- 무료권은 본인 서비스 리포트 하나에 바인딩. 재열람 가능, 사용 후 만료·중단되어도 해당 리포트 권한 유지. 금액·비율 할인은 1주문1장, 서버 카탈로그 계산, 최소 결제1원(무료 제공은 무료권).
- 할인 쿠폰은 최초 주문에 고정. ready는 같은 주문 재시도, 종료된 주문은 운영 재발급 필요. 자동 쿠폰 복구/부분환불 혜택 재계산 없음. 구글플레이 고정가격 주문에 웹 할인을 승인하지 않는다.
- 상담 무료 → 유효 쿠폰 → 결제 질문 순서. 성공 답변 저장 CAS와 쿠폰 사용 횟수 함께 기록, 확인 대화·실패·재시도 미차감. 할인 상담팩은 쿠폰 바인딩·금액·PG승인·환불 상태를 다시 검사.
- src/coupons/{contracts,store,router}.ts, supabase/migrations/20261002100000_coupon_store.sql, 관련 결제/상담 모듈과 UI.
- 상담에 기존 UMSHChrome GNB·하단5메뉴와 홈페이지 회사정보/정책 푸터 추가. 모바일 입력창과 푸터가 하단 메뉴에 가리지 않도록 여백 확보.

## QA result
- 집중 회귀 153/153 PASS. 최종 추가 검사 결과는 아래 기록.
- 격리 로컬 PostgreSQL: 동시 등록12요청 중 허용수량2개, 같은 쿠폰 동시 리포트 바인딩8요청 중1개, anon/authenticated table/RPC 차단, service_role 조회 PASS. 운영 DB 사용 안 함.
- 실제 Express 쿠폰 라우터 HTTP: 관리자 발급권한, 회원 등록/타인접근 거부/잘못된 리포트 거부/멱등 사용/중단 PASS (테스트 저장소).
- 브라우저 합성 fixture: 관리자 상담권 발급, 쿠폰 등록, 할인49,900→46,900원, 무료0원/복귀, 모바일375px 쿠폰함 표시 PASS. screenshots docs/coupon-qa/*fixture.jpg는 합성 UI 증거이며 운영 성공 증거 아님.
- 로컬 실제 정적 상담: GNB·MY 이동·MY 쿠폰 링크·모바일 입력/푸터·회사 연락처 가림 없음 PASS. 로컬 API는 별도 미리보기 제약 유지.
- 정적 배포 자산 생성/SEO PASS. 전체 typecheck는 위 기존3건 BLOCKED. 새로운 쿠폰/상담 변경 타입 오류는 없음.
- 운영회원·실제PG·운영DB migration·운영배포 NOT_RUN. 외부 Grok 리뷰 Approved with comments, Critical/Major 없음.

## lesson / relation
원자적 쿠폰 장부는 일반 고객 수정 가능 테이블과 분리한다. 승인된 주문을 retry upsert로 ready 상태로 되돌리면 안 된다. UI 계정 변경 후 늦은 응답과 catch의 버튼 재활성화를 함께 막아야 한다. 관련: notes/umsh-consultation-payment-20261002.md.

## next_patch / limits
운영 반영 전 기존 앱 오류 해결 및 승인된 DB 적용, 실제 회원/PG 왕복 검증 필요. 쿠폰 캠페인2,000/등록20,000/감사10,000/12MB 상한 도달 시 실패로 알림; 메모리 성공 대체 없음. 상담 전체 사용량은 MY의 본인 장부에서 조회하며 관리자 목록의 무료권 적용 수와 구분. 상담/쿠폰 두 보호 migration 모두 필요. 일반 무료 풀이의 실제 AI 생성은 미검증.

## 외부 리뷰 후 반영
발급 코드 최소8자, 예약 할인권의 주문 리포트·상태 DTO와 결제화면 필터, MY의 ready 주문 이어가기, CouponError 충돌 문구, 상담 사용량과 무료권 적용 수 구분, 결제 JS 캐시 버전 갱신. 쿠폰함 링크 보존/계정 변경 뒤 늦은 결제 응답 차단도 수정. 보완 후 검사 아래 기록.

검증 공백: 기존 main import 오류 때문에 실제 주문생성/Play 승인/리포트 GET의 통합 HTTP 시험은 미실행. 쿠폰 라우터 HTTP, 주문 insert-only 단위, 코드 리뷰로 확인한 범위만 PASS. REST CAS 운영 경로는 원격 미적용, 격리 SQL로 검증. 무료권은 최초 reportId 정확일치 권한이며 새 코퍼스 epoch 리포트로 자동 이관하지 않음.

## 최종 검증 기록
집중 회귀 154/154 PASS. 추가 타입 narrowing 후 쿠폰 프런트 7/7 재확인 PASS. 전체 typecheck 기존 app.ts3건만 BLOCKED. 정적 배포 자산/SEO PASS. 외부 리뷰 Critical/Major 없음, Minor 권고 반영. 실제 브라우저 폭375px 및 데스크톱 확인; 별도768/1024 폭은 도구 override가 유지되지 않아 정확한 폭 검증 NOT_RUN. 격리 DB55329와 합성 UI8833 종료, 실제 로컬 미리보기8821 유지. 운영 배포·운영 쿠폰 발급·실결제 없음.
