# A03 · 기존 웹 기준 QA

실행일 2026-09-10. 로컬 서버(`npm start`, 커밋 `f010f55` + 미커밋 변경분)에서 실행했다.
**프로덕션이 아니라 로컬 기준이다.** 프로덕션은 16커밋 뒤처져 있어 결과가 다를 수 있다.

## 화면 경로 30개

전부 `200`. 리다이렉트를 따라간 최종 상태 기준이다.

`/` `/search` `/today/free` `/cmdg/` `/day/wedding` `/flow/newyear` `/match/couple`
`/match/marry` `/love/signal` `/love/this-year` `/work/job-choice` `/work/quit`
`/work/move` `/money/save` `/me/lucky` `/me/pass-angle` `/match/cat` `/place/home`
`/payment` `/payment/result` `/terms` `/privacy` `/refund` `/support` `/my` `/profile`
`/orders` `/vault` `/leave` `/signup`

판정 **PASS** — 경로 30/30.

## 인증 게이트

비로그인 상태로 POST 했을 때 전부 `401`.

| 엔드포인트 | 결과 |
|---|---|
| `/api/day/wedding/analyze` | 401 |
| `/api/money/save/analyze` | 401 |
| `/api/payment/orders` | 401 |
| `/api/payment/google/verify` | 401 |
| `/api/user/profile` | 401 |

판정 **PASS** — 로그인 없이 유료 경로에 닿지 않는다.

## 공개 API

| 엔드포인트 | 결과 | 비고 |
|---|---|---|
| `/api/health` | 200 | 코퍼스 28팩 지문 노출 |
| `/api/services` | 200 | 14개(비노출 5개 제외) |
| `/api/payment/config` | 200 | `checkoutEnabled: false` |
| `/api/auth/config` | 200 | Supabase 공개키 |
| `/.well-known/assetlinks.json` | 200 | App Links 검증용, 지문 자리표시자 |

판정 **PASS** — 다만 `checkoutEnabled: false` 는 아래 참조.

## 앱 결제 배선

`/payment` 응답에 `app-billing.js` 스크립트 태그 1개 확인. 웹 브라우저에서는
`UMSHAppBilling.isAvailable()` 이 거짓이라 기존 이니시스 경로가 그대로 동작한다.

판정 **PASS**.

## 자동 테스트

`npm test` 381개 통과 / 0 실패. `npx tsc --noEmit` 오류 없음.
`check:*` 스크립트 6개 확인분 전부 통과.

## 확인된 제약

| 항목 | 상태 | 영향 |
|---|---|---|
| `checkoutEnabled: false` | 이니시스 미설정(BASE-05) | 결제 전 과정을 로컬에서 끝까지 실행할 수 없다 |
| 저장소 `memory` | 로컬에 DB 없음 | 재시작 시 주문·리포트 사라짐. 운영과 다름 |
| 로그인 실행 | Supabase 실계정 미사용 | 로그인 이후 화면은 **NOT_TESTED** |
| 실제 리포트 생성 | 비용 발생 | 별도 확인분 존재(결혼택일 2섹션, 소비성향·커플궁합 각 1섹션) |

## 종합

| 구분 | 적용 대상 | PASS | FAIL | NOT_TESTED |
|---|---|---|---|---|
| 화면 경로 | 30 | 30 | 0 | 0 |
| 인증 게이트 | 5 | 5 | 0 | 0 |
| 공개 API | 5 | 5 | 0 | 0 |
| 앱 결제 배선 | 1 | 1 | 0 | 0 |
| 로그인 이후 흐름 | 6단계 | 0 | 0 | 6 |

실행률 41/47 = 87% · 통과율 41/47 = 87%. 로그인 이후 6단계는 분모에 남겼다.
