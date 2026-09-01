# UMSH Social Auth Provider Setup

## Context

- Date: 2026-08-31
- AIOS project path: `C:\Users\user\Desktop\chungi-t`
- Vercel project: `ax-lab-cream/chungi-t`
- Supabase project: `chungi-t`
- Supabase ref: `wdyzollywccgaepjeynu`
- Supabase URL: `https://wdyzollywccgaepjeynu.supabase.co`
- Production domain target: `https://umsh.kr`

## App Configuration

The app exposes social provider identifiers through `/api/auth/config`.
Provider identifiers are now environment-driven:

```env
SUPABASE_GOOGLE_PROVIDER=google
SUPABASE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
SUPABASE_KAKAO_PROVIDER=kakao
SUPABASE_NAVER_PROVIDER=custom:naver
```

Kakao and Naver call `supabase.auth.signInWithOAuth()` with these provider IDs.
Kakao uses the requested scopes `profile_nickname profile_image`.
Google renders the official Google Identity Services button on `umsh.kr` and
passes its ID token to `supabase.auth.signInWithIdToken()`.
Naver uses Supabase Custom OAuth/OIDC with provider ID `custom:naver`.

Production verification showed Vercel env values can arrive with trailing
newlines if pasted from a shell or dashboard field. The server trims provider
IDs before returning `/api/auth/config` so OAuth provider names stay stable.

## Supabase Auth URL Values

Set these in Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `https://umsh.kr`
- Redirect URLs:
  - `https://umsh.kr/**`
  - `https://www.umsh.kr/**`
  - `https://chungi-t.vercel.app/**`
  - `https://*-ax-lab-cream.vercel.app/**`
  - `http://localhost:8790/**`

Provider console callback URL:

```text
https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback
```

Only replace this callback if a paid Supabase Auth custom domain is later enabled.
The direct Google Identity Services flow does not navigate through this callback,
so its Google account chooser identifies the relying site as `umsh.kr`.

## Google Provider

Google Cloud Console > Auth Platform > Clients:

- Application type: Web application
- Production client name: `umsh.kr web`
- Production client ID: `366440624896-f3trevr63eeubfkmho6n96pgnog9ht15.apps.googleusercontent.com`
- Authorized JavaScript origins (no trailing slash; Google rejects mismatches as `origin_mismatch`):
  - `https://umsh.kr`
  - `https://www.umsh.kr`
  - `https://chungi-t.vercel.app`
  - `http://localhost:8790`
- Authorized redirect URI:
  - `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`

GIS popup login is currently disabled in production because the umsh.kr web
client returns `400 origin_mismatch`. Google sign-in uses Supabase OAuth
redirect (`signInWithOAuth`) until the JavaScript origins above are saved on
client `366440624896-f3trevr63eeubfkmho6n96pgnog9ht15`.

Supabase Dashboard > Authentication > Providers > Google:

- Enable Google
- Client ID: Google OAuth Web Client ID
- Client Secret: Google OAuth Web Client Secret

The same public Web Client ID is stored in Vercel as
`SUPABASE_GOOGLE_CLIENT_ID`. Keep the secret only in the provider console and
Supabase.

## Kakao Provider

Kakao Developers:

- Platform Web Site Domain:
  - `https://umsh.kr`
  - `https://www.umsh.kr`
  - `http://localhost:8790`
- Kakao Login Redirect URI:
  - `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`
- Kakao Login: ON
- Consent items:
  - `profile_nickname`
  - `profile_image`
  - `account_email` optional

Supabase Dashboard > Authentication > Providers > Kakao:

- Enable Kakao
- Client ID: Kakao REST API key
- Client Secret: Kakao Login Client Secret code
- If `account_email` is not enabled, allow users without an email in Supabase.

## Naver Provider

Naver supports OIDC discovery. Use Supabase Custom OAuth/OIDC:

- Provider identifier: `custom:naver`
- Configuration method: Auto-discovery (OIDC)
- Issuer URL: `https://nid.naver.com`
- Client ID: Naver Developers Client ID
- Client Secret: Naver Developers Client Secret
- Callback URL to register in Naver:
  - `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`

Naver Developers:

- Service URL: `https://umsh.kr`
- Callback URL:
  - `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`
- Required OIDC scope includes `openid`.

## Operational Notes

- Supabase hosted Auth providers were verified as enabled on 2026-08-31.
- The Supabase authorize endpoint returned provider redirects for Google, Kakao, and Naver.
- `redirect_to` was accepted for `https://umsh.kr/`, `https://www.umsh.kr/`, and `http://localhost:8790/`.
- Portal Today free ticket now routes to `/signup?entry=today`, which renders the existing `#login` scene with UMSH store styling.
- Standalone signup entry clears pending analysis state and returns social OAuth users to `/cmdg/?signupReturn=1#name` so empty analysis requests are not triggered.
- OAuth Client IDs and secrets are managed in each provider developer console and Supabase Auth provider settings.
- Do not commit provider secrets to `.env` or `.env.example`.
- Vercel environment values only store provider IDs. Real provider secrets belong in Supabase Auth provider settings.
- After DNS for `umsh.kr` resolves to Vercel, run a live login check for Kakao, Naver, and Google from the production domain.
