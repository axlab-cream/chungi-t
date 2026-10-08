(function (global) {
  'use strict';

  if (global.__umshTrackLoaded) return;
  global.__umshTrackLoaded = true;

  /**
   * 퍼널 수집기.
   *
   * 두 가지만 센다 — 어느 단계에 들어왔는지(step_view), 무엇을 눌렀는지(cta_click).
   * 그 둘이면 "어디서 나가는가"와 "무엇에 관심이 있는가"를 볼 수 있다.
   *
   * 남기지 않는 것: 이름·생년월일·해석 본문·질의문자열. 화면 문구도 남기지 않는다 —
   * 문구는 개편 때마다 바뀌어서 그걸로 세면 통계가 끊긴다. 대신 `data-action` 처럼
   * 바뀌지 않는 행동 이름을 쓴다.
   */
  var ENDPOINT = '/api/events';
  var SESSION_KEY = 'umsh:track:session';
  var SESSION_TTL_MS = 30 * 60 * 1000;
  var queue = [];
  var flushTimer = null;
  var authPromise = null;
  var cachedAuthHeaders = null;
  var startedNewSession = false;

  /** 로그인 런타임이 있는 고객 화면에서만 현재 세션을 읽는다. 실패하면 익명 집계를 유지한다. */
  function authHeaders() {
    if (cachedAuthHeaders) return Promise.resolve(cachedAuthHeaders);
    if (authPromise) return authPromise;
    if (!global.UMSHAuthSession || !global.supabase || typeof global.fetch !== 'function') return Promise.resolve({});
    authPromise = global.fetch('/api/auth/config')
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (config) {
        if (!config || !config.enabled) return null;
        return global.UMSHAuthSession.resolveLiveSession(config, 500);
      })
      .then(function (resolved) {
        var token = resolved && resolved.session && resolved.session.access_token;
        cachedAuthHeaders = token ? { Authorization: 'Bearer ' + token } : {};
        return cachedAuthHeaders;
      })
      .catch(function () { cachedAuthHeaders = {}; return cachedAuthHeaders; });
    return authPromise;
  }

  function sessionId() {
    try {
      var now = Date.now();
      var stored = global.localStorage.getItem(SESSION_KEY);
      var found = stored ? JSON.parse(stored) : null;
      if (found && typeof found.id === 'string' && Number.isFinite(found.lastSeenAt) && now - found.lastSeenAt < SESSION_TTL_MS) {
        global.localStorage.setItem(SESSION_KEY, JSON.stringify({ id: found.id, lastSeenAt: now }));
        return found.id;
      }
      var made = (global.crypto && global.crypto.randomUUID)
        ? global.crypto.randomUUID()
        : String(now) + '-' + Math.random().toString(36).slice(2);
      startedNewSession = true;
      global.localStorage.setItem(SESSION_KEY, JSON.stringify({ id: made, lastSeenAt: now }));
      return made;
    } catch (_) {
      // 저장소가 막힌 브라우저에서도 한 화면 안의 흐름은 이어진다.
      if (!global.__umshTrackSession) global.__umshTrackSession = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
      return global.__umshTrackSession;
    }
  }

  /*
   * 2026-10-08 유입 채널. 새 방문이 시작될 때 한 번만 "어디서 왔는지"를 남긴다.
   * utm_source 가 있으면 그것을, 없으면 이전 사이트의 주소(도메인)로 나눈다. 주소 전체는 남기지 않는다.
   * 메신저(카카오톡 등)로 연 링크는 이전 주소가 전달되지 않아 직접 방문으로 잡힌다 — 홍보 링크에 utm 을 붙이는 이유다.
   */
  var UTM_ALIASES = { ig: 'instagram', insta: 'instagram', fb: 'facebook', kakaotalk: 'kakao', 'kakao-channel': 'kakao', kakao_channel: 'kakao' };
  var REFERRER_CHANNELS = [
    [/(^|\.)google\.[a-z.]+$/, 'google'], [/(^|\.)naver\.com$/, 'naver'], [/(^|\.)daum\.net$/, 'daum'], [/(^|\.)bing\.com$/, 'bing'],
    [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)(facebook\.com|fb\.com)$/, 'facebook'], [/(^|\.)kakao\.com$/, 'kakao'],
    [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'], [/(^|\.)threads\.(net|com)$/, 'threads'],
  ];
  function channelOf(href, referrer, origin) {
    try {
      var url = new URL(href);
      var utm = String(url.searchParams.get('utm_source') || '').trim().toLowerCase();
      if (utm) { utm = UTM_ALIASES[utm] || utm; return /^[a-z0-9_-]{1,30}$/.test(utm) ? utm : 'other'; }
      if (url.searchParams.get('gclid') || url.searchParams.get('gbraid') || url.searchParams.get('wbraid')) return 'google_ads';
      if (!referrer) return 'direct';
      var ref = new URL(referrer);
      if (ref.origin === origin) return null;
      for (var i = 0; i < REFERRER_CHANNELS.length; i += 1) if (REFERRER_CHANNELS[i][0].test(ref.hostname)) return REFERRER_CHANNELS[i][1];
      return 'other';
    } catch (_) { return 'direct'; }
  }

  /** 경로에서 서비스와 단계를 읽는다. 화면마다 따로 적어 두면 새 서비스에서 빠진다. */
  function placeOf(pathname) {
    var path = String(pathname || '');
    var service = null;
    var map = [
      [/^\/cmdg(\/|$)/, 'cmdg'], [/^\/money\/save/, 'money_save'], [/^\/work\/quit/, 'quit_fortune'],
      [/^\/work\/move/, 'work_move'], [/^\/work\/job-choice/, 'job_choice'], [/^\/work\/job/, 'work_job'],
      [/^\/love\/this-year/, 'love_this_year'], [/^\/love\/signal/, 'couple_signal'], [/^\/love\/mind/, 'love_mind'],
      [/^\/love\/again/, 'love_again'], [/^\/love\/spouse/, 'love_spouse'], [/^\/match\/couple/, 'match_couple'],
      [/^\/match\/marry/, 'marry_match'], [/^\/match\/cat/, 'cat_compatibility'], [/^\/me\/lucky/, 'lucky_color'],
      [/^\/me\/pass-angle/, 'pass_angle'], [/^\/flow\/newyear/, 'newyear_flow'], [/^\/day\/wedding/, 'wedding_day'],
      [/^\/play\/love-speed(?:\/|$)/, 'love_speed'], [/^\/play\/solo-nara(?:\/|$)/, 'solo_nara'], [/^\/place\/home/, 'home_pungsu'], [/^\/today\/free/, 'today_fortune'],
    ];
    for (var i = 0; i < map.length; i += 1) { if (map[i][0].test(path)) { service = map[i][1]; break; } }

    var step = null;
    if (/01-step-1-story/.test(path)) step = '01-story';
    else if (/02-step-2-saju-input/.test(path)) step = '02-input';
    else if (/03-step-3-service-input/.test(path)) step = '03-service-input';
    else if (/04-step-4-report/.test(path)) step = '04-report';
    else if (/05-step-5-chat/.test(path)) step = '05-toc';
    else if (/06-step-6_1-report-detail/.test(path)) step = '06-detail';
    else if (/^\/vault/.test(path)) step = 'vault';
    else if (/^\/search/.test(path)) step = 'search';
    else if (/^\/payment/.test(path)) step = 'payment';
    else if (/^\/r\//.test(path)) step = '06-detail';
    else if (path === '/' || /^\/index\.html$/.test(path)) step = 'home';
    else if (service) step = 'entry';
    return { service: service, step: step };
  }

  function send(force, leaving) {
    if (!queue.length) return;
    var batch = queue.splice(0, 20);
    var body = JSON.stringify({ sessionId: sessionId(), events: batch });
    // 첫 인증 조회가 끝나기 전에 화면을 닫으면 beacon으로 익명 이벤트라도 보존한다.
    if (leaving && !cachedAuthHeaders && global.navigator && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return Promise.resolve();
    }
    return authHeaders().then(function (headers) {
      try {
        // 인증된 요청은 Authorization 헤더가 필요해 keepalive fetch로 보낸다.
        if (!headers.Authorization && !force && global.navigator && navigator.sendBeacon) {
          navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
          return;
        }
        return global.fetch(ENDPOINT, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers), body: body, keepalive: true }).catch(function () {});
      } catch (_) { /* 통계 실패가 화면을 막지 않는다 */ }
    });
  }

  function push(event, extra) {
    var place = placeOf(location.pathname);
    queue.push({
      event: event,
      serviceKey: place.service,
      // 한 화면 안에서 단계가 바뀌는 서비스(천명사주)는 단계를 직접 넘긴다. 정해진 단계 이름만 받는다.
      step: (extra && /^0[1-6]-[a-z0-9_-]{2,30}$/.test(extra.step || '')) ? extra.step : place.step,
      target: (extra && extra.target) || null,
      route: location.pathname,
    });
    if (flushTimer) clearTimeout(flushTimer);
    // 클릭 여러 개를 한 번에 보낸다. 누를 때마다 요청을 내면 느린 회선에서 화면이 밀린다.
    flushTimer = setTimeout(send, 1200);
  }

  /** 안정적인 행동 이름을 고른다. 없으면 세지 않는다 — 문구로 세지 않기 위해서다. */
  function targetOf(node) {
    var actionNode = node.closest('[data-action], [data-shell-nav], [data-shell-bottom-menu]');
    if (!actionNode) return null;
    // 팝업처럼 같은 문구라도 게시 버전별로 따로 보아야 하는 CTA는 안정적인 전용 키를 준다.
    // 값은 서버가 이벤트 저장 전에 다시 길이·제어문자를 검증한다.
    var trackedTarget = actionNode.getAttribute('data-track-target');
    if (trackedTarget) return trackedTarget;
    return actionNode.getAttribute('data-action')
      || (actionNode.getAttribute('data-shell-nav') && 'nav:' + actionNode.getAttribute('data-shell-nav'))
      || (actionNode.getAttribute('data-shell-bottom-menu') && 'menu:' + actionNode.getAttribute('data-shell-bottom-menu'))
      || null;
  }

  function start() {
    authHeaders();
    // Free play tests record only an allowlisted entry source and honour DNT/GPC for every event.
    var service = placeOf(location.pathname).service;
    var play = service === 'love_speed' || service === 'solo_nara';
    if (play && (/preview\.html$/.test(location.pathname) || global.navigator.doNotTrack === '1' || global.navigator.globalPrivacyControl === true)) return;
    var source = service === 'solo_nara' ? global.UMSHSoloNaraSource : global.UMSHLoveSpeedSource;
    push('step_view', play ? { target: service + ':source:' + (['home','share','admin','internal','search','social','external','direct'].includes(source) ? source : 'direct') } : undefined);
    // 새 방문의 첫 화면에서만 유입 채널을 남긴다. 버튼 클릭 표에는 섞이지 않게 서버가 따로 센다.
    sessionId();
    if (startedNewSession) {
      var channel = channelOf(location.href, document.referrer, location.origin);
      if (channel) push('cta_click', { target: 'source:' + channel });
    }
    // 측정 태그가 이 수집기보다 먼저 남긴 가입 단계(로그인 복귀 직후 등)를 이어 보낸다.
    var pending = global.__umshTrackQueue;
    global.__umshTrackQueue = null;
    if (Array.isArray(pending)) pending.slice(0, 10).forEach(function (target) { if (typeof target === 'string') push('cta_click', { target: target }); });
    // 같은 단계 판정을 GA4 퍼널에도 쓴다. 측정 태그가 꺼진 환경(로컬·DNT)에는 UMSHAnalytics 가 없다.
    if (global.UMSHAnalytics && typeof global.UMSHAnalytics.funnelStep === 'function') global.UMSHAnalytics.funnelStep(placeOf(location.pathname));
    document.addEventListener('click', function (event) {
      var node = event.target && event.target.closest ? event.target : null;
      if (!node) return;
      var target = targetOf(node);
      if (target && (target.indexOf('love_speed:') === 0 || target.indexOf('solo_nara:') === 0) && (global.navigator.doNotTrack === '1' || global.navigator.globalPrivacyControl === true)) return;
      if (target) push('cta_click', { target: target });
      if (target === 'love_speed:home' && global.UMSHAnalytics && typeof global.gtag === 'function' && global.navigator.doNotTrack !== '1' && global.navigator.globalPrivacyControl !== true) global.gtag('event', 'love_speed_banner_click', { service_key: 'love_speed', link_source: 'home' });
    }, true);
    // 떠나기 직전에 남은 것을 보낸다.
    global.addEventListener('pagehide', function () { send(false, true); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(false, true); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  global.UMSHTrack = { push: push, flush: function () { return send(true); }, sessionTimeoutMs: SESSION_TTL_MS, channelOf: channelOf };
})(typeof window !== 'undefined' ? window : globalThis);
