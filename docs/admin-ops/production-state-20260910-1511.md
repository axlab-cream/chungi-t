# 운영 상태 변경 감지 — 2026-09-10 15:11 배포

- 작성일: 2026-09-10 (TASK-015 착수 시점)
- 계기: 배포 경로 확인 중 **이 세션 중에 운영이 재배포된 것**을 발견
- **이 문서는 T01·T02의 운영 관련 결론을 갱신한다.** 그 결론들은 측정 시점(약 5시간 전)에는
  사실이었고 지금은 낡았다.

## 1. 무엇이 바뀌었나

| | T01·T02 측정 시점 | 현재 |
| --- | --- | --- |
| 운영 배포 | `dpl_8GJ6WMBmoaBZeQy4YFQtcwZ8JeKZ` (09-09 17:06) | **`dpl_GvzMisxCbojK93hZVYJ8f5W6LiMq` (09-10 15:11)** |
| 운영 소스 계열 | 로컬 브랜치 `fix/umsh-qa-ux` | **`origin/main` 계열** |
| `umsh.kr` alias | 이전 배포 | 새 배포로 이동 |

Production 배포가 51분 전에 2건 연속 발생했고(15:10, 15:11) 새 배포가 `umsh.kr`을 가진다.
**나는 배포를 실행하지 않았다** — 이 세션에서 `vercel deploy` 계열 명령을 쓴 적이 없다.

`vercel project inspect`에 Git 연동 섹션이 없고 `vercel inspect`의 배포 정보에도
git 메타데이터가 없다.
→ 당시 나는 이것을 **"U14 확정: Git 연동이 없다"**로 읽었다. **그 판단은 틀렸다.**

**[2026-09-10 16:25 정정]** `vercel git connect`가
`already connected to your project`를 반환하고, `main` push가 Production 배포를,
브랜치 push가 Preview 배포를 즉시 만들었다.
→ **16:25 시점에 Git 연동이 존재한다.** 따라서 "연동이 없다"는 결론은 틀렸고
`README.md`의 "`main` push가 Production을 트리거한다"는 서술은 사실이다.

**단 이 정정에도 경계가 있다.** 위 증거는 **관측 시점의** 연결 상태와 라우팅만 증명한다.
**15:11 배포 당시의 연동 상태와 그 배포의 경로는 확정할 수 없다.**
git 메타데이터 부재는 CLI 배포와 양립하지만 단독 증거가 아니다.

**그렇다면 15:11 회귀의 원인은 무엇인가.**
연동 부재가 아니라 **CLI 배포가 연동 배포를 우회할 수 있다는 점**이다.
`vercel deploy --prod`는 Git 상태와 무관하게 로컬 작업 트리를 올린다.
09-09 17:06과 09-10 15:11 배포는 **이 시나리오와 부합한다** — 콘텐츠가 서로 다른 두 로컬
소스와 일치하고 `main`과는 일치하지 않았다. 배포 경로 자체는 미확정이다.
상세: `docs/admin-ops/TASK-018-deploy-path.md` §0

## 2. 새 배포가 가져온 것 (개선)

| 항목 | 확인 |
| --- | --- |
| 결제 문구의 환경변수 노출 해소 | `setupMessage` = `"지금은 결제를 열 수 없습니다. …"` — 더 이상 `INICIS_MID` 등을 노출하지 않는다 |
| Android App Links | `GET /.well-known/assetlinks.json` → **HTTP 200** |
| 공용 GNB·브랜드·모바일 정합 | `origin/main` 계열이므로 포함 |

TASK-012(문구 노출)가 이 배포로 **운영에서 실제 해소**되었다.

## 3. 새 배포가 잃은 것 (회귀)

우리 브랜치 10커밋의 공개 SEO·FAQ·about 작업이 **운영에서 서비스되지 않는다.**

| 경로 | 이전 | 현재 |
| --- | --- | --- |
| `/robots.txt` | 200 (437 bytes) | **404** |
| `/sitemap.xml` | 200 (2,557 bytes) | **404** |
| `/about` | 200 | **404** |
| `/faq` | 200 (126개 가이드) | **404** |
| `/my` | 200 | 200 (양쪽 공통) |
| `/privacy` 마커 | `UMSH 운명상회` / `v=20260909-logo` | `운명상회` / `v=20260901-policy-pages` |

관련 커밋: `10f23b3`(SEO·FAQ 기반), `80c45ea`(공개 MY·about·FAQ), `ca95a92`(공용 브랜드 로고 헤더),
`3390372`(FAQ 126건), `6d22c54`(about 카피), `dac3835`(사이트 신원 통일·검색 기반 검증)

