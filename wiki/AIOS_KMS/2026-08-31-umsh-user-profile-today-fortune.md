# UMSH User Profile + Today Fortune

## 요청
- 운명상회 Today 무료 버튼 이후 로그인 사용자가 오늘운을 바로 볼 수 있게 한다.
- 이름, 생년월일, 태어난 시간이 없으면 입력폼으로 보내고, 저장 후 모든 서비스에서 재입력 없이 불러오게 한다.

## 적용
- Supabase `public.cheongi_user_profiles` 테이블을 생성하고 `user_id` 기준 RLS select/insert/update 정책을 적용했다.
- 서버 API를 추가했다: `GET/PUT /api/user/profile`, `POST /api/today/fortune`.
- Today 해석은 저장된 기본 사주 프로필을 바탕으로 KST 오늘 날짜의 일진을 계산해 일/돈/관계/주의/행동 기준으로 반환한다.
- `/signup?entry=today` OAuth 복귀 후 저장 프로필이 있으면 Today 결과로 바로 이동하고, 없으면 기존 이름/생년월일/시간 입력 단계로 이동한다.
- 일반 종합사주 진입도 로그인 상태에서 저장 프로필이 있으면 기본 입력 단계를 건너뛰고 고민 입력으로 이동한다.

## 검증 계획
- Supabase table/RLS/advisor 확인
- `npm run typecheck`
- `npm test`
- 로컬 HTTP/API와 인라인 UI 코드로 Today missing-profile/profile-present 분기 확인

## 검증 결과
- Supabase `cheongi_user_profiles` 생성 확인: RLS enabled, `user_id` primary key, `auth.users` FK.
- 정책 확인: authenticated 본인 row select/insert/update, anon select 불가.
- advisor 확인: 신규 프로필 테이블 관련 security/performance lint 없음. 기존 프로젝트 권고만 남음.
- 로컬 API 확인: `/api/health` 200, 비로그인 `/api/user/profile`과 `/api/today/fortune` 401, invalid token Today 요청 401.
- 정적 UI 확인: `/signup?entry=today` HTML에 Today 로그인/프로필/결과 흐름 코드 포함.
- `npm run typecheck` 통과.
- `npm test` 통과: 40 tests, 0 fail.
- `npm run vercel-build` 통과.
