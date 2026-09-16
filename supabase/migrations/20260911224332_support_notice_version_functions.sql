-- T22 Slice 4: one editable draft and one published support notice. Browser
-- roles keep no table access; only the server service role can call these
-- security-definer functions.
create unique index if not exists content_versions_one_draft_placement
  on public.content_versions (content_type, coalesce(service_key, ''), placement)
  where state = 'draft';

create or replace function public.create_support_notice_draft(
  p_payload jsonb,
  p_checksum text,
  p_review_note text,
  p_author_email text
)
returns setof public.content_versions
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('content:notice:support_top', 0));
  if exists (
    select 1 from public.content_versions
    where content_type = 'notice' and service_key is null and placement = 'support_top' and state = 'draft'
  ) then
    raise exception using errcode = '23505', message = 'SUPPORT_NOTICE_DRAFT_EXISTS';
  end if;

  return query
  insert into public.content_versions (
    content_type, service_key, placement, payload, checksum, state,
    author_email, review_note, revision
  ) values (
    'notice', null, 'support_top', p_payload, p_checksum, 'draft',
    pg_catalog.lower(p_author_email), nullif(pg_catalog.btrim(p_review_note), ''), 0
  )
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
  candidate public.content_versions%rowtype;
begin
  if nullif(pg_catalog.btrim(p_actor_email), '') is null then
    raise exception using errcode = '22023', message = 'SUPPORT_NOTICE_ACTOR_INVALID';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('content:notice:support_top', 0));
  select * into candidate
  from public.content_versions
  where id = p_draft_id
    and content_type = 'notice'
    and service_key is null
    and placement = 'support_top'
  for update;

  if not found or candidate.state <> 'draft' or candidate.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'SUPPORT_NOTICE_DRAFT_REVISION_CONFLICT';
  end if;

  update public.content_versions
  set state = 'archived', updated_at = pg_catalog.now()
  where content_type = 'notice'
    and service_key is null
    and placement = 'support_top'
    and state = 'published';

  return query
  update public.content_versions
  set state = 'published',
      revision = revision + 1,
      published_at = pg_catalog.now(),
      scheduled_at = null,
      updated_at = pg_catalog.now()
  where id = candidate.id
  returning *;
end;
$$;

revoke all on function public.create_support_notice_draft(jsonb, text, text, text) from public, anon, authenticated;
revoke all on function public.publish_support_notice_draft(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.create_support_notice_draft(jsonb, text, text, text) to service_role;
grant execute on function public.publish_support_notice_draft(uuid, integer, text) to service_role;
