# 운명상회 관리자 감사·멱등 명령 기반 — 2026-09-11

## Observation

관리자 쓰기 기능을 연결하기 전에 실제 audit ledger와 request receipt가 없었다. 운영 테이블은 Supabase `public` schema이므로 browser role 접근을 차단해야 한다.

## Decision

`admin_audit_events`는 append-only로, `admin_command_receipts`는 actor/action/idempotency key 단위로 만든다. 서버의 service role만 두 테이블에 접근하며, 브라우저 DTO는 감사 actor를 마스킹한다.

## Artifact

- Migration: `supabase/migrations/20260911104208_admin_audit_command_foundation.sql`
- Command guard: `src/admin/admin-command.ts`
- Live audit adapter: `src/admin/audit-store.ts`

## QA result

- Same idempotency key + same body replays stored result.
- Same key + changed body throws conflict.
- Audit insert failure prevents the mutation callback.
- Production DB verification: both tables RLS enabled; anon/authenticated grants are zero.

## Lesson

When a new admin read scope is introduced, update both the configuration-based staff scopes and local-admin session scopes. A browser smoke test caught this mismatch before release.

## Next patch

Use `executeAdminCommand` for the first concrete write flow: administrator account add/disable/password reset, then create the support case domain.
