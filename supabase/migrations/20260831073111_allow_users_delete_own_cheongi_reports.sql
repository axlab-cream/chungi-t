do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cheongi_reports'
      and policyname = 'Users can delete own cheongi reports'
  ) then
    create policy "Users can delete own cheongi reports"
      on public.cheongi_reports
      for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;
