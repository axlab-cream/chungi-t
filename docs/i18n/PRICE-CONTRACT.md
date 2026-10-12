# 현지 통화 표시와 원화 청구 계약

## 현재 지원 범위

- 표시 브랜드: 영어 **Fate Shop**, 일본어 **運命商会**. 한국어 운명상회와 법인명은 변경하지 않는다.
- 실제 상품 금액·쿠폰·주문·INIpay/Inicis 청구·정산은 **KRW**다. 결제 카탈로그/연동 코드는 변경하지 않는다.
- 영어 USD와 일본어 JPY는 **참고 환산액**이며 고정 외화 판매가가 아니다. `Approx.` / `約`와 통화 코드를 붙여 표시한다.
- 영어 표시 기준은 **1 USD = 1,340 KRW**, 일본어는 **1 KRW = 0.118 JPY**다. 앞선 계획의 환산 기준을 고정한 것으로, 이 구현은 최신 실시간 환율이나 실제 카드 환율을 조회하지 않는다.
- USD는 소수 2자리, JPY는 정수로 일반 반올림한다. 별도 마케팅 가격표·가격 최솟값을 만들지 않는다. 0원 쿠폰은 $0.00 / ¥0으로 표시한다.
- 예: 9,900 KRW → `Approx. $7.39 USD` / `約 ¥1,168 JPY`; 49,900 KRW → `Approx. $37.24 USD` / `約 ¥5,888 JPY`.

## 변경해도 되는 영역

`replaceVisibleLocaleText`는 HTML 고객 노출 텍스트와 `data-price`(원/ KRW 문구인 경우만), `aria-label`, `aria-description`, `title`, `alt`의 참고 금액을 바꾼다.

숫자만 든 `data-price="9900"`, `data-amount`, URL, 구매/쿠폰 식별자, JS 변수·API 요청 본문, script/style 내부 문구는 변경하지 않는다. 동적으로 JS가 만드는 가격 표시는 별도 UI 포맷터 연결이 필요하며 이 함수로 문자열 코드를 고쳐서는 안 된다.

구조화 데이터의 Offer `price`와 `priceCurrency`는 실제 **KRW 가격과 KRW 통화**를 유지한다. JSON-LD script와 SEO/microdata `content` 값은 환산하지 않는다. 외화 청구가 없는 상태에서 SEO에 USD/JPY 판매가를 올리면 안 된다.

한국어 경로는 이 함수를 호출하지 않는다. 실수로 `locale='ko'`를 전달해도 원문을 그대로 돌려준다.

## 반드시 함께 노출되는 안내

참고 가격이 변환된 페이지에는 `umsh-currency-disclosure` 안내를 한 번만 붙인다.

- 참고 환율과 근사 표시임을 명시한다.
- 결제는 USD/JPY가 아니라 **한국 원화(KRW)**로 청구됨을 명시한다.
- 카드사 환율·수수료로 실제 외화 청구액은 달라질 수 있음을 명시한다.
- 쿠폰 적용 후 최종 원화액은 결제창에서 확인하도록 안내한다.

실제 외화 청구로 전환하려면 외화 결제사/가맹점 설정, 통화별 서버 카탈로그, 최소통화단위, 환불·쿠폰·주문 검증을 별도 구현하고 계약을 갱신해야 한다.

## 검사

PowerShell, 작업 폴더 `_build/chungi-t-deploy`:

```powershell
node --import tsx --test tests/unit/locale-prices.test.ts
npm run typecheck
```

가격 표시·접근성, 구매 payload 보존, KRW 구조화 데이터, 쿠폰/0원/범위, 반복 적용, 한국어 불변을 검증한다.
