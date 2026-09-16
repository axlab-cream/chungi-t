(function (global) {
  'use strict';

  var DEVICE_KEY = 'cheongi_auth_device_session_started_at_v1';
  var DEVICE_MS = 30 * 24 * 60 * 60 * 1000;

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

  function rememberDeviceAuthSession(session) {
    if (!session || !session.access_token) {
      clearDeviceAuthSession();
      return 0;
    }
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
        storage: global.localStorage,
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
    rememberDeviceAuthSession: rememberDeviceAuthSession,
    enforceDeviceAuthSession: enforceDeviceAuthSession,
    clearDeviceAuthSession: clearDeviceAuthSession,
    isSharedProfileComplete: isSharedProfileComplete,
    waitForRuntime: waitForRuntime,
    resolveLiveSession: resolveLiveSession,
    bindServiceSession: bindServiceSession,
    watchSignedIn: watchSignedIn,
  };
})(typeof window !== 'undefined' ? window : globalThis);
