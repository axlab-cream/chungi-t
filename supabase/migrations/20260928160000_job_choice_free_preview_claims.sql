create table if not exists public.job_choice_free_preview_claims (
  user_id text not null,
  lineage_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lineage_id)
);

alter table public.job_choice_free_preview_claims enable row level security;
revoke all on public.job_choice_free_preview_claims from public, anon, authenticated;
grant select, insert on public.job_choice_free_preview_claims to service_role;

create or replace function public.claim_job_choice_free_preview(p_user_id text, p_lineage_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  used_count integer;
begin
  if nullif(btrim(p_user_id), '') is null or nullif(btrim(p_lineage_id), '') is null then
    raise exception 'job choice preview identity is required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('job_choice_preview:' || p_user_id, 0));
  select count(*) into used_count from public.job_choice_free_preview_claims where user_id = p_user_id;
  if exists (select 1 from public.job_choice_free_preview_claims where user_id = p_user_id and lineage_id = p_lineage_id) then
    return jsonb_build_object('used', used_count, 'limit', 5, 'allowed', true);
  end if;
  if used_count >= 5 then
    return jsonb_build_object('used', used_count, 'limit', 5, 'allowed', false);
  end if;
  insert into public.job_choice_free_preview_claims (user_id, lineage_id) values (p_user_id, p_lineage_id);
  return jsonb_build_object('used', used_count + 1, 'limit', 5, 'allowed', true);
end;
$$;

create or replace function public.job_choice_free_preview_status(p_user_id text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object('used', count(*), 'limit', 5, 'allowed', count(*) < 5)
  from public.job_choice_free_preview_claims where user_id = p_user_id;
$$;

revoke all on function public.claim_job_choice_free_preview(text, text) from public, anon, authenticated;
revoke all on function public.job_choice_free_preview_status(text) from public, anon, authenticated;
grant execute on function public.claim_job_choice_free_preview(text, text) to service_role;
grant execute on function public.job_choice_free_preview_status(text) to service_role;
