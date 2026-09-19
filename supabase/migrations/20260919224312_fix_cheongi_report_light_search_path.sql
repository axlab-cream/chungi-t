-- The function is SECURITY INVOKER and only uses pg_catalog operators/functions,
-- but pinning an empty search_path also prevents caller-controlled name resolution
-- and clears Supabase's function_search_path_mutable advisor warning.
alter function public.cheongi_report_light(jsonb)
  set search_path = '';
