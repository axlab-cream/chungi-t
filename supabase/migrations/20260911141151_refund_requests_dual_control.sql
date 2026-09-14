create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  amount integer not null check (amount > 0),
  reason text not null check (char_length(reason) between 1 and 240),
  state text not null default 'requested' check (state in ('requested', 'approved', 'processing', 'succeeded', 'failed', 'unknown', 'rejected')),
  requested_by_email text not null check (requested_by_email = lower(requested_by_email)),
  approved_by_email text,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (requested_by_email, idempotency_key)
);
create index refund_requests_order_state_idx on public.refund_requests (order_id, state, created_at desc);
alter table public.refund_requests enable row level security;
revoke all on table public.refund_requests from public, anon, authenticated, service_role;
grant select, insert, update on table public.refund_requests to service_role;

create function public.create_refund_request(
  p_order_id text,
  p_amount integer,
  p_reason text,
  p_requested_by_email text,
  p_idempotency_key text,
  p_expected_order_revision integer
) returns public.refund_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.cheongi_payment_orders%rowtype;
  v_existing public.refund_requests%rowtype;
  v_reserved integer;
  v_result public.refund_requests%rowtype;
begin
  select * into v_existing from public.refund_requests
  where requested_by_email = lower(p_requested_by_email) and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_existing.order_id <> p_order_id or v_existing.amount <> p_amount or v_existing.reason <> p_reason then
      raise exception 'REFUND_IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return v_existing;
  end if;

  select * into v_order from public.cheongi_payment_orders where order_id = p_order_id for update;
  if not found then raise exception 'REFUND_ORDER_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_order.revision <> p_expected_order_revision then raise exception 'REFUND_ORDER_REVISION_CONFLICT' using errcode = 'P0001'; end if;
  if v_order.status not in ('paid', 'viewed') then raise exception 'REFUND_ORDER_NOT_REFUNDABLE' using errcode = 'P0001'; end if;

  select coalesce(sum(amount), 0) into v_reserved from public.refund_requests
  where order_id = p_order_id and state in ('requested', 'approved', 'processing', 'unknown', 'succeeded');
  if p_amount <= 0 or p_amount > v_order.amount - v_reserved then raise exception 'REFUND_AMOUNT_EXCEEDS_REMAINING' using errcode = 'P0001'; end if;

  insert into public.refund_requests (order_id, amount, reason, requested_by_email, idempotency_key)
  values (p_order_id, p_amount, p_reason, lower(p_requested_by_email), p_idempotency_key)
  returning * into v_result;
  return v_result;
end;
$$;

create function public.approve_refund_request(
  p_refund_id uuid,
  p_approved_by_email text,
  p_expected_revision integer
) returns public.refund_requests
language plpgsql
security definer
set search_path = ''
as $$
declare v_refund public.refund_requests%rowtype;
begin
  select * into v_refund from public.refund_requests where id = p_refund_id for update;
  if not found then raise exception 'REFUND_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_refund.revision <> p_expected_revision then raise exception 'REFUND_REVISION_CONFLICT' using errcode = 'P0001'; end if;
  if v_refund.requested_by_email = lower(p_approved_by_email) then raise exception 'REFUND_SELF_APPROVAL_FORBIDDEN' using errcode = 'P0001'; end if;
  if v_refund.state <> 'requested' then raise exception 'REFUND_NOT_REQUESTED' using errcode = 'P0001'; end if;
  update public.refund_requests set state = 'approved', approved_by_email = lower(p_approved_by_email), approved_at = now(), revision = revision + 1, updated_at = now()
  where id = p_refund_id returning * into v_refund;
  return v_refund;
end;
$$;

revoke all on function public.create_refund_request(text, integer, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.approve_refund_request(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.create_refund_request(text, integer, text, text, text, integer) to service_role;
grant execute on function public.approve_refund_request(uuid, text, integer) to service_role;
