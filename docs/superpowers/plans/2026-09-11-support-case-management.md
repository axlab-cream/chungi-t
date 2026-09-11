# T12 — CS 케이스 관리

## 목표

실제 운영 DB의 지원 케이스를 접수·배정·메모·답변 초안·종료까지 관리한다. 고객 메시지 전송은 외부 채널이 없으므로 이 Task에 포함하지 않는다.

## 화면 계획

- 화면 목적: 지원 담당자가 열린 케이스의 우선순위, 상태, 담당자와 다음 내부 조치를 한 화면에서 결정한다.
- 주 사용자: `support:read`/`support:write`를 가진 운영 관리자. 현재 super admin은 두 scope를 가진다.
- 핵심 CTA: 케이스 접수, 상태·담당자 변경, 내부 메모 추가, 고객 답변 초안 추가.
- 상태: 로딩, 비어 있음, 조회 실패, 입력 오류, revision 충돌, 저장 성공을 구분한다.
- 데이터: server-only Supabase PostgREST → `/api/admin/v1/support` → `/admin/support`; 브라우저에서 DB 직접 접근은 없다.
- 디자인: 기존 운영 LNB·표 시스템을 유지한다. 표 기반 우선순위/상태 표시와 케이스별 타임라인을 사용하며, 큰 화면에서는 상세를 목록 아래에, 모바일에서는 표 컨테이너만 가로 스크롤한다.

## 보안·불변조건

- 신규 `public` 테이블은 RLS를 활성화하고 `anon`·`authenticated` 권한을 제거한다.
- 쓰기는 `settings:write`가 아닌 전용 `support:write` 범위, revision 조건, Idempotency-Key, T06 감사 원장을 요구한다.
- 고객 답변은 `customer_reply_draft`로만 저장하며 자동 발송하지 않는다. 내부 메모와 구분한다.
- 고객 프로필·리포트 본문은 반환하지 않고 연결 ID만 다룬다.

## 완료 기준

- 실제 테이블·migration·RLS/grant 검증
- 목록·생성·변경·메모 API와 UI가 실제 DB에 연결
- 상태 전이·revision 충돌·답변 초안/내부 메모 구분 단위 테스트
- Production 배포 및 로그인된 관리자 화면 검증
