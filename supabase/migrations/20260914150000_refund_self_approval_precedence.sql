-- 자기승인 검사를 revision 검사보다 앞으로 옮긴다.
--
-- 이전 정의는 revision 을 먼저 봤다. 그래서 요청자가 낡은 revision 으로 자기 요청을
-- 승인하려 하면 REFUND_REVISION_CONFLICT 가 나왔다. 관리자 화면은 "새로고침 후 다시"로
-- 안내하므로, 운영자는 절대 성공할 수 없는 동작을 재시도하게 된다.
-- 승인자가 누구인지는 revision 과 무관한 사실이므로 먼저 판정한다.
--
-- 테이블·권한·상태 전이는 그대로다. 함수 본문의 검사 순서만 바뀐다.
create or replace function public.approve_refund_request(
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
  if v_refund.requested_by_email = lower(p_approved_by_email) then raise exception 'REFUND_SELF_APPROVAL_FORBIDDEN' using errcode = 'P0001'; end if;
  if v_refund.revision <> p_expected_revision then raise exception 'REFUND_REVISION_CONFLICT' using errcode = 'P0001'; end if;
  if v_refund.state <> 'requested' then raise exception 'REFUND_NOT_REQUESTED' using errcode = 'P0001'; end if;
  update public.refund_requests set state = 'approved', approved_by_email = lower(p_approved_by_email), approved_at = now(), revision = revision + 1, updated_at = now()
  where id = p_refund_id returning * into v_refund;
  return v_refund;
end;
$$;

revoke all on function public.approve_refund_request(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.approve_refund_request(uuid, text, integer) to service_role;
