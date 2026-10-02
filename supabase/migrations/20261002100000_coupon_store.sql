-- Prepared only: production application requires the approved migration workflow.
BEGIN;
CREATE TABLE IF NOT EXISTS public.coupon_state (
  id integer PRIMARY KEY CHECK (id = 1),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data->'campaigns') = 'array' AND jsonb_typeof(data->'wallets') = 'array' AND jsonb_typeof(data->'audit') = 'array')
);
ALTER TABLE public.coupon_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupon_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.coupon_state TO service_role;
INSERT INTO public.coupon_state(id, data) VALUES (1, '{"campaigns":[],"wallets":[],"audit":[]}') ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.coupon_state_cas(expected_revision bigint, next_data jsonb)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = pg_catalog
AS $$
  WITH changed AS (
    UPDATE public.coupon_state SET revision = revision + 1, data = next_data
    WHERE id = 1 AND revision = expected_revision RETURNING id
  ) SELECT EXISTS (SELECT 1 FROM changed);
$$;
REVOKE ALL ON FUNCTION public.coupon_state_cas(bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coupon_state_cas(bigint, jsonb) TO service_role;
COMMIT;
