# T04 — 기존 회귀 기준 수집

- pack task: `admin-ops-execution-pack/15-TASKS.md` T04 (M0 / P0 / 선행 T01) — **M0 마지막 Task**
- CreamAI task: `task-t04`
- 요구 추적: R06 / 참고: 16-ACCEPTANCE
- 작성일: 2026-09-10
- 기준: 로컬 HEAD `dac38355b5ef4bb5e91778fdcf458873fc63f29e` (`fix/umsh-qa-ux`) = 운영 배포 계열
- 코드 변경: 없음

## 1. 결론 요약

| 항목 | 결과 |
| --- | --- |
| typecheck | **PASS** — 오류 0건 |
| unit (`npm test`) | **PASS** — 373 tests / 29 suites / 373 pass / 0 fail / 약 76s |
| **unit 재현성** | **불안정.** 동일 파일 집합을 명시 목록으로 실행하면 **365 pass / 8 fail** (§3) |
| `check:*` 스크립트 16개 | **4 PASS / 12 FAIL** (§4) |
| `qa:all-services` | **PASS** — 20개 서비스 공개 플로우/숨김 정책/프롬프트/코퍼스 검수 (정적, LLM 미사용) |
| 12개 FAIL의 성격 | **11개는 stale guard** (`origin/main`에 수정본 존재), **1개는 실제 코드 차이**(cat) |
| 16-ACCEPTANCE 지정 재사용 테스트 9개 | **전부 존재하고 전부 통과** (§5) |
| A01~A40 커버리지 | **덮임 2 / 부분 17 / 없음 21** (§6) |

**R06 관점의 핵심 결론 2개:**
1. 회귀 기준은 **명령 문자열까지 고정해야 한다.** `npm test`와 "같은 파일들을 직접 넘긴 실행"이
   서로 다른 결과를 낸다. 비교 가능한 baseline은 **`npm test` 뿐이다.**
2. `check:*`의 12개 실패는 **admin-ops 작업과 무관한 기존 실패**다. 이 목록을 고정해 두면
   관리자 구현 중 나타나는 실패를 즉시 신규 회귀로 판별할 수 있다.

## 2. 검증 명령 인벤토리 (`package.json`)

| 분류 | 스크립트 | 성격 |
| --- | --- | --- |
| 타입 | `typecheck` → `tsc --noEmit` | 정적 |
| 유닛 | `test` → `tsx --test --test-concurrency=1 tests/unit/*.test.ts` | 정적/인메모리 |
| 빌드 | `vercel-build` → `prepare-vercel-public.mjs && typecheck` | 정적 |
| 통합 | `check:integrations` | **네트워크 필요** (운영 또는 로컬 서버) |
| 무결성 가드 | `check:production-source` | git 조회 (fetch 포함) |
| 서비스 연동 가드 | `check:pass-angle`, `check:marry`, `check:save`, `check:quit`, `check:couple`, `check:signal`, `check:thisyear`, `check:jobchoice`, `check:cat`, `check:lucky`, `check:wedding`, `check:newyear` | **정적 문자열 존재 검사** |
| 흐름 가드 | `check:polish` | 정적 |
| 프롬프트 가드 | `check:prompt-guide`, `check:service-contracts` | 정적 |
| QA | `qa:all-services` | **정적** (fs·path·prompt 모듈만 import) — **실행함, PASS** |

`check-*.mjs` 16개 중 **네트워크가 필요한 것은 `check-integrations.mjs` 하나**다
(`grep -lE "fetch\(|localhost:8790|OPENAI" scripts/check-*.mjs` → 1건).
나머지 15개는 파일 문자열 검사이므로 CI에 넣기 적합하다.

> **정정:** 초안은 `qa:all-services`를 "LLM 호출 추정 — 미실행"으로 적었다. **틀렸다.**
> `scripts/qa-all-services.ts`의 import는 `node:fs`, `node:path`,
> `src/prompt/service-system.js`, `src/prompt/service-voice-contracts.js` 뿐이고
> OpenAI·fetch 호출이 없다. 실행 결과:
> `20개 서비스 QA 통과: 20개 · 공개 플로우/숨김 정책/프롬프트/코퍼스 검수 완료` (exit 0).
> 따라서 **CI에 넣을 수 있는 정적 검증이 하나 더 있다.**
> 단 **부작용이 있다**: 실행 시 `output/`에 QA 산출물을 쓴다(작업 트리에 `?? output/`로 나타난다).
> CI에 넣을 때는 산출물 경로를 격리하거나 `.gitignore`에 추가해야 한다. — Codex 리뷰 Major 4 반영

## 3. unit baseline과 재현성 문제

### 3.1 실행 결과

