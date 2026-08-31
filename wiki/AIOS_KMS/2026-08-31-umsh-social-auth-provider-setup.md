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
SUPABASE_KAKAO_PROVIDER=kakao
SUPABASE_NAVER_PROVIDER=custom:naver
```

The frontend calls `supabase.auth.signInWithOAuth()` with these provider IDs.
Kakao uses the requested scopes `profile_nickname profile_image`.
Google uses `prompt=select_account`.
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

## Google Provider

Google Cloud Console > Auth Platform > Clients:

- Application type: Web application
- Authorized JavaScript origins:
  - `https://umsh.kr`
  - `https://www.umsh.kr`
  - `https://chungi-t.vercel.app`
  - `http://localhost:8790`
- Authorized redirect URI:
  - `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`

Supabase Dashboard > Authentication > Providers > Google:

- Enable Google
- Client ID: Google OAuth Web Client ID
- Client Secret: Google OAuth Web Client Secret

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

- OAuth Client IDs and secrets must be issued in each provider developer console before the Supabase providers can be fully enabled.
- Do not commit provider secrets to `.env` or `.env.example`.
- Vercel environment values only store provider IDs. Real provider secrets belong in Supabase Auth provider settings.
- After DNS for `umsh.kr` resolves to Vercel, run a live login check for Kakao, Naver, and Google from the production domain.
