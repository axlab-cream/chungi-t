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
    // 뒤로 가기로 웹 히스토리를 먼저 소비하고, 더 갈 곳이 없을 때 앱을 내린다.
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#080302',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080302',
      overlaysWebView: false,
    },
  },
}

export default config
