revoke all on table public.cheongi_reports from anon;
revoke all on table public.cheongi_reports from public;
grant select, insert, update, delete on table public.cheongi_reports to authenticated;
