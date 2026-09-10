---
task_id: task-t02
pack_task: T02
status: done
active: false
owner: claude-pm
created: 2026-09-10
milestone: M0
priority: P0
depends_on: [task-t01]
requirement: R02
baseline: "로컬 HEAD dac3835 (fix/umsh-qa-ux). 운영 API 직접 대조로 매핑표가 운영 현재값임을 확인 (U1/U7 해소)"
---
# task-t02 — 20종 키·노출 매핑 (admin-ops T02)

## Purpose
운영 관리자가 서비스를 관리하려면 `canonicalKey`, `paymentKey`, `promptKey`,
`landingPath`, `returnPath`, 노출 상태, 판매 상태를 **별도 필드로** 알아야 한다
(18-SERVICES: "route 문자열이나 서비스명만으로 상품을 매칭하지 않는다").
현재 코드의 실제 매핑을 전수 추출하고 누락·alias 충돌·노출 불일치를 검출한다.

## Scope
- Implement:
  - `prompts/services-manifest.json` / `src/prompt/service-system.ts` /
    `src/payment/catalog.ts` / `src/server/service-directory.ts` 전수 매핑
  - 20종 누락 검사
  - alias 충돌 검사 (namespace 간 정규화 방향 불일치)
  - hidden 자동 공개 여부 검사
  - 노출(discovery)과 판매(checkout) 상태의 불일치 검사
  - 패키지 18-SERVICES 표와의 행 단위 대조
- Do not implement:
  - 코드 수정 (매핑 버그 교정은 T22 또는 별건)
  - 저장소 스키마 조사 (T03)
  - 서비스 콘텐츠 버전 저장소 (T22)
  - git 커밋/푸시

## Success Criteria
- [x] 20종 canonical/payment/prompt/route 매핑표 산출
- [x] 누락 검출 결과 명시 — 0건
- [x] alias 충돌 검출 결과 명시 — 2건
- [x] hidden 4종 자동 공개 없음 — 런타임 15건 확인
- [x] 성공·거절·실패 사례 기록 (§9)
- [x] 기준 라벨 — U1 해소로 "운영 현재값"으로 승격 (근거 첨부)

## Deliverables
- `docs/admin-ops/T02-service-mapping.md`
- `docs/admin-ops/HANDOFF.md` T02 항목 추가

## Verification Steps
- 매핑 생성 스크립트 실행 (프로젝트 밖 스크래치패드, 저장소 오염 없음)
- `npm run check:service-contracts` (기존 검증기)
- `listServiceDirectory()` 런타임 호출로 visible 수 확인
- `loadServiceSystemPrompt()`를 19개 payment key로 호출해 실패 사례 확보

## Collaboration Logs
- research: 해당 없음 (내부 코드 조사 작업, 외부 문서 리서치 불필요)
- review: CreamAI/logs/review/
- harness: CreamAI/logs/harness/

## Key Findings
1. 20종 누락 **0건**. canonical 20 = manifest 20 = `prompts/services/*.md` 20.
2. [중대] `cmdg ↔ saju_master` 브리지가 코드에 없다. `loadServiceSystemPrompt('cmdg')` THROW.
   현재는 `/api/saju/analyze`가 400으로 거절해 사용자 영향 없으나, 관리자가 paymentKey를
   프롬프트/코퍼스 조회에 넘기면 500이 된다.
3. `home` 정규화 방향이 축마다 반대 (prompt: home_pungsu→home_fit / directory: home_fit→home_pungsu).
4. hidden 자동 공개 없음 — `listServiceDirectory()` 15건.
5. [신규] **노출 15종 ≠ 판매 19종.** `PUBLICLY_DISABLED_PRODUCT_KEYS`가 빈 Set이라
   hidden 4종이 결제 catalog에 노출되고 신규 주문이 가능하다. **운영 API로 실측 확인.**
6. [신규] 06-SCREENS S02 요구 17개 필드 중 코드 상수 10 / 부재 7 → **관리자 편집 가능 0개.**
7. `returnPath ≠ landingPath` 8건. 관리자 상세에서 별도 필드로 다뤄야 한다.
8. 18-SERVICES 표는 20행 중 19행 정확.

## Review Outcome (2026-09-10)
- Codex review: `CreamAI/logs/review/task-t02_admin-ops-t02-review.md` — Critical 0 / Major 3 / Minor 2
- 전부 수용, 반려 0건.
- Major 1(운영==HEAD 과잉 주장) → **운영 `/api/services`·`/api/payment/config`를 새로 조회**해
  T02 감사 표면을 직접 검증. 주장 범위 축소, 트리 전체 동일성은 U16으로 분리.
- Major 2(CLI 배포 단정) → 가설로 하향, U14 유지.
- Major 3(S02 필드 12/5 산술 오류) → **10/7로 정정**. T22 신규 필드 범위 2개 확대.
- Minor 1(merge-tree 읽기전용 표현), Minor 2(add/add 독립성 단정) → 문구 수정.
