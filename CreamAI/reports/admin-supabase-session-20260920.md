# 관리자 Supabase 비밀번호 세션 교환 복구

## Observation

- 운영 관리자 계정 저장소와 Supabase Auth에는 동일한 활성 관리자 이메일이 있었지만, 관리자 로그인 API는 별도 로컬 비밀번호 해시만 검사했다.
- 비밀번호 재설정은 Supabase Auth 비밀번호만 바꾸므로 이후 관리자 로그인은 계속 401이 될 수 있었다.

## Decision

- 기존 로컬 관리자 로그인을 롤백 경로로 유지한다.
- 로컬 로그인 401일 때만 저장하지 않는 Supabase 비밀번호 클라이언트로 인증한다.
- 서버는 Supabase 사용자를 검증한 뒤 활성 관리자 계정 행을 별도로 확인하고, 기존 서명 HttpOnly 관리자 쿠키를 발급한다.
- Supabase 브라우저 세션은 교환 직후 제거하며 인증과 관리자 권한을 결합하지 않는다.

## Artifact

- `POST /api/admin/v1/session/supabase`
- `admin-ui/index.html`의 로컬 로그인 폴백 및 복구 링크 교환
- `tests/unit/admin-supabase-session.test.ts`

## QA

- 집중 인증 테스트 29/29 통과.
- 전체 직렬 테스트 1,476/1,476 통과.
- TypeScript typecheck 및 Vercel build 통과.
- 독립 리뷰에서 Critical 0, Major 0. 로컬 관리자 로그아웃이 무관한 고객 Supabase 세션을 지울 수 있다는 Minor 지적도 조건 분기로 해소했다.

## Lesson

- 같은 이메일이라도 인증 비밀번호의 정본이 둘이면 재설정 경로와 로그인 경로가 분리될 수 있다.
- 외부 인증 세션을 권한 세션으로 교환할 때는 인증 제공자 세션을 브라우저에 장기 보관하지 않고, 서버가 권한 원본을 독립 확인해야 한다.

## Relation

- `notes/umsh-admin-account-management-20260911.md`
- `notes/umsh-oauth-provider-recovery-20260911.md`

## Next patch

- 브라우저 DOM 하네스를 도입할 때 로컬 401 → Supabase 인증 → 쿠키 교환 → 로그아웃의 전체 흐름을 동작 테스트로 추가한다.
