# UMSH Auth Session + History Sync

## 요청
- 한 번 로그인한 계정의 이름, 성별, 생년월일, 태어난 시간 입력정보가 DB에 저장되는지 확인한다.
- 재로그인은 30일 기준으로 잡고 기기별 로그인 상태를 유지한다.
- PC와 모바일에서 같은 소셜 계정으로 접속하면 동일한 고유 `user_id`의 해석 이력을 불러오게 한다.

## 적용
- Supabase `public.cheongi_user_profiles` 확인: `user_id` primary key, `auth.users` FK, RLS enabled, authenticated 본인 row select/insert/update 정책.
- Supabase `public.cheongi_reports` 확인: `user_id` FK, RLS enabled, authenticated 본인 row select/insert/update/delete 정책.
- `cheongi_reports`의 불필요한 anon table grant를 제거하고 authenticated grant만 남겼다.
- 서버에 `GET /api/user/reports`와 `DELETE /api/user/reports/:reportId`를 추가했다.
- 일반 `/api/saju/analyze` 요청도 인증된 사용자의 기본 사주 프로필을 DB에 업서트하도록 보강했다.
- 브라우저 Supabase 세션은 유지하되 앱 레벨에서 기기별 로그인 시작 시각을 저장하고 30일 초과 시 현재 기기만 `signOut({ scope: "local" })` 처리한다.
- 보관함을 열거나 로그인 세션이 확인되면 원격 리포트 목록을 로컬 history와 병합한다.

## 검증
- Supabase table row 확인: `cheongi_user_profiles` 2 rows, `cheongi_reports` 7 rows.
- Supabase grants 확인: 두 테이블 모두 anon select false, authenticated select/insert/update true.
- Supabase security advisor: 기존 leaked password protection warning만 남음.
- Supabase performance advisor: 기존 unused `cheongi_reports_user_id_idx`, Auth connection strategy info만 남음.
- `npm run typecheck` 통과.
- `npm test` 통과: 41 tests, 0 fail.
- `npm run vercel-build` 통과.
- 로컬 `http://localhost:8791`: `/api/user/reports`, `DELETE /api/user/reports/example`, `/api/today/fortune` 비로그인 401 확인.
- 로컬 `/cmdg/?entry=today#name` HTML에 30일 세션, 원격 보관함, 삭제 API, `birthTimeKnown` 코드 포함 확인.

## 운영 메모
- 실제 사용자 세션 토큰 없이는 특정 사용자 row의 개인정보 값을 직접 조회하지 않는다.
- 같은 카카오/네이버/구글 계정으로 PC와 모바일에서 각각 로그인하면 Supabase Auth의 동일 사용자 `id` 기준으로 프로필과 리포트 이력이 저장/조회된다.
- 30일 만료는 앱 레벨 기기 정책이다. Supabase 프로젝트 레벨 max session lifetime을 강제하려면 Dashboard Auth Sessions 설정도 별도 변경한다.