| 실행 형태 | tests | suites | pass | fail | 비고 |
| --- | --- | --- | --- | --- | --- |
| `npm test` (패키지 glob) — 1회차 | 373 | 29 | **373** | **0** | 75.9s |
| 명시 파일 목록 (`ls tests/unit/*.test.ts` 60개) — 1회차 | 373 | 29 | **365** | **8** | 동일 집합 |
| `npm test` — 2회차 (위 실패 실행 **직후**) | 373 | 29 | **373** | **0** | 디스크 상태 영향 아님 |
| 명시 파일 목록 — 2회차 | 373 | 29 | **365** | **8** | **재현됨** |

각 형태를 **2회씩** 실행해 결과가 형태별로 결정적임을 확인했다
(glob 2회 모두 373/0, 명시 목록 2회 모두 365/8). 무작위 실패(flaky)는 아니다.

> **관측과 해석의 구분 (Codex 리뷰 Major 1 반영).**
> 초판은 이를 "실행 순서 의존"으로 단정했다. **그 인과는 확인되지 않았다.**
> 확인된 것은 **실행 형태(invocation mode)에 따라 결과가 결정적으로 갈린다**는 사실이다.
> `tests`/`suites` 수가 같다는 것만으로 파일 집합이 동일하다고 단정할 수도 없다
> (다른 집합이 우연히 같은 합계를 낼 수 있다).
> 두 형태는 인자 전달 방식, glob 해석 주체(Node vs 셸), 러너의 실행 모드까지 함께 달라진다.
> 2회차 `npm test`가 실패 실행 직후 통과했다는 것도 **모든** 공유 상태 영향을 배제하지는 못한다.
> 원인 후보: Node 자체 glob의 파일 집합·순서, tsx 로더 동작, 파일별 프로세스 분리 여부,
> `--test-concurrency` 의미, cwd 차이, `report-store.ts`의 모듈 수준 싱글턴.
> **원인 특정은 U24로 남긴다.**

배경: `npm test`의 인자는 `tests/unit/*.test.ts` 문자열이고, Windows npm 스크립트에서는 셸이
전개하지 않으므로 Node 테스트 러너가 자체 glob으로 처리한다.
Bash에서 `ls`로 전개해 넘기면 60개 경로가 정렬 순서로 전달된다.

### 3.2 순서 의존으로 실패하는 8개

파일 귀속은 Codex 리뷰에서 확인됐다: `report-content-guards.test.ts` 1건,
`report-generator.test.ts` 2건, `report-persistence.test.ts` 5건.
(초판은 이를 `daily-report`·`report-store` 계열로 잘못 귀속했다.)

| # | 테스트 | 파일 |
| --- | --- | --- |
| 1 | `saves a daily result with IDs and recalls the old day rather than replacing it` | `report-content-guards.test.ts` |
| 2 | `같은 사주와 맥락은 같은 reportId로 저장된다` | `report-generator.test.ts` |
| 3 | `저장된 리포트 목록은 계정 고유 ID로 분리된다` | `report-generator.test.ts` |
| 4 | `allocates result and section IDs before generation; concurrent creates keep the first snapshot` | `report-persistence.test.ts` |
| 5 | `merges simultaneous changes without losing a section` | `report-persistence.test.ts` |
| 6 | `uses the exact specialized section, persists response/usage, and does not regenerate on recall` | `report-persistence.test.ts` |
| 7 | `retains rejected output but never labels a bad fallback complete` | `report-persistence.test.ts` |
| 8 | `reopens completed legacy records without metadata migration or regeneration on retry` | `report-persistence.test.ts` |

8개 전부 **리포트 저장·식별 계열**이며 3개 파일에 몰려 있다.
T03이 확인한 `report-store.ts`의 모듈 수준 싱글턴(`memoryReports`, `dbReady`, `localFiles`)이
원인 후보이지만 **특정하지 않았다.**

### 3.3 R06에 대한 결론

- **baseline은 명령과 환경을 함께 고정한다** — 명령 문자열(`npm test`), Node/tsx 버전,
  작업 디렉터리, 그리고 대상 파일 경로 목록(manifest)까지. 다른 형태로 돌려 나온 실패는
  같은 조건의 회귀 증거로 쓸 수 없다.
- **U24가 해소되기 전까지 이 baseline은 "권위 있는" 것이 아니라 "조건부"다.**
  8개를 격리한 뒤에야 회귀 판정의 기준으로 삼을 수 있다.
- 위 8개는 **잠재 위험**이다. 향후 테스트 파일을 추가·이름 변경해 발견 순서가 바뀌면
  동작 회귀 없이도 실패할 수 있다. 그때 원인을 찾느라 시간을 쓰지 않도록 이 목록을 남긴다.
- 관리자 구현이 `report-store.ts`를 건드리면(T10) 이 8개를 **먼저** 확인한다.

## 4. `check:*` baseline — 4 PASS / 12 FAIL

