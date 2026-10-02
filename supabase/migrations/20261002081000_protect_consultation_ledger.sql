-- Prepared only. Apply through the project's approved DB migration workflow.
-- Existing customer report policies must not allow replay/reset of paid credits.
BEGIN;
DROP POLICY IF EXISTS consultation_ledger_server_only ON public.cheongi_reports;
CREATE POLICY consultation_ledger_server_only
ON public.cheongi_reports AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (report_id NOT LIKE 'consultation-%')
WITH CHECK (report_id NOT LIKE 'consultation-%');

CREATE OR REPLACE FUNCTION public.consultation_ledger_protection_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'cheongi_reports'
      AND c.relrowsecurity AND p.polname = 'consultation_ledger_server_only'
      AND NOT p.polpermissive AND p.polcmd = '*'
      AND (SELECT oid FROM pg_roles WHERE rolname = 'authenticated') = ANY(p.polroles)
      AND (SELECT oid FROM pg_roles WHERE rolname = 'anon') = ANY(p.polroles)
      AND pg_get_expr(p.polqual, p.polrelid) = '(report_id !~~ ''consultation-%''::text)'
      AND pg_get_expr(p.polwithcheck, p.polrelid) = '(report_id !~~ ''consultation-%''::text)'
  );
$$;
REVOKE ALL ON FUNCTION public.consultation_ledger_protection_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultation_ledger_protection_ready() TO service_role;
COMMIT;
