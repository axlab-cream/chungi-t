# 운영 소스 정본 확인 — U1 / U7 해소

- 작성일: 2026-09-10
- 계기: 사용자 질문 "운영에서 최신파일이 있다면 그것을 다운받아 로컬이 동기화 되어야 겠지?"
- 결론: **운영이 최신이 아니다. 운영은 로컬 HEAD 계열로 배포되어 있다.**
  진짜 문제는 `origin/main`의 20 커밋이 운영에도 로컬에도 없다는 것이다.
- 이 문서는 T01의 U1·U7을 해소하고, T01/T02의 "운영 대조 미완료" 라벨을 갱신한다.

> **주장 범위 (Codex 리뷰 Major 1 반영).**
> 초판은 "운영 == 로컬 HEAD"라고 트리 전체의 동일성을 주장했다. **그것은 과잉 주장이다.**
> 정적 파일 마커 일치는 그 파일들이 같다는 것만 증명하고, 제3의 트리가 같은 마커를
> 공유할 가능성을 배제하지 못한다.
> 정확한 주장은 다음 두 가지다:
> 1. `origin/main`은 운영 소스가 **아니다** (마커 3종 불일치로 확정).
> 2. **T02가 감사한 서비스·결제 매핑 표면은 운영과 일치한다** (§1.3 운영 API 직접 대조).
> 트리 전체의 비트 단위 동일성은 미확인이며, 확정하려면 배포 산출물 해시 또는
> 운영이 서빙하는 빌드 SHA 마커가 필요하다(§6 U16).

## 1. 실측 증거

### 1.1 운영 배포 신원

```
vercel inspect https://chungi-1fin5ygnf-ax-lab-cream.vercel.app --scope ax-lab-cream

id       dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ
target   production
status   ● Ready
created  Wed Sep 09 2026 17:06:57 GMT+0900   [21h ago]
aliases  https://umsh.kr, https://www.umsh.kr, https://chungi-t.vercel.app
```

두 가지가 확인된다.

1. 이 배포 id는 패키지 `02-EVIDENCE.md`가 조사 루트로 적은
   `vercel-source-dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`와 **동일하다.**
   즉 admin-ops 패키지는 **현재 운영 중인 배포의 소스**를 보고 작성됐다.
2. `vercel inspect` 출력에 **git 커밋·브랜치 메타데이터가 없다.**
   Git 연동 배포라면 표시되는 정보가 비어 있다.
   → **가설: CLI 로컬 배포(`vercel --prod` 계열).**
   단 메타데이터 부재는 CLI 배포와 양립하지만 그것을 **증명하지는 않는다**
   (프로젝트 설정 등 다른 원인도 가능). 배포 방식은 **미확인**으로 남기고 U14를 유지한다.
   (Codex 리뷰 Major 2 반영 — 초판은 이를 근거로 단정했다.)

### 1.2 운영 콘텐츠가 어느 브랜치와 일치하는가

브랜치별로만 존재하는 마커를 골라 라이브 응답과 비교했다.

| 마커 | 로컬 HEAD `dac3835` | `origin/main` | 라이브 `umsh.kr` |
| --- | --- | --- | --- |
| `사주/robots.txt` | 있음 | **없음** | **HTTP 200, 437 bytes** |
| `사주/sitemap.xml` | 있음 | **없음** | **HTTP 200, 2557 bytes** |
| `/privacy` `<title>` | `개인정보처리방침 · UMSH 운명상회` | `개인정보처리방침 · 운명상회` | **`… · UMSH 운명상회`** |
| `/privacy` css 버전 | `policy.css?v=20260909-logo` | `policy.css?v=20260901-policy-pages` | **`v=20260909-logo`** |

3개 마커 모두 **로컬 HEAD와 일치**한다. `origin/main`과는 일치하지 않는다.
이는 "`origin/main`이 운영이 아니다"를 확정하지만, "운영 트리 전체가 HEAD와 같다"는 뜻은 아니다.

### 1.3 T02 감사 표면 직접 대조 (Codex Major 1 대응으로 추가 수집)

정적 페이지 마커 대신 **T02가 실제로 감사한 서비스·결제 코드의 출력**을 운영에서 직접 조회했다.

```
GET https://umsh.kr/api/services          -> 15건
GET https://umsh.kr/api/payment/config    -> catalog 19건,
                                             checkoutEnabled=false, storage=supabase, testMode=false
```

`/api/services` 운영 응답 (key / amount / href) — **15건 전부, 순서까지 로컬 `SEEDS`와 일치**:

| key | amount | href |
| --- | --- | --- |
| `cmdg` | 49900 | `/cmdg/` |
| `love_this_year` | 12900 | `/love/this-year` |
| `job_choice` | 9900 | `/work/job-choice` |
| `cat_compatibility` | 9900 | `/match/cat` |
| `lucky_color` | 4900 | `/me/lucky` |
| `newyear_flow` | 19900 | `/flow/newyear` |
| `wedding_day` | 24900 | `/day/wedding` |
| `match_couple` | 19900 | `/match/couple` |
| `marry_match` | 24900 | `/match/marry` |
| `couple_signal` | 19900 | `/love/signal` |
| `quit_fortune` | 14900 | `/work/quit` |
| `pass_angle` | 9900 | `/me/pass-angle` |
| `money_save` | 9900 | `/money/save` |
| `work_move` | 14900 | `/work/move` |
| `home_pungsu` | 19900 | `/place/home` |

`/api/payment/config` 운영 catalog 19건 — **`catalog.ts` 선언 순서와 완전히 일치**:
`cmdg, love_this_year, wedding_day, newyear_flow, home_pungsu, work_move, work_job,
quit_fortune, job_choice, cat_compatibility, lucky_color, money_save, marry_match,
match_couple, couple_signal, love_mind, love_again, love_spouse, pass_angle`

이로써 확정되는 것:
- **T02 §3 매핑표는 운영 현재값이다.** 노출 15종·판매 19종·금액·landing 경로가 운영과 일치한다.
- **T02 §6의 "노출 15 ≠ 판매 19"가 운영에서 실측 확인됐다.** discovery에서 숨긴
  `work_job`, `love_mind`, `love_again`, `love_spouse`가 **운영 결제 catalog에 그대로 노출**되고 있다.
  U10(판매 정책)은 가설이 아니라 현재 운영 상태다.
- 운영 `storage=supabase`, `checkoutEnabled=false` — T01 §4 환경별 표와 일치.

### 1.4 타임스탬프 일치

```
로컬 HEAD dac3835  커밋 시각  2026-09-09 17:06:34 +0900
운영 배포 dpl_8GJ6…  생성 시각  2026-09-09 17:06:57 +0900   (+23초)
```

커밋 23초 후 배포됐다. 시간 상관관계는 **정황 증거**이며 소스 출처를 증명하지는 않는다
(Codex 리뷰 반영). §1.2·§1.3의 콘텐츠 대조와 합쳐서 판단한다.

## 2. 정정 — T01 U1의 방향이 반대였다

T01은 "HEAD가 `origin/main`보다 20 커밋 뒤이므로 HEAD는 운영 소스가 아니다"라고 적었다.
**분기 수치는 맞았지만 결론이 틀렸다.** `origin/main`이 운영이라는 전제가 사실이 아니었다.

전제의 출처는 `README.md`다:

> 현재 Vercel 프로젝트는 `ax-lab-cream/chungi-t`에 링크되어 있고, GitHub
> `axlab-cream/chungi-t`의 `main` 브랜치 push가 Production 배포를 트리거합니다.

이 서술은 **현재 사실과 다르다.** 최신 운영 배포에는 git 메타데이터가 없고
콘텐츠는 `main`이 아니라 이 로컬 브랜치와 일치한다.
→ `README.md` 정정이 필요하다 (T04 이후 별건, 이 Task에서 수정하지 않음).

## 3. 실제 상태 — 3-way 분기

```
                    d4c4e1b (2026-09-07 17:14)  fork point
                       │
      ┌────────────────┴─────────────────┐
      │                                  │
  origin/main                    fix/umsh-qa-ux  ← 운영 배포 계열
  20 commits                     10 commits
  09-08 13:47 ~ 18:47            09-07 17:17 ~ 09-09 17:06
  결혼택일(wedding) 서비스        공개 SEO·FAQ 기반
  공용 GNB/크롬 완성              공개 MY·about·FAQ 126건
  브랜드 UMSH→운명상회 통일       공용 브랜드 로고 헤더
  모바일 프레임 정합              집풍수 숨김→재공개
  커플 02 입력 화면 정리          서비스 해석 QA 강화
  QA 자동 규칙 강제               사이트 신원 통일·검색 기반 검증
      │                                  │
      └──────── 병합 안 됨 ──────────────┘
                       │
                 운영에 없는 작업: origin/main 쪽 20 커밋 전부
```

`origin/main`의 20 커밋에 담긴 작업은 **운영에 반영된 적이 없다**:

- `a10a5b5` ~ `f010f55` 결혼택일(wedding_day) 서비스 구축
- `795e65f`, `aca0bf3` 공용 GNB·하단 메뉴 완성, 체크아웃 환경변수 노출 제거
- `e777c43`, `40f4494` 고객 노출 브랜드를 UMSH → 운명상회로 통일
- `3ce3c0a`, `0fd9058`, `29902f2` 모바일 프레임 정합
- `1ea8213`, `4cff78e` QA 자동 규칙 강제, 19개 서비스 6단계 전수 점검

