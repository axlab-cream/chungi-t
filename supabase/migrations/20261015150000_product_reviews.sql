-- Product reviews ("다녀간 손님들의 말"). Approved by the user on 2026-10-15.
-- Prepared only: production application requires the approved migration workflow.
-- One review per paid order. Server-only access (service_role); customers never read this table directly.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cheongi_product_reviews (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  report_id text NOT NULL,
  product_key text NOT NULL CHECK (product_key ~ '^[a-z0-9_]{1,60}$'),
  body text NOT NULL CHECK (char_length(body) BETWEEN 20 AND 300),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 12),
  ilju text CHECK (ilju IS NULL OR char_length(ilju) BETWEEN 2 AND 8),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  hidden_reason text,
  reward_wallet_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cheongi_product_reviews_product_idx
  ON public.cheongi_product_reviews (product_key, status, created_at DESC);
CREATE INDEX IF NOT EXISTS cheongi_product_reviews_owner_idx
  ON public.cheongi_product_reviews (owner_id, product_key);
ALTER TABLE public.cheongi_product_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cheongi_product_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cheongi_product_reviews TO service_role;
COMMIT;
