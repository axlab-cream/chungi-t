/*
 * 공용 측정 태그.
 *
 * 2026-09-18: 고객 화면 135개 가운데 태그가 붙은 곳은 홈 한 곳뿐이었다. 입력·결과·결제·보관함이
 * 통째로 측정되지 않아, 유입은 보이는데 그 뒤 여정이 비어 있었다. 화면마다 스니펫을 붙이면 새
 * 화면이 생길 때마다 빠지므로 여기 한 곳에서만 싣는다.
 *
 * 주소에서 **광고 측정용 허용값 외에는 떼고 보낸다.** 리포트와 결제 주소에는 reportId·orderId 가 붙는데,
 * reportId 는 특정 고객의 사주 해석에 1:1 로 연결되는 값이다. 어느 화면을 봤는지는 그대로
 * 집계되고, 누구의 해석인지는 넘어가지 않는다. 같은 이유로 유입 주소(referrer)도 잘라서 보낸다.
 */
(function (global) {
  var MEASUREMENT_ID = 'G-QVQZSPWK6M';
  var document = global.document;
  if (!document || global.__umshAnalyticsLoaded) return;
  if ((global.location || {}).origin !== 'https://umsh.kr') return;
  if (/^\/play\/love-speed\/preview\.html$/.test((global.location || {}).pathname || '')) return;

  // QA에서 운영 링크를 열어도 해당 탭의 후속 탐색까지 운영 통계에 섞이지 않는다.
  var qaReferrer = false;
  try {
    var host = new URL(document.referrer).hostname;
    qaReferrer = /^(localhost|.*\.localhost|127(?:\.\d+){3}|\[::1\]|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2})$/.test(host);
  } catch (_) { /* 없는 referrer는 정상 직접 유입이다. */ }
  try {
    if (qaReferrer) global.sessionStorage.setItem('umsh:analytics:qa', '1');
    qaReferrer = qaReferrer || global.sessionStorage.getItem('umsh:analytics:qa') === '1';
  } catch (_) { /* 저장소가 차단돼도 확인된 QA 유입은 제외한다. */ }
  if (qaReferrer) return;

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
  // 전체 쿼리를 제거하면 UTM/자동 태깅도 사라진다. 지정된 광고 키만 복원한다.
  // 캠페인 값에는 고객 정보를 넣지 않는다. 이메일/URL/제어문자/긴 값은 거부한다.
  try {
    var incoming = new URL(location.href);
    var measured = new URL(cleanLocation);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term', 'gclid', 'dclid', 'gbraid', 'wbraid'].forEach(function (key) {
      var value = incoming.searchParams.get(key);
      var valid = /^utm_/.test(key) ? /^[\p{L}\p{N} _+.\-]{1,200}$/u : /^[A-Za-z0-9_\-]{1,512}$/;
      if (value && valid.test(value)) measured.searchParams.set(key, value);
    });
    cleanLocation = measured.href;
  } catch (_) { /* 파싱 실패 시 식별자를 제외한 경로만 사용한다. */ }
  var cleanReferrer = withoutQuery(document.referrer);
  if (/^\/play\/love-speed(?:\/|$)/.test(location.pathname || '') && cleanReferrer) {
    try { cleanReferrer = new URL(cleanReferrer).origin + '/'; } catch (_) { cleanReferrer = ''; }
  }

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

  var SIGNUP_PENDING = 'umsh:analytics:signup-pending';
  var SIGNUP_TTL = 60 * 60 * 1000;
  var completingSignup = null;
  function cancelSignup() {
    try { global.sessionStorage.removeItem(SIGNUP_PENDING); } catch (_) {}
  }
  function isSignupMethod(method) {
    return ['google', 'kakao', 'naver'].includes(method);
  }
  function viewSignupWall() {
    try { global.gtag('event', 'view_signup_wall', {}); } catch (_) {}
  }
  function signupClick(method) {
    if (!isSignupMethod(method)) return;
    try { global.gtag('event', 'signup_click', { method: method }); } catch (_) {}
  }
  async function beginSignup(method) {
    cancelSignup();
    if (!isSignupMethod(method)) return;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 1500);
    try {
      // Browser clocks may be wrong. Compare account creation against our server clock.
      var response = await global.fetch('/api/auth/config', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      var config = await response.json();
      var startedAt = Date.parse(config.serverTime || '');
      if (!Number.isFinite(startedAt)) return;
      global.sessionStorage.setItem(SIGNUP_PENDING, JSON.stringify({ method: method, provider: (config.providers || {})[method] || method, startedAt: startedAt, localAt: Date.now() }));
    } catch (_) { /* Measurement must never prevent authentication. */ }
    finally { clearTimeout(timer); }
  }
  function completeSignup(client, session) {
    if (completingSignup) return completingSignup;
    if (!session || !session.access_token) return Promise.resolve();
    completingSignup = (async function () {
      var timer;
      try {
        var pending = JSON.parse(global.sessionStorage.getItem(SIGNUP_PENDING) || 'null');
        if (!pending) return;
        if (!isSignupMethod(pending.method) || !Number.isFinite(pending.startedAt) || !Number.isFinite(pending.localAt) || Date.now() - pending.localAt > SIGNUP_TTL || Date.now() < pending.localAt) { cancelSignup(); return; }
        // Verify with Auth rather than trusting a cached session or editable user_metadata.
        var result = await Promise.race([
          client.auth.getUser(),
          new Promise(function (resolve) { timer = setTimeout(function () { resolve(null); }, 1500); }),
        ]);
        if (!result || result.error || !result.data || !result.data.user) return;
        var user = result.data.user;
        var createdAt = Date.parse(user.created_at || '');
        cancelSignup();
        if (!user.id || !Number.isFinite(createdAt) || createdAt < pending.startedAt || createdAt > pending.startedAt + SIGNUP_TTL || (user.app_metadata || {}).provider !== (pending.provider || pending.method)) return;
        var key = 'umsh:analytics:signup-sent:' + user.id;
        if (global.localStorage.getItem(key)) return;
        // Consume before sending: repeated auth callbacks and reloads must not count twice.
        global.localStorage.setItem(key, '1');
        await new Promise(function (resolve) {
          var deliveryTimer = setTimeout(resolve, 1000);
          global.gtag('event', 'sign_up', {
            method: pending.method,
            event_callback: function () { clearTimeout(deliveryTimer); resolve(); },
            event_timeout: 1000,
          });
        });
      } catch (_) { /* Offline/blocked storage or analytics must not break login. */ }
      finally { clearTimeout(timer); }
    })().finally(function () { completingSignup = null; });
    return completingSignup;
  }
  global.UMSHAnalytics = { measurementId: MEASUREMENT_ID, withoutQuery: withoutQuery, viewSignupWall: viewSignupWall, signupClick: signupClick, beginSignup: beginSignup, completeSignup: completeSignup, cancelSignup: cancelSignup };
})(typeof window !== 'undefined' ? window : globalThis);
