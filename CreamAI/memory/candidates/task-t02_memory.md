# ProjectOps Memory Candidate

task_id: task-t02
date: 2026-09-10
case_type: success (quality_gate) + failure (context_loss)
failure_type: context_loss
success_pattern: quality_gate
problem: |
  "운영에 배포된 소스가 무엇인가"를 문서(README)의 서술로 판단하면 틀린다.
  이 프로젝트의 README는 "`main` 브랜치 push가 Production 배포를 트리거한다"고 적었지만,
  실제 운영 배포는 그 브랜치가 아니었다. 이 잘못된 전제 하나가 T01 전체의 결론
  ("로컬은 운영 소스가 아니다")을 뒤집었고, 후속 Task 두 개(T02·T03)에 불필요한
  "운영 대조 미완료" 게이트를 걸었다.
solution: |
  운영 소스 판정은 **운영이 실제로 응답하는 값**으로 한다. 3단계로 강도를 올린다.

  1단계 — 배포 신원: `vercel inspect <prod-url> --scope <team>`
     배포 id·생성 시각·alias 확인. git 메타데이터 유무도 함께 본다(단정 근거로는 쓰지 않는다).
  2단계 — 정적 마커: 한쪽 브랜치에만 존재하는 파일/문자열을 골라 라이브 응답과 비교.
     "어느 브랜치가 운영이 아니다"를 배제하는 데 유효하다. 동일성 증명에는 부족하다.
  3단계 (핵심) — **감사 대상 코드의 출력을 직접 조회.**
     조사 주제가 서비스 매핑이면 `GET /api/services`, `GET /api/payment/config`처럼
     그 코드가 만들어내는 응답을 운영에서 받아 로컬 산출물과 대조한다.
     이것이 "내 조사 결과가 운영 현재값인가"에 대한 직접 증거다.

  1·2단계만으로 "운영 == 로컬 트리"를 주장하면 과잉이다. 3단계는 주장 범위를
  "감사한 표면은 일치한다"로 정확히 좁혀 준다.
root_cause: |
  두 가지가 겹쳤다.
  (a) 저장소 문서(README)의 배포 서술이 실제와 달랐고, 그것을 검증 없이 전제로 사용했다.
  (b) 조사 도구가 정적 페이지 마커에 머물러, 정작 조사 주제인 서비스·결제 코드의
      운영 출력을 확인하지 않았다.
why_it_worked: |
  Codex 리뷰가 "마커 일치는 트리 동일성을 증명하지 않는다"고 지적했고,
  그 지적에 대응해 운영 API를 직접 조회한 결과 오히려 **더 강한 증거**를 얻었다.
  운영 `/api/services` 15건과 `/api/payment/config` catalog 19건이 로컬 매핑표와
  순서까지 일치했고, 동시에 "노출 15 ≠ 판매 19" 결함이 운영 현재 상태임을 확정했다.
  지적을 문구 수정으로 넘기지 않고 증거를 추가로 수집한 것이 전환점이었다.
reuse_condition: |
  운영 배포의 소스를 확정해야 할 때. 또는 로컬 조사 결과를 "운영 현재값"으로
  제시하기 직전. 또는 저장소 문서의 배포/브랜치 서술에 의존하려 할 때.
do_not_use_when: |
  운영에 인증이 필요한 엔드포인트만 있어 비인증 GET으로 상태를 볼 수 없는 경우.
  그때는 배포 산출물 해시나 빌드 SHA 마커를 도입하는 편이 낫다.
related_files:
  - docs/admin-ops/production-source-of-truth.md
  - docs/admin-ops/T02-service-mapping.md
  - README.md
  - src/server/service-directory.ts
  - src/payment/catalog.ts
  - src/prompt/service-system.ts
recommended_prompt: |
  "운영 소스를 판정할 때 README나 문서의 배포 서술을 전제로 쓰지 말고,
   (1) 배포 신원, (2) 브랜치 전용 마커, (3) 조사 주제 코드의 운영 API 출력
   세 단계로 증거를 모아라. 주장 범위는 실제로 검증한 표면까지만 적어라."
recommended_command: |
  vercel inspect <prod-url> --scope <team>
  curl -s <prod>/api/services
  curl -s <prod>/api/payment/config
  git rev-list --left-right --count origin/main...HEAD
  git merge-tree --write-tree --name-only HEAD origin/main
revalidation_command: |
  curl -s https://umsh.kr/api/services | node -e '...' — 15건이고 key/amount/href가
  docs/admin-ops/T02-service-mapping.md §3과 일치하면 유효.
  값이 달라지면 운영이 재배포된 것이므로 매핑표를 갱신한다.
expires_at: 다음 운영 배포 시점 (또는 2026-12-31)
privacy_level: internal
should_promote_to_rag: true

## 재사용 가능한 도메인 지식 (이 프로젝트 전용)

- 서비스 키 네임스페이스가 **3개**이고 정규화 함수도 **3개**다.
  `promptKey`(20, `prompts/services/*.md` 파일명), `paymentKey`(19, catalog),
  `directory seed`(19, paymentKey 참조). 관리자/스크립트에서 키를 다룰 때
  어느 네임스페이스인지 먼저 확정해야 한다.
- `cmdg`(결제) ↔ `saju_master`(프롬프트) 브리지가 **코드에 없다.**
  `loadServiceSystemPrompt('cmdg')`는 예외를 던진다. paymentKey를 프롬프트·코퍼스
  조회에 그대로 넘기면 안 된다.
- `hidden`(discovery 숨김)과 `PUBLICLY_DISABLED_PRODUCT_KEYS`(판매 중단)는
  **다른 축이고 다른 파일이다.** 후자가 빈 Set이므로 hidden 서비스도 판매된다.
- `returnPath`(PG 복귀 지점, 8종은 `…/04-step-4-report/index.html`)와
  `landingPath`(SEEDS href)는 **다른 값**이다. 같은 필드로 취급하면 안 된다.
- 서비스 제목·가격·노출·판매가 전부 코드 상수다. 06-SCREENS S02 기준 관리자
  편집 가능 필드는 현재 0개다.

## Evidence
- review: `CreamAI/logs/review/task-t02_admin-ops-t02-review.md` — Critical 0 / Major 3 / Minor 2, 전부 수용
- 운영 실측: `/api/services` 15건, `/api/payment/config` catalog 19건 (`storage=supabase`)
- 런타임 실측: `listServiceDirectory()` 15건, `loadServiceSystemPrompt('cmdg')` THROW
- 기존 검증기: `npm run check:service-contracts` 통과
- merge dry-run: 충돌 24파일

## 정정 이력 (같은 Task 안에서 3회)
1. T01의 "HEAD는 운영 소스가 아니다" → 실측으로 반대임을 확인
2. "운영 == 로컬 HEAD" → Codex 지적으로 "감사 표면 일치"로 범위 축소 + 증거 보강
3. S02 필드 "12/5" → 산술 오류, "10/7"로 정정

교훈: 개수를 문서에 쓸 때는 표를 다시 세어 합이 맞는지 확인한다.
전제를 문서에서 가져올 때는 그 전제 자체를 먼저 검증한다.

## Redaction Check
- api_keys_removed: true
- tokens_removed: true
- personal_data_removed: true
- 비고: 운영 배포 id와 공개 URL만 기록. 비밀값·고객 데이터 없음.
