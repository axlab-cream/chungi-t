# 관리자 OAuth 복구 점검 — 2026-09-11

## Observation

운명상회 관리자 `/admin`의 Google 조직 계정 로그인은 Google 동의 화면 이후
Supabase callback에서 `Unable to exchange external code`로 실패했다.

## Decision

Supabase Auth의 Site URL을 `https://umsh.kr`로 정정하고, `https://umsh.kr/**`와
`https://www.umsh.kr/**`를 Redirect URL allowlist에 추가했다. Google provider의
client secret은 비밀값이며 Google Cloud Console 재인증 없이는 조회·교체하지 않았다.

## QA result

- Redirect URL allowlist 저장을 Dashboard에서 확인했다.
- 새 OAuth 흐름에서도 같은 external-code exchange 실패를 재현했다.
- Vercel Production의 `UMSH_ADMIN_SUPER_EMAILS` 키 존재와 `umsh.kr`의 Ready 배포를
  확인했다. 비밀값은 기록하지 않았다.

## Lesson

OAuth 실패를 redirect 문제와 provider token-exchange 문제로 구분한다. redirect
allowlist를 고친 뒤에도 exchange가 실패하면 Google Cloud OAuth client의 callback URL과
Supabase에 저장된 client secret을 해당 client 기준으로 다시 검증해야 한다.

## Next patch

Google Cloud Console 재인증 후, `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`
을 authorized redirect URI로 확인하고 현재 client secret을 Supabase Google provider에
갱신한다. 그 뒤 새 OAuth 로그인과 `/api/admin/v1/me`의 super-admin 응답을 검증한다.
