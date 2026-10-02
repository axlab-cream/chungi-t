import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 운명상회 하이브리드 셸.
 *
 * 웹 앱은 Express 가 `사주/` 의 HTML 을 직접 내려 주는 구조라 번들로 말아 넣을 수 있는
 * 정적 산출물이 없다. 그래서 셸은 배포된 사이트를 그대로 띄우고, `www/` 는 서버에
 * 닿지 못했을 때 보여 줄 화면만 담는다.
 *
 * allowNavigation 에 umsh.kr 만 둔다. 여기 없는 주소는 시스템 브라우저로 나가며,
 * 그게 소셜 로그인에 필요한 동작이다. 구글은 임베디드 WebView 안에서의 OAuth 를
 * `disallowed_useragent` 로 막기 때문에 앱 안에서 처리하면 로그인이 아예 안 된다.
 * 결제창(이니시스)도 같은 이유로 밖으로 내보내고, 돌아오는 길은 App Links 로 잇는다.
 */
const config: CapacitorConfig = {
  // Play 콘솔에 한 번 올리면 바꿀 수 없다. 첫 업로드 전에 확정해야 한다.
  appId: 'kr.umsh.app',
  appName: '운명상회',
  webDir: 'www',
  bundledWebRuntime: false,

  server: {
    url: 'https://umsh.kr',
    cleartext: false,
    // 이 목록에 없는 host 는 외부 브라우저로 열린다.
    // 밖으로 나가야 하는 것들: accounts.google.com, kauth.kakao.com,
    // nid.naver.com, stdpay.inicis.com
    allowNavigation: ['umsh.kr', 'www.umsh.kr'],
    // 서버에 닿지 못했을 때 보여 줄 로컬 화면. 이것이 있어야 첫 실행에 네트워크가
    // 없을 때 크롬 오류 화면 대신 설명되는 화면에서 멈춘다. 이 파일은 플러그인에
    // 접근하지 못하므로 안내와 다시 시도만 한다.
    errorPath: 'index.html',
  },

  android: {
    // 웹 앱이 전부 https 라 섞인 컨텐츠를 허용할 이유가 없다.
    allowMixedContent: false,
    // webContentsDebuggingEnabled 는 두지 않는다. Capacitor 기본값이 "디버그 빌드에서만 켬"
    // (CapConfig.java: isDebug)이라 릴리스 AAB 는 꺼진 채로 나가고, 디버그 APK 는 PC 에서
    // chrome://inspect 로 로그인·세션 문제를 들여다볼 수 있다.
  },

  plugins: {
    App: {
      // 뒤로 가기는 MainActivity 가 처리한다. 플러그인 기본 처리는 웹 기록이 없을 때
      // 아무것도 하지 않아 앱이 닫히지 않았다.
      disableBackButtonHandler: true,
    },
    SplashScreen: {
      // 원격 umsh.kr 에는 SplashScreen.hide() 를 부르는 코드가 없다. false 로 두면
      // 스플래시가 닫히지 않아 앱이 로고 화면에서 멈춘다(2026-10-02 실기기 확인).
      // 웹을 앱 때문에 고치지 않도록 셸이 정해진 시간 뒤 스스로 닫는다.
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#080302',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    // Capacitor 8 core 의 SystemBars 는 기본값(DEFAULT)이 기기 테마를 따른다. 라이트 모드
    // 폰에서 검정 배경 위에 검정 아이콘을 그려 시계·배터리가 안 보였다(2026-10-02 실기기).
    // 웹 배경이 항상 어두우므로 밝은 아이콘(DARK)으로 고정한다.
    SystemBars: {
      style: 'DARK',
      // 여백은 MainActivity 가 항상 직접 넣는다. 'css'(기본값)로 두면 viewport-fit=cover
      // 페이지에서 여백을 빼 버려 화면이 시스템 바와 겹친다.
      insetsHandling: 'disable',
    },
    // 앱을 보고 있을 때 온 푸시도 알림으로 띄운다. 빈 배열이면 Android 에서는 아무것도
    // 표시되지 않고 웹 이벤트만 온다. badge 는 iOS 전용이다.
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080302',
      overlaysWebView: false,
    },
  },
}

export default config
