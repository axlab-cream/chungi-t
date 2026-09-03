(function attachUmshCheckout(global) {
  'use strict';

  async function loadConfig() {
    try {
      return await fetch('/api/payment/config').then((response) => response.json());
    } catch (_error) {
      return null;
    }
  }

  /**
   * Sends the reader to the real checkout for `productKey`, bound to `reportId` so the
   * resulting order unlocks exactly this reading. Resolves with started:false when
   * checkout is not live yet, so a caller can keep whatever it already does in that case.
   */
  async function start(options) {
    const settings = options || {};
    const productKey = String(settings.productKey || '');
    if (!productKey) return { started: false, reason: 'no-product', message: '' };

    const config = await loadConfig();
    if (!config) return { started: false, reason: 'unreachable', message: '' };
    if (!config.checkoutEnabled) {
      return { started: false, reason: 'not-configured', message: config.setupMessage || '' };
    }

    const reportId = String(settings.reportId || '');
    const returnTo = String(settings.returnTo || global.location.pathname);
    const params = new URLSearchParams({ product: productKey, returnTo });
    if (reportId) params.set('reportId', reportId);
    global.UMSHPaymentBridge?.save(productKey, { reportId }, returnTo);
    global.location.assign('/payment?' + params.toString());
    return { started: true, reason: 'redirect', message: '' };
  }

  /** Reads the ?paid=1&orderId=... marker the payment result page sends readers back with. */
  function paidReturn() {
    const params = new URLSearchParams(global.location.search);
    if (params.get('paid') !== '1') return null;
    return { orderId: params.get('orderId') || '', reportId: params.get('reportId') || '' };
  }

  /** Marks the order as read and clears the payment params from the address bar. */
  async function finish(headers) {
    const info = paidReturn();
    if (!info) return null;
    if (info.orderId) {
      await fetch('/api/payment/orders/' + encodeURIComponent(info.orderId) + '/viewed', {
        method: 'POST',
        headers: headers || {},
      }).catch(() => undefined);
    }
    global.UMSHPaymentBridge?.clear();
    const clean = new URLSearchParams(global.location.search);
    clean.delete('paid');
    clean.delete('orderId');
    const query = clean.toString();
    global.history.replaceState(
      null,
      '',
      global.location.pathname + (query ? '?' + query : '') + global.location.hash,
    );
    return info;
  }

  global.UMSHCheckout = Object.freeze({ start, finish, paidReturn });
})(window);
