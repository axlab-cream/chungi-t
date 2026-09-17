# 긴 풀이 파이프라인 — 작업지시서

원본: `C:/Users/user/Desktop/UMSH_톤앤보이스_인계_20260917/UMSH_톤앤보이스_인계_20260917`
작성: 2026-09-17 · 기준 문서: `goal.md` · `rules.md` §6 · `ROADMAP.md`

## 0. 범위 원칙

인계 v2 전체를 옮기지 않는다. **없던 것을 더하고 품질이 실제로 올라가는 영역만** 넣는다.
말투 규격(01~07)과 프롬프트 20개는 v1과 바이트까지 같으므로 **건드리지 않는다.**

### 넣는 것 — 4개 Task

| ID | 제목 | 왜 필요한가 | 크기 |
|---|---|---|---|
| L1 | 결론 고정 + 결론 일관성 검사 | 현행 구조의 **실제 결함**을 고친다 | S |
| L2 | 서머리 | 없던 산출물. 체감 가치 최대 | M |
| L3 | 하이라이트 3개 | 없던 산출물. 나열이 아닌 새 판단 | M |
| L4 | 분량 예산 + 엔진 라벨 노출 검사 | 추정 기준을 실측 기준으로 교체 | S |

### 넣지 않는 것 — 근거를 남긴다

| 제외 | 근거 |
|---|---|
| 말투·안전·숫자출처·한자·중복 검사 | `src/report/tone-v2-review.ts`(971줄)에 **이미 더 정교하게** 구현돼 있다. 재구현은 순수 낭비다 |
| 생성 병렬화 | 비용·레이트리밋과 맞바꾸는 변경. 현행 섹션 예산이 9,000 토큰(`report-generator.ts:2284`)이라 동시성 상한 정책이 먼저다 |
| 품질 단계(light·basic·deep·premium) | 문턱값이 인계 문서 스스로 "초기값(검증 안 됨)". 미검증 값으로 가격을 정당화하게 된다 |
| 항목 2문단화(`item_shape`) | 분량 증가 성격이고 대표 결정(고가라고 분량을 늘리지 않는다)과 결이 어긋난다. 기존 단락 게이트(`interpretation-validation.ts:18`, 단락당 2~4문장)와도 충돌한다 |
| KMS 근거 원자 반영 | 전부 미감수(`phase1_draft_unreviewed`)이고 목차가 가리키는 ITEM-07·17·18은 KMS에 없다. **선행 조건이 깨져 있다** |

---

## L1 — 결론 고정 + 결론 일관성 검사

### 문제

현행은 섹션마다 독립 생성이다(`report-queue.ts:245` `for...await`). `compactPromptSiblings()`는 **중복 회피**만 하고 결론을 공유하지 않는다. 서머리·하이라이트를 붙이는 순간, 서로 다른 날짜를 1순위로 고르는 사고가 구조적으로 가능해진다.

### 할 일

1. `SajuReport`에 `verdict` 추가 — 리포트 생성 시작 시 **한 번** 결정하고 이후 모든 호출에 내려보낸다.
   ```ts
   /** Fixed once at report creation; every section, summary and highlight call receives it. */
   verdict?: { statement: string; rankedChoices?: string[]; decidedAt: string }
   ```
2. `sectionPrompt()`의 `evidenceLayers`에 `fixedVerdict`를 싣는다 (`report-generator.ts:2107`).
3. `reviewReportVerdictConsistency()`를 `tone-v2-review.ts`에 추가 — 서머리·하이라이트·섹션이 고른 1순위가 `verdict.rankedChoices[0]`과 다르면 위반.
4. 자기모순 검사: 하위로 적은 선택지를 1순위로 고르면 위반.

### 완료 기준

- [x] `verdict`가 없으면 기존과 동일하게 동작한다(하위 호환, 기존 저장 리포트 불변)
- [x] 서머리와 하이라이트가 서로 다른 1순위를 고르면 검사가 잡는다
- [x] 정상 케이스·경계(선택지 1개)·오류(모순)·회귀(verdict 없는 기존 리포트) 4종 테스트