| 스크립트 | exit | 마지막 메시지 요약 | 판정 |
| --- | --- | --- | --- |
| `check:wedding` | 0 | `wedding_day 연동 지점 전부 정상 (6페이지, 6대분류, 21중분류)` | PASS |
| `check:polish` | 0 | `01~06_1 흐름 마감 상태 정상 (14개 서비스)` | PASS |
| `check:prompt-guide` | 0 | `프롬프트 가이드 반영 100%: 공통 6, 서비스 20` | PASS |
| `check:service-contracts` | 0 | `20개 서비스 해석 계약 QA 통과` | PASS |
| `check:production-source` | 1 | 작업 트리 비청결 + `HEAD does not contain the freshly fetched origin/main` | **FAIL (정당)** |
| `check:pass-angle` | 1 | `스냅샷에서 복구하세요` | **FAIL (stale guard)** |
| `check:marry` | 1 | `대분류별 해석 렌즈 누락` | **FAIL (stale guard)** |
| `check:save` | 1 | `RAG 근거 추출 누락` | **FAIL (stale guard)** |
| `check:quit` | 1 | `RAG 근거 추출 누락` | **FAIL (stale guard)** |
| `check:couple` | 1 | `RAG 근거 추출 누락` | **FAIL (stale guard)** |
| `check:signal` | 1 | `RAG 근거 추출 누락` | **FAIL (stale guard)** |
| `check:thisyear` | 1 | `배우자성 계산 누락` | **FAIL (stale guard)** |
| `check:jobchoice` | 1 | `RAG 근거 추출 누락` | **FAIL (stale guard)** |
| `check:lucky` | 1 | `RAG 근거 추출 누락` | **FAIL (stale guard)** |
| `check:newyear` | 1 | `신년운세 홈 카드의 직접 이동 링크가 남아 있음` | **FAIL (stale guard)** |
| `check:cat` | 1 | `RAG 근거 추출 누락` | **FAIL (실제 코드 차이)** |
| `check:integrations` | 1 | Inicis MID·SignKey / checkout enabled | FAIL (기존, T01·T02에서 기록) |

### 4.1 [핵심] 11개가 stale guard인 근거

`check-*.mjs`는 **파일에 특정 문자열이 있는지** 검사하는 grep 가드다. 예:

```js
// HEAD의 scripts/check-save.mjs:37
['src/money/save-service.ts', 'function ragLineFrom', 'RAG 근거 추출'],
```

`ragLineFrom`은 우리 `save-service.ts`에 **0건**이다. 그런데 `origin/main`의 같은 줄은:

```js
// origin/main의 scripts/check-save.mjs:39
['src/money/save-service.ts', 'retrieveCategoryOwnChunks', 'RAG 근거 추출'],
```

그리고 `retrieveCategoryOwnChunks`는 **우리 코드에 존재한다**:

| 파일 | `retrieveCategoryOwnChunks` |
| --- | --- |
| `src/money/save-service.ts` | 2건 |
| `src/work/quit-service.ts` | 2건 |
| `src/love/signal-service.ts` | 2건 |
| `src/body/lucky-service.ts` | 2건 |
| `src/match/marry-service.ts` | 2건 |
| `src/pet/cat-service.ts` | **0건** ← 예외, §4.2 |

결정적 근거:
- 리팩터 커밋 `fdc80f2`가 grounding 코드를 이동시켰고, **`fdc80f2`는 HEAD의 조상이다**
  (`git merge-base --is-ancestor fdc80f2 HEAD` 성공). 즉 **우리 코드는 리팩터 이후 형태다.**
- `origin/main`에는 가드를 따라 고친 커밋이 있다:
  `7a4ef1c fix(check): follow the rest of the services to where fdc80f2 moved their grounding`,
  `00453e0 fix(check): follow lucky's grounding to where fdc80f2 moved it`
- `git diff --stat HEAD origin/main -- scripts/check-*.mjs` → **12개 파일이 다르다**
  (cat 10줄, couple 6, jobchoice 10, lucky 8, marry 3, newyear 11, pass-angle 5,
  quit 6, save 6, signal 6, thisyear 13, **wedding 32**).
  이 중 11개가 현재 실패 중인 stale guard이고, `check-wedding.mjs`도 다르지만 **통과한다**
  (우리 가드로도 wedding은 만족된다). — Codex 리뷰 Minor 1 반영

→ **서비스 코드가 유실된 것이 아니라, 가드가 옛 심볼명을 가리키고 있다.**
   해당 가드 수정본은 `origin/main`에 있고 우리 브랜치에 없다.

#### 11개 전수 확인 (5개 표본 일반화가 아니다)

`save` 하나로 일반화하지 않고, 실패한 가드 전부에 대해
`git diff HEAD origin/main -- scripts/check-<g>.mjs`로 **어느 심볼이 교체됐는지** 확인하고
**교체된 신 심볼이 우리 코드에 존재하는지** 검증했다.

