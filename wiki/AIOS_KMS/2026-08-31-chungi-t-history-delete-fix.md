# 2026-08-31 천명대공 보관함 삭제 안정화

## 목적

보관함 설정 패널에서 저장된 풀이의 `×` 삭제 버튼을 눌러도 항목이 삭제되지 않거나, 현재 열려 있는 리포트가 자동 저장 흐름을 통해 다시 보관함에 나타나는 문제를 수정했다.

## 원인

- 기존 삭제는 로컬 히스토리 배열에서 항목을 제거하는 수준에 가까웠다.
- 현재 보고서가 열린 상태에서는 `saveCurrentReading()` 호출로 같은 `reportId`가 다시 저장될 수 있었다.
- Supabase 저장소에는 삭제 API와 사용자 본인 리포트 삭제 RLS 정책이 없어 서버 저장 데이터 삭제까지 보장되지 않았다.
- 브라우저 기본 `confirm()`에 의존하면 모바일/인앱 환경에서 삭제 플로우가 일관되지 않을 수 있다.

## 적용 내용

- `src/report/report-store.ts`
  - `deleteReportRecord(reportId, owner)` 추가.
  - memory, Supabase REST, Postgres 저장소 삭제를 모두 지원.
  - Supabase/Postgres에서는 인증 사용자 본인 데이터만 삭제되도록 owner 정보를 사용.

- `src/server/app.ts`
  - `DELETE /api/report/:reportId` 추가.
  - Supabase 인증이 활성화된 환경에서는 인증된 사용자만 삭제 가능.

- `사주/사주/index.html`
  - 보관함 삭제 버튼 클릭 시 인라인 삭제 확인 UI를 표시.
  - 삭제 확정 시 로컬 히스토리에서 제거하고 active report/session/url 상태를 정리.
  - 삭제된 `reportId`를 `cheongi_deleted_report_ids_v1`에 tombstone으로 저장해 자동 저장 또는 URL 복원으로 재등장하지 않게 처리.
  - 사용자가 같은 입력으로 새 풀이를 다시 생성하면 tombstone을 해제해 재저장을 허용.

- Supabase
  - `cheongi_reports` 테이블에 authenticated 사용자가 자신의 `user_id = auth.uid()` 행만 삭제할 수 있는 DELETE RLS 정책 추가.

## 검증

- `npm run typecheck` 통과.
- `npm test` 통과. 총 46개 테스트 성공.
- 저장소 단위 삭제 테스트 추가: 생성된 reportId 삭제 후 재조회가 `null`이고, 두 번째 삭제는 `false`를 반환.
- 임시 Chrome 프로필에서 로컬 페이지를 열고 더미 보관함 항목으로 실제 UI 클릭 흐름 검증:
  - 보관함 열기
  - `×` 클릭
  - 인라인 삭제 확인 표시
  - `삭제` 클릭
  - 빈 보관함 표시
  - tombstone 기록 확인
- Supabase DELETE RLS 정책 존재 확인.

## 참고

- 실제 사용자 보관함 항목은 검증 중 삭제하지 않았다.
- Supabase 보안 어드바이저의 `Leaked Password Protection Disabled` 경고는 이번 소셜 로그인/보관함 삭제 수정과 직접 관련 없는 별도 Auth 보안 설정이다.
