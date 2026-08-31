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
- Supabase Auth > Providers > New Provider > Auto-discovery (OIDC)로 생성한다.
- Provider Identifier는 `custom:` prefix 뒤에 `naver`만 입력한다.
- Issuer URL은 `https://nid.naver.com`으로 둔다.
- Scopes는 `openid, profile`로 둔다. Naver OIDC discovery의 `scopes_supported`는 `openid`, `profile`만 반환하므로 `email`을 scope에 넣으면 `invalid_scope`로 로그인 복귀가 실패한다.
- Naver Developers에서는 PC 웹 환경만 남기고 서비스 URL과 Supabase callback URL을 등록한다.
- 이메일은 Naver Developers의 제공 정보 선택에서 추가 권한으로 둔다. OIDC scope에는 `email`을 넣지 않는다.
- OAuth2 수동 설정이 필요하면 다음 값을 사용한다.
  - Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
  - Token URL: `https://nid.naver.com/oauth2.0/token`
  - UserInfo URL: `https://openapi.naver.com/v1/nid/me`
- Scope에는 최소 `openid`를 포함하되, OIDC 기준으로는 `openid, profile`만 사용한다.
- Naver Developers의 Callback URL은 Supabase Custom Provider 화면에 표시되는 callback URL을 그대로 입력한다.

## 2026-08-31 적용 결과

- Supabase URL Configuration
  - Site URL: `https://chungi-t.vercel.app`
  - Redirect URLs: `https://chungi-t.vercel.app/**`, `http://localhost:8790/**`, `http://localhost:8791/**`
- Google Cloud OAuth
  - Project: `cheonmyeong-507206`
  - OAuth client type: Web application
  - Authorized JavaScript origin: `https://chungi-t.vercel.app`
  - Authorized redirect URI: `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`
  - Branding URLs:
    - Homepage: `https://chungi-t.vercel.app`
    - Privacy Policy: `https://chungi-t.vercel.app/privacy.html`
    - Terms of Service: `https://chungi-t.vercel.app/terms.html`
  - Supabase Auth > Providers > Google status: `Enabled`
  - Client Secret은 Supabase provider 설정에만 저장하고 문서/Git에는 기록하지 않는다.
- Supabase Custom Provider
  - Name: `Naver`
  - Identifier: `custom:naver`
  - Type: `oidc`
  - Status: `Enabled`
  - Client Secret은 Supabase provider 설정에만 저장하고 문서/Git에는 기록하지 않는다.
- Kakao Developers
  - App: `천명록`
  - App ID: `1562321`
  - App representative domain: `https://chungi-t.vercel.app`
  - Kakao Login status: `ON`
  - Kakao Login Redirect URI: `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`
  - Kakao Login Client Secret은 활성화 상태이며 Supabase provider 설정에만 저장한다.
  - Consent items:
    - `profile_nickname`: `선택 동의`
    - `profile_image`: `선택 동의`
    - `account_email`: 비즈 앱 전환 전에는 `권한 없음`
- Supabase Auth > Providers > Kakao
  - Status: `Enabled`
  - Client ID에는 Kakao REST API key를 사용한다.
  - Client Secret에는 Kakao Login Client Secret code를 사용한다.
  - Kakao 앱이 아직 비즈 앱이 아니므로 `Allow users without an email`을 켜서 이메일 미제공 계정도 로그인 실패하지 않게 한다.
  - Supabase Kakao provider는 기본 authorize URL에 `account_email`을 포함할 수 있어 비즈 앱 전환 전에는 `KOE205`가 발생한다.
  - 프론트 `signInWithOAuth()` 호출 시 Kakao에 한해 `queryParams.scope = "profile_nickname profile_image"`를 전달해 `account_email` 요청을 제거한다.
- 운영 페이지 검증
  - `https://chungi-t.vercel.app`의 `네이버로 계속하기` 클릭 시 `https://nid.naver.com/login/noauth/allow_oauth?...` 동의 화면까지 정상 이동한다.
  - 임시 Chrome 프로필에서 `https://chungi-t.vercel.app` 접속 후 `해석 시작` 클릭 시 회원가입 모달이 표시된다.
  - 같은 모달에서 `구글로 계속하기` 클릭 시 Google 계정 로그인 화면(`accounts.google.com`)까지 정상 이동한다.
  - Supabase Kakao authorize endpoint가 `Unsupported provider` 오류 없이 Kakao OAuth로 `302` 이동한다.
  - 임시 Chrome 프로필에서 Kakao OAuth 시작 시 카카오계정 로그인 화면(`accounts.kakao.com/login`)까지 정상 이동한다.
  - 카카오 실제 authorize 테스트에서 `KOE205`가 발견되어 consent item과 Kakao 전용 scope override를 적용했다.

## Google 공개 상태 주의

- Google Cloud Auth Platform > Audience의 게시 상태는 `테스트 중`일 수 있다.
- 이 상태에서는 테스트 사용자만 OAuth 로그인을 끝까지 완료할 수 있으므로, 일반 고객 대상 운영 전에 `앱 게시` 상태를 확인한다.
- 최종 계정 선택 및 동의 단계는 실제 Google 계정 정보가 Supabase Auth로 전달되는 단계이므로 사용자 본인이 진행한다.

## 주의

- Client secret, provider token, Supabase service role key는 Git이나 문서에 저장하지 않는다.
- Vercel env에는 공개 가능한 Supabase URL/publishable key만 둔다.
- Provider secret은 Supabase Auth provider 설정 화면에만 저장한다.
