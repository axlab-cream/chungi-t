리뷰 스킬과 현재 uncommitted diff를 먼저 확인한 뒤, 지정된 포커스 영역만 근거로 검토하겠습니다.핵심 문서와 uncommitted diff를 읽어 리뷰 범위를 확정합니다.변경된 파일과 복원된 마이그레이션 내용을 대조해 보겠습니다.TOC 숫자, about.html, 마이그레이션, 통합 리포트를 대조해 가드가 실제 런타임과 맞는지 확인합니다.런타임 TOC 실제 개수와 about.html JSON-LD·칩 표시가 가드 숫자와 맞는지 대조합니다.about.html과 런타임 TOC를 파싱해 숫자 정합성을 직접 집계합니다.PowerShell 인용 이슈를 피해 세션 임시 스크립트로 집계하겠습니다.복원된 마이그레이션 SQL과 가드 카운팅 로직을 확인합니다.# Review Report - integration-20260920

## 1. Scope
- Task id: `integration-20260920`
- Reviewed files:
  - `scripts/check-cat.mjs`, `scripts/check-couple.mjs`, `scripts/check-jobchoice.mjs`, `scripts/check-lucky.mjs`, `scripts/check-marry.mjs`, `scripts/check-newyear.mjs`, `scripts/check-quit.mjs`, `scripts/check-save.mjs`, `scripts/check-signal.mjs`, `scripts/check-thisyear.mjs`, `scripts/check-wedding.mjs`
  - `src/body/lucky-service.ts`, `src/day/wedding-service.ts`, `src/flow/newyear-service.ts`, `src/love/signal-service.ts`, `src/love/thisyear-service.ts`, `src/match/couple-service.ts`, `src/match/marry-service.ts`, `src/money/save-service.ts`, `src/pet/cat-service.ts`, `src/work/jobchoice-service.ts`, `src/work/quit-service.ts` (read-only TOC)
  - `사주/about.html`
  - `tests/unit/service-scope-contract.test.ts`
  - `CreamAI/integrations/state.json`
  - `CreamAI/logs/integrations/github.jsonl`, `CreamAI/logs/integrations/supabase.jsonl`, `CreamAI/logs/integrations/vercel.jsonl`, `CreamAI/logs/integrations/creamwiki.jsonl`
  - `CreamAI/reports/integration-recovery-20260920.md`
  - `docs/superpowers/plans/2026-09-20-integration-state-recovery.md`
  - `status.md`
  - restored: `supabase/migrations/20260831053851_create_cheongi_reports_auth_storage.sql`, `20260831054747_harden_cheongi_reports_rls.sql`, `20260831073111_allow_users_delete_own_cheongi_reports.sql`, `20260831115018_create_cheongi_user_profiles.sql`, `20260831115038_drop_cheongi_user_profiles_updated_at_index.sql`, `20260901010303_harden_cheongi_reports_anon_grants.sql`, `20260911220432_create_service_config_draft.sql`, `20260911222600_publish_service_config_draft.sql`, `20260911224332_support_notice_version_functions.sql`, `20260912002420_media_assets_storage_lifecycle.sql`, `20260912093000_support_notice_approval_schedule.sql`
  - renamed (R100): `supabase/migrations/20260914024826_payment_net_cancelled_event.sql`, `supabase/migrations/20260914043741_payment_order_revision.sql`
- Review time: `2026-09-19T22:05:08Z`

## 2. Verdict
- Approved with comments
- Summary: Blocking finding은 없다. CI 가드의 `EXPECTED_GROUPS`/`EXPECTED_ITEMS` 변경은 런타임 TOC 축소와 일치하고, 계약·페이지·아트워크 검사는 그대로다. JSON-LD와 숫자 카피(묶음/항목)는 런타임과 맞다. 공개 퇴사운 칩은 합쳐 없앤 대분류 2개를 그대로 보여 고객 화면이 8묶음 숫자와 어긋난다. 복원 마이그레이션 11개와 타임스탬프 이름 수정 2건은 원격 재적용·history repair를 실행하지 않은 전제에서 파괴적 신규 쓰기로 보이지 않는다.

## 3. Critical Issues
- 없음.

## 4. Major Issues
- [`사주/about.html:48`] Issue: 공개 `id="service-quit"` 상세가 `상세 풀이 목차 · 8묶음 20개 항목`을 쓰면서 칩은 10개다. `번아웃 체크`, `남는다면`이 남아 있다. `src/work/quit-service.ts:33-35`는 `burnout`/`stay`를 05/06에서 지웠고 `WORK_QUIT_TOC`는 8그룹 20항목이다 (`flow`, `why-hard`, `money`, `next-career`, `timing`, `exit-method`, `mental-people`, `action-plan`).
- Risk: 살아 있는 소개 화면이 없는 대분류를 보여 준다. 포스터·JSON-LD의 20항목과 칩 목록이 어긋난다. `tests/unit/service-scope-contract.test.ts:38-42`는 meta 문자열만 봐서 이 불일치를 놓친다.
- Recommendation: 퇴사운 칩을 `WORK_QUIT_TOC` 8개 title에 맞추고, 가능하면 칩 수 = `EXPECTED_GROUPS`를 테스트에 넣는다.

