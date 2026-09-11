-- T22 follow-up: Supabase projects may retain default DELETE grants on public
-- tables. These version rows are archived by state and must not be hard-deleted
-- through the Data API, including by the application service role.
revoke all on table public.service_config_versions, public.content_versions from anon, authenticated, service_role;
grant select, insert, update on table public.service_config_versions, public.content_versions to service_role;