| 가드 | HEAD가 찾는 옛 심볼 | `origin/main`이 찾는 신 심볼 | 우리 코드의 신 심볼 |
| --- | --- | --- | --- |
| `save` | `function ragLineFrom` | `retrieveCategoryOwnChunks` | 2건 ✓ |
| `quit` | `function ragLineFrom` | `retrieveCategoryOwnChunks` | 2건 ✓ |
| `signal` | `function ragLineFrom` | `retrieveCategoryOwnChunks` | 2건 ✓ |
| `lucky` | `function ragLineFrom` | `retrieveCategoryOwnChunks` | 2건 ✓ |
| `marry` | `const GROUP_LENS` | `MARRY_MATCH_TOC`, `../love/reading-content.js` | 3건 / 1건 ✓ |
| `thisyear` | `GROUP_LENS`, `ragLineFrom`, `dohwaLine`, `partnerStarLine` | `LOVE_THISYEAR_TOC`, `./reading-content.js` | 3건 / 1건 ✓ |
| `couple` | `GROUP_LENS`, `ragLineFrom` | `COUPLE_MATCH_TOC`, `retrieveCategoryOwnChunks` | 3건 / 2건 ✓ |
| `jobchoice` | `GROUP_PALACE`, `palaceLine`, `ragLineFrom` | `JOB_CHOICE_TOC`, `./practical-readings.js`, `workSymbol` | 4건 / — / 2건 ✓ |
| `pass-angle` | `return buildPassAngleInterpretation(`, `'기대해! 신규 운명'` | `buildPassAngleInterpretation(sectionId`, `isPassAngleContext(context)`, `'지금 열린 운명'` | 5건 / 1건 ✓ |
| `newyear` | 카드가 button+SOON | 카드가 링크+`is-live` | `사주/portal.html`이 `is-live` ✓ |
| `cat` | `function ragLineFrom` | `retrieveCategoryOwnChunks` **+** `retrieveCategoryRagChunks` | **0건 / 2건 → §4.2** |

리팩터의 성격이 드러난다: 서비스별로 손으로 쓴 렌즈·RAG 헬퍼 함수
(`GROUP_LENS`, `ragLineFrom`, `dohwaLine`, `partnerStarLine`, `GROUP_PALACE`, `palaceLine`)를
**공용 reading-content/practical-readings 테이블 + `retrieveCategoryOwnChunks`** 로 대체했다.
우리 코드는 전부 신 형태이고, 우리 가드만 구 형태다.
`cat` 하나만 신 형태에서도 한 단계가 빠져 있다.

`check:newyear`도 같은 종류다. 우리 가드는 신년운세 카드가 **"준비 중(button, href 없음, SOON)"** 이길
요구하지만 `사주/portal.html`의 카드는 `is-live`이고 `coming-tag`는 2건뿐(다른 카드 것)이다.
유닛 테스트 `portal-newyear-coming-soon.test.ts`는 제목만 옛 이름이고 실제 단정은
`the newyear card keeps its placement and **links to its service**`로 **live 상태를 검증하며 통과한다.**
`origin/main`의 가드는 live를 요구하도록 갱신되어 있다 (`f6402cd feat(portal): open the two upcoming cards`).

**따라서 `origin/main` 병합으로 11개 가드 실패가 해소될 것으로 예상된다.** U13의 구체적 가치다.
단 병합 충돌 24건(T02 §4)과 병합 후 동작은 미검증이므로, 병합 직후
**가드 16개 + `npm test` baseline을 전수 재실행**해 확인해야 한다. — Codex 리뷰 Minor 2 반영

### 4.2 [예외] `check:cat`은 실제 코드 차이다

| 심볼 | `origin/main` cat-service.ts | HEAD cat-service.ts |
| --- | --- | --- |
| `retrieveCategoryOwnChunks` (자기 코퍼스 우선 검색) | **2건** | **0건** |
| `retrieveCategoryRagChunks` (일반 RAG) | 2건 | 2건 |
| `./cat-practical-readings.js` | 1건 | 1건 |

우리 `cat-service.ts`는 일반 RAG(`retrieveCategoryRagChunks`, 384~392행)는 하지만
**자기 코퍼스 우선 검색 단계가 없다.** 형제 서비스 5개는 모두 그 단계를 갖고 있다.
`origin/main`에는 있다.

→ 즉 **고양이 궁합만 RAG 근거 선택 단계가 한 단 빠진 상태로 운영되고 있을 가능성이 있다.**
`origin/main`의 갱신된 가드로 검사해도 이 항목은 실패한다.
이것은 stale guard가 아니라 **실제 기능 차이**다. → **U23 신설.**

주의: 이 판정은 **심볼 존재 여부**에 근거한다. 실제 해석 품질 저하 여부는 확인하지 않았다.
`qa:all-services`는 통과하지만(정적 검사) **이 단계를 검사하지 않으므로** 품질 판정 근거가 되지 못한다.
실제 확인에는 고양이 궁합 리포트를 생성해 근거 블록 출처를 형제 서비스와 비교하는 작업이 필요하다.

