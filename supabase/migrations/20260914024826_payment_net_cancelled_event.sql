alter table public.financial_events
  drop constraint if exists financial_events_kind_check;

alter table public.financial_events
  add constraint financial_events_kind_check
  check (kind in ('payment_approved', 'payment_net_cancelled'));
