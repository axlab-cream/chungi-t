-- task-022 — Census of settled orders that were never bound to a reading.
--
-- WHY: entitlement now binds an order to one reportId. Orders settled before that deploy carry
-- no report_id, and they are grandfathered only for readings created before a cutoff
-- (UMSH_LEGACY_ORDER_CUTOFF, default 2026-09-04T00:00:00+09:00). If the cutoff is wrong, a past
-- buyer loses access. This query tells us where to put it.
--
-- SAFETY: aggregates only. It returns counts and timestamps. It never returns an email, phone
-- number, owner id, order id, TID or approval code, never writes, and never contacts the PG.

-- 1) How many settled orders are bound vs unbound, per product.
select
  product_key,
  count(*)                                              as settled_orders,
  count(*) filter (where coalesce(report_id, '') <> '') as bound,
  count(*) filter (where coalesce(report_id, '') =  '') as unbound
from public.cheongi_payment_orders
where status in ('paid', 'viewed')
group by product_key
order by unbound desc, settled_orders desc;

-- 2) The unbound ones: when were they settled, and do they fall before the proposed cutoff?
--    `after_cutoff` rows are the ones claim-on-first-use will handle; `before_cutoff` rows are
--    the legacy grandfathered set. A large `after_cutoff` count means orders are still being
--    created without a report binding and the checkout entry points need review.
with unbound as (
  select product_key, created_at
  from public.cheongi_payment_orders
  where status in ('paid', 'viewed') and coalesce(report_id, '') = ''
)
select
  count(*)                                                         as unbound_total,
  count(*) filter (where created_at <  timestamptz '2026-09-04 00:00:00+09') as before_cutoff,
  count(*) filter (where created_at >= timestamptz '2026-09-04 00:00:00+09') as after_cutoff,
  min(created_at)                                                  as oldest,
  max(created_at)                                                  as newest
from unbound;

-- 3) Monthly distribution of the unbound orders, so the cutoff can be placed on a real boundary
--    instead of a guessed one.
select
  date_trunc('month', created_at) as month,
  product_key,
  count(*)                        as unbound_orders
from public.cheongi_payment_orders
where status in ('paid', 'viewed') and coalesce(report_id, '') = ''
group by 1, 2
order by 1 desc, 3 desc;

-- 4) Do the accounts holding an unbound order also hold a bound one? An owner who already has a
--    bound order for the same product is not at risk from a stricter cutoff.
with settled as (
  select owner_id, product_key, coalesce(report_id, '') <> '' as is_bound
  from public.cheongi_payment_orders
  where status in ('paid', 'viewed')
)
select
  count(*) as owners_product_pairs_with_unbound,
  count(*) filter (where has_bound)     as also_hold_a_bound_order,
  count(*) filter (where not has_bound) as unbound_only_at_risk
from (
  select owner_id, product_key,
    bool_or(is_bound)      as has_bound,
    bool_or(not is_bound)  as has_unbound
  from settled
  group by owner_id, product_key
) as per_owner
where has_unbound;
