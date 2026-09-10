# 인수 및 회귀 시나리오
대상은 **구현 후 실행할 검증**이다. 이 ZIP 작성 시 앱 구현·테스트 통과를 주장하지 않는다.
테스트 fixture는 합성 회원 A/B, 직원 역할별 계정, 실제 PG를 호출하지 않는 adapter, 완료·실패·구형 보고서, 20종 매핑을 포함한다.

| ID | Given / When | Then | 연결 |
|---|---|---|---|
| A01 | 비로그인 관리자 API | 401, 데이터 없음 | T05 |
| A02 | 일반회원·기존 unlock 이메일만 가진 회원 | 직원 membership 없으면 403 | T05 |
| A03 | 권한 회수 후 기존 세션 재요청 | 즉시 거절 | T05 |
| A04 | CS가 범위 밖 회원/금융 실행 호출 | 403, 감사 기록 | T05,T10 |
| A05 | 민감 reveal 사유 누락/정상 | 거절/최소필드·열람감사 | T10 |
| A06 | paid→viewed 전환 | 승인액·승인건수 증가 없음 | T15 |
| A07 | test/admin_unlock 결과 | 실제 매출 합계 제외 | T15 |
| A08 | 같은 key 환불 중복 클릭 | 단일 operation | T17 |
| A09 | 같은 key 다른 금액 | 409 | T17 |
| A10 | 두 직원이 동시 환불 | 승인액 초과 예약·환불 차단 | T17 |
| A11 | 요청자가 자기 환불 승인 | 403 | T17 |
| A12 | PG 성공 후 응답 유실 | unknown→대사 성공, 이중 취소 없음 | T16,T19 |
| A13 | PG 성공 후 DB 저장 실패 | intent 유지·대사 복구 | T17 |
| A14 | 전액환불 성공 후 고객 결과/하위 상담 | 기존 구매권한 철회 반영 | T17 |
| A15 | 실패 항목 두 번 재시도 | 단일 작업, 완료 항목 hash 불변 | T20 |
| A16 | worker 강제종료 후 재시작 | lease 만료 회수·중복효과 없음 | T14 |
| A17 | memory 저장 모드 운영 쓰기 | 503/readiness 실패 | T14 |
| A18 | 서비스 숨김·판매중단 | 검색 제외/신규주문 차단, 기존 권한 유지 | T22 |
| A19 | 가격변경 후 옛 주문 조회 | 주문 당시 금액 유지 | T22 |
| A20 | 참조 중 미디어 삭제/깨진 poster | 삭제/발행 차단 | T23 |
| A21 | 승인된 콘텐츠 수정 | 새 revision·재승인 필요 | T24 |
| A22 | 잘못된 corpus schema·중복ID | 필드별 오류, 저장·발행 차단 | T25 |
| A23 | legacy chunks/structured/templates import | 종류별 유효성, 호환 읽기 | T25 |
| A24 | 평가 후 corpus 내용 변경 | hash 불일치 발행 차단 | T29 |
| A25 | release 복구 중 진행중 생성 | 시작 snapshot 유지·신규만 이전 버전 | T30 |
| A26 | 20종 평가·금지 일반화 사례 | 중대 위반 0 또는 발행 거절 | T28 |
| A27 | 이벤트 중복·72h 지연·KST 경계 | 중복 미집계·과거 집계 갱신 | T32 |
| A28 | 브라우저 승인액 조작 | 금융 원장 무영향 | T31 |
| A29 | 이메일/토큰/질문을 event에 삽입 | 허용 필드 외 저장 없음 | T31 |
| A30 | CSV =,+,-,@ 시작값 | 수식 실행 무력화 | T34 |
| A31 | 타인 export·만료 URL | 다운로드 차단 | T34 |
| A32 | 구버전 report 필드 없음 | 상세 오류 없이 미기록 표시 | T10 |
| A33 | 회원 A가 B의 고객 report 조회 | 기존 소유권 차단 유지 | T36 |
| A34 | 기존 완료 result 재방문 | 모델 미호출·본문/ID 불변 | T36 |
| A35 | DB 조회 실패·빈 목록·필터없음 | 서로 다른 UI 상태 | T07~T13 |
| A36 | 390/768/1280/1440px 긴 한국어 | 버튼/제목 겹침 없음·키보드 가능 | T36 |
| A37 | 권한감사 저장 실패 후 민감 명령 | 외부 부작용 실행 전 차단 | T06 |
| A38 | 개인정보 삭제 dry-run | 대상·예외·복사본 표시, 실제 삭제 없음 | T35 |
| A39 | 고객 /orders 및 /r/:id 회귀 | 기존 auth·소유권·접근 흐름 유지 | T36 |
| A40 | 장애 알림 같은 원인 연속 발생 | 하나의 incident 갱신·복구 상태 | T21 |

## 기존 테스트 재사용
tests/unit/admin.test.ts, payment.test.ts, payment-order-store-rest.test.ts, report-api-access.test.ts, report-api-chat.test.ts, report-persistence.test.ts, report-store-rest.test.ts, service-directory.test.ts, service-corpus-coverage.test.ts.
실제 존재·내용은 구현 시 재확인한다. npm run typecheck와 npm test 기준 실패를 기록하고 영향 테스트를 추가한다.

## 검증 산출물
실행환경·commit·명령·시각·fixture·성공/실패·잔여 위험. 브라우저는 화면 캡처와 실제 버튼 동작을 함께 검증한다. unit 통과만으로 실제 PG·운영 DB 연결 검증을 대신하지 않는다.
