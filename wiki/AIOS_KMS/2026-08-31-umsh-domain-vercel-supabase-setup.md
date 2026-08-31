# UMSH.KR Domain, Vercel, Supabase Setup

## Scope

- Local AIOS path: `C:\Users\user\Desktop\chungi-t`
- Domain: `umsh.kr`
- Vercel team/project: `ax-lab-cream/chungi-t`
- Vercel project id: `prj_83OG8hBV8JxhI10zAlbUVUXRpYV3`
- Supabase project: `chungi-t`
- Supabase ref: `wdyzollywccgaepjeynu`
- Supabase region: `ap-northeast-2`

## Completed

1. Added `umsh.kr` to the Vercel project.
2. Added `www.umsh.kr` to the Vercel project.
3. Confirmed both aliases point to the latest production deployment:
   `chungi-rjl98zg15-ax-lab-cream.vercel.app`.
4. Confirmed production deployment is `Ready`.
5. Confirmed production health endpoint returns `{"ok":true,"openai":true}`.
6. Confirmed Vercel Production/Preview/Development env vars exist:
   `SUPABASE_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_ANON_KEY`.
7. Confirmed Supabase project status is `ACTIVE_HEALTHY`.
8. Confirmed `public.cheongi_reports` exists with RLS enabled.
9. Confirmed Supabase Auth config endpoint is enabled and uses:
   `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`.

## DNS State

- Current nameservers: Gabia (`ns.gabia.co.kr`, `ns.gabia.net`,
  `ns1.gabia.co.kr`)
- Current `A` record for `umsh.kr`: `121.254.178.237`
- Current `A` record for `www.umsh.kr`: `121.254.178.237`
- Vercel-required target: `76.76.21.21`

## Required Gabia DNS Records

Keep Gabia nameservers and update DNS records:

| Type | Host | Value | Note |
| --- | --- | --- | --- |
| `A` | `@` | `76.76.21.21` | Apex domain `umsh.kr` |
| `A` | `www` | `76.76.21.21` | `www.umsh.kr`, as currently requested by Vercel CLI |

If Vercel Dashboard shows a generated `CNAME` for `www`, follow the Dashboard's
current value instead of the generic value in older documentation.

## Domain Convention

Recommended production identity:

- Primary public URL: `https://umsh.kr`
- Secondary URL: `https://www.umsh.kr`
- Keep both in Vercel so either user input works.
- If a single canonical host is later required for SEO, configure Vercel Domain
  redirect from the non-primary host to the selected primary host.

## Supabase Auth Values

Set these in Supabase Dashboard > Auth > URL Configuration:

- Site URL: `https://umsh.kr`
- Redirect URLs:
  - `https://umsh.kr/**`
  - `https://www.umsh.kr/**`
  - `https://chungi-t.vercel.app/**`
  - `https://*-ax-lab-cream.vercel.app/**`
  - `http://localhost:8790/**`

For Google/Kakao/Naver OAuth provider consoles, use the Supabase callback URL:

- `https://wdyzollywccgaepjeynu.supabase.co/auth/v1/callback`

Only change this callback URL if Supabase Custom Domain is purchased and enabled
for an API subdomain such as `api.umsh.kr`.

## Follow-Up

- After Gabia DNS propagation, run:
  - `Resolve-DnsName umsh.kr -Type A`
  - `Resolve-DnsName www.umsh.kr -Type A`
  - `vercel domains inspect umsh.kr --scope ax-lab-cream`
  - `vercel domains inspect www.umsh.kr --scope ax-lab-cream`
- Enable Supabase leaked password protection before public auth launch.