### 파일

`src/types/index.ts` · `src/report/report-generator.ts` · `src/report/tone-v2-review.ts` · `tests/unit/tone-v2-verdict.test.ts`(신규)

---

## L2 — 서머리

### 문제

48항목 리포트를 열면 고객이 처음 만나는 건 1번 항목이다. 전체 판정을 얻으려면 끝까지 읽어야 한다. 현행 `SajuReport`에는 서머리 **필드 자체가 없다.**

### 할 일

1. `SajuReport.summary` 추가 — 섹션과 같은 생성·재시도·리스 규약을 따른다.
   ```ts
   summary?: { text: string; status?: 'pending' | 'generating' | 'complete' | 'failed'
               generationId?: string; generatedAt?: string; attempts?: ...; generationLease?: ... }
   ```
2. `summaryPrompt()` 신설. L1의 `verdict`를 받고, 서비스별 `summary_group_sentences`를 지킨다.
3. 생성 순서: **틀(verdict) → 서머리 → 섹션**. 서머리를 먼저 완성해 리더 상단에 먼저 띄운다.
4. 리더(`/r/:id`)와 06-1 상세에 서머리 블록을 최상단 렌더. **인쇄 스타일시트에도 포함**한다.
5. 서머리에도 기존 게이트 전량 적용 — `reviewToneCopy()` · `reviewSafetyClaims()` · 숫자 출처.

### 완료 기준

- [x] 서머리가 리더 최상단과 PDF 인쇄본 모두에 나온다
- [x] 서머리 생성 실패가 섹션 생성을 막지 않는다(부분 실패 격리)
- [x] 기존 저장 리포트는 서머리 없이도 정상 렌더된다
- [x] 서머리가 `verdict`와 같은 결론을 말한다(L1 검사 통과)

### 파일

`src/types/index.ts` · `src/report/report-generator.ts` · `src/report/report-queue.ts` · 리더 템플릿 · `tests/unit/report-summary.test.ts`(신규)

### 주의

`report-queue.ts`에 **미커밋 교착 수정**(리스 없는 `generating` 잔해)이 있다. 서머리도 같은 리스 규약을 쓰므로 **그 수정을 먼저 커밋한 뒤** 착수한다.

---

## L3 — 하이라이트 3개

### 범위

**목차와 하이라이트 정의가 둘 다 있는 5개 서비스만.** 나머지 15개는 주제 미정의라 착수하지 않는다.

| 서비스 | 하이라이트 3개 |
|---|---|
| `quit_fortune` | GO/HOLD/타이밍 조정 · 다섯 스승의 서로 다른 조언 · 퇴사 전 체크리스트 |
| `pass_angle` | 전체 흐름 판정 · 집중 끊기는 지점 · D-100·D-30·D-7 |
| `newyear_flow` · `wedding_day` · `lucky_color` | `report_budget.json` 참조 |

### 할 일

1. `SajuReport.highlights?: Array<{ title; text; status; ... }>` 추가.
2. 서비스별 하이라이트 정의를 **코드가 아니라 설정으로** 둔다 — `tone-v2/highlight-config.json`. 각 항목은 `title` · `shape`(서술 형태) · `paragraphs` · `chars[min,max]`.
3. `highlightPrompt()` 신설. `verdict` 주입 + `shape` 지시.
4. 미정의 서비스는 `highlights`를 만들지 않는다. **빈 배열과 미정의를 구분**한다.

### 완료 기준

- [x] 설정에 주제가 있는 서비스만 하이라이트가 생기고, 없는 서비스는 필드를 만들지 않는다
- [x] 하이라이트가 목차 항목을 요약만 하지 않는다(새 판단 포함)
- [x] `shape`가 지정한 문단 수를 지킨다
- [x] 하이라이트도 `verdict`와 결론이 같다

### 파일

`src/types/index.ts` · `tone-v2/highlight-config.json`(신규) · `src/report/report-generator.ts` · `tests/unit/report-highlights.test.ts`(신규)

---

