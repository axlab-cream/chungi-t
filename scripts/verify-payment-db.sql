-- Metadata-only readiness check for the confirmed UMSH Supabase project.
-- Run after supabase-payment-orders.sql. Every returned flag must be true.
-- This query never reads customer/payment rows and never creates an order,
-- changes payment status, charges a customer, or contacts a payment provider.
-- It verifies DB configuration, not the live API key or the payment gateway.
with target as (
  select to_regclass('public.cheongi_payment_orders')::oid as table_oid
), readiness as (
  select
    t.table_oid is not null as table_exists,
    coalesce(c.relrowsecurity, false) as rls_enabled,
    coalesce(
      has_table_privilege('service_role', t.table_oid, 'SELECT')
      and has_table_privilege('service_role', t.table_oid, 'INSERT')
      and has_table_privilege('service_role', t.table_oid, 'UPDATE')
      and has_table_privilege('service_role', t.table_oid, 'DELETE'),
      false
    ) as server_crud,
    coalesce((select rolbypassrls from pg_roles where rolname = 'service_role'), false)
      as server_bypasses_rls,
    t.table_oid is not null and not exists (
      select 1
      from (values ('anon'::text), ('authenticated'::text)) as browser(role_name)
      where has_table_privilege(
        browser.role_name, t.table_oid,
        'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'
      )
    ) as no_browser_table_access,
    t.table_oid is not null and not exists (
      select 1
      from (values ('anon'::text), ('authenticated'::text)) as browser(role_name)
      where has_any_column_privilege(
        browser.role_name, t.table_oid, 'SELECT, INSERT, UPDATE, REFERENCES'
      )
    ) as no_browser_column_access,
    t.table_oid is not null and not exists (
      select 1 from aclexplode(c.relacl) as acl where acl.grantee = 0
    ) as no_public_table_grants,
    t.table_oid is not null and not exists (
      select 1
      from pg_attribute as a
      cross join lateral aclexplode(a.attacl) as acl
      where a.attrelid = t.table_oid and a.attnum > 0 and not a.attisdropped
        and acl.grantee = 0
    ) as no_public_column_grants,
    t.table_oid is not null and not exists (
      select 1 from pg_policy as p
      where p.polrelid = t.table_oid
        and p.polname in (
          'payment orders owner select',
          'payment orders owner insert',
          'payment orders owner update'
        )
    ) as legacy_owner_policies_removed,
    exists (
      select 1 from pg_index as i
      join pg_class as idx on idx.oid = i.indexrelid
      where i.indrelid = t.table_oid
        and idx.relname = 'cheongi_payment_orders_owner_updated_idx'
        and i.indisvalid and i.indisready
    ) as owner_updated_index_ready
  from target as t
  left join pg_class as c on c.oid = t.table_oid
)
select *,
  table_exists and rls_enabled and server_crud and server_bypasses_rls
  and no_browser_table_access and no_browser_column_access
  and no_public_table_grants and no_public_column_grants
  and legacy_owner_policies_removed and owner_updated_index_ready
    as payment_storage_ready
from readiness;
