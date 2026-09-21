# 작업 큐 실패 복구 및 화면 개선 구현 계획

**Goal:** `home_fit` 구형 리포트의 섹션 매핑 실패를 고치고, 운영자가 실제 대기 작업과 완료 이력을 혼동하지 않게 한다.

**Architecture:** 저장된 구형 섹션 ID를 현재 12개 섹션 계약으로 정규화하되 저장 데이터는 변경하지 않는다. 관리자 화면은 기존 작업 API 응답을 진행 중, 조치 필요, 완료 이력으로만 분류하며 `ops.pause` 제어 마커는 일시정지 상태 UI로만 표현한다.

**Tech Stack:** TypeScript, Node test runner, 정적 관리자 HTML/JavaScript, Supabase 운영 데이터(읽기 검증만)

## Global Constraints

- Grok과 외부 신규 모델은 사용하지 않는다.
- 운영 리포트 원문과 개인정보는 로그·문서에 기록하지 않는다.
- 원격 push·배포는 `rules.md` §6 H1/H2 승인 전 실행하지 않는다.
- 재처리는 코드 수정이 운영에 반영된 뒤에만 실행한다.

---

### Task 1: 구형 집터맞춤 섹션 호환

**Files:**
- Modify: `src/report/home-reading-corpus.ts`
- Test: `tests/unit/home-corpus-routing.test.ts`

- [x] 운영 진단으로 실패 섹션과 오류 코드를 확인한다.
- [x] 구형 `house-energy`, `spatial-fix`가 현재 계약으로 연결되지 않는 재현 테스트를 추가한다.
- [x] 두 ID를 현재 정본 섹션으로 정규화한다.
- [x] 집중 테스트와 전체 회귀를 실행한다.

### Task 2: 작업 큐 상태 구분

**Files:**
- Modify: `admin-ui/index.html`
- Test: `tests/unit/admin-workspace-data-routes.test.ts`

- [x] 완료·실패·제어 마커가 한 표에 섞이는 재현 테스트를 추가한다.
- [x] 진행 중, 조치 필요, 최근 완료 이력으로 분리한다.
- [x] `ops.pause` 마커를 목록에서 제외하고 기존 일시정지 제어로만 표시한다.
- [x] 빈 상태, 진단 버튼, 완료 이력 접힘 상태를 검증한다.

### Task 3: 운영 완료 처리

**Files:**
- Modify: `tests.md`, `status.md`

- [ ] 배포 승인 후 수정본을 운영에 반영한다.
- [ ] 실패 리포트를 한 번만 재시작하고 완료 상태를 확인한다.
- [ ] 작업 큐에서 활성 0건, 조치 필요 0건을 확인한다.
- [ ] CreamWIKI에 원인·수정·검증을 저장하고 재조회한다.