## L4 — 분량 예산 + 엔진 라벨 노출 검사

### 문제

현행 분량 규칙은 `interpretation-validation.ts:14`의 **하한 80자 sanity floor 하나뿐**이다. 가격대별 글자 목표는 인계 v2에서 폐기됐다 — 목차 항목 수 × 인물 문장 길이를 못 넘었기 때문이다.

### 할 일

1. `tone-v2/report-budget.json` 이식. **단, 인계 값을 그대로 쓰지 않는다.** 현행 파이프라인으로 같은 입력을 **두 번** 재서 `하한 = 작은 값 ×0.9`, `상한 = 큰 값 ×1.35`로 다시 뽑는다. 한 번만 재면 회차 편차(전체 ±12%, 하이라이트 ±30%)에 하한이 걸린다.
2. `reviewLengthBudget()` 추가 — 서머리·전체·하이라이트별 글자 수를 예산 구간과 대조. 구간 밖이면 **재생성 대상**이지 실패가 아니다.
3. `reviewEngineLabelExposure()` 추가 — 등급 라벨 날것(`돈 낮음` 류)이 본문에 박히는지 검사. 실측에서 **6~27회** 박혔다.
4. 입력 형식 교정: 등급을 라벨이 아니라 **뜻으로** 넘긴다(`돈 낮음` → `힘을 덜 받는 쪽`).

### 완료 기준

- [x] 예산은 이 저장소에서 두 번 측정한 값이다(인계 값 그대로 복사 금지)
- [x] 라벨 날것 노출이 0건이다
- [x] 예산 미달·초과가 재생성으로 돌고, 재생성 한도 초과 시 `NOT_RUN`이 아니라 명시적 실패로 남는다

### 파일

`tone-v2/report-budget.json`(신규) · `src/report/tone-v2-review.ts` · `src/report/report-generator.ts` · `tests/unit/report-budget.test.ts`(신규)

---

## 실행 순서와 의존성

```
L1 (결론 고정)  ─┬─> L2 (서머리)  ─┬─> L4 (예산·라벨)
                 └─> L3 (하이라이트) ┘
```

L1이 먼저다. 서머리와 하이라이트가 결론을 공유하지 못하면 붙이는 순간 모순이 난다.
L4는 서머리·하이라이트가 있어야 잴 대상이 생긴다.

`rules.md` §6.1에 따라 승인 이슈가 소진될 때까지 연속 수행한다.

---

## 선행 블로커

| 항목 | 상태 | 해제 조건 |
|---|---|---|
| `report-queue.ts` 미커밋 교착 수정 | 작업 트리에 존재 | 테스트 통과 후 커밋 (L2 착수 전 필수) |
| KMS 근거 원자 감수 | `phase1_draft_unreviewed` · ITEM-07·17·18 부재 | 사람 감수. **L1~L4와 독립**이므로 병행 가능 |
| 결혼택일 입력 요일 오류 | 10월 18일은 2026·2027 어느 해도 토요일이 아님 | 기획 확인 |
| 외부 LLM 모델 선택 | 보류(유료 API 잠금·고객 정보 외부 전송) | 대표 결정 |

넥서스 로컬 모델은 이 규격을 못 지킨다(kanana-8b 목차 6/48, 말투 이탈 55). 외부 API 전제로 설계한다.

---

## Definition of Done

- [ ] L1~L4 각 Task의 완료 기준을 전부 충족
- [ ] 정상·경계·오류·회귀 4종 테스트가 각 Task에 있고 `npm test` 전량 통과
- [ ] `npm run typecheck` PASS
- [ ] 기존 저장 리포트의 본문·주소·소유권이 불변임을 회귀 테스트로 증명
- [ ] Grok 리뷰(`CreamAI/scripts/run-reviewer.ps1 -Cli grok`) Critical/Major 0
- [ ] `tests.md`에 검증 행 기록, `status.md`에 이력 추가
- [ ] 실행하지 않은 검사는 `NOT_RUN`, 실행 불가는 `BLOCKED`로 남긴다 — 통과로 표시하지 않는다
