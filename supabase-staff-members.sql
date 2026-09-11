-- 직원 membership (T05 최소판) — 운영 관리자 권한의 **유일한 근거**
--
-- 왜 별도 테이블인가.
--   기존 `isAdminEmail`·`isAdminOwner`(`src/auth/admin.ts`)는 **결제 없이 유료 리포트를
--   여는 레거시 unlock 이메일 목록**이다. 그것을 운영 권한으로 재사용하면
--   (1) 직원 membership 없이 관리자 API 가 열리고
--   (2) 회수하려면 재배포해야 하며
--   (3) 누가 언제 권한을 얻었는지 감사할 수 없다 — "코드에 박힌 권한"이 된다.
--   `plan.md` 와 `docs/admin-ops/T01-baseline.md` 가 그 재사용을 금지한다.
--
-- 그래서 권한은 이 테이블 하나에서만 나온다. 회수는 `is_active = false` 한 줄이고,
-- 부여·회수 시각이 남는다.
--
-- 실행 위치: Supabase 대시보드 → SQL Editor (프로젝트 소유자)
-- 이 스크립트는 기존 테이블을 건드리지 않는다.

create table if not exists public.cheongi_staff_members (
  -- Supabase 계정과 1:1. 계정이 지워지면 권한도 함께 사라져야 한다.
  user_id     uuid primary key references auth.users(id) on delete cascade,
  -- 조회·감사용 표시값. 권한 판정에 쓰지 않는다 — 판정은 user_id 로만 한다.
  email       text not null,
  -- 지금은 한 가지 역할만 쓴다. 역할이 늘면 여기에 추가한다.
  role        text not null default 'operator' check (role in ('operator', 'owner')),
  -- 회수는 행 삭제가 아니라 이 플래그로 한다. 삭제하면 "언제 회수했는지"가 사라진다.
  is_active   boolean not null default true,
  note        text,
  granted_by  uuid references auth.users(id) on delete set null,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 활성 직원만 빠르게 찾는다. 관리자 API 는 매 요청 이 조회를 한다(A03).
create index if not exists cheongi_staff_members_active_idx
  on public.cheongi_staff_members (user_id) where is_active;

alter table public.cheongi_staff_members enable row level security;

-- 서버(service_role)만 이 테이블을 본다. 직원 자신도 직접 읽지 않는다 —
-- 관리자 화면은 `/api/admin/v1/*` 를 거치고, 그 안에서 서버가 확인한다.
-- 클라이언트가 직접 읽게 두면 직원 목록 자체가 노출 대상이 된다.
revoke all on table public.cheongi_staff_members from public, anon, authenticated;
grant select, insert, update, delete on table public.cheongi_staff_members to service_role;

-- 컬럼 권한은 테이블 권한과 별개다. 레거시 예외가 남지 않게 함께 지운다.
do $$
declare columns_sql text;
begin
  select string_agg(quote_ident(attname), ',') into columns_sql
  from pg_attribute
  where attrelid = 'public.cheongi_staff_members'::regclass and attnum > 0 and not attisdropped;
  execute format(
    'revoke all (%s) on table public.cheongi_staff_members from public, anon, authenticated',
    columns_sql
  );
end $$;

-- 회수 시각을 코드가 아니라 저장소가 채운다. `is_active` 를 내리면 그 순간이 기록된다.
create or replace function public.cheongi_staff_members_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.is_active = false and old.is_active = true then
    new.revoked_at := coalesce(new.revoked_at, now());
  end if;
  if new.is_active = true and old.is_active = false then
    new.revoked_at := null;
    new.granted_at := now();
  end if;
  return new;
end $$;

drop trigger if exists cheongi_staff_members_touch on public.cheongi_staff_members;
create trigger cheongi_staff_members_touch
  before update on public.cheongi_staff_members
  for each row execute function public.cheongi_staff_members_touch();

-- ─────────────────────────────────────────────────────────────
-- 첫 직원 등록 (수동, 1회)
--
-- 이메일이 아니라 **계정 id** 로 넣는다. 이메일은 바뀔 수 있고, 같은 이메일로
-- 다른 계정을 만들 수도 있다.
--
--   select id, email from auth.users where email = '넣을 직원 이메일';
--
-- 위에서 확인한 id 로 아래를 실행한다.
--
--   insert into public.cheongi_staff_members (user_id, email, role, note)
--   values ('<user id>', '<이메일>', 'owner', '최초 등록')
--   on conflict (user_id) do update
--     set is_active = true, role = excluded.role, email = excluded.email;
--
-- 회수:
--   update public.cheongi_staff_members set is_active = false where user_id = '<user id>';
-- ─────────────────────────────────────────────────────────────
