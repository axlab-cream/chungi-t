(function attachPaymentBridge(global) {
  'use strict';

  const STORAGE_KEY = 'umsh_pending_payment_request_v1';

  function normalizePath(value) {
    const raw = String(value || '').trim();
    if (!raw.startsWith('/') || raw.startsWith('//')) return '';
    try {
      const url = new URL(raw, global.location.origin);
      if (url.origin !== global.location.origin || /^\/payment(?:\/|$)/i.test(url.pathname)) return '';
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_error) {
      return '';
    }
  }

  function save(productKey, payload, returnTo) {
    const target = normalizePath(returnTo) || `${global.location.pathname}${global.location.search}`;
    const value = { productKey: String(productKey || ''), payload, returnTo: target, savedAt: Date.now() };
    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (_error) {
      return false;
    }
    return true;
  }

  function load(productKey) {
    try {
      const value = JSON.parse(global.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || value.productKey !== productKey || Date.now() - Number(value.savedAt || 0) > 30 * 60 * 1000) return null;
      return value;
    } catch (_error) {
      return null;
    }
  }

  function clear() {
    try {
      global.sessionStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Storage can be unavailable in embedded browser surfaces.
    }
  }

  global.UMSHPaymentBridge = Object.freeze({ save, load, clear, STORAGE_KEY });
})(window);