> 주의: 상단 GNB·하단 메뉴 공용 크롬 작업이 이 미반영 묶음에 포함되어 있다.
> 운영 페이지에서 공용 크롬이 기대와 다르게 보이면 이 미병합이 원인일 수 있다.

## 4. 병합 위험 측정 (병합 시뮬레이션)

```
git merge-tree --write-tree --name-only HEAD origin/main   →  exit 1 (충돌)
```

작업 트리·브랜치·커밋 히스토리를 바꾸지 않는 병합 시뮬레이션이다.
단 `--write-tree`는 `.git`에 tree 오브젝트를 기록하므로 **문자 그대로 읽기 전용은 아니다**
(Codex 리뷰 Minor 1 반영 — 초판은 "읽기 전용"이라고 적었다).

**충돌 파일 24개.** 주요 항목:

| 유형 | 파일 | 성격 |
| --- | --- | --- |
| content | `src/server/app.ts` | 양쪽이 같은 서버 파일을 대폭 수정 |
| content | `data/corpus/registry.json` | 코퍼스 레지스트리 |
| **add/add** | `prompts/services/wedding_day.md` | **양쪽이 병렬로 결혼택일을 추가** (기능 동일성 미확인) |
| **add/add** | `src/day/wedding-service.ts` | 동일 |
| **add/add** | `scripts/check-wedding.mjs` | 동일 |
| content | `tests/unit/day-wedding-service.test.ts` | 동일 |
| content | `사주/day/wedding/**` (8개) | 화면 전체 |
| content | `사주/privacy.html`, `terms.html`, `refund.html`, `support.html`, `portal.html` | 정책·포털 페이지 |
| content | `사주/js/portal.js`, `js/wedding-service.js` | |
| content | `사주/match/couple/02-step-2-saju-input/index.html` | |
| content | `tests/unit/portal-newyear-coming-soon.test.ts`, `service-system-prompt.test.ts` | |

**add/add 충돌은 merge base 이후 양쪽이 같은 경로를 각자 추가했다는 뜻이다.**
로컬 HEAD에도 `wedding_day`가 catalog·manifest·프롬프트에 모두 존재하고(T02 §3 20행 표),
`origin/main`에도 있다. 자동 병합으로는 해결되지 않고 **어느 구현을 살릴지 사람이 정해야 한다.**
다만 이것만으로 두 구현이 기능적으로 독립·상이하다고 단정할 수는 없다
(Codex 리뷰 Minor 2 반영 — 초판은 "독립 구현"으로 단정했다).
정확히는 **병렬 추가이며 구현 비교가 필요한 상태**다. 동작·테스트를 비교한 뒤 판정한다.

## 5. 선택지

| # | 방식 | 결과 | 비용·위험 |
| --- | --- | --- | --- |
| **A** | `origin/main`을 로컬로 병합 (24개 충돌 수동 해소) | 양쪽 작업 통합. 공용 GNB·브랜드 통일·모바일 정합이 운영에 들어감 | 높음. 결혼택일 중복 구현 선택 필요. 회귀 위험 큼. 병합 후 373 테스트 전수 재검증 필수 |
| **B** | 로컬을 `origin/main`에 강제 반영 (main을 로컬로 맞춤) | 저장소가 운영과 일치. 단순 | `origin/main`의 20 커밋 작업이 **유실**됨. 공용 크롬·브랜드 통일이 사라짐. **권장하지 않음** |
| **C** | 지금은 병합하지 않고 admin-ops만 진행 | admin-ops가 운영 배포 계열 소스 위에서 진행됨. T02 결과는 운영 API 대조로 **운영 현재값 확정** | 낮음. 단 `origin/main` 분기는 계속 벌어짐. 나중에 병합 비용이 더 커짐. **병합은 추적되는 별도 Task로 반드시 남긴다** |
| **D** | `origin/main`의 특정 커밋만 cherry-pick (예: 공용 GNB·브랜드 통일) | 필요한 것만 선별 반영 | 중간. 어느 커밋이 필요한지 판단 필요 |

### 권고

**단기: C로 admin-ops를 계속 진행하고, 병합은 별도 Task로 분리한다.**

이유:
1. 운영 = 로컬 HEAD이므로 admin-ops의 기준 소스는 **이미 정확하다.**
   U1이 admin-ops를 막을 이유가 없어졌다.
2. 24개 충돌 병합은 그 자체로 며칠짜리 통합 작업이고, 관리자 구축과 섞으면
   회귀 원인을 분리할 수 없다.
3. 병합을 admin-ops 앞에 두면 관리자 작업이 무기한 지연된다.

