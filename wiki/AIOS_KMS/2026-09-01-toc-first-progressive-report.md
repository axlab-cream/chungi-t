# TOC-first Progressive Report + Persist + Public URL

## Problem
Specialized service detail pages blocked on a full OpenAI enrich before showing any TOC.

## Design
1. Analyze endpoints return TOC/skeleton immediately via `beginSpecializedProgressiveReport`.
2. Backend fills sections sequentially with `report-queue` / `updateReportSection`, persisting each section.
3. Durable cache key = `report_id` (user + service + normalized input fingerprint). Complete cache skips LLM.
4. Cross-device: rows keyed by Supabase `user_id` with RLS (owner-only). localStorage is optional UX only.
5. Unique public URL: `https://umsh.kr/r/{public_id}`
   - `public_id`: UUID without dashes, unique discriminator for admin + deep links
   - login-gated owner read via `GET /api/r/:publicId`
6. Admin columns on `cheongi_reports`: `public_id`, `service_key`, `status`, `progress_complete`, `progress_total`, `order_id`, `input_fingerprint`, `user_id`, timestamps.

## SQL
Apply `supabase-reports.sql` in Supabase SQL editor if columns/policies are missing.

## Verify
1. Login → `/work/job` → submit form
2. Report screen should show TOC immediately; sections fill with "준비중/작성중" then content
3. URL becomes `/r/{publicId}`
4. Refresh or open same URL on another device with same login → cached report, no full wait
