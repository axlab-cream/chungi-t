CREATE TABLE IF NOT EXISTS public.cheongi_user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 20),
  birth_year integer NOT NULL CHECK (birth_year BETWEEN 1900 AND 2100),
  birth_month integer NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  birth_day integer NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
  birth_hour integer NOT NULL CHECK (birth_hour BETWEEN 0 AND 23),
  birth_minute integer NOT NULL DEFAULT 0 CHECK (birth_minute BETWEEN 0 AND 59),
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  calendar text NOT NULL DEFAULT 'solar' CHECK (calendar IN ('solar', 'lunar')),
  is_leap_month boolean NOT NULL DEFAULT false,
  birth_time_known boolean NOT NULL DEFAULT true,
  profile_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cheongi_user_profiles_updated_at_idx
  ON public.cheongi_user_profiles (updated_at DESC);

ALTER TABLE public.cheongi_user_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cheongi_user_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cheongi_user_profiles TO authenticated;

DROP POLICY IF EXISTS "Users can view their own birth profile" ON public.cheongi_user_profiles;
CREATE POLICY "Users can view their own birth profile"
ON public.cheongi_user_profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own birth profile" ON public.cheongi_user_profiles;
CREATE POLICY "Users can create their own birth profile"
ON public.cheongi_user_profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own birth profile" ON public.cheongi_user_profiles;
CREATE POLICY "Users can update their own birth profile"
ON public.cheongi_user_profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
