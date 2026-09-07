-- Run only against the confirmed UMSH project as an authorized DB administrator.
-- Synthetic storage check: every insert/update is rolled back; no customer row is read.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local role service_role;
do $$
declare
  test_id text := 'umsh-db-qa-' || gen_random_uuid()::text;
  result_id text := gen_random_uuid()::text;
  changed integer;
  snapshot jsonb;
begin
  insert into public.cheongi_reports(report_id,payload)
  values(test_id,jsonb_build_object('qaMarker','umsh-db-validation','resultId',result_id,'revision',0,'body','synthetic-original'));
  insert into public.cheongi_reports(report_id,payload)
  values(test_id,'{"body":"must-not-replace"}'::jsonb) on conflict(report_id) do nothing;
  select payload into snapshot from public.cheongi_reports where report_id=test_id;
  if snapshot->>'body' <> 'synthetic-original' then raise exception 'First-write immutability failed'; end if;
  update public.cheongi_reports set payload=jsonb_set(payload,'{revision}','1')
  where report_id=test_id and payload->>'revision'='0';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'CAS did not update exactly one row'; end if;
  update public.cheongi_reports set payload=jsonb_set(payload,'{body}','"stale-write"')
  where report_id=test_id and payload->>'revision'='0';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Stale CAS was not rejected'; end if;
  select payload into snapshot from public.cheongi_reports where payload->>'resultId'=result_id;
  if snapshot->>'revision' <> '1' or snapshot->>'body' <> 'synthetic-original' then raise exception 'UUID recall mismatch'; end if;
  delete from public.cheongi_reports where report_id=test_id and payload->>'qaMarker'='umsh-db-validation';
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Exact synthetic cleanup failed'; end if;
end $$;
rollback;
select 'PASS: service-role insert, first-write, CAS, UUID recall, exact cleanup; all writes rolled back' as verification;
