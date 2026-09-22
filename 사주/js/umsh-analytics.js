/*
 * 공용 측정 태그.
 *
 * 2026-09-18: 고객 화면 135개 가운데 태그가 붙은 곳은 홈 한 곳뿐이었다. 입력·결과·결제·보관함이
 * 통째로 측정되지 않아, 유입은 보이는데 그 뒤 여정이 비어 있었다. 화면마다 스니펫을 붙이면 새
 * 화면이 생길 때마다 빠지므로 여기 한 곳에서만 싣는다.
 *
 * 주소에서 **물음표 뒤는 떼고 보낸다.** 리포트와 결제 주소에는 reportId·orderId 가 붙는데,
 * reportId 는 특정 고객의 사주 해석에 1:1 로 연결되는 값이다. 어느 화면을 봤는지는 그대로
 * 집계되고, 누구의 해석인지는 넘어가지 않는다. 같은 이유로 유입 주소(referrer)도 잘라서 보낸다.
 */
(function (global) {
  var MEASUREMENT_ID = 'G-QVQZSPWK6M';
  var document = global.document;
  if (!document || global.__umshAnalyticsLoaded) return;

  // 사용자가 추적을 끄는 브라우저 설정을 켜 두었으면 싣지 않는다.
  var navigator = global.navigator || {};
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;

  global.__umshAnalyticsLoaded = true;

  /** 물음표 뒤(질의 문자열)와 해시를 떼어 낸 주소. 식별자가 여기 붙는다. */
  function withoutQuery(value) {
    var text = String(value || '');
    if (!text) return '';
    var cut = text.indexOf('?');
    if (cut > -1) text = text.slice(0, cut);
    var hash = text.indexOf('#');
    if (hash > -1) text = text.slice(0, hash);
    return text;
  }

  var location = global.location || {};
  var cleanLocation = withoutQuery(String(location.origin || '') + String(location.pathname || ''));
  var cleanReferrer = withoutQuery(document.referrer);

  global.dataLayer = global.dataLayer || [];
  function gtag() { global.dataLayer.push(arguments); }
  global.gtag = global.gtag || gtag;

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    page_location: cleanLocation,
    page_path: String(location.pathname || ''),
    page_referrer: cleanReferrer,
  });

  /**
   * GA4의 자동 page_view와 짝을 이룬다. 페이지 경로만 남기므로 보고서·주문 URL의
   * 식별자를 보내지 않으며, 탐색 분석에서 `page_path`별 이탈 수를 바로 비교할 수 있다.
   */
  var exitTracked = false;
  function trackPageExit() {
    if (exitTracked) return;
    exitTracked = true;
    gtag('event', 'page_exit', {
      page_location: cleanLocation,
      page_path: String(location.pathname || ''),
      exit_reason: 'pagehide',
    });
  }
  if (typeof global.addEventListener === 'function') global.addEventListener('pagehide', trackPageExit, { capture: true });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  (document.head || document.documentElement).appendChild(script);

  global.UMSHAnalytics = { measurementId: MEASUREMENT_ID, withoutQuery: withoutQuery };
})(typeof window !== 'undefined' ? window : globalThis);
