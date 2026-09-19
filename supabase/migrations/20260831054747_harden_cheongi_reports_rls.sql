ALTER FUNCTION public.set_cheongi_reports_updated_at() SET search_path = public;

DROP POLICY IF EXISTS "Users can insert own cheongi reports" ON public.cheongi_reports;
DROP POLICY IF EXISTS "Users can read own cheongi reports" ON public.cheongi_reports;
DROP POLICY IF EXISTS "Users can update own cheongi reports" ON public.cheongi_reports;

CREATE POLICY "Users can insert own cheongi reports"
  ON public.cheongi_reports
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can read own cheongi reports"
  ON public.cheongi_reports
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own cheongi reports"
  ON public.cheongi_reports
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
