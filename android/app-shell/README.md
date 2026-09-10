# 운명상회 안드로이드 앱 셸

`umsh.kr` 웹 앱을 Capacitor 네이티브 셸로 감싼 하이브리드 앱입니다.
같은 프로젝트에 나중에 iOS 를 붙일 수 있도록 Capacitor 를 골랐습니다.

- 앱 이름 `운명상회`
- 패키지 `kr.umsh.app` — **Play 에 한 번 올리면 바꿀 수 없습니다.** 첫 업로드 전에 확정해 주세요.
- Capacitor 8.5.1 / Gradle 8.14.3 / AGP 8.13.0 / compileSdk 36 / minSdk 24

## 이 PC 에 없어서 설치가 필요한 것

세팅은 끝났지만 이 PC 에는 JDK 와 안드로이드 SDK 가 없어 **빌드는 아직 못 합니다.**

| 필요한 것 | 확인 방법 |
| --- | --- |
| JDK 21 (최소 17) | `java -version` |
| Android Studio + SDK 36 + Build-Tools | Android Studio > SDK Manager |
| `ANDROID_HOME` 환경변수 | `echo $ANDROID_HOME` |

설치 후 `android/local.properties` 에 `sdk.dir` 을 적거나 Android Studio 로 한 번 열면
자동으로 생성됩니다. 이 파일은 PC 마다 달라 커밋하지 않습니다.

## 명령

```bash
cd app
npm install          # 한 번만
npm run sync:android # 설정과 플러그인을 네이티브 프로젝트에 반영
npm run open:android # Android Studio 로 열기
npm run doctor       # 설치 상태 점검
npm run assets       # assets/ 의 아이콘·스플래시를 안드로이드 리소스로 다시 생성
```

AAB 만들기 (Play 업로드용):

```bash
cd app/android
./gradlew bundleRelease
# 산출물: app/build/outputs/bundle/release/app-release.aab
```

## 구조와 선택 이유

**원격 로드 방식입니다.** 웹 앱이 Express 가 `사주/` HTML 을 직접 내려 주는 구조라
번들로 말아 넣을 정적 산출물이 없습니다. 그래서 셸이 `https://umsh.kr` 을 그대로 띄웁니다
(`capacitor.config.ts` 의 `server.url`). 이 방식이라야 Capacitor 브리지가 원격 페이지에
주입되어 스플래시·상태바·딥링크 플러그인이 동작합니다.

`www/index.html` 은 서버에 닿지 못했을 때 보여 줄 화면입니다. 브랜드 톤으로 만들어 두었고
다시 시도 버튼이 있습니다. **다만 아직 연결되어 있지 않습니다** — 원격 로드가 실패했을 때
이 화면으로 넘기려면 `MainActivity` 에서 `WebViewClient.onReceivedError` 를 잡아
로컬 자산으로 보내는 코드를 넣어야 합니다.

**로그인과 결제는 시스템 브라우저로 나갑니다.** `allowNavigation` 에 `umsh.kr` 만 두었기
때문에 그 밖의 주소는 외부 브라우저로 열립니다. 구글이 임베디드 WebView 안의 OAuth 를
`disallowed_useragent` 로 막기 때문에 이렇게 해야 로그인이 됩니다. 끝나고 돌아오는 길은
`AndroidManifest.xml` 의 App Links 필터가 받습니다.

## 첫 업로드 전에 반드시 해야 하는 것

### 1. 업로드 키스토어

```bash
cd app
keytool -genkeypair -v -keystore umsh-release.jks -alias umsh   -keyalg RSA -keysize 4096 -validity 10000
cp android/keystore.properties.example android/keystore.properties
# keystore.properties 에 비밀번호를 채운다. 이 파일과 .jks 는 커밋되지 않는다.
```

**이 키를 잃으면 같은 앱으로 업데이트를 올릴 수 없습니다.** Play 앱 서명을 쓰더라도
업로드 키는 따로 안전하게 보관해야 합니다.

`keystore.properties` 가 없으면 릴리스 빌드도 **디버그 키로 서명됩니다.** Play 는 그
산출물을 거부합니다. 업로드 전에 파일이 채워졌는지 확인해 주세요.

### 2. App Links 지문 채우기

`사주/.well-known/assetlinks.json` 에 자리표시자 두 개가 있습니다.

```bash
# 업로드 키 지문
keytool -list -v -keystore app/umsh-release.jks -alias umsh | grep SHA256
# Play 앱 서명 지문은 Play Console > 설정 > 앱 서명 에서 복사
```

두 값을 모두 넣어야 합니다. 업로드 키로만 넣으면 Play 가 재서명한 뒤 App Links 검증이
깨집니다. 배포 후 `https://umsh.kr/.well-known/assetlinks.json` 이 열리는지 확인해 주세요.

### 3. Play Console 에 올릴 자산

| 항목 | 규격 | 준비 상태 |
| --- | --- | --- |
| 앱 아이콘 | 512×512 PNG | `assets/play-store-icon-512.png` 준비됨 |
| 그래픽 이미지 | 1024×500 | 없음 — 만들어야 합니다 |
| 스마트폰 스크린샷 | 2~8장, 16:9 또는 9:16 | 없음 — 실기기에서 찍어야 합니다 |
| 짧은 설명 | 80자 이내 | 없음 |
| 자세한 설명 | 4000자 이내 | 없음 |
| 개인정보처리방침 URL | 공개 주소 | `https://umsh.kr/privacy` 있음 |
| 데이터 세이프티 설문 | — | 없음 — 생년월일·이메일·결제 수집을 신고해야 합니다 |