**검색엔진 영향**: `robots.txt`와 `sitemap.xml`이 404이고, 색인되었을 `/about`·`/faq`도 404다.
`dac3835`가 빌드 시점에 검증했던 검색 기반이 현재 운영에서 동작하지 않는다.

### 집 풍수도 다시 내려갔다

| | 이전 | 현재 |
| --- | --- | --- |
| `GET /api/services` | 15종 (`home_pungsu` 포함) | **14종 (`home_pungsu` 없음)** |
| `/place/home` | 200 | 302 (리다이렉트) |
| `/place/home/01-step-1-story/` | 200 | 200 (직접 경로는 살아 있음) |

우리 브랜치가 `dc42c81 fix: reopen home feng shui service`로 재개했던 것이
`origin/main` 상태(`hidden: true`)로 되돌아갔다. 기존 구매자의 직접 경로는 살아 있으나
포털·검색 목록에서 사라졌다.

## 4. 로컬 병합본은 양쪽을 모두 가진다

현재 로컬 HEAD `2d49b8d`(병합 스택)를 확인한 결과:

| 자산 | 병합본 |
| --- | --- |
| `사주/robots.txt`, `sitemap.xml`, `about.html`, `faq.html` | **있음** |
| `/about`, `/faq` 라우트 | 각 1건 등록 |
| `사주/.well-known/assetlinks.json` + 라우트 | **있음** |
| `listServiceDirectory()` | **15종, `home_pungsu` 포함** |
| `PAYMENT_UNAVAILABLE_NOTICE` | 적용 (판매 게이트 필터도 유지) |

검증 상태: typecheck 0 오류, `npm test` 417/417, `check:*` 15/15,
`qa:all-services` PASS, `check:production-source` **PASS**.

→ **병합본을 배포하면 §3의 회귀를 복구하면서 §2의 개선을 유지한다.**

## 5. 판단이 필요한 지점

15:11 배포는 **의도적일 수 있다.** 결제 문구 노출 해소나 Android 작업이 급했다면
`origin/main`을 먼저 올리는 것이 합리적인 선택이다.
따라서 이것을 "사고"로 단정하지 않는다.

확인이 필요한 것은 두 가지다.
1. 그 배포가 의도한 것이었는가
2. `/about`·`/faq`·`robots.txt`·`sitemap.xml`이 내려간 것과 집 풍수가 목록에서 사라진 것을
   알고 있었는가

둘 다 "그렇다"면 현 상태가 의도된 운영 상태이므로 병합본 배포를 서두를 이유가 없다.
아니라면 병합본 배포가 복구 조치가 된다.

## 6. T01·T02 문서 갱신 사항

- T01 §2.1, `production-source-of-truth.md`: "운영 = 로컬 HEAD 계열"은
  **2026-09-09 17:06 배포 기준으로 사실이었고, 2026-09-10 15:11 배포로 무효**가 되었다.
- T02 §1·§1.3(운영 API 대조): `/api/services` 15종·catalog 19종이 당시 운영과 일치했으나
  현재 운영은 **14종**이다. 매핑표 자체(코드 기준)는 여전히 유효하다.
- U14(배포 경로): ~~확정. Git 연동 없음, CLI 배포만.~~ → **정정.** 16:25 시점에 Git 연동 존재.
  실제 위험은 CLI 배포가 그것을 우회할 수 있다는 것이다.
  규칙: 기본 경로는 `main` push, CLI Production 배포는 승인된 긴급 예외 (자동 강제 수단 없음).
- U7: 이 두 배포의 커밋 SHA는 여전히 미확인이다(CLI 배포이므로 git 메타데이터가 없다).
  **다만 이후 배포는 추적 가능하다** — `main` push 배포(`dpl_42Ckhx…`)는 연동 배포이므로
  `chungi-t-git-main-…` alias로 식별되고 커밋에 대응한다.

## 7. 복구 결과 (2026-09-10 16:19 배포)

`main`을 병합본(`0556e49`)으로 fast-forward하자 자동 배포가 일어났고 `umsh.kr`이 이동했다.

| 검증 | 결과 |
| --- | --- |
| `/robots.txt` `/sitemap.xml` `/about` `/faq` `/my` | **전부 200** (§3 회귀 복구) |
| `/.well-known/assetlinks.json` | **200** (§2 개선 유지) |
| `GET /api/services` | **15종, `home_pungsu` 포함** (14종 → 복구) |
| `GET /api/payment/config` | `setupMessage` 정상, 환경변수 이름 노출 **0건**, catalog 19종 |
| `/privacy` 마커 | `UMSH 운명상회` / `v=20260909-logo` (우리 계열) |

→ **§3의 회귀를 복구하면서 §2의 개선을 모두 유지했다.** §5의 판단 지점은
사용자 지시("기존에 제작한 SEO는 복구해야 한다")로 해소되었다.
