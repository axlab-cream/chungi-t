-- Server-only payment storage. Run as the confirmed project's DB administrator.
-- The application verifies ownership and payment transitions; clients cannot set
-- an order's amount, approval details, report binding or paid/viewed status.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

create table if not exists public.cheongi_payment_orders (
  order_id text primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  owner_email text,
  buyer_email text not null,
  buyer_tel text not null,
  product_key text not null,
  product_title text not null,
  amount integer not null check (amount > 0),
  status text not null check (status in ('ready', 'approving', 'paid', 'viewed', 'cancelled', 'failed')),
  tid text,
  pay_method text,
  approval_code text,
  message text,
  report_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installs: add the report binding that unlocks a specific paid report.
alter table public.cheongi_payment_orders add column if not exists report_id text;
-- 낙관적 동시성 제어. 쓰기는 자기가 읽은 판에만 적용된다.
--
-- 없으면 읽고-고쳐-쓰기가 서로를 덮는다. 결제에서 그것은 돈 기록이 사라지는 문제다 —
-- 승인 콜백과 조회 폴링이 겹치면 나중 쓰기가 앞선 상태를 통째로 지운다(U17).
-- 기존 행은 0 에서 시작한다. 애플리케이션은 열이 없어도 0 으로 읽으므로,
-- 이 열을 추가하기 전 배포에서도 깨지지 않는다.
alter table public.cheongi_payment_orders add column if not exists revision integer not null default 0;

alter table public.cheongi_payment_orders enable row level security;

drop policy if exists "payment orders owner select" on public.cheongi_payment_orders;
drop policy if exists "payment orders owner insert" on public.cheongi_payment_orders;
drop policy if exists "payment orders owner update" on public.cheongi_payment_orders;

revoke all on table public.cheongi_payment_orders from public, anon, authenticated;

-- Table-level REVOKE does not remove independent column grants on older installs.
do $$
declare
  order_columns text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
    into order_columns
  from pg_attribute
  where attrelid = 'public.cheongi_payment_orders'::regclass
    and attnum > 0 and not attisdropped;
  execute format(
    'revoke all (%s) on table public.cheongi_payment_orders from public, anon, authenticated',
    order_columns
  );
end $$;

grant select, insert, update, delete on public.cheongi_payment_orders to service_role;

create index if not exists cheongi_payment_orders_owner_updated_idx
  on public.cheongi_payment_orders (owner_id, updated_at desc);

commit;
