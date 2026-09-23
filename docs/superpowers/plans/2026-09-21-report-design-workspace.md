# Report Design Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 운영 시스템과 연결되지 않은 별도 폴더에서 티저, 해석 목록, 해석 상세 화면을 각각 열고 디자인과 이미지를 안전하게 수정할 수 있게 한다.

**Architecture:** `design-workspace/report-pages` 아래에 정적 HTML 세 장과 허브 한 장을 두고, 공통 토큰·컴포넌트·페이지 스타일과 로컬 전용 스크립트를 공유한다. 모든 링크와 이미지는 상대 경로를 사용하고 네트워크/API/인증/결제 코드는 포함하지 않는다.

**Tech Stack:** HTML5, CSS custom properties, dependency-free JavaScript, Node.js test runner

---

### Task 1: 격리 계약을 테스트로 고정

**Files:**
- Create: `tests/unit/report-design-workspace.test.ts`

- [ ] 필요한 HTML·CSS·JS·이미지 파일 구성을 검사한다.
- [ ] 모든 화면에 샌드박스 표식과 수정 위치 안내가 있는지 검사한다.
- [ ] API, 인증, 결제, 분석, 브라우저 저장소 호출이 없는지 검사한다.

### Task 2: 독립 디자인 작업 폴더 구성

**Files:**
- Create: `design-workspace/report-pages/index.html`
- Create: `design-workspace/report-pages/teaser.html`
- Create: `design-workspace/report-pages/reading-list.html`
- Create: `design-workspace/report-pages/reading-detail.html`
- Create: `design-workspace/report-pages/css/tokens.css`
- Create: `design-workspace/report-pages/css/components.css`
- Create: `design-workspace/report-pages/css/pages.css`
- Create: `design-workspace/report-pages/js/preview.js`
- Create: `design-workspace/report-pages/README.md`
- Create: `design-workspace/report-pages/assets/README.md`

- [ ] 현재 운명상회 톤의 공통 디자인 토큰을 한 파일로 분리한다.
- [ ] 세 화면을 서로 독립적으로 열 수 있게 만든다.
- [ ] 모든 상호작용은 로컬 미리보기만 바꾸며 외부 요청을 하지 않게 한다.
- [ ] 이미지 교체 파일명과 권장 비율을 화면 안과 문서에 표시한다.

### Task 3: 대표 이미지를 편집용 자산으로 복사

**Files:**
- Create: `design-workspace/report-pages/assets/teaser-hero.webp`
- Create: `design-workspace/report-pages/assets/reading-list-cover.webp`
- Create: `design-workspace/report-pages/assets/reading-detail-hero.webp`

- [ ] 기존 원본은 유지하고 복사본만 작업 폴더에 둔다.
- [ ] 각 페이지가 복사본만 참조하는지 확인한다.

### Task 4: 디자인 명세와 검증

**Files:**
- Create: `design-system/pages/report-design-workspace.md`

- [ ] 데스크톱과 모바일에서 가로 넘침과 핵심 계층을 확인한다.
- [ ] 단위 테스트, 타입 검사, diff whitespace 검사를 실행한다.
- [ ] 운영 반영·커밋·배포 없이 로컬 작업 폴더만 남긴다.

