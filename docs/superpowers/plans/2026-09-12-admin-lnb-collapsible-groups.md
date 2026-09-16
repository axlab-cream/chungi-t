# Admin LNB Collapsible Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute this plan inline, one test cycle at a time. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 LNB의 카테고리와 하위 메뉴를 시각적으로 분리하고, 카테고리별 접기·펼치기를 키보드와 모바일에서도 사용할 수 있게 한다.

**Architecture:** 단일 관리자 셸 `admin-ui/index.html` 안에서 카테고리를 네 개의 의미 있는 그룹으로 묶고 네이티브 `button`을 토글로 사용한다. 접힘 상태는 `sessionStorage`에 저장하되 현재 경로가 속한 그룹은 항상 펼쳐 현재 위치를 숨기지 않는다.

**Tech Stack:** 정적 HTML/CSS, 브라우저 JavaScript, Node.js test runner

## Global Constraints

- 기존 232px 고정 LNB와 관리자 색상 토큰을 유지한다.
- 실제 관리자 데이터/API와 인증 경계는 변경하지 않는다.
- 토글은 `aria-expanded`, `aria-controls`, 네이티브 버튼 포커스를 제공한다.
- 768px 이하에서는 기존 수평 LNB 동작을 유지하고 카테고리 헤더는 숨긴다.

---

### Task 1: LNB 카테고리 계층과 토글

**Files:**
- Modify: `admin-ui/index.html`
- Test: `tests/unit/admin-shell.test.ts`

**Interfaces:**
- Consumes: `data-admin-route`와 `markCurrentRoute()`의 현재 경로 판정
- Produces: `data-admin-nav-group`, `data-admin-nav-toggle`, `data-admin-nav-items`, `setupAdminNavGroups()`

- [x] **Step 1: 회귀 테스트 작성**

  네 개 그룹의 버튼·패널 연결, 블릿/들여쓰기 CSS, 세션 상태 저장, 현재 메뉴 그룹 자동 펼침을 HTML 응답에서 검증한다.

- [x] **Step 2: 실패 확인**

  Run: `npx tsx --test --test-concurrency=1 tests/unit/admin-shell.test.ts`

  Expected: 새 LNB 그룹 계약이 없어 실패한다.

- [x] **Step 3: 최소 구현**

  기존 링크를 네 개 그룹으로 감싸고 CSS 의사 요소 블릿과 들여쓰기를 적용한다. 토글 클릭 시 `hidden`과 `aria-expanded`를 동기화하고 세션에 저장한다.

- [x] **Step 4: 검증**

  Run: `npx tsx --test --test-concurrency=1 tests/unit/admin-shell.test.ts`

  Expected: 관리자 셸 테스트가 모두 통과한다.

  Run: `npm run typecheck`

  Expected: TypeScript 오류 0건.

  Run: `npm run vercel-build`

  Expected: 관리자 정적 자산 복사 및 타입 검사가 성공한다.

- [x] **Step 5: 운영 문서와 KMS 기록**

  `plan.md`, `tests.md`, `status.md`에 구현·검증 근거를 추가하고 검증된 LNB 패턴을 CreamWIKI 후보로 저장한다.
