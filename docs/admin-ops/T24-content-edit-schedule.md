# T24 콘텐츠 편집·승인·예약 실행 계획

## 목적과 범위

실제 `content_versions`의 고객센터 상단 공지(`notice / support_top`)를 첫 vertical slice로
완성한다. 목업 데이터나 브라우저 로컬 상태를 사용하지 않는다. 이 Task에서 만드는 흐름은
편집 → 발행본 대비 diff → 승인 요청 → 승인 → 즉시 발행 또는 예약 → 예약 취소다.

이번 slice에서 FAQ·배너·법적 링크의 새 스키마를 추측해 만들지 않는다. 동일 workflow를
재사용할 수 있는 저장소 함수와 UI 패턴을 먼저 검증한 뒤 후속 콘텐츠 유형에 확장한다.

## Page Brief

- 사용자: `content:read`, `content:write`, `content:publish` 범위를 가진 운영 관리자
- 핵심 작업: 현재 고객 노출본을 보면서 안전하게 다음 revision을 만들고 승인·예약한다.
- 정보 우선순위: 현재 상태 → 편집 필드 → 변경 diff/미리보기 → 승인·예약 CTA → 발행 이력
- 레이아웃: 데스크톱 편집/검토 2열, 768px 이하 1열. 기존 LNB와 토큰을 유지한다.
- 상태: 로딩, 실제 빈 상태, 저장소 오류, 저장 중, 승인 대기, 승인됨, 예약됨, 발행됨,
  revision 충돌을 각각 텍스트로 구분한다.
- 접근성: 실제 `label`, `role=status`, 키보드 CTA, 색+텍스트 상태, 개행 보존,
  390px 가로 overflow 방지.

## Gap Audit

| 항목 | 현재 | 목표 |
| --- | --- | --- |
| 편집 | 구조화 제목·본문·검수 메모 | 유지, 저장 시 승인·예약 무효화 |
| diff | 없음 | 발행본/초안의 제목·본문 줄 단위 비교 |
| 미리보기 | 없음 | HTML 삽입 없이 고객 노출 모양 확인 |
| 승인 | 즉시 발행만 존재 | 승인 요청과 명시적 승인 선행 |
| 예약 | `scheduled_at` 열만 존재 | 미래 시각 검증, 취소, cron 발행 |
| 동시성 | revision CAS 일부 | 모든 workflow RPC에서 revision CAS |
| 감사 | 저장·발행만 | 요청·승인·예약·취소 작업도 감사 명령 |

## 구현 순서

1. RED: store 계약, 승인 무효화, 예약 시간 검증, RPC 권한, UI·한국어 개행 테스트.
2. DB: 승인 증거 열과 원자적 SECURITY DEFINER RPC 추가. `search_path=''`, fully-qualified
   relation, service_role 전용 실행을 유지한다.
3. Store/API: 상태를 실제 열에서 투영하고 모든 쓰기를 idempotent admin command로 감싼다.
4. Worker: 기존 `/api/cron/ops` 한 실행에서 만료 lease 작업과 승인된 due 공지를 함께 처리한다.
5. UI: 편집·diff·미리보기·승인·예약을 연결하고 중복 submit을 막는다.
6. 검증: focused unit → typecheck → full unit → build → 운영 migration/deploy → 브라우저 smoke.

## 불변 조건

- 승인 checksum과 현재 checksum이 다르면 즉시/예약 발행을 거부한다.
- 승인 이후 내용 또는 검수 메모를 저장하면 승인·승인요청·예약을 모두 지운다.
- 예약 취소는 콘텐츠나 승인 증거를 바꾸지 않는다.
- 공개 API는 발행된 allowlist 필드만 반환한다.
- 비밀, 원시 인증 정보, 개인정보를 로그·감사 본문·KMS에 저장하지 않는다.

## AIOS 경로

`00 Context`, `01 Skills`, `04 Workflows`, `07 Design System`, `08 Components`,
`11 Ops`, `12 QA/Eval`, `13 Deploy`, `14 Memory/KMS`.

## 롤백

앱 롤백은 이전 Production deployment로 alias를 되돌린다. DB 열은 기존 읽기/발행 경로와
호환되므로 즉시 drop하지 않는다. 새 RPC의 execute 권한을 회수하고 worker 호출을 제거한 뒤
별도 검증 Task에서 데이터 보존 여부를 확인한다.
