(function attachCommonAuthReturn(global) {
  'use strict';

  const STORAGE_KEY = 'umsh_common_auth_return_to_v1';
  const SIGNUP_PATH = /^\/signup(?:\/|\.html)?$/i;

  function currentOrigin(explicitOrigin) {
    return String(explicitOrigin || global.location?.origin || '').trim();
  }

  function normalizeReturnTo(value, explicitOrigin) {
    const origin = currentOrigin(explicitOrigin);
    const raw = String(value || '').trim();
    if (!origin || !raw.startsWith('/') || raw.startsWith('//')) return '';

    try {
      const url = new URL(raw, origin);
      if (url.origin !== origin || SIGNUP_PATH.test(url.pathname)) return '';
      url.searchParams.delete('authReturn');
      url.searchParams.delete('signupReturn');
      if (/(?:access_token|refresh_token|error_description)=/i.test(url.hash)) {
        url.hash = '';
      }
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_error) {
      return '';
    }
  }

  function rememberReturnTo(value, explicitOrigin) {
    const target = normalizeReturnTo(value, explicitOrigin);
    if (!target) return '';
    try {
      global.sessionStorage?.setItem(STORAGE_KEY, target);
    } catch (_error) {
      // OAuth can still continue with the returnTo query when storage is unavailable.
    }
    return target;
  }

  function storedReturnTo(explicitOrigin) {
    try {
      return normalizeReturnTo(global.sessionStorage?.getItem(STORAGE_KEY), explicitOrigin);
    } catch (_error) {
      return '';
    }
  }

  function resolveReturnTo(value, explicitOrigin) {
    return rememberReturnTo(value, explicitOrigin) || storedReturnTo(explicitOrigin);
  }

  function currentPageReturnTo(locationLike = global.location) {
    if (!locationLike?.href) return '';
    try {
      const url = new URL(locationLike.href);
      url.searchParams.delete('authReturn');
      url.searchParams.delete('signupReturn');
      return normalizeReturnTo(`${url.pathname}${url.search}${url.hash}`, url.origin);
    } catch (_error) {
      return '';
    }
  }

  function commonLoginUrl(entry, returnTo, explicitOrigin) {
    const origin = currentOrigin(explicitOrigin);
    const target = rememberReturnTo(returnTo, origin) || currentPageReturnTo();
    const url = new URL('/signup', origin);
    if (entry) url.searchParams.set('entry', String(entry));
    if (target) url.searchParams.set('returnTo', target);
    url.hash = 'login';
    return url.toString();
  }

  function oauthReturnUrl(entry, returnTo, explicitOrigin) {
    const origin = currentOrigin(explicitOrigin);
    const target = resolveReturnTo(returnTo, origin);
    const url = new URL('/signup', origin);
    url.searchParams.set('signupReturn', '1');
    if (entry) url.searchParams.set('entry', String(entry));
    if (target) url.searchParams.set('returnTo', target);
    url.hash = 'login';
    return url.toString();
  }

  function clearReturnTo() {
    try {
      global.sessionStorage?.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Nothing else is required when storage is unavailable.
    }
  }

  global.UMSHCommonAuth = Object.freeze({
    STORAGE_KEY,
    normalizeReturnTo,
    rememberReturnTo,
    resolveReturnTo,
    currentPageReturnTo,
    commonLoginUrl,
    oauthReturnUrl,
    clearReturnTo,
  });
})(window);
