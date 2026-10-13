-- OPTIONAL, NOT EXECUTED. Server-only copy table. Never alters original cheongi_reports rows.
-- Run only after checking the database migration ledger and service-role deployment configuration.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cheongi_report_locale_copies (
  copy_key text PRIMARY KEY CHECK (copy_key ~ '^[a-f0-9]{64}$'),
  owner_id text NOT NULL CHECK (length(owner_id) > 0),
  original_report_id text NOT NULL CHECK (length(original_report_id) > 0),
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  locale text NOT NULL CHECK (locale IN ('en', 'ja')),
  access_scope text NOT NULL CHECK (access_scope IN ('paid', 'preview')),
  translation_version text NOT NULL,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, original_report_id, source_hash, locale, access_scope, translation_version)
);
CREATE INDEX IF NOT EXISTS cheongi_report_locale_copies_owner_original
ON public.cheongi_report_locale_copies(owner_id, original_report_id);
ALTER TABLE public.cheongi_report_locale_copies ENABLE ROW LEVEL SECURITY;
-- No public or authenticated policies. Customer access is through an authenticated server handler.
REVOKE ALL ON public.cheongi_report_locale_copies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.cheongi_report_locale_copies TO service_role;
COMMIT;
