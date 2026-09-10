# 이벤트·로그·지표
분석 구현은 신규 제안이다. 원본 로그가 현재 전부 존재한다고 가정하지 않는다.

## 데이터 계층
금융 원장: 서버 PG 검증에서만 생성.
행동 이벤트: 브라우저·서버에서 수집하되 서버 식별자를 기준으로 정합성 검사.
운영 로그: 요청·오류·지연 메타데이터.
감사: 직원 조회·변경 책임 기록. 네 계층을 한 이벤트명으로 혼합하지 않는다.

## 이벤트 사전
| 이벤트 | 발생원·시점 | 필수 속성 | 중복 기준 |
|---|---|---|---|
| service_viewed | 고객 서비스 화면 표시 | eventId,sessionId,serviceKey | eventId |
| input_started | 첫 유효 입력 | sessionId,serviceKey | session+service+journey |
| analysis_requested | 서버 요청 수락 | requestId,serviceKey,reportId | requestId |
| preview_viewed | 미리보기 실제 표시 | reportId,sessionId | eventId |
| checkout_started | 주문 생성 성공 | orderId,serviceKey | orderId |
| payment_approved | 검증된 PG 승인 | orderId,amount,source,providerRef | providerRef |
| payment_failed | 확정 PG 실패 | orderId,errorCode | operationId |
| report_ready | 필수 유료 항목 저장 완료 | reportId,serviceKey | reportId+completion |
| report_opened | 권한 검증 후 고객 열람 | reportId,sessionId | eventId |
| refund_succeeded | 검증된 PG 취소 | refundId,orderId,amount | refundId |
| generation_failed | 시도 실패 확정 | attemptId,reportId,errorCode | attemptId |
| support_created | 내부 문의 생성 | caseId,category | caseId |

공통: schemaVersion, environment, occurredAt, receivedAt, traceId, pseudonymousUserId(있는 경우). test/admin_unlock source는 금융 KPI에서 제외한다. 브라우저 payment_approved 이벤트는 매출 근거로 사용하지 않는다.

## 지표 정의
| 지표 | 분자/분모 또는 수식 | 주의 |
|---|---|---|
| 승인액 | 실제 승인 financial event amount 합 | viewed 중복 합산 금지 |
| 환불액 | 성공 refund event amount 합 | requested/unknown 제외 |
| 순거래액 | 승인액 - 환불액 | 회계 매출·정산 입금과 구분 |
| 구매 전환 | 세션 진입 후 24h 내 실제 승인 세션 / 유효 진입 세션 | 모델 변경 시 버전 기록 |
| 결제 성공률 | 확정 승인 주문 / 승인 시도 주문 | 진행중·unknown 별도 |
| 제공 성공률 | 승인 후 10분 내 report_ready 연결 주문 / 해당 cohort 승인 주문 | 집계 시각 10분 미경과 제외 |
| 생성 실패율 | 실패 attempt / 전체 종료 attempt | report 실패율과 구분 |
| 재방문율 | 첫 열람 후 7일 내 다른 날짜 열람 회원 / 7일 관측 가능한 회원 | 과거 계측 없는 회원 미측정 |
| 문의율 | 기간 구매 cohort 관련 case 있는 주문 / cohort 승인 주문 | 중복 문의 주문 1회 |
| 생성 비용 | 기록 token × 버전별 단가 | 사용량/단가 누락이면 미산정 |

모든 지표는 기간·타임존·환경·서비스·데이터 기준시각·대상 건수를 표시한다. 서비스별 비교는 표본 30건 미만이면 저표본 표시를 기본 제안한다.

## 로그 구조
requestId, traceId, routeTemplate, serviceKey, statusCode, durationMs, errorCode, storageMode, releaseId.
로그에 이메일·전화·주소·생년월일·이름·질문·해석 원문·Authorization·PG 원시 응답을 저장하지 않는다. 객체 ID도 관리자 권한 아래만 검색한다.
분석 event의 허용 필드 외 값은 서버에서 제거/거절한다. IP·user-agent·URL query 원문은 기본 수집하지 않는다.

## 수집·보존
이벤트 UUID 중복 제거, 지연 수신 72시간 재집계 초기안, 클라이언트 시계 이상은 receivedAt 기준 보정 표시. 통계용 가명 ID와 삭제 요청 매핑은 제한 보관.
보존기간 초기안: 운영 로그 30일, 행동 원시 이벤트 90일, 가명 일집계 13개월. 법적 정책으로 확정한 값이 아니며 운영 정책 검토 후 활성화한다. 금융·감사 보존은 별도 정책 미확정.
알림: 승인 후 제공 지연, PG unknown, 저장소 실패, 급격한 실패율. 최소 모수·지속시간·중복 억제·복구 알림을 정의한다.