## 정책상 먼저 정해야 하는 것

세팅과 별개로, **이 세 가지를 정하지 않으면 심사에서 막힙니다.**

### 결제 — 구글플레이 결제로 붙였습니다

앱에서는 이니시스 대신 **Google Play 결제**를 씁니다. 웹은 그대로 이니시스입니다.
`사주/js/payment.js` 가 `UMSHAppBilling.isAvailable()` 로 앱 안인지 보고 갈라집니다.

흐름:

1. `POST /api/payment/orders` — 주문을 만든다 (웹과 같다)
2. `GET /api/payment/google/product/:productKey` — Play 상품 ID 와 계정 식별자를 받는다
3. `NativePurchases.purchaseProduct` — 결제창. `autoAcknowledgePurchases: false`,
   `isConsumable: false` 로 두어 확인과 소비를 서버 검증 뒤로 미룬다
4. `POST /api/payment/google/verify` — 서버가 구글에 영수증을 직접 물어보고,
   통과하면 확인 통보(acknowledge)까지 하고 주문을 `paid` 로 바꾼다
5. `NativePurchases.consumePurchase` — 소비. 같은 상품을 다시 살 수 있게 한다
6. `/payment/result?orderId=…` — 이니시스와 같은 착지점

서버가 막는 것들 (`tests/unit/google-play-payment.test.ts` 17개로 고정):

- 클라이언트가 보내는 상품명·금액은 근거로 쓰지 않는다. 구글에 물어본 값만 믿는다
- 같은 결제 토큰으로 두 주문을 열 수 없다 (`PURCHASE_ALREADY_USED`)
- 다른 계정에서 만들어진 결제는 거절한다 (`PURCHASE_ACCOUNT_MISMATCH`).
  결제 시 넘긴 ObfuscatedAccountId 를 서버가 같은 규칙으로 다시 계산해 대조한다
- 보류(2)·취소(1)·상태 없음은 열어 주지 않는다
- 이미 열린 주문을 다시 확인해도 같은 결과가 나온다

#### Play Console 에 등록해야 하는 것

**상품 ID 는 카탈로그 키를 그대로 씁니다.** 별도 매핑 표가 없으니 아래 19개를
인앱 상품으로 같은 이름으로 만들어야 합니다. 이름이 다르면 결제가 검증에서 막힙니다.

```
cmdg  love_this_year  wedding_day  newyear_flow  home_pungsu
work_move  work_job  quit_fortune  job_choice  cat_compatibility
lucky_color  money_save  marry_match  match_couple  couple_signal
love_mind  love_again  love_spouse  pass_angle
```

가격은 `src/payment/catalog.ts` 의 `amount`(원) 와 맞추면 됩니다.

#### 서버 환경변수

Play Console > 설정 > API 액세스 에서 서비스 계정을 만들고 **재무 데이터 보기** 권한을
주고, 내려받은 JSON 키를 넣습니다.

```
GOOGLE_PLAY_PACKAGE_NAME=kr.umsh.app
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<JSON 원본 또는 base64>
```

이 값이 없으면 `/api/payment/google/verify` 가 503 을 돌려주고 앱 결제는 열리지 않습니다.
웹 이니시스 결제는 영향받지 않습니다.

#### 아직 실기기에서 확인하지 못한 것

이 PC 에 안드로이드 SDK 가 없어 다음은 서명 빌드를 올린 뒤 내부 테스트 트랙에서
확인해야 합니다.

- 같은 상품을 두 번 사는 흐름(소비가 실제로 재구매를 열어 주는지)
- `com.android.vending.BILLING` 권한이 billing 라이브러리와 병합되는지
- 결제 도중 앱이 종료된 건을 `UMSHAppBilling.recoverPending` 이 되살리는지
### 소셜 로그인

카카오·네이버·구글 로그인을 외부 브라우저로 넘기도록 세팅했습니다. 다만 각 SDK 의
콘솔에 **안드로이드 패키지명과 키 해시**를 등록해야 실제로 동작합니다.

- 카카오: 패키지명 `kr.umsh.app` + 키 해시
- 네이버: 패키지명 + 앱 이름
- 구글: OAuth 클라이언트에 안드로이드 패키지명 + SHA-1

### 최소 기능성

웹사이트를 그대로 감싼 앱은 Play 의 저품질 정책과 애플 4.2(최소 기능성)에서 거부되는
경우가 잦습니다. 네이티브다운 요소가 최소 하나는 필요합니다. 이 앱에서 가장 값이 큰 것은
**푸시 알림**입니다(오늘의 운, 결과 생성 완료, 재방문). 다음 단계로 붙이시겠다면
`@capacitor/push-notifications` 와 Firebase 프로젝트를 준비하면 됩니다.

## 이 저장소와의 관계

- `app/` 은 서버 프로젝트와 별개 패키지입니다. 서버 `package.json` 은 건드리지 않았습니다.
- `.vercelignore` 에 `app/` 을 넣었습니다. Vercel 함수 크기가 이미 291MB 로 한계에 가까워
  안드로이드 프로젝트가 번들에 들어가면 안 됩니다.
- 서버에는 App Links 검증용 라우트 하나만 추가했습니다
  (`src/server/app.ts` 의 `/.well-known/assetlinks.json`).
