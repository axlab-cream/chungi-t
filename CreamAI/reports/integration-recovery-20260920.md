# 운명상회 로컬·Git·Vercel·Supabase 안전 복구

- 점검일: 2026-09-20 KST
- 작업공간: `C:/Users/user/Desktop/chungi-t`
- 운영 도메인: `https://umsh.kr`
- 비밀정보: 값 미기록, 상태와 식별자만 기록

## Observation

1. 로컬 `main`은 `a0c388b`에서 멈춰 `origin/main`보다 45커밋 뒤였고, 9월 18일 연동 점검 기록과 Playwright 증거가 미커밋 상태였다.
2. `upstream`은 존재하지 않는 `jaeyong-planner/chungi-t`를 가리켜 `git fetch --all`을 실패시켰다.
3. GitHub CI는 단위 테스트 1,473개와 typecheck를 통과한 뒤 `check:marry`에서 실패했다. 9월 17일 승인 커밋 `819d44c`가 결혼궁합 목차를 70항목에서 24항목으로 줄였지만, 검사와 고객 안내가 70을 계속 요구했다.
4. Vercel Production은 `69d36fc`를 Ready로 제공하며 `umsh.kr`과 `chungi-t.vercel.app`에 연결돼 있다.
5. Supabase 프로젝트 `wdyzollywccgaepjeynu`는 `ACTIVE_HEALTHY`이며 핵심 REST/Auth 흐름은 정상이다. 문제는 런타임 연결이 아니라 migration history였다.

## Decision and artifact

- 기존 미커밋 연동 기록은 로컬 브랜치 `codex/backup-pre-sync-20260920`, 커밋 `0a4e4c3`에 보존했다.
- `.playwright-mcp/`는 삭제하지 않고 `.git/info/exclude`에만 추가했다.
- 로컬 `main`을 `origin/main` `69d36fc`로 fast-forward했다.
- 기존 `upstream`은 보존하되 `remote.upstream.skipDefaultUpdate=true`로 설정해 기본 fetch에서 제외했다.
- 결혼궁합 정본을 10묶음/24항목으로 고정하고 검사, 런타임 주석, 고객 안내를 같은 값으로 맞췄다.
- 원격 migration table의 SQL을 읽어 저장소에 없던 historical migration 11개를 복원했다.
- 이름과 SQL이 같고 타임스탬프만 달랐던 결제 migration 2개를 원격 버전 `20260914024826`, `20260914043741`에 맞췄다.

## Supabase migration reconciliation

복구 전에는 원격 전용 13개와 로컬 전용 10개가 있었다. 복구 후 원격 22개는 모두 같은 버전의 로컬 SQL을 가진다.

원격 history에 아직 없는 로컬 버전은 아래 8개다.

- `20260914150000_refund_self_approval_precedence.sql`
- `20260914160000_service_config_version_commands.sql`
- `20260917120000_funnel_events.sql`
- `20260917150000_cheongi_report_list_view.sql`
- `20260917160000_cheongi_report_light_column.sql`
- `20260918090000_cheongi_report_light_slim.sql`
- `20260919090000_admin_incident_tracking.sql`
- `20260919120000_prompt_content_versions.sql`

읽기 전용 원격 조회에서 위 변경이 만든 함수·표·뷰·생성 열은 모두 존재했다. `db push --dry-run --include-all --skip-vault`도 이 8개만 적용 대상으로 보고했다. 즉 스키마는 존재하지만 history 행이 없는 상태다.

## Gate

원격 migration history 수정은 `rules.md` §6 H2와 `plan.md` TASK-004 G1~G5의 하드 스톱 대상이다. 사용자의 2026-09-20 후속 승인은 G5를 충족했지만, G3 전체 권한·RLS 동등성 검토와 G4 사전 dry-run 0건이 충족되지 않아 `migration repair`와 `db push`는 실행하지 않았다.

같은 승인으로 Git push와 Vercel 자동 배포는 실행했다. 커밋 `ae12c69`를 `origin/main`에 push했고 GitHub CI와 Production 배포가 성공했다.

백업/PITR, 정확한 함수 정의·권한·RLS diff, 롤백 담당자를 확인한 뒤에만 아래 형태의 명령을 검토한다. 이 문장은 실행 기록이 아니다.

```powershell
npx supabase@latest migration repair --linked --status applied 20260914150000 20260914160000 20260917120000 20260917150000 20260917160000 20260918090000 20260919090000 20260919120000
```

## Verification

- `git fetch --all`: PASS, 종료코드 0
- `npm run check:marry`: PASS, 16계약·6페이지·10대분류
- `npx tsx --test tests/unit/service-scope-contract.test.ts`: PASS 1/1
- 원격 SQL 대조: 복원/이름 수정한 13개가 원격 migration statements와 일치
- `npx supabase@latest migration list --linked`: 원격 전용 0, 로컬 전용 8
- `npx supabase@latest db push --linked --dry-run --include-all --skip-vault`: 8개만 계획, 실제 적용 0

## Final verification

- `npm run typecheck`: PASS
- `npm test`: PASS, 1,474/1,474
- 서비스 검수 14종: PASS
- SEO foundation: PASS, sitemap 19 URL / FAQ 126
- `npm run qa:all-services`: PASS, 20/20
- `npm run vercel-build`: PASS, 생성물 추가 변경 없음
- `npm run check:integrations -- --base https://umsh.kr`: PASS, 10/10
- Vercel Production: `Ready`, `umsh.kr` alias 확인
- ProjectOps changed-file secret scan: PASS
- Grok reviewer: blocking finding 없음. 퇴사운 칩/기존 안내 문구/주석/상태 기록 지적은 반영.
- Supabase `db lint --linked`: `BLOCKED`, DB password 인증 실패. 마이그레이션 조회와 운영 REST/Auth 점검은 정상이며 원격 변경은 없었음.
- Supabase physical backup: 완료 백업 8개, 최신 `2026-09-19T16:55:10Z`; PITR 비활성.
- GitHub push: `origin/main` = `ae12c69`, CI run `35473142768` SUCCESS.
- Vercel Production: `dpl_8hxeRbUCLcHAofNXms8uHoCzXvGU` Ready, `umsh.kr` alias 확인.
- 운영 재검증: 연동 10/10 PASS, `/about` 서비스 범위 및 퇴사운 8개 칩 PASS.

Git/Vercel 반영은 완료됐다. 원격 migration history repair는 G3·G4를 충족하는 별도 DB 작업으로 남긴다.