## 5. Minor Issues
- [`사주/about.html:64`] Issue: 이용 방법 예시가 결혼택일을 `6개 묶음 21개 항목`으로 적는다. 같은 파일의 paused wedding 상세와 `WEDDING_TOC`는 6묶음 12항목이다. 이 줄은 이번 diff에서 안 바뀐 기존 문장이다.
- Risk: `/about`에서 일시정지 서비스 예시가 잘못된 목차 크기를 보여 준다.
- Recommendation: 예시를 공개 서비스로 바꾸거나 `6묶음 12개 항목`으로 고친다.

- [`scripts/check-quit.mjs:19`] Issue: `EXPECTED_GROUPS = 8`, `EXPECTED_ITEMS = 20`으로 바꿨는데 주석은 여전히 48항목을 정본처럼 적는다. `scripts/check-wedding.mjs:16-17`도 12항목인데 20항목 주석이 남는다.
- Risk: 이후 가드 숫자를 옛 주석 기준으로 되돌릴 수 있다.
- Recommendation: 주석을 현재 런타임 계약에 맞춘다.

- [`CreamAI/reports/integration-recovery-20260920.md:57`] Issue: `tests/unit/marry-scope-contract.test.ts` PASS를 적었으나 그 파일은 없다. 실제 추가는 `tests/unit/service-scope-contract.test.ts`다.
- Risk: 재현 경로가 깨진다.
- Recommendation: 리포트 경로를 실제 테스트 파일로 고친다.

- [`CreamAI/integrations/state.json:39`] Issue: notes가 `22 remote migrations restored locally`다. 워킹 트리 기준 신규 복원은 11개 SQL이고, 22는 맞춘 원격 버전 수다.
- Risk: 운영자가 22개 파일을 새로 넣었다고 오해할 수 있다.
- Recommendation: `22 matched after restoring 11 historical files and renaming 2 timestamps`처럼 구분한다.

- [`CreamAI/integrations/state.json:51`] Issue: `loginId carrotcap`, `personalPrefix personal/carrotcap/`가 들어 있다. 토큰/비밀번호는 아니다.
- Risk: 커밋되면 개인 식별자가 저장소에 남는다.
- Recommendation: 계정 식별자는 빼고 터널 포트/상태만 남긴다.

## 6. Verification Gaps
- Gap: 신규 테스트는 `MARRY_MATCH_TOC`만 세고, 나머지 서비스는 `check-*.mjs` 상수와 about meta 문자열만 대조한다. 칩 수·JSON-LD 항목 수는 보지 않는다.
- Suggested check: 각 서비스 TOC `groups`/`items`와 about 칩 수, JSON-LD `N개 항목`을 같은 fixture로 고정한다.

- Gap: 이 리뷰는 원격 `migration list`/스키마 조회를 다시 실행하지 않았다. 22 matched / 8 local-only / repair 미실행은 제공 증거를 전제로 한다.
- Suggested check: 커밋 전 읽기 전용 `npx supabase@latest migration list --linked`로 로컬 버전 목록이 리포트의 8개 local-only와 같은지 재확인한다. `migration repair` / `db push` / deploy는 실행하지 않는다.

- Gap: 복원 SQL 일부(`20260911220432_create_service_config_draft.sql`, `20260912002420_media_assets_storage_lifecycle.sql`, `20260912093000_support_notice_approval_schedule.sql`)는 최상위 문장 사이에 세미콜론이 없다. 원격 statements와 바이트 일치라면 history 정합에는 맞을 수 있으나, 로컬 `db reset` 재실행은 실패할 수 있다.
- Suggested check: 원격 schema_migrations statements와 파일 바이트를 한 번 더 대조한다. 불일치면 원격 원문을 그대로 두고, 임의로 세미콜론을 넣지 않는다.

## 7. Final Recommendation
- Next action: Blocking issue는 없다. 공개 퇴사운 칩을 8그룹 런타임에 맞춘 뒤 로컬 커밋만 진행한다. 원격 history repair, `db push`, Git push, Vercel 배포는 기존 G1–G5 / §6 H2 게이트를 해제하기 전에는 실행하지 않는다.

CI 가드 대조 (약화 없음): 변경은 카운트 상수와 대응 주석뿐이다. `CONTRACTS`, 페이지 목록, 라우트/아트워크 검사는 그대로다. 런타임 항목 수는 가드와 같다 — couple 14/28, marry 10/24, signal 10/21, thisyear 8/24, jobchoice 10/21, cat 10/20, save 8/16, quit 8/20, lucky 6/13, wedding 6/12, newyear 10/20.

JSON-LD (`사주/about.html:3`) 항목 수: 커플 28, 결혼궁합 24, 직장선택 21, 올해연애운 24, 고양이 20, 소비성향 16, 신년 20, 퇴사운 20, lucky 13. 관계 신호 JSON-LD는 원래 숫자를 넣지 않았고 본문 meta만 21이다.

마이그레이션: 복원 11개는 `20260911213941` 테이블 생성 이후 함수/초안 명령이 오도록 정렬된다. `DROP`은 `DROP POLICY/TRIGGER/INDEX IF EXISTS`와 인덱스 1개(`20260831115038`)뿐이고 `DROP TABLE`/`TRUNCATE`/`DELETE FROM`은 없다. 타임스탬프 rename 2건은 R100이며 내용은 `financial_events` kind 체크 재정의, `cheongi_payment_orders.revision` 추가다. 원격 버전 이름에 맞춘 로컬 파일명 수정으로 보이며, 원격 repair는 실행되지 않았다. 잔여 위험은 스키마는 있고 history 행이 없는 로컬 전용 8버전을 게이트 없이 repair하는 것이다.