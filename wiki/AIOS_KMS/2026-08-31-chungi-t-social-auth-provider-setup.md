# chungi-t 소셜 회원가입 연동 기록

## 범위

- 대상 서비스: `https://chungi-t.vercel.app/`
- 인증 게이트: 입력 완료 후 해석 시작 전 회원가입 모달
- 인증 백엔드: Supabase Auth
- Supabase ref: `wdyzollywccgaepjeynu`
- Supabase OAuth callback: `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`

## 코드 구조

1. `/api/auth/config`가 Supabase 공개 URL, publishable key, provider id를 프론트에 전달한다.
2. 입력 페이지는 `@supabase/supabase-js` PKCE flow로 `signInWithOAuth()`를 호출한다.
3. `/api/saju/analyze`, `/api/report/section`, `/api/report/prewarm`, `/api/report/chat-history`, `/api/report/destiny-partner-sketch`, `/api/chat`은 Supabase access token을 `Authorization: Bearer`로 검증한다.
4. 리포트 저장 시 `owner.id`, `owner.email`, `owner.provider`를 payload 및 관리자 조회용 컬럼에 저장한다.

## Provider 설정

### Google

- Supabase provider id: `google`
- Google OAuth client type: Web application
- Authorized JavaScript origins:
  - `https://chungi-t.vercel.app`
  - `http://localhost:8790`
- Authorized redirect URI:
  - `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`
- Supabase Auth > Providers > Google에 Client ID, Client Secret을 저장한다.

### Kakao

- Supabase provider id: `kakao`
- Kakao Client ID: REST API key
- Kakao Client Secret: Kakao Login Client Secret code
- Web platform site domain:
  - `https://chungi-t.vercel.app`
- Kakao Login Redirect URI:
  - `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`
- Consent items:
  - `profile_nickname`
  - `profile_image`
  - `account_email`은 비즈 앱 전환이 필요한 경우가 있으므로, 불가하면 Supabase Kakao provider에서 email optional을 허용한다.

### Naver

- Supabase provider id: `custom:naver`
- Supabase Auth > Providers > New Provider > Manual/OIDC 중 대시보드가 허용하는 방식으로 생성한다.
- OIDC가 가능하면 issuer를 `https://nid.naver.com`으로 둔다.
- OAuth2 수동 설정이 필요하면 다음 값을 사용한다.
  - Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
  - Token URL: `https://nid.naver.com/oauth2.0/token`
  - UserInfo URL: `https://openapi.naver.com/v1/nid/me`
- Scope에는 최소 `openid`를 포함하고, 서비스 권한에서 이메일·닉네임·프로필 이미지를 허용한다.
- Naver Developers의 Callback URL은 Supabase Custom Provider 화면에 표시되는 callback URL을 그대로 입력한다.

## 주의

- Client secret, provider token, Supabase service role key는 Git이나 문서에 저장하지 않는다.
- Vercel env에는 공개 가능한 Supabase URL/publishable key만 둔다.
- Provider secret은 Supabase Auth provider 설정 화면에만 저장한다.
