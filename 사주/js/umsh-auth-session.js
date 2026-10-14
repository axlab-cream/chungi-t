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
    isGuestSession: isGuestSession,
    isMemberSession: isMemberSession,
    purgeGuest: purgeGuest,
    guestAwareStorage: guestAwareStorage,
    GUEST_IDLE_MS: GUEST_IDLE_MS,
  };

  try { sweepGuestResidue(); } catch (_error) { /* 저장소가 막힌 브라우저 */ }
})(typeof window !== 'undefined' ? window : globalThis);