**단, `origin/main` 병합을 미결로 방치하면 안 된다.** 별도 Task로 등록해
결혼택일 중복 구현 판정과 공용 크롬 반영 여부를 먼저 결정해야 한다.
공용 GNB·하단 메뉴가 운영에서 기대대로 동작하는지 확인이 필요하다.

## 6. U1 / U7 해소 결과

| ID | 이전 상태 | 해소 결과 |
| --- | --- | --- |
| U1 | 기준 브랜치 미확정, T02·T03 게이팅 | **해소.** 기준 브랜치 = `fix/umsh-qa-ux`. `origin/main`은 운영이 아님이 확정되었고, T02 감사 표면은 운영과 일치함을 §1.4로 직접 검증했다. T02·T03의 "운영 대조 미완료" 라벨을 **해제**한다 |
| U7 | 운영 배포 커밋 SHA 미확인 | **부분 해소.** 운영 배포 = `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ`. 커밋 SHA는 여전히 미확인(메타데이터 없음). 콘텐츠 수준에서 HEAD 계열임을 확인했다 |

신규 항목:

| ID | 내용 | 영향 | 해제 조건 |
| --- | --- | --- | --- |
| U13 | `origin/main`의 20 커밋(결혼택일·공용 GNB·브랜드 통일·모바일 정합)이 운영 미반영 | 저장소 정합성, 고객 화면 | 병합 Task 수행 (선택지 A 또는 D) |
| U14 | 운영 배포가 Git 연동이 아니라 CLI 로컬 배포로 이뤄지고 있다 | 배포 재현성·감사 추적. `README.md` 서술이 사실과 다름 | 배포 경로를 Git 연동으로 정상화할지 결정 |
| U15 | 결혼택일(wedding_day)이 양쪽 브랜치에 **병렬 추가**되어 있다 (add/add). 기능적 독립성은 미확인 | U13 병합 시 어느 구현을 살릴지 | 두 구현의 동작·테스트 비교 후 판정 |
| U16 | 운영 트리 전체가 로컬 HEAD와 비트 단위로 같은지 미확인 | 이후 Task에서 "운영 == 로컬"을 전제로 삼을 경우 | 운영이 서빙하는 빌드 SHA/버전 마커 도입, 또는 배포 산출물 해시 확보 |

## 7. 검증 명령 기록 (sanitized)

```
git fetch origin                                        -> ok
git rev-list --left-right --count origin/main...HEAD    -> 20  10
git merge-base HEAD origin/main                         -> d4c4e1b (2026-09-07 17:14)
git log origin/main -1                                  -> f010f55 (2026-09-08 18:47)
git log -1 HEAD                                         -> dac3835 (2026-09-09 17:06:34)
vercel inspect <prod url> --scope ax-lab-cream          -> dpl_8GJ6…, created 2026-09-09 17:06:57
curl -s -o /dev/null -w "%{http_code}" umsh.kr/robots.txt  -> 200 (437 bytes)
curl -s umsh.kr/privacy | grep title                    -> "· UMSH 운명상회" (HEAD 마커)
curl -s umsh.kr/api/services                            -> 15건, key/amount/href 로컬과 일치
curl -s umsh.kr/api/payment/config                      -> catalog 19건, storage=supabase,
                                                            checkoutEnabled=false, testMode=false
git merge-tree --write-tree --name-only HEAD origin/main -> exit 1, 24 conflicted files
```

작업 트리는 변경하지 않았다. `git fetch`와 `merge-tree` 시뮬레이션만 수행했고
merge·rebase·checkout·commit·push는 하지 않았다.
운영에는 GET 요청만 보냈다 (쓰기·결제·DB 조회 없음).

## 8. Codex 리뷰 반영 (2026-09-10)

보고서: `CreamAI/logs/review/task-t02_admin-ops-t02-review.md` — Critical 0 / Major 3 / Minor 2. 전부 수용.

| 지적 | 반영 |
| --- | --- |
| Major 1 — "운영 == 로컬 HEAD"는 마커만으로 성립하지 않음 | 주장 범위를 문서 상단에서 명시적으로 축소. **운영 API 직접 대조(§1.4)를 새로 수집**해 T02 감사 표면에 대해서는 직접 증명. 트리 전체 동일성은 U16으로 분리 |
| Major 2 — git 메타데이터 부재가 CLI 배포의 증거가 아님 | §1.1을 "가설"로 하향, U14 유지 |
| Minor 1 — `merge-tree --write-tree`는 문자 그대로 읽기 전용이 아님 | §4·§7 문구 수정 |
| Minor 2 — add/add가 기능적 독립을 증명하지 않음 | §4·U15 문구를 "병렬 추가, 비교 필요"로 수정 |

(Major 3은 `docs/admin-ops/T02-service-mapping.md` §7 필드 개수 오류로, 해당 문서에서 정정했다.)
