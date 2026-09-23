# 회원별 대운 흐름·공통 현실 기준 — 2026-09-22

## observation

- 저장 리포트의 UI 분석 payload에는 이미 `fortune.daewoon`, `fortune.currentDaewoon`, `fortune.currentYear`가 있다.
- 현실 조건을 리포트별 브라우저 메모리에만 두면 다음 해석에서 재사용할 수 없다.

## decision

- 대운 흐름은 저장 리포트의 실제 `fortune` 결과만 렌더한다. 임의 운세 점수, 미래 사건, 삼재 계산값은 추가하지 않는다.
- 회원이 직접 적는 현실 기준은 기존 `cheongi_user_profiles.profile_payload` JSONB의 `life_context`에 저장한다. 새 migration은 만들지 않는다.
- 구형 프로필 저장 요청이 `lifeContext`를 생략하면 이전 값은 유지한다.
- 저장 해석 API는 인증된 소유자의 `memberContext`만 반환한다. 기존 저장 원문은 불변이다.

## artifact

- `src/user/profile-store.ts`
- `src/server/app.ts`
- `사주/profile.html`, `사주/js/profile.js`
- `사주/js/umsh-report-access.js`, `사주/css/umsh-verified-reader.css`
- `tests/unit/user-profile-shared-context.test.ts`

## qa

- `npx tsx --test tests/unit/user-profile-shared-context.test.ts tests/unit/report-access-frontend.test.ts tests/unit/report-api-access.test.ts`: 70/70 PASS
- `npm run typecheck`: PASS
- `node --check 사주/js/umsh-report-access.js`; `node --check 사주/js/profile.js`; `git diff --check`: PASS

## limits

- 원격 DB 기록·배포·커밋·push는 실행하지 않았다.
- 로컬 서버에서는 운영 로그인 세션을 보유하지 않아 인증 후 실제 프로필 저장 UI E2E는 실행하지 않았다.
