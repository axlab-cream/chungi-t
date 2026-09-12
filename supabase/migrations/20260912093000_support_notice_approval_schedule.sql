alter table public.content_versions
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approval_requested_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approved_checksum text;

create or replace function public.update_support_notice_draft(
  p_draft_id uuid,
  p_expected_revision integer,
  p_payload jsonb,
  p_checksum text,
  p_review_note text
)
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.content_versions
  set payload = p_payload,
      checksum = p_checksum,
      review_note = nullif(btrim(p_review_note), ''),
      revision = revision + 1,
      approval_requested_at = null,
      approval_requested_by = null,
      approved_at = null,
      approved_by = null,
      approved_checksum = null,
      scheduled_at = null,
      updated_at = now()
  where id = p_draft_id
    and content_type = 'notice'
    and placement = 'support_top'
    and service_key is null
    and state = 'draft'
    and revision = p_expected_revision
  returning *;
end;
$$;

create or replace function public.request_support_notice_approval(
  p_draft_id uuid,
  p_expected_revision integer,
  p_actor_email text
)
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.content_versions
  set approval_requested_at = now(),
      approval_requested_by = lower(btrim(p_actor_email)),
      approved_at = null,
      approved_by = null,
      approved_checksum = null,
      scheduled_at = null,
      updated_at = now()
  where id = p_draft_id
    and content_type = 'notice'
    and placement = 'support_top'
    and service_key is null
    and state = 'draft'
    and revision = p_expected_revision
  returning *;
end;
$$;

create or replace function public.approve_support_notice_draft(
  p_draft_id uuid,
  p_expected_revision integer,
  p_actor_email text
)
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.content_versions
  set approved_at = now(),
      approved_by = lower(btrim(p_actor_email)),
      approved_checksum = checksum,
      updated_at = now()
  where id = p_draft_id
    and content_type = 'notice'
    and placement = 'support_top'
    and service_key is null
    and state = 'draft'
    and revision = p_expected_revision
    and approval_requested_at is not null
  returning *;
end;
$$;

create or replace function public.schedule_support_notice_draft(
  p_draft_id uuid,
  p_expected_revision integer,
  p_scheduled_at timestamptz,
  p_actor_email text
)
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_scheduled_at < now() + interval '1 minute' then
    return;
  end if;
  return query
  update public.content_versions
  set scheduled_at = p_scheduled_at,
      updated_at = now()
  where id = p_draft_id
    and content_type = 'notice'
    and placement = 'support_top'
    and service_key is null
    and state = 'draft'
    and revision = p_expected_revision
    and approved_at is not null
    and approved_checksum = checksum
  returning *;
end;
$$;

create or replace function public.cancel_support_notice_schedule(
  p_draft_id uuid,
  p_expected_revision integer,
  p_actor_email text
)
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.content_versions
  set scheduled_at = null,
      updated_at = now()
  where id = p_draft_id
    and content_type = 'notice'
    and placement = 'support_top'
    and service_key is null
    and state = 'draft'
    and revision = p_expected_revision
    and scheduled_at is not null
    and length(btrim(p_actor_email)) > 0
  returning *;
end;
$$;

create or replace function public.publish_support_notice_draft(
  p_draft_id uuid,
  p_expected_revision integer,
  p_actor_email text
)
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draft public.content_versions%rowtype;
begin
  select * into v_draft
  from public.content_versions
  where id = p_draft_id
    and content_type = 'notice'
    and placement = 'support_top'
    and service_key is null
    and state = 'draft'
    and revision = p_expected_revision
    and approved_at is not null
    and approved_checksum = checksum
  for update;
  if not found then return; end if;

  update public.content_versions
  set state = 'archived', updated_at = now()
  where content_type = 'notice' and placement = 'support_top'
    and service_key is null and state = 'published';

  return query
  update public.content_versions
  set state = 'published', scheduled_at = null, published_at = now(),
      author_email = lower(btrim(p_actor_email)), revision = revision + 1, updated_at = now()
  where id = v_draft.id
  returning *;
end;
$$;

create or replace function public.publish_due_support_notices()
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draft public.content_versions%rowtype;
begin
  select * into v_draft
  from public.content_versions
  where content_type = 'notice' and placement = 'support_top'
    and service_key is null and state = 'draft'
    and scheduled_at <= now()
    and approved_at is not null and approved_checksum = checksum
  order by scheduled_at asc
  for update skip locked
  limit 1;
  if not found then return; end if;

  update public.content_versions
  set state = 'archived', updated_at = now()
  where content_type = 'notice' and placement = 'support_top'
    and service_key is null and state = 'published';

  return query
  update public.content_versions
  set state = 'published', scheduled_at = null, published_at = now(),
      revision = revision + 1, updated_at = now()
  where id = v_draft.id
  returning *;
end;
$$;

revoke all on function public.update_support_notice_draft(uuid, integer, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.request_support_notice_approval(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.approve_support_notice_draft(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.schedule_support_notice_draft(uuid, integer, timestamptz, text) from public, anon, authenticated;
revoke all on function public.cancel_support_notice_schedule(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.publish_due_support_notices() from public, anon, authenticated;

grant execute on function public.update_support_notice_draft(uuid, integer, jsonb, text, text) to service_role;
grant execute on function public.request_support_notice_approval(uuid, integer, text) to service_role;
grant execute on function public.approve_support_notice_draft(uuid, integer, text) to service_role;
grant execute on function public.schedule_support_notice_draft(uuid, integer, timestamptz, text) to service_role;
grant execute on function public.cancel_support_notice_schedule(uuid, integer, text) to service_role;
grant execute on function public.publish_due_support_notices() to service_role;
