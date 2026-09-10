# Review Report - task-005 GitHub Actions CI

## 1. Scope

- Task id: task-005
- Reviewed files: `.github/workflows/ci.yml`, `.nvmrc`, `tests/unit/ci-workflow.test.ts`, `package.json`, `scripts/prepare-vercel-public.mjs`, `scripts/check-production-source.mjs`, `vercel.json`, `.gitignore`
- Review time: 2026-09-10T10:57:04Z

## 2. Verdict

- Changes requested
- Summary: 검사 전용 CI라는 핵심 제약은 지켜졌고, typecheck·test·15개 check·SEO·20개 서비스 QA가 모두 연결되어 있다. 다만 Vercel 실제 빌드 경로가 CI에서 실행되지 않아 배포에서만 실패할 회귀가 가능하다. 또한 CI 계약 테스트의 권한 및 배포 금지 검사가 선언한 보안 정책보다 약하다.

## 3. Critical Issues

- None.

## 4. Major Issues

- [.github/workflows/ci.yml:38-57; package.json:12; scripts/prepare-vercel-public.mjs:1-47] Issue: CI가 `npm run vercel-build`를 실행하지 않는다.
  - Risk: Vercel은 `vercel-build`에서 FAQ 정적 생성·SEO 검증·`public/` 자산 복사를 수행한다. 현재 CI는 그 중 SEO 검사만 별도로 실행하므로, 복사 대상 파일 누락·경로 변경·정적 생성 실패 등 배포 빌드에서만 깨지는 회귀가 PR/push CI를 통과할 수 있다.
  - Recommendation: 검사 전용 원칙을 유지한 채 `npm run vercel-build`를 CI 게이트로 추가한다. 이는 배포 명령이 아니며, 실제 배포 빌드 경로 검증이다.

- [tests/unit/ci-workflow.test.ts:27-31] Issue: 권한 계약은 `contents: read`가 존재하는지만 확인하고, 추가 write 권한 또는 job-level 권한 승격을 막지 못한다.
  - Risk: 이후 `pull-requests: write`, `id-token: write` 등을 root 또는 job 수준에 추가해도 테스트가 통과할 수 있다. “읽기 제한” 보안 계약이 실질적으로 보장되지 않는다.
  - Recommendation: YAML을 구조적으로 읽어 workflow 및 각 job의 effective permissions가 `contents: read`만 허용하는지 검사하고, job-level permissions 추가도 실패하게 한다.

## 5. Minor Issues

- [tests/unit/ci-workflow.test.ts:11-24] Issue: 배포 금지 검사는 일부 문자열만, 대소문자 구분으로 검사한다.
  - Risk: `npx vercel@… --prod`, 다른 Vercel 배포 액션, 변수/쉘 조합 등은 탐지되지 않는다. 주석 제외 자체는 설명 주석을 허용하기 위한 합리적인 처리이나, 우회 가능성은 남는다.
  - Recommendation: `run`과 `uses` 필드를 구조적으로 검사하고 Vercel CLI의 production 배포 형태 및 알려진 배포 액션을 차단한다. 이는 신뢰된 maintainer의 악의적 변경을 막는 통제는 아니며, 실수 방지 계약으로 범위를 명확히 한다.

- [.github/workflows/ci.yml:28-30] Issue: GitHub Actions가 mutable tag(`@v5`)로 참조된다.
  - Risk: 현재 공식 `actions/*`만 사용하므로 즉시 차단 사유는 아니지만, 태그 재지정 시 공급망 재현성이 약해진다.
  - Recommendation: 저장소 보안 정책이 immutable action pinning을 요구한다면 전체 커밋 SHA로 pin하고 Renovate/Dependabot으로 갱신한다. 현 상태는 기능상 OK이나 SHA pin이 더 안전하다.

- [.nvmrc:1; .gitignore:17] Issue: CI/로컬 Node 버전은 `.nvmrc`로 고정되지만 Vercel의 `nodeVersion: "24.x"` 설정은 gitignore된 `.vercel/project.json`에만 관측된다.
  - Risk: Vercel Dashboard 설정 변경 또는 신규 프로젝트 연결 시 CI와 함수 런타임의 Node 버전이 드리프트할 수 있다.
  - Recommendation: 현재 Vercel 설정이 24.x인 것은 확인되어 즉시 문제는 아니다. `package.json`에 `engines.node`를 추가한다면 `.nvmrc`와 동등함을 테스트로 고정하거나, Vercel 설정을 별도 운영 검증으로 관리한다. 단일 출처 원칙을 유지하려면 단순 중복 선언만 추가하지 않는다.

## 6. Verification Gaps

- Gap: `npm run vercel-build` 및 그 결과의 정적 산출물 검증이 CI에 없다.
  - Suggested check: CI에서 `npm run vercel-build` 실행 후, 필요한 경우 생성된 `public/` 파일의 핵심 경로를 검사한다.

- Gap: `check:production-source`를 main push에서 실행해도 Vercel Git 배포는 이미 병렬로 시작하므로 배포 차단 게이트가 되지 않는다.
  - Suggested check: 현재처럼 CI에서는 제외한다. 필요하다면 main push의 비차단 감사 또는 배포 승격 직전의 수동 preflight로만 운영하고, Vercel artifact commit SHA와의 대조 절차를 둔다.

- Gap: `check:integrations`는 실제 계정·운영 엔드포인트를 필요로 하므로 fork PR CI에서 제외한 판단은 적절하다.
  - Suggested check: 필요 시 protected main 또는 schedule에서 제한된 환경/승인 정책으로 별도 실행한다. PR에 secret을 노출하지 않는다.

- Gap: lint 스크립트나 lint 설정은 `package.json`에 존재하지 않는다.
  - Suggested check: 현재 CI의 typecheck·unit test·도메인 검수는 기능 회귀 게이트로 충분하며, lint 부재만으로 차단할 근거는 없다. 반복되는 가독성·정적 오류 문제가 확인될 때에만 별도 lint 도입을 검토한다.

- Gap: 약 2분 CI를 지금부터 샤딩/병렬 job으로 나눌 필요성은 확인되지 않았다.
  - Suggested check: 현재 단일 job을 유지하고, 큐 대기 또는 실행 시간이 지속적으로 커질 때 독립적인 test/check job 분리를 측정 근거와 함께 검토한다.

## 7. Final Recommendation

- Next action: `npm run vercel-build`를 검사 전용 CI 게이트로 추가하고, CI 계약 테스트가 권한의 “읽기 전용”과 배포 금지를 구조적으로 검증하도록 보강한 뒤 재실행한다. 현재의 무배포 정책, 최소 권한 선언, fork PR에 secret을 주입하지 않는 구성, lockfile 기반 `npm ci` 및 npm cache 사용은 OK이다.