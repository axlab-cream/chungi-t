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

  function createClient(supabaseGlobal, url, publishableKey) {
    if (!supabaseGlobal || !supabaseGlobal.createClient) return null;
    return supabaseGlobal.createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: global.localStorage,
      },
    });
  }

  async function enforceDeviceAuthSession(session, client) {
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
