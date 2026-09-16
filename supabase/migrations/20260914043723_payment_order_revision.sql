alter table public.cheongi_payment_orders
  add column if not exists revision integer not null default 0;

alter table public.cheongi_payment_orders
  drop constraint if exists cheongi_payment_orders_revision_nonnegative;

alter table public.cheongi_payment_orders
  add constraint cheongi_payment_orders_revision_nonnegative
  check (revision >= 0);