### 4.3 `check:production-source`는 정당한 실패다

```
[production-source] HEAD=dac3835…
[production-source] origin/main=f010f55…
[production-source] BLOCKED: Working tree is not clean…
[production-source] BLOCKED: HEAD does not contain the freshly fetched origin/main…
exit 1
```

이 스크립트는 저장소 자신의 **배포 전 게이트**이고, 두 조건을 요구한다:
작업 트리 청결, 그리고 **HEAD가 방금 fetch한 `origin/main`을 포함할 것.**

즉 **이 저장소는 "origin/main을 통합한 뒤 배포"라는 수동 preflight 요구를 문서화하고 있고,
현재 소스는 그 요구를 통과하지 못한다.**

> **주장 범위 (Codex 리뷰 Major 2 반영).** 초판은 여기서 "현재 운영 배포가 저장소 자체
> 정책을 위반했다"고 적었다. **그것은 증거를 넘는다.**
> 이 스크립트는 스스로 한계를 밝힌다: "Manual preflight only: this command does not
> intercept other deploys or verify a remote deployment artifact."
> 즉 자동 차단 장치가 아니고 배포 산출물을 검사하지도 않는다.
> 현재의 exit 1이 증명하는 것은 **현재 HEAD가 dirty하고 fetch한 `origin/main`보다 뒤졌다**는 것뿐이다.
> 과거 배포가 이 검사를 실행했는지, 실행하고 무시했는지, 아예 대상이 아니었는지는 **미확인**이다.
> 판정하려면 배포 로그나 CI 기록이 필요하다 → U14에 포함.

작업 트리 비청결(31건)은 admin-ops 산출물 때문이므로 **이 항목은 커밋 전략(TASK-008) 뒤에 재평가**한다.


## 5. 16-ACCEPTANCE 지정 재사용 테스트 9개 — 전부 존재·통과

패키지는 "실제 존재·내용은 구현 시 재확인한다"고 했다. 재확인 결과:

| 파일 | 존재 | 테스트 수 | 주요 커버리지 |
| --- | --- | --- | --- |
| `admin.test.ts` | O | 3 | 기본 관리자 이메일 상수, `UMSH_ADMIN_EMAILS` 추가, 관리자 paid entitlement 표시 |
| `payment.test.ts` | O | 3 | 카탈로그 서버 기준 금액, 이니시스 서명 서버 생성, 테스트모드 production 강제 비활성 |
| `payment-order-store-rest.test.ts` | O | 1 | 비-JWT 키를 Bearer로 보내지 않음 |
| `report-api-access.test.ts` | O | 10 | 저장소 readiness 503, legacy/UUID/복수형 alias 동일 결과, `/r/UUID` 데이터 없는 셸, production 인증 누락 시 fail-closed, GET이 생성·변경 안 함, 404/400, 소유 리포트 거절, 완료 섹션 재사용, 알 수 없는 섹션, 목록에서 유료 섹션 제거 |
| `report-api-chat.test.ts` | O | 9 | 로그인 필수, 요청ID 재사용 단일 생성, legacy/UUID 재열람 시 모델 미호출·프롬프트 미노출, 타 소유자 거절·저장 히스토리 변경 방지, 모든 경로에서 로그인·소유권 확인, 미결제 소유자 preview 유지, 타 소유자 삭제 방지, 부모 권한 정확 일치, **권한 회수 재확인** |
| `report-persistence.test.ts` | O | 6 | 생성 전 ID 할당·동시 생성 첫 스냅샷 유지, 동시 변경 병합, 섹션 검증, 특화 섹션 재생성 안 함, 거부 출력 보존, **구형 레코드 재열람** |
| `report-store-rest.test.ts` | O | 20 | 서버 자격만 사용(사용자 토큰 금지), 서버 키 없으면 fail-closed, opaque 키는 apikey만, 진단 비밀 미노출, 소유자 필터, 외부 소유자 충돌 거절, **revision CAS 병합·stale 재읽기·legacy is.null CAS**, 완료 텍스트 미덮어씀, 경쟁 하 재시도 제한 |
| `service-directory.test.ts` | O | 3 | 서비스별 썸네일, 카탈로그 제목·금액 사용, 보관함이 원래 서비스로 복귀 |
| `service-corpus-coverage.test.ts` | O | 2 | 모든 서비스가 전용 코퍼스 팩 보유, 전용 팩이 읽을 수 있는 판단 블록 |

9개 전부 `npm test` 373건에 포함되어 **통과한다.**

> **T05 주의.** `admin.test.ts`는 `기본 슈퍼관리자 이메일은 …이다`로
> **하드코딩된 기본 관리자 목록을 테스트로 고정**하고 있다(T01 §5.1).
> T05에서 직원 RBAC를 만들 때 이 테스트를 "고쳐서 통과시키면" 안 된다.
> 레거시 unlock은 그대로 두고 **분리**하는 것이 13-SECURITY와 ADR-02의 요구다.

