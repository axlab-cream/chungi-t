(function (global) {
  'use strict';

  var DEVICE_KEY = 'cheongi_auth_device_session_started_at_v1';
  var DEVICE_MS = 30 * 24 * 60 * 60 * 1000;

  /*
   * 2026-10-14 비회원(Supabase 익명 계정). 계획: docs/auth/guest-member-plan.md
   * - 비회원 세션은 sessionStorage 에만 둔다. 창을 닫으면 사라진다(공용 PC 보호).
   * - 1시간 동안 쓰지 않으면 지운다. 크롬 "이전 세션 이어 열기"로 sessionStorage 가 되살아나도 막힌다.
   * - 비회원이 남긴 생년월일 캐시(localStorage)도 같이 지운다.
   * - 회원(SNS) 세션은 예전처럼 localStorage 에 둔다. 결제·운명록처럼 자체 클라이언트를 쓰는 화면은
   *   localStorage 만 보므로 비회원을 로그아웃 상태로 보고 로그인을 요구한다.
   */
  var GUEST_ACTIVE_KEY = 'umsh_guest_active_at_v1';
  var GUEST_IDLE_MS = 60 * 60 * 1000;
  var GUEST_RESIDUE_KEYS = ['cheongi_user_birth_profile_v1'];

  function isAuthTokenKey(key) {
    return /^sb-.+-auth-token$/.test(String(key || ''));
  }

  function storedSessionIsAnonymous(value) {
    try {
      var parsed = JSON.parse(value || 'null');
      var session = parsed && (parsed.currentSession || parsed);
      return Boolean(session && session.user && session.user.is_anonymous === true);
    } catch (_error) {
      return false;
    }
  }

  function safeGet(store, key) { try { return store.getItem(key); } catch (_error) { return null; } }
  function safeSet(store, key, value) { try { store.setItem(key, value); } catch (_error) { /* 저장소가 막힌 브라우저 */ } }
  function safeRemove(store, key) { try { store.removeItem(key); } catch (_error) { /* 저장소가 막힌 브라우저 */ } }

  function touchGuest() { safeSet(global.localStorage, GUEST_ACTIVE_KEY, String(Date.now())); }

  function guestIdleExpired() {
    var last = Number(safeGet(global.localStorage, GUEST_ACTIVE_KEY));
    return Number.isFinite(last) && last > 0 && Date.now() - last > GUEST_IDLE_MS;
  }

  function guestTokenKeys() {
    var keys = [];
    try {
      for (var i = 0; i < global.sessionStorage.length; i += 1) {
        var key = global.sessionStorage.key(i);
        if (isAuthTokenKey(key)) keys.push(key);
      }
    } catch (_error) { /* 저장소가 막힌 브라우저 */ }
    return keys;
  }

  /** 비회원 흔적(세션·생년월일 캐시)을 지운다. 회원 세션(localStorage 토큰)은 건드리지 않는다. */
  function purgeGuest() {
    guestTokenKeys().forEach(function (key) { safeRemove(global.sessionStorage, key); });
    GUEST_RESIDUE_KEYS.forEach(function (key) { safeRemove(global.localStorage, key); });
    safeRemove(global.localStorage, GUEST_ACTIVE_KEY);
  }

  /**
   * 페이지를 열 때 한 번: 비회원 표시가 남아 있는데 비회원 세션이 없거나(창을 닫았음) 1시간이 지났으면
   * 앞사람의 흔적이다. 지운다.
   */
  function sweepGuestResidue() {
    if (!safeGet(global.localStorage, GUEST_ACTIVE_KEY)) return;
    if (!guestTokenKeys().length || guestIdleExpired()) purgeGuest();
  }

  /** Supabase 클라이언트 저장소. 비회원 세션만 sessionStorage 로 보낸다. */
  var guestAwareStorage = {
    getItem: function (key) {
      if (!isAuthTokenKey(key)) return safeGet(global.localStorage, key);
      var member = safeGet(global.localStorage, key);
      if (member && !storedSessionIsAnonymous(member)) return member;
      var guest = safeGet(global.sessionStorage, key);
      if (!guest) return member;
      if (guestIdleExpired()) { purgeGuest(); return null; }
      touchGuest();
      return guest;
    },
    setItem: function (key, value) {
      if (!isAuthTokenKey(key)) { safeSet(global.localStorage, key, value); return; }
      if (storedSessionIsAnonymous(value)) {
        safeSet(global.sessionStorage, key, value);
        if (storedSessionIsAnonymous(safeGet(global.localStorage, key))) safeRemove(global.localStorage, key);
        touchGuest();
        return;
      }
      safeSet(global.localStorage, key, value);
      safeRemove(global.sessionStorage, key);
      safeRemove(global.localStorage, GUEST_ACTIVE_KEY);
    },
    removeItem: function (key) {
      safeRemove(global.localStorage, key);
      if (isAuthTokenKey(key)) safeRemove(global.sessionStorage, key);
    },
  };

  function isGuestSession(session) {
    return Boolean(session && session.access_token && session.user && session.user.is_anonymous === true);
  }

  /** SNS 로그인 회원인지. 비회원(익명 계정)도 access_token 을 가지므로 토큰만 보면 안 된다. */
  function isMemberSession(session) {
    return Boolean(session && session.access_token && !isGuestSession(session));
  }

  function clearDeviceAuthSession() {
    try {
      global.localStorage.removeItem(DEVICE_KEY);
    } catch (_error) {
      // Browser storage can be unavailable in restricted modes.
    }
  }

  function deviceSessionStartedAt() {
    try {
      var value = Number(global.localStorage.getItem(DEVICE_KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (_error) {
      return 0;
    }
  }

  /**
   * GA4에 sign_up 이벤트가 전혀 없어 "가입 저조"와 "가입은 되는데 측정이 안 됨"을
   * 구분할 수 없었다. Supabase는 완전히 새로 가입한 사용자의 경우 created_at과
   * last_sign_in_at이 같은 요청에서 거의 동시에 찍힌다(수 초 이내). 이 차이를 이용해
   * "방금 막 가입한 세션"만 걸러내고, 사용자 1명당 한 번만 전송한다.
   */
  function trackSignupIfNew(session) {
    try {
      var user = session && session.user;
      if (!user || !user.id || user.is_anonymous === true) return;
      var createdAt = Date.parse(user.created_at || '');
      var lastSignIn = Date.parse(user.last_sign_in_at || '');
      if (!Number.isFinite(createdAt) || !Number.isFinite(lastSignIn)) return;
      if (Math.abs(lastSignIn - createdAt) > 15000) return;
      var trackedKey = 'umsh_signup_ga_tracked:' + user.id;
      if (global.localStorage.getItem(trackedKey)) return;
      global.localStorage.setItem(trackedKey, '1');
      if (typeof global.gtag === 'function') {
        global.gtag('event', 'sign_up', {
          method: (user.app_metadata && user.app_metadata.provider) || 'unknown',
        });
      }
    } catch (_error) {
      // 분석은 최선형(best-effort)이다. 실패해도 인증 흐름을 막지 않는다.
    }
  }

  function rememberDeviceAuthSession(session) {
    if (!session || !session.access_token) {
      clearDeviceAuthSession();
      return 0;
    }
    // 비회원 세션의 수명은 30일 기기 기준이 아니라 1시간 미사용 기준이다(guestAwareStorage).
    if (isGuestSession(session)) return 0;
    trackSignupIfNew(session);
    var existing = deviceSessionStartedAt();
    if (existing) return existing;
    var lastSignIn = Date.parse((session.user && session.user.last_sign_in_at) || '');
    var startedAt = Number.isFinite(lastSignIn) ? lastSignIn : Date.now();
    try {
      global.localStorage.setItem(DEVICE_KEY, String(startedAt));
    } catch (_error) {
      // Supabase still keeps its own session where browser storage allows it.
    }
    return startedAt;
  }

  var sharedClient = null;
  var sharedClientKey = '';

  function createClient(supabaseGlobal, url, publishableKey) {
    if (!supabaseGlobal || !supabaseGlobal.createClient) return null;
    var key = String(url || '') + '\n' + String(publishableKey || '');
    if (sharedClient && sharedClientKey === key) return sharedClient;
    var client = supabaseGlobal.createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: guestAwareStorage,
      },
    });
    sharedClient = client;
    sharedClientKey = key;
    return client;
  }

  async function enforceDeviceAuthSession(session, client) {
    if (global.UMSHReportAccess) global.UMSHReportAccess.setOwner(session && session.user && session.user.id);
    if (!session || !session.access_token) {
      clearDeviceAuthSession();
      return null;
    }
    if (isGuestSession(session)) return session;
    var startedAt = deviceSessionStartedAt() || rememberDeviceAuthSession(session);
    if (Date.now() - startedAt <= DEVICE_MS) return session;
    clearDeviceAuthSession();
    if (client && client.auth && client.auth.signOut) {
      await client.auth.signOut({ scope: 'local' }).catch(function () { return undefined; });
    }
    return null;
  }

  function waitForRuntime(timeoutMs) {
    return new Promise(function (resolve) {
      var deadline = Date.now() + (typeof timeoutMs === 'number' ? timeoutMs : 1500);
      (function poll() {
        if (global.supabase && global.supabase.createClient) return resolve(true);
        if (Date.now() >= deadline) return resolve(false);
        setTimeout(poll, 60);
      })();
    });
  }

  /**
   * getSession() 직후엔 로그인 복귀 토큰이 아직 없을 수 있다.
   * INITIAL_SESSION/SIGNED_IN 을 잠깐 기다려, 있는 세션을 놓치지 않는다.
   */
  async function resolveLiveSession(config, timeoutMs) {
    var wait = typeof timeoutMs === 'number' ? timeoutMs : 900;
    var deadline = Date.now() + wait;
    if (!(await waitForRuntime(Math.max(0, deadline - Date.now())))) return null;
    if (!config || !config.url || !config.publishableKey) return null;
    var client = createClient(global.supabase, config.url, config.publishableKey);
    if (!client) return null;
    var result = await client.auth.getSession();
    var session = await enforceDeviceAuthSession(result.data && result.data.session, client);
    if (session && session.access_token) return { client: client, session: session };
    var remaining = deadline - Date.now();
    if (remaining <= 0) return { client: client, session: null };
    return await new Promise(function (resolve) {
      var finished = false;
      var subscription = null;
      function finish(next) {
        if (finished) return;
        finished = true;
        if (subscription && subscription.unsubscribe) subscription.unsubscribe();
        clearTimeout(timer);
        if (!next) {
          resolve({ client: client, session: null });
          return;
        }
        enforceDeviceAuthSession(next, client).then(function (live) {
          resolve({ client: client, session: live });
        });
      }
      var listen = client.auth.onAuthStateChange(function (_event, next) {
        if (next && next.access_token) finish(next);
      });
      subscription = listen && listen.data && listen.data.subscription;
      var timer = setTimeout(function () { finish(null); }, remaining);
    });
  }

  async function bindServiceSession(auth, timeoutMs) {
    if (!auth) return null;
    if (auth.session && auth.session.access_token) return auth.session;
    if (!auth.config) {
      var response = await fetch('/api/auth/config');
      auth.config = await response.json();
    }
    if (!auth.config || !auth.config.enabled) return null;
    var resolved = await resolveLiveSession(auth.config, timeoutMs);
    if (!resolved) return null;
    auth.client = resolved.client;
    auth.session = resolved.session;
    return auth.session;
  }

  /**
   * 무료 화면용: 회원이든 비회원이든 세션을 돌려준다. 없으면 비회원(익명) 세션을 만든다.
   * 서버가 비회원 로그인을 켜 두지 않았으면(config.guestSignIn) 만들지 않고 null — 예전처럼 로그인으로 보낸다.
   */
  async function ensureGuestSession(auth, timeoutMs) {
    var session = await bindServiceSession(auth, timeoutMs);
    if (session) return session;
    if (!auth || !auth.config || !auth.config.guestSignIn) return null;
    if (!auth.client) auth.client = createClient(global.supabase, auth.config.url, auth.config.publishableKey);
    if (!auth.client || !auth.client.auth || typeof auth.client.auth.signInAnonymously !== 'function') return null;
    try {
      var result = await auth.client.auth.signInAnonymously();
      var created = result && result.data && result.data.session;
      if (!created || !created.access_token) return null;
      touchGuest();
      auth.session = created;
      if (global.UMSHReportAccess) global.UMSHReportAccess.setOwner(created.user && created.user.id);
      try {
        if (global.UMSHTrack && typeof global.UMSHTrack.push === 'function') global.UMSHTrack.push('cta_click', { target: 'signup:guest' });
      } catch (_error) { /* 측정은 흐름을 막지 않는다 */ }
      return created;
    } catch (_error) {
      return null;
    }
  }

  /*
   * 2026-10-14 3단계: 비회원 → 회원 이어받기. docs/auth/guest-member-plan.md
   * 같은 탭(sessionStorage)에 비회원 세션이 남아 있고 회원(SNS) 세션이 생기면, 비회원으로 본 결과와 사주 정보를
   * 회원 계정으로 옮긴다. 공용 PC에서 다음 사람이 남의 결과를 가져가지 않게 옮기기 전에 묻는다(결제 화면은 묻지 않음 —
   * 방금 본 결과를 사려는 본인이다). 이름·생일은 띄우지 않고 개수만 보인다.
   */
  function storedTokens(store, wantAnonymous) {
    var tokens = [];
    try {
      for (var i = 0; i < store.length; i += 1) {
        var key = store.key(i);
        if (!isAuthTokenKey(key)) continue;
        var parsed = JSON.parse(store.getItem(key) || 'null');
        var session = parsed && (parsed.currentSession || parsed);
        if (!session || !session.access_token || !session.user) continue;
        if ((session.user.is_anonymous === true) === wantAnonymous) tokens.push(session.access_token);
      }
    } catch (_error) { /* 저장소가 막힌 브라우저 */ }
    return tokens;
  }

  function dropGuestSession() {
    guestTokenKeys().forEach(function (key) { safeRemove(global.sessionStorage, key); });
    safeRemove(global.localStorage, GUEST_ACTIVE_KEY);
  }

  function loadSheet() {
    if (global.UMSHGuestSaveSheet || !global.document) return Promise.resolve(global.UMSHGuestSaveSheet);
    return new Promise(function (resolve) {
      var script = global.document.createElement('script');
      script.src = '/js/umsh-guest-save-sheet.js?v=20261016b';
      script.onload = function () { resolve(global.UMSHGuestSaveSheet); };
      script.onerror = function () { resolve(null); };
      global.document.head.appendChild(script);
    });
  }

  var claiming = null;
  function claimGuestNow(options) {
    if (claiming) return claiming;
    var guestToken = storedTokens(global.sessionStorage, true)[0];
    var memberToken = storedTokens(global.localStorage, false)[0];
    if (!guestToken || !memberToken) return Promise.resolve({ skipped: true });
    function post(body) {
      return fetch('/api/auth/claim-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + memberToken },
        body: JSON.stringify(body),
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (json) { return { ok: response.ok, status: response.status, body: json }; });
      });
    }
    claiming = (async function () {
      try {
        var plan = await post({ guestToken: guestToken, dryRun: true });
        if (!plan.ok) {
          // 비회원 토큰이 만료·무효면 더 할 일이 없다. 서버·네트워크 오류면 다음 페이지에서 다시 시도한다.
          if (plan.status === 400) dropGuestSession();
          return { error: true };
        }
        var count = Number(plan.body.reports) || 0;
        var hasProfile = plan.body.profile === 'copied';
        if (!count && !hasProfile) { dropGuestSession(); return { moved: 0 }; }
        var agree = true;
        var onPayment = /^\/payment(\/|$)/.test(String(global.location && global.location.pathname || ''));
        // 2026-10-16: 결과 화면의 [저장하기]·[운명 거래하기]로 로그인한 경우(30분 안)는 이미 저장하겠다고 한 것이라 묻지 않는다.
        var intentAt = Number(safeGet(global.sessionStorage, 'umsh_claim_intent_v1')) || 0;
        var saveIntent = intentAt > 0 && Date.now() - intentAt < 30 * 60 * 1000;
        if (!(options && options.silent) && !onPayment && !saveIntent) {
          var sheet = await loadSheet();
          agree = sheet && sheet.confirmClaim ? await sheet.confirmClaim({ reports: count, profile: hasProfile }) : true;
        }
        if (!agree) { dropGuestSession(); return { declined: true }; }
        var done = await post({ guestToken: guestToken });
        if (done.ok) { dropGuestSession(); safeRemove(global.sessionStorage, 'umsh_claim_intent_v1'); }
        try {
          if (global.UMSHTrack && typeof global.UMSHTrack.push === 'function') global.UMSHTrack.push('cta_click', { target: done.ok ? 'signup:guest_claimed' : 'signup:guest_claim_failed' });
        } catch (_error) { /* 측정은 흐름을 막지 않는다 */ }
        return done.body;
      } catch (_error) {
        return { error: true };
      } finally {
        claiming = null;
      }
    })();
    return claiming;
  }

  /*
   * 2026-10-15 비회원 집계·약관 동의. 계획: docs/auth/guest-member-plan.md
   * - 기기 번호: 이 브라우저를 가리키는 무작위 값. 이름·사주는 담지 않는다. 비회원은 "기기 + 사주"로 한 사람을 센다.
   * - 비회원이 무료 결과를 보면 서버에 방문을 남긴다(POST /api/guest/visit). 탭·계정·서비스마다 한 번.
   * - 회원 세션이 생기면 로그인 전에 받아 둔 동의(umsh-consent.js)를 서버에 기록하고,
   *   지금 버전 동의 기록이 없는 회원에게는 동의 시트를 한 번 띄운다.
   */
  var DEVICE_ID_KEY = 'umsh_device_id_v1';
  var CONSENT_PENDING_KEY = 'umsh_consent_pending_v1';
  var CONSENT_OK_KEY = 'umsh_consent_ok_v1';
  var CONSENT_CHECKED_PREFIX = 'umsh_consent_checked:';
  var GUEST_VISIT_PREFIX = 'umsh_guest_visit:';

  function randomId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    } catch (_error) { /* 오래된 브라우저 */ }
    var hex = '';
    for (var i = 0; i < 32; i += 1) hex += Math.floor(Math.random() * 16).toString(16);
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-4' + hex.slice(13, 16) + '-a' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
  }

  /** 이 브라우저의 기기 번호. 저장소가 막혔으면 빈 문자열(서버는 기기 없는 방문으로 센다). */
  function deviceId() {
    var existing = safeGet(global.localStorage, DEVICE_ID_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    var next = randomId();
    safeSet(global.localStorage, DEVICE_ID_KEY, next);
    return safeGet(global.localStorage, DEVICE_ID_KEY) === next ? next : '';
  }

  function storedSession(store, wantAnonymous) {
    try {
      for (var i = 0; i < store.length; i += 1) {
        var key = store.key(i);
        if (!isAuthTokenKey(key)) continue;
        var parsed = JSON.parse(store.getItem(key) || 'null');
        var session = parsed && (parsed.currentSession || parsed);
        if (!session || !session.access_token || !session.user) continue;
        if ((session.user.is_anonymous === true) === wantAnonymous) return { token: session.access_token, userId: String(session.user.id || '') };
      }
    } catch (_error) { /* 저장소가 막힌 브라우저 */ }
    return null;
  }

  function currentGuestToken() { var found = storedSession(global.sessionStorage, true); return found ? found.token : ''; }
  function currentMemberToken() { var found = storedSession(global.localStorage, false); return found ? found.token : ''; }

  /** 비회원이 무료 결과를 봤다고 서버에 남긴다. 회원이거나 비회원 세션이 없으면 하지 않는다. 실패는 조용히 넘긴다. */
  function recordGuestVisit(service) {
    if (typeof fetch !== 'function') return Promise.resolve(false);
    if (storedSession(global.localStorage, false)) return Promise.resolve(false);
    var guest = storedSession(global.sessionStorage, true);
    if (!guest) return Promise.resolve(false);
    var name = String(service || (global.location && global.location.pathname) || 'unknown').slice(0, 80);
    var key = GUEST_VISIT_PREFIX + guest.userId + ':' + name;
    if (safeGet(global.sessionStorage, key)) return Promise.resolve(false);
    safeSet(global.sessionStorage, key, '1');
    return fetch('/api/guest/visit', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + guest.token },
      body: JSON.stringify({ deviceId: deviceId(), service: name }),
    }).then(function (response) { return response.ok; }).catch(function () { return false; });
  }

  function loadConsentModule() {
    if (global.UMSHConsent || !global.document) return Promise.resolve(global.UMSHConsent || null);
    return new Promise(function (resolve) {
      var script = global.document.createElement('script');
      script.src = '/js/umsh-consent.js?v=20261016a';
      script.onload = function () { resolve(global.UMSHConsent || null); };
      script.onerror = function () { resolve(null); };
      global.document.head.appendChild(script);
    });
  }

  function readConsentPending() {
    try {
      var pending = JSON.parse(safeGet(global.sessionStorage, CONSENT_PENDING_KEY) || 'null');
      if (!pending || pending.terms !== true || pending.privacy !== true || pending.age14 !== true) return null;
      if (!Number.isFinite(pending.at) || Date.now() - pending.at > 24 * 60 * 60 * 1000) { safeRemove(global.sessionStorage, CONSENT_PENDING_KEY); return null; }
      return pending;
    } catch (_error) {
      return null;
    }
  }

  function postConsentRecord(token, pending) {
    return fetch('/api/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        version: pending.version,
        terms: true, privacy: true, age14: true,
        marketing: pending.marketing === true,
        source: pending.source || 'login',
        deviceId: deviceId(),
      }),
    }).then(function (response) { return { ok: response.ok, status: response.status }; })
      .catch(function () { return { ok: false, status: 0 }; });
  }

  var consentChecking = null;
  /**
   * 회원 세션에서 한 번: 받아 둔 동의를 기록한다. options.prompt 일 때만, 지금 버전 동의가 없으면 동의 시트를 띄운다.
   * 2026-10-15 대표 결정: 화면을 열자마자 동의 시트를 띄우지 않는다. 결제(운명 거래하기)처럼 필요한 순간에만
   * ensureMemberConsent() 로 묻는다. 동의 기록 저장소가 없거나(503) 네트워크가 끊기면 묻지 않는다.
   */
  function syncMemberConsent(options) {
    var prompt = Boolean(options && options.prompt);
    if (consentChecking) return prompt ? consentChecking.then(function () { return syncMemberConsent(options); }) : consentChecking;
    if (typeof fetch !== 'function') return Promise.resolve({ skipped: true });
    var member = storedSession(global.localStorage, false);
    if (!member) return Promise.resolve({ skipped: true });
    var checkedKey = CONSENT_CHECKED_PREFIX + member.userId;
    consentChecking = (async function () {
      try {
        var pending = readConsentPending();
        if (pending) {
          var recorded = await postConsentRecord(member.token, pending);
          if (recorded.ok) {
            safeRemove(global.sessionStorage, CONSENT_PENDING_KEY);
            safeSet(global.localStorage, CONSENT_OK_KEY, String(pending.version || ''));
            safeSet(global.sessionStorage, checkedKey, '1');
            return { recorded: true };
          }
          // 필수 누락·버전이 바뀜: 받아 둔 동의는 버리고 아래에서 지금 버전으로 다시 묻는다.
          if (recorded.status === 400 || recorded.status === 409) safeRemove(global.sessionStorage, CONSENT_PENDING_KEY);
          else return { error: true };
        }
        if (safeGet(global.sessionStorage, checkedKey)) return { skipped: true };
        var response = await fetch('/api/consents/status', { headers: { Authorization: 'Bearer ' + member.token } }).catch(function () { return null; });
        if (!response || !response.ok) return { error: true };
        var status = await response.json().catch(function () { return null; });
        if (!status || status.current !== false) {
          safeSet(global.sessionStorage, checkedKey, '1');
          if (status && status.version) safeSet(global.localStorage, CONSENT_OK_KEY, String(status.version));
          return { current: true };
        }
        if (!prompt) return { current: false };
        var consent = await loadConsentModule();
        if (!consent || typeof consent.openReconsent !== 'function') return { error: true };
        var agreed = await consent.openReconsent({ token: member.token, title: options.title, sub: options.sub, dismissLabel: options.dismissLabel });
        if (agreed) safeSet(global.sessionStorage, checkedKey, '1');
        return { reconsented: agreed };
      } catch (_error) {
        return { error: true };
      } finally {
        consentChecking = null;
      }
    })();
    return consentChecking;
  }

  /** 결제처럼 동의가 꼭 있어야 하는 순간. 동의돼 있으면(확인할 수 없을 때도) true, 시트를 닫으면 false. */
  function ensureMemberConsent(options) {
    return syncMemberConsent(Object.assign({}, options, { prompt: true })).then(function (result) {
      return !(result && result.reconsented === false);
    }, function () { return true; });
  }

  function watchSignedIn(auth, onSession) {
    if (!auth || auth.watching || !auth.client || !auth.client.auth || !auth.client.auth.onAuthStateChange) return;
    auth.watching = true;
    auth.client.auth.onAuthStateChange(function (_event, session) {
      if (!session || !session.access_token) return;
      auth.session = session;
      if (typeof onSession === 'function') onSession(session);
    });
  }

  function isSharedProfileComplete(profile) {
    var birth = (profile && profile.birth) || {};
    var hasCore = Boolean(profile && profile.name && birth.year && birth.month && birth.day);
    if (!hasCore) return false;
    // If birth time is marked known, require hour (0 is valid).
    if (profile.birthTimeKnown) {
      return Number.isFinite(Number(birth.hour));
    }
    return true;
  }

  global.UMSHAuthSession = {
    DEVICE_KEY: DEVICE_KEY,
    DEVICE_MS: DEVICE_MS,
    createClient: createClient,
    trackSignupIfNew: trackSignupIfNew,
    rememberDeviceAuthSession: rememberDeviceAuthSession,
    enforceDeviceAuthSession: enforceDeviceAuthSession,
    clearDeviceAuthSession: clearDeviceAuthSession,
    isSharedProfileComplete: isSharedProfileComplete,
    waitForRuntime: waitForRuntime,
    resolveLiveSession: resolveLiveSession,
    bindServiceSession: bindServiceSession,
    watchSignedIn: watchSignedIn,
    ensureGuestSession: ensureGuestSession,
    claimGuestNow: claimGuestNow,
    isGuestSession: isGuestSession,
    isMemberSession: isMemberSession,
    purgeGuest: purgeGuest,
    guestAwareStorage: guestAwareStorage,
    GUEST_IDLE_MS: GUEST_IDLE_MS,
    deviceId: deviceId,
    currentGuestToken: currentGuestToken,
    currentMemberToken: currentMemberToken,
    recordGuestVisit: recordGuestVisit,
    syncMemberConsent: syncMemberConsent,
    ensureMemberConsent: ensureMemberConsent,
  };

  try { sweepGuestResidue(); } catch (_error) { /* 저장소가 막힌 브라우저 */ }
  // 로그인에서 돌아온 페이지: 회원 세션이 저장되는 데 시간이 걸릴 수 있어 두 번 살핀다.
  // 결과 옮기기 확인이 먼저 끝나야 동의 시트가 그 위에 겹치지 않는다.
  if (typeof fetch === 'function' && global.document) {
    var afterClaim = function () { return syncMemberConsent(); };
    setTimeout(function () { claimGuestNow().then(afterClaim, afterClaim); }, 1500);
    setTimeout(function () { claimGuestNow().then(afterClaim, afterClaim); }, 5000);
  }
})(typeof window !== 'undefined' ? window : globalThis);
