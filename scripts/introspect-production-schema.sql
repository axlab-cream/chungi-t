-- 운영 스키마·권한 조회 (U4) — 읽기 전용, 고객 데이터 미열람
--
-- 실행 위치: Supabase 대시보드 → SQL Editor
-- 실행자: 프로젝트 소유자 (이 스크립트는 어떤 것도 변경하지 않는다)
--
-- 이 파일은 **메타데이터만** 읽는다. 고객의 리포트 본문·이름·생년월일·결제 정보를
-- 조회하는 문장은 하나도 없다. 마지막 §6 만 집계값(건수)을 세며 내용은 읽지 않는다.
--
-- 결과를 붙여 주시면 `docs/admin-ops/U4-production-schema.md` 에 기록하고,
-- 저장소의 `supabase-*.sql` 과 어긋난 부분을 정리한다.

-- ─────────────────────────────────────────────────────────────
-- §1. 테이블 존재와 RLS 활성 여부
-- ─────────────────────────────────────────────────────────────
select
  c.relname                       as table_name,
  c.relrowsecurity                as rls_enabled,
  c.relforcerowsecurity           as rls_forced,
  pg_catalog.obj_description(c.oid, 'pg_class') as comment
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- ─────────────────────────────────────────────────────────────
-- §2. 컬럼 정의 — 저장소 SQL 과의 드리프트를 본다
--     `cheongi_user_profiles` 는 저장소에 SQL 이 없다(U19). 여기 결과가 유일한 정본이다.
-- ─────────────────────────────────────────────────────────────
select
  table_name,
  ordinal_position as pos,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('cheongi_reports', 'cheongi_payment_orders', 'cheongi_user_profiles', 'cheongi_staff_members')
order by table_name, ordinal_position;

-- ─────────────────────────────────────────────────────────────
-- §3. RLS 정책 정의
--     정책 본문(USING / WITH CHECK)이 저장소의 것과 같은지 확인한다.
-- ─────────────────────────────────────────────────────────────
select
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual        as using_expression,
  with_check  as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ─────────────────────────────────────────────────────────────
-- §4. 테이블 권한 — 누가 읽고 쓸 수 있는가
--     기대: anon·authenticated 는 reports/orders 에서 revoke,
--           service_role 만 전권. profiles 는 authenticated 가 필요하다(앱이 RLS 경유로 읽는다).
-- ─────────────────────────────────────────────────────────────
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('cheongi_reports', 'cheongi_payment_orders', 'cheongi_user_profiles', 'cheongi_staff_members')
group by table_name, grantee
order by table_name, grantee;

-- ─────────────────────────────────────────────────────────────
-- §5. 컬럼 단위 권한 — 저장소 SQL 이 컬럼 단위로도 revoke 한다
-- ─────────────────────────────────────────────────────────────
select
  table_name,
  grantee,
  privilege_type,
  count(*)                                   as column_count,
  string_agg(column_name, ', ' order by column_name) as columns
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('cheongi_reports', 'cheongi_payment_orders', 'cheongi_user_profiles')
  and grantee in ('anon', 'authenticated', 'public')
group by table_name, grantee, privilege_type
order by table_name, grantee, privilege_type;

-- ─────────────────────────────────────────────────────────────
-- §6. 집계만 — 소급 정리 규모 판단용 (U26)
--     내용을 읽지 않는다. jsonb 키의 **존재 여부**만 세어 건수를 낸다.
-- ─────────────────────────────────────────────────────────────
select
  count(*)                                                          as total_reports,
  count(*) filter (where payload -> 'context' -> 'partner' ? 'birth') as reports_with_partner_birth
from public.cheongi_reports;

-- ─────────────────────────────────────────────────────────────
-- §7. 인덱스·제약
-- ─────────────────────────────────────────────────────────────
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('cheongi_reports', 'cheongi_payment_orders', 'cheongi_user_profiles', 'cheongi_staff_members')
order by tablename, indexname;