## 6. A01~A40 커버리지 매핑

`덮임` = 기존 테스트가 그 시나리오를 실제로 검증한다.
`부분` = 인접 동작은 검증하지만 시나리오 조건(직원 권한·금융 원장 등)이 없다.
`없음` = 대응 테스트가 없다(신규 작성 필요).

| A | 시나리오 요지 | 판정 | 근거 / 필요 작업 |
| --- | --- | --- | --- |
| A01 | 비로그인 관리자 API → 401 | **없음** | 관리자 API 자체가 없음 (T05) |
| A02 | 일반회원·기존 unlock 이메일만 → 403 | **부분** | `admin.test.ts`가 현재 unlock 동작을 고정. 직원 membership 부재 (T05) |
| A03 | 권한 회수 후 재요청 즉시 거절 | **부분** | `report-api-chat.test.ts`의 "rechecks a revoked parent entitlement"가 **고객 권한** 회수를 검증. 직원 권한 회수는 없음 (T05). T01 §5.1의 하드코딩 목록 때문에 현재 구조로는 불가 |
| A04 | CS가 범위 밖 호출 → 403 + 감사 | **없음** | scope·감사 없음 (T05, T10) |
| A05 | 민감 reveal 사유 누락/정상 | **없음** | reveal 경로 없음 (T10) |
| A06 | paid→viewed 전환이 승인액 증가 아님 | **없음** | 금융 원장 없음 (T15) |
| A07 | test/admin_unlock이 매출 제외 | **부분** | `payment.test.ts`가 테스트모드 production 비활성을 검증. 매출 집계 자체가 없음 (T15) |
| A08 | 같은 key 환불 중복 클릭 → 단일 operation | **없음** | 멱등키 없음 (T03 U17) |
| A09 | 같은 key 다른 금액 → 409 | **없음** | 동일 |
| A10 | 두 직원 동시 환불 → 초과 차단 | **없음** | 동일 |
| A11 | 요청자 자기 승인 → 403 | **없음** | 환불 워크플로 없음 (T17) |
| A12 | PG 성공 후 응답 유실 → unknown→대사 | **없음** | 불확정 상태 없음 (T03 U22) |
| A13 | PG 성공 후 DB 저장 실패 → intent 유지 | **없음** | 동일 |
| A14 | 전액환불 후 권한 철회 반영 | **부분** | `report-api-chat.test.ts`가 권한 회수 재확인을 검증. 환불 연동은 없음 (T17) |
| A15 | 실패 항목 두 번 재시도 → 단일 작업, 완료 hash 불변 | **부분** | `report-persistence.test.ts`·`report-store-rest.test.ts`가 완료 텍스트 미덮어씀·CAS 병합을 검증. 재시도 작업 큐는 없음 (T20) |
| A16 | worker 강제종료 후 lease 회수 | **부분** | `file-report-storage.test.ts`가 "bounds live-lock waiting and fails closed on a stale crashed lock" 검증. outbox worker는 없음 (T14) |
| A17 | memory 저장 모드 운영 쓰기 → 503 | **부분** | `report-api-access.test.ts`가 "uncached 503 for a non-durable memory store" 검증(리포트). 주문·프로필은 장치 자체가 없음 (T03 U20) |
| A18 | 서비스 숨김·판매중단 | **부분** | `service-directory.test.ts`·`home-public-availability.test.ts`가 노출을 검증. **판매 중단 축은 비활성**(T02 U10) |
| A19 | 가격변경 후 옛 주문 금액 유지 | **부분** | `payment.test.ts`가 서버 기준 금액을 검증. amount 스냅샷은 경로별 보증 상이 (T03 U21) |
| A20 | 참조 중 미디어 삭제/깨진 poster 차단 | **없음** | 미디어 관리 없음 (T23) |
| A21 | 승인된 콘텐츠 수정 → 새 revision | **없음** | 콘텐츠 버전 없음 (T24) |
| A22 | 잘못된 corpus schema·중복ID 차단 | **부분** | `service-corpus-coverage.test.ts`가 팩 보유·블록 형태를 검증. import 검증은 없음 (T25) |
| A23 | legacy chunks/structured/templates import | **부분** | `rag-retriever.test.ts`(24건)·`home-corpus-routing.test.ts`가 읽기 호환을 검증. import는 없음 (T25) |
| A24 | 평가 후 corpus 변경 → hash 불일치 발행 차단 | **없음** | 평가·release 없음 (T29) |
| A25 | release 복구 중 진행중 생성 snapshot 유지 | **없음** | release 없음 (T30) |
| A26 | 20종 평가·금지 일반화 중대 위반 0 | **부분** | `check:service-contracts`·`check:prompt-guide`가 계약·가이드 100%를 검증. 200사례 평가셋은 없음 (T28) |
| A27 | 이벤트 중복·72h 지연·KST 경계 | **없음** | 분석 이벤트 없음 (T32) |
| A28 | 브라우저 승인액 조작 무영향 | **부분** | `payment.test.ts` 서버 기준 금액 + `order` 생성 시 서버 재조회 (T02 §7). 원장은 없음 (T31) |
| A29 | 이메일/토큰/질문을 event에 삽입 차단 | **없음** | 이벤트 allowlist 없음 (T31) |
| A30 | CSV 수식 무력화 | **없음** | export 없음 (T34) |
| A31 | 타인 export·만료 URL 차단 | **없음** | 동일 |
| A32 | 구버전 report 필드 없음 → **미기록 표시** | **부분** | `report-persistence.test.ts:102`가 구형 레코드 재열람·정규화를 검증. 그러나 시나리오가 요구하는 **관리자 상세의 "미기록" 표시 UI**는 존재하지 않는다 (T10, T11) — Codex 리뷰 반영으로 덮임→부분 하향 |
| A33 | 회원 A가 B의 report 조회 차단 | **덮임** | `report-api-chat.test.ts` "denies a different owner", `report-store-rest.test.ts` "rejects a foreign owner collision", `report-api-access.test.ts` "rejects an owned report" |
| A34 | 기존 완료 result 재방문 시 모델 미호출·불변 | **덮임** | `report-api-chat.test.ts` "without a model call or saved prompt leakage", `report-persistence.test.ts` "does not regenerate on recall", `report-store-rest.test.ts` "does not overwrite completed text or status" |
| A35 | 조회 실패·빈 목록·필터없음이 서로 다른 UI 상태 | **부분** | `report-access-frontend.test.ts`(41건)가 pending/실패/성공 상태 구분을 검증(고객). 관리자 화면은 없음 (T07~T13) |
| A36 | 390/768/1280/1440 긴 한국어 겹침 없음 | **부분** | `wedding-readability.test.ts`·`home-*`·`teaser-customer-copy.test.ts`가 고객 화면 가독성을 검증. 관리자 화면은 없음 (T36) |
| A37 | 감사 저장 실패 후 민감 명령 차단 | **없음** | 감사 없음 (T06) |
| A38 | 개인정보 삭제 dry-run | **없음** | 없음 (T35) |
| A39 | 고객 `/orders`·`/r/:id` 회귀 | **부분** | `/r/:id` 계열은 `report-api-access.test.ts` 10건 + `report-api-chat.test.ts` 9건 + `report-access-frontend.test.ts` 41건으로 덮인다. **`/orders`를 직접 검증하는 테스트는 없다** (T36에서 추가 필요) — Codex 리뷰 반영으로 덮임→부분 하향 |
| A40 | 장애 알림 연속 발생 → 단일 incident | **없음** | incident 없음 (T21) |

