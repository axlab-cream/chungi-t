CREATE TABLE IF NOT EXISTS public.cheongi_reports (
  report_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  auth_provider text,
  admin_status text NOT NULL DEFAULT 'new',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cheongi_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS cheongi_reports_user_id_idx
  ON public.cheongi_reports (user_id);

CREATE OR REPLACE FUNCTION public.set_cheongi_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cheongi_reports_set_updated_at ON public.cheongi_reports;
CREATE TRIGGER cheongi_reports_set_updated_at
BEFORE UPDATE ON public.cheongi_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_cheongi_reports_updated_at();

DROP POLICY IF EXISTS "Users can insert own cheongi reports" ON public.cheongi_reports;
CREATE POLICY "Users can insert own cheongi reports"
ON public.cheongi_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own cheongi reports" ON public.cheongi_reports;
CREATE POLICY "Users can read own cheongi reports"
ON public.cheongi_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cheongi reports" ON public.cheongi_reports;
CREATE POLICY "Users can update own cheongi reports"
ON public.cheongi_reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);;
