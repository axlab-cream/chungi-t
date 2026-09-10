---
task_id: task-t04
pack_task: T04
status: done
active: false
owner: claude-pm
created: 2026-09-10
milestone: M0
priority: P0
depends_on: [task-t01]
requirement: R06
baseline: "로컬 HEAD dac3835 (fix/umsh-qa-ux) = 운영 배포 계열"
---
# task-t04 — 기존 회귀 기준 수집 (admin-ops T04, M0 마지막)

## Purpose
관리자 구현 중 나타나는 실패가 **기존 실패인지 신규 회귀인지** 즉시 구분할 수 있어야 한다.
현재 HEAD의 typecheck·unit·품질 스크립트 기준선을 고정하고,
16-ACCEPTANCE A01~A40 중 **이미 테스트로 덮여 있는 것과 새로 써야 하는 것**을 분리한다.

## Scope
- Implement:
  - `package.json` 검증 스크립트 전수 목록
  - `tests/unit` 전수 인벤토리 및 실행 커버리지 확인 (glob이 모든 파일을 잡는지)
  - typecheck / unit / 품질 스크립트 baseline 고정
  - 16-ACCEPTANCE가 지정한 재사용 테스트 9개의 실제 존재·내용 확인
  - A01~A40을 기존 테스트에 매핑 (덮임 / 부분 / 없음)
  - 기존 실패 목록 확정 (신규 회귀 판별 기준)
- Do not implement:
  - 새 테스트 작성 (T05 이후 각 Task가 담당)
  - 실패 수정
  - 코드 수정
  - git 커밋/푸시

## Success Criteria
- [x] typecheck·unit baseline 수치 + 환경·manifest 해시 기록
- [x] 실행 형태별 결과 차이 확인 (glob 373/0, 명시목록 365/8, 각 2회 재현) — 원인은 U24
- [x] 지정 9개 파일 존재·통과 확인 + `it()` 제목 전수 추출
- [x] A01~A40 매핑 — 덮임 2 / 부분 17 / 없음 21
- [x] 기존 실패 13건 고정 + 각 실패의 성격 분류(stale guard / 실제 차이 / 정당)
- [x] NOT_RUN 표기 (단 `qa:all-services`는 오분류였고 실행해 PASS 확인)

## Deliverables
- `docs/admin-ops/T04-regression-baseline.md`
- `docs/admin-ops/HANDOFF.md` T04 항목

## Verification Steps
- `npm run typecheck`
- `npm test`
- `npm run check:service-contracts`, `check:prompt-guide`
- 정적 `it(`/`describe(` 개수와 런타임 보고 수 대조 (커버리지 검증)
- 9개 지정 테스트의 `it()` 제목 추출

## Collaboration Logs
- research: 해당 없음
- review: CreamAI/logs/review/
- harness: CreamAI/logs/harness/

## Key Findings
1. baseline: typecheck 0 오류, `npm test` 373/373, `qa:all-services` PASS, `check:*` 4 PASS / 12 FAIL.
2. **실행 형태에 따라 unit 결과가 결정적으로 갈린다** (373/0 vs 365/8, 각 2회 재현). 원인 미특정 → U24.
   baseline은 명령·환경·파일 manifest 해시까지 고정해야 유효하다.
3. **`check:*` 실패 12개 전수 규명**: 11개는 stale guard(리팩터 `fdc80f2` 이후 심볼 변경,
   가드 수정본은 `origin/main`에만 있음 — 11개 가드 각각 옛/신 심볼과 우리 코드 존재를 표로 검증),
   1개(`cat`)는 실제 코드 차이 → U23.
4. **U23은 판매 중인 서비스의 동작 차이**다. 고양이 궁합에만 `retrieveCategoryOwnChunks`가 없다.
   Codex 권고에 따라 **병합/출시 차단 항목**으로 격상.
5. `check:production-source`가 저장소의 수동 배포 preflight이고 현재 exit 1이다.
   단 과거 배포가 이를 무시했는지는 미확인(U14).
6. 지정 재사용 테스트 9개 전부 존재·통과. `admin.test.ts`가 하드코딩 관리자 목록을 고정하므로
   T05에서 "고쳐서 통과" 금지.
7. A01~A40: 덮임 2(A33 소유권, A34 완료 불변) / 부분 17 / 없음 21.

## Review Outcome (2026-09-10)
- Codex review: `CreamAI/logs/review/task-t04_admin-ops-t04-review.md` — Critical 0 / Major 4 / Minor 3
- 전부 수용, 반려 0건.
- Major 1: "순서 의존" 단정 → "실행 형태 차이(원인 미특정)"로 하향. 환경·manifest 해시 추가
- Major 2: "운영 배포가 정책 위반" → "현재 소스가 수동 preflight를 통과하지 못한다"로 하향
- Major 3: A32·A39를 덮임 → **부분**으로 하향. 합계 덮임 2 / 부분 17 / 없음 21로 정정
- Major 4: `qa:all-services` NOT_RUN 사유("LLM 호출 추정")가 오류 → 실행해 PASS 확인,
  `output/` 산출물 부작용 기록
- Minor 1: check 스크립트 diff 11 → **12**개(wedding 포함, 단 wedding은 통과)
- Minor 2: "병합하면 해소된다" → "해소될 것으로 예상, 병합 후 전수 재실행"
- Minor 3: 회귀 오라클에 명령·환경·manifest 조건 명시
- Codex 독립 검증: stale-guard 근거 (a)~(e) 전부 PASS, (f)만 12/11 표기 오류. U23 수치 정확.
- **Codex 최종 판정: T01~T04 개별 산출물은 done 가능하나 M0는 U13/U23/U25 미해결로 완료 선언 불가.**