**집계: 덮임 2 / 부분 17 / 없음 21** (덮임은 **A33 소유권**, **A34 완료 불변** 2개)

> 검산: 덮임 2 (A33, A34) + 부분 17 + 없음 21 = 40. ✓
> (초판은 A32·A39를 덮임으로 분류했다. Codex 리뷰 Major 3에 따라 부분으로 하향했다:
>  A32는 관리자 "미기록 표시" UI가 없고, A39는 `/orders` 직접 검증 테스트가 없다.)

### 6.1 해석

- **덮임 2개(A33 소유권, A34 완료 불변)는 "관리자를 만들면서 절대 깨뜨리면 안 되는 것"이며
  이미 테스트로 보호된다.** 이것이 T04의 가장 유용한 결과다.
- A32(구형 payload)와 A39(고객 라우트)는 **핵심 동작은 보호되지만 시나리오 전체는 미충족**이다:
  A32는 관리자 "미기록 표시" UI가 없고, A39는 `/orders` 직접 검증이 없다.
  T10·T11·T36이 각자 보완해야 한다.
- **없음 21개는 전부 아직 존재하지 않는 기능**(직원 RBAC, 감사, 환불, 대사, CMS, 평가,
  분석, export, incident)이다. 각 Task가 자기 시나리오 테스트를 함께 써야 한다.
- **부분 15개는 "고객 축은 있고 직원/금융 축이 없는" 상태**다. 기존 테스트를 확장하지 말고
  관리자용 테스트를 별도로 추가하는 편이 안전하다 — 고객 테스트가 회귀 방지선이기 때문이다.

## 7. 신규 항목

