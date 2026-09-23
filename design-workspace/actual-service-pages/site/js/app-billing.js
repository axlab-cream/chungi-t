/**
 * 앱 안에서의 결제. 구글플레이 인앱 결제를 쓴다.
 *
 * 안드로이드 앱에서 디지털 콘텐츠를 팔 때 Play 결제를 쓰는 것은 정책 요구사항이다.
 * 웹에서는 이 파일이 아무것도 하지 않고 기존 이니시스 결제가 그대로 돌아간다.
 *
 * 플러그인 JS 를 이 사이트에 번들하지 않는다. Capacitor 셸이 원격 페이지에 브리지를
 * 주입하므로 window.Capacitor.Plugins.NativePurchases 로 바로 부를 수 있다.
 *
 * 순서를 지키는 이유:
 *   결제 → 서버 검증 → 소비(consume)
 * 소비를 먼저 하면 검증이 실패했을 때 되돌릴 수 없고, 소비를 아예 안 하면 같은 상품을
 * 다시 살 수 없다. 서버가 검증 단계에서 확인 통보까지 하므로, 중간에 앱이 죽어도
 * 구글이 3일 뒤 자동 환불하는 일은 생기지 않는다.
 */
(function (global) {
  'use strict';

  function plugin() {
    var bridge = global.Capacitor;
    return (bridge && bridge.Plugins && bridge.Plugins.NativePurchases) || null;
  }

  /** 앱 셸 안에서 결제 플러그인까지 붙어 있을 때만 참이다. */
  function isAvailable() {
    var bridge = global.Capacitor;
    if (!bridge || typeof bridge.isNativePlatform !== 'function') return false;
    if (!bridge.isNativePlatform()) return false;
    return plugin() !== null;
  }

  async function callJson(path, options) {
    var init = options || {};
    var response = await fetch(path, {
      method: init.method || 'GET',
      // 인증 헤더는 호출한 화면이 넘긴다. 세션을 들고 있는 쪽이 그 화면이다.
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        (init.authHeaders && init.authHeaders()) || {},
        init.headers || {}
      ),
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw Object.assign(new Error(payload.error || '요청을 처리하지 못했습니다.'), {
        status: response.status,
        code: payload.code,
        payload: payload,
      });
    }
    return payload;
  }

  /**
   * 이미 만들어진 주문을 구글플레이 결제로 결제한다.
   *
   * @param {{ orderId: string, productKey: string, onStatus?: (text: string) => void }} params
   * @returns {Promise<{ order: object }>} 서버가 확인한 주문
   */
  async function payOrder(params) {
    var native = plugin();
    if (!native) throw new Error('앱 결제를 사용할 수 없습니다.');
    var say = params.onStatus || function () {};

    var support = await native.isBillingSupported().catch(function () { return { isBillingSupported: false }; });
    if (!support || support.isBillingSupported === false) {
      throw new Error('이 기기에서는 구글플레이 결제를 사용할 수 없습니다.');
    }

    say('결제 정보를 확인하고 있습니다.');
    var product = await callJson('/api/payment/google/product/' + encodeURIComponent(params.productKey), {
      authHeaders: params.authHeaders,
    });
    if (!product.configured) throw new Error('앱 결제가 아직 준비되지 않았습니다.');

    say('구글플레이 결제창을 여는 중입니다.');
    var transaction = await native.purchaseProduct({
      productIdentifier: product.productId,
      productType: 'inapp',
      // 소비와 확인 통보를 플러그인에 맡기지 않는다. 서버가 검증한 뒤에만 처리한다.
      isConsumable: false,
      autoAcknowledgePurchases: false,
      // 구글의 ObfuscatedAccountId 로 들어간다. 서버가 같은 값을 다시 계산해 대조한다.
      appAccountToken: product.obfuscatedAccountId,
    });
    var purchaseToken = transaction && transaction.purchaseToken;
    if (!purchaseToken) throw new Error('결제 정보를 받지 못했습니다. 결제 내역을 확인해 주세요.');

    say('결제를 확인하고 있습니다.');
    var confirmed = await callJson('/api/payment/google/verify', {
      method: 'POST',
      authHeaders: params.authHeaders,
      body: { orderId: params.orderId, productId: product.productId, purchaseToken: purchaseToken },
    });

    // 여기서 소비해야 같은 상품을 다음에 다시 살 수 있다. 소비는 확인 통보도 함께 한다.
    // 실패해도 열람 권한은 이미 서버에 저장되었으므로 사용자를 막지 않는다.
    try {
      await native.consumePurchase({ purchaseToken: purchaseToken });
    } catch (error) {
      if (global.console && global.console.warn) {
        global.console.warn('[umsh] 결제 소비 처리를 마치지 못했습니다.', error);
      }
    }
    return confirmed;
  }

  /**
   * 앱을 지웠다 다시 깔았거나 결제 도중 끊긴 건을 다시 확인한다.
   * 결제는 새로 하지 않고, 남아 있는 결제만 서버에 다시 물어본다.
   */
  async function recoverPending(params) {
    var native = plugin();
    if (!native || typeof native.getPurchases !== 'function') return [];
    var result = await native.getPurchases().catch(function () { return null; });
    var purchases = (result && result.purchases) || [];
    var recovered = [];
    for (var index = 0; index < purchases.length; index += 1) {
      var item = purchases[index];
      if (!item || !item.purchaseToken || !params || !params.orderId) continue;
      try {
        var confirmed = await callJson('/api/payment/google/verify', {
          method: 'POST',
          authHeaders: params.authHeaders,
          body: {
            orderId: params.orderId,
            productId: item.productIdentifier,
            purchaseToken: item.purchaseToken,
          },
        });
        recovered.push(confirmed);
        await native.consumePurchase({ purchaseToken: item.purchaseToken }).catch(function () {});
      } catch (error) {
        // 이 주문과 무관한 결제이거나 이미 쓰인 결제다. 다음 것을 본다.
      }
    }
    return recovered;
  }

  global.UMSHAppBilling = {
    isAvailable: isAvailable,
    payOrder: payOrder,
    recoverPending: recoverPending,
  };
})(window);
