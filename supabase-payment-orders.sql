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

alter table public.cheongi_payment_orders enable row level security;

drop policy if exists "payment orders owner select" on public.cheongi_payment_orders;
create policy "payment orders owner select" on public.cheongi_payment_orders
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists "payment orders owner insert" on public.cheongi_payment_orders;
create policy "payment orders owner insert" on public.cheongi_payment_orders
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "payment orders owner update" on public.cheongi_payment_orders;
create policy "payment orders owner update" on public.cheongi_payment_orders
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists cheongi_payment_orders_owner_updated_idx
  on public.cheongi_payment_orders (owner_id, updated_at desc);