| ID | 내용 | 영향 | 해제 조건 |
| --- | --- | --- | --- |
| **U23** | `src/pet/cat-service.ts`에 `retrieveCategoryOwnChunks`(자기 코퍼스 우선 검색)가 없다. 형제 5개 서비스와 `origin/main`에는 있다 | **판매 중인 서비스의 동작 차이 → 병합/출시 차단 항목** (Codex 리뷰 권고) | `origin/main` 병합 또는 해당 단계 이식 후 `check:cat` 통과 **+ 고양이 궁합 검색 결과를 형제 서비스와 대조하는 결정적 assertion 추가** |
| **U24** | unit 스위트 8개가 실행 순서에 의존한다 | R06 baseline 신뢰성, T10 | 원인 특정 후 격리(테스트별 저장소 분리 등) |
| **U25** | `check:*` 11개 가드가 stale이며 수정본이 `origin/main`에만 있다 | 회귀 판별, CI 도입(TASK-005) | `origin/main` 병합 (U13) |

U13(origin/main 병합)의 가치가 T04에서 구체화되었다:
**병합 시 11개 가드 실패 + U23이 함께 해소된다.**

## 8. 고정된 회귀 기준 (관리자 구현 중 이 목록과 대조)

```
HEAD                       dac38355b5ef4bb5e91778fdcf458873fc63f29e  (fix/umsh-qa-ux)
npm run typecheck          PASS, 오류 0
npm test                   373 tests / 29 suites / 373 pass / 0 fail   (약 76s)
                           ※ 반드시 이 명령 문자열로 실행. 다른 방식은 비교 불가
check:wedding              PASS
check:polish               PASS
check:prompt-guide         PASS
check:service-contracts    PASS
check:production-source    FAIL (작업트리 비청결 + origin/main 미포함)
check:pass-angle           FAIL (stale guard)
check:marry                FAIL (stale guard)
check:save                 FAIL (stale guard)
check:quit                 FAIL (stale guard)
check:couple               FAIL (stale guard)
check:signal               FAIL (stale guard)
check:thisyear             FAIL (stale guard)
check:jobchoice            FAIL (stale guard)
check:lucky                FAIL (stale guard)
check:newyear              FAIL (stale guard)
check:cat                  FAIL (실제 코드 차이 — U23)
check:integrations         FAIL 2건 (Inicis MID·SignKey / checkout enabled)
qa:all-services            PASS (20개 서비스 QA 통과)
```

**위 목록은 아래 조건에서만 유효한 회귀 오라클이다:**
- 명령: 표에 적힌 문자열 그대로 (`npm test`는 반드시 npm 스크립트로)
- 환경: Node **v24.13.1** / tsx **v4.23.12** / cwd = 저장소 루트 / Windows 11
- 대상 파일 manifest: `tests/unit/*.test.ts` **60개**
  - 경로 목록 sha256[0:16] = `202b69511bda7f40`
  - 파일 내용 합본 sha256[0:16] = `d08cc1c098bd0494`
  - 두 해시가 달라지면 대상이 바뀐 것이므로 baseline을 다시 뜬다
    (재계산: `ls tests/unit/*.test.ts | sort | sha256sum`, `cat tests/unit/*.test.ts | sha256sum`)

이 조건이 같을 때, **위 목록에 없는 실패는 신규 회귀로 본다.**
조건이 다르면(다른 OS·Node 버전·실행 형태·미실행 검증) 먼저 U24를 확인하고
같은 조건으로 재실행해 대조한 뒤 판정한다.

## 9. T04 수용 조건 대조

| 수용 조건 | 결과 |
| --- | --- |
| typecheck·unit baseline 산출 | 충족 — §3.1, §8 |
| **실패가 기존인지 신규인지 구분** | 충족 — §8이 기존 실패 13건을 고정. §4가 각 실패의 성격(stale guard / 실제 차이 / 정당)까지 분류 |

## 10. M0 완료 상태

| pack task | 상태 | 산출물 |
| --- | --- | --- |
| T01 기준 소스·운영 차이 | DONE | `T01-baseline.md`, `production-source-of-truth.md` |
| T02 20종 키·노출 매핑 | DONE | `T02-service-mapping.md` |
| T03 저장소 스키마·권한 | DONE | `T03-storage-schema.md` |
| T04 기존 회귀 기준 | DONE | 이 문서 |

**M0 종료 게이트(14-ROADMAP: "코드·WIKI 차이 해결")** 대조:
- 코드와 패키지 명세의 차이는 T01~T04에서 전수 기록했다 (E01~E16 재검증, 08-DATA 오류 검출,
  18-SERVICES 대조, A01~A40 매핑).
- **미해결로 남은 차이**: U13(origin/main 미병합), U23(cat RAG 단계), U25(stale guard).
  세 항목은 모두 `origin/main` 병합으로 수렴한다.
- **따라서 M0의 "차이 해결"을 완결하려면 U13 병합 결정이 필요하다.**

M1(T05~T13) 착수 전 필요한 것: U2(개발용 영속 저장소), U4(운영 스키마·grant),
U17(주문 직렬화), U3(ADR-0002 승인).
