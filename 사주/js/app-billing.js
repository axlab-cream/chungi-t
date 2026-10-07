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

  var PENDING_MESSAGE = '결제가 아직 완료되지 않았습니다. 결제가 끝난 뒤 이 화면을 다시 열면 자동으로 반영됩니다.';

  /**
   * 플러그인 오류를 화면에 보일 문장으로 바꾼다.
   *
   * 플러그인은 취소와 실패를 똑같이 영어 문장("Purchase is not purchased")으로 돌려준다.
   * 대기 결제("Purchase is pending")만 따로 구분된다.
   */
  function purchaseError(error) {
    var message = String((error && (error.message || error.errorMessage)) || error || '');
    if (/pending/i.test(message)) return new Error(PENDING_MESSAGE);
    return new Error('결제가 완료되지 않았습니다. 취소하셨다면 다시 시도해 주세요.');
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
    var transaction;
    try {
      transaction = await native.purchaseProduct({
        productIdentifier: product.productId,
        productType: 'inapp',
        // 소비와 확인 통보를 플러그인에 맡기지 않는다. 서버가 검증한 뒤에만 처리한다.
        isConsumable: false,
        autoAcknowledgePurchases: false,
        // 구글의 ObfuscatedAccountId 로 들어간다. 서버가 같은 값을 다시 계산해 대조한다.
        appAccountToken: product.obfuscatedAccountId,
      });
    } catch (error) {
      throw purchaseError(error);
    }
    var purchaseToken = transaction && transaction.purchaseToken;
    if (!purchaseToken) throw new Error('결제 정보를 받지 못했습니다. 결제 내역을 확인해 주세요.');

    say('결제를 확인하고 있습니다.');
    var confirmed = await callJson('/api/payment/google/verify', {
      method: 'POST',
      authHeaders: params.authHeaders,
      body: { orderId: params.orderId, productId: product.productId, purchaseToken: purchaseToken },
    });
    // 202 도 응답은 성공이다. 대기 결제를 소비하면 안 되고, 결과 화면으로 넘겨도 안 된다.
    // 결제가 끝나면 다음에 결제 화면을 열 때 recoverPending 이 마저 연다.
    if (confirmed && confirmed.code === 'PAYMENT_PENDING') throw new Error(PENDING_MESSAGE);

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
   * 결제 도중 끊긴 건을 다시 확인한다.
   *
   * 구글 결제가 끝난 직후 앱이 꺼지면 서버 확인을 못 해 리포트가 열리지 않는다. 그 결제는
   * 소비되지 않은 채 기기에 남는다. 결제 화면을 열 때마다 남은 결제를 서버에 보내고,
   * 서버가 연 것만 소비한다. 서버가 거절한 결제는 소비하지 않는다. 확인 통보가 없으면
   * 구글이 3일 뒤 자동 환불한다.
   *
   * @returns {Promise<object[]>} 이번에 열린 주문
   */
  async function recoverPending(params) {
    var native = plugin();
    if (!native || typeof native.getPurchases !== 'function') return [];
    var result = await native.getPurchases({ productType: 'inapp' }).catch(function () { return null; });
    var purchases = (result && result.purchases) || [];
    var recovered = [];
    for (var index = 0; index < purchases.length; index += 1) {
      var item = purchases[index];
      // Android Billing 의 PURCHASED 는 1, PENDING 은 2 다. 대기 결제는 끝날 때까지 둔다.
      if (!item || !item.purchaseToken || !item.productIdentifier || String(item.purchaseState) !== '1') continue;
      try {
        var confirmed = await callJson('/api/payment/google/recover', {
          method: 'POST',
          authHeaders: params && params.authHeaders,
          body: { productId: item.productIdentifier, purchaseToken: item.purchaseToken },
        });
        if (!confirmed || !confirmed.order) continue;
        await native.consumePurchase({ purchaseToken: item.purchaseToken }).catch(function () {});
        if (!confirmed.alreadyPaid) recovered.push(confirmed.order);
      } catch (error) {
        // 이 계정 결제가 아니거나 열 주문이 없다. 소비하지 않고 다음 것을 본다.
      }
    }
    return recovered;
  }

  /**
   * 구글플레이에 등록된 가격 문자열(예: "24,900원").
   *
   * 앱 안에서는 실제로 청구되는 금액이 Play Console 가격이다. 화면 가격을 여기서 받아 오면
   * 가격을 바꿀 때 Play Console 만 고쳐도 앱 화면이 맞춰진다. 못 받으면 null 을 돌려주고,
   * 화면은 원래 카탈로그 가격을 그대로 보여 준다.
   */
  async function priceText(productKey) {
    var native = plugin();
    if (!native || typeof native.getProducts !== 'function' || !productKey) return null;
    try {
      var result = await native.getProducts({ productIdentifiers: [productKey], productType: 'inapp' });
      var products = (result && result.products) || [];
      for (var index = 0; index < products.length; index += 1) {
        var item = products[index];
        if (!item || item.identifier !== productKey) continue;
        // 원화는 웹과 같은 모양("24,900원")으로 맞춘다. 다른 통화는 구글 표기를 그대로 쓴다.
        if (item.currencyCode === 'KRW' && Number.isFinite(Number(item.price))) {
          return Math.round(Number(item.price)).toLocaleString('ko-KR') + '원';
        }
        if (item.priceString) return String(item.priceString);
      }
    } catch (error) {
      // Play 에 상품이 없거나 결제 서비스에 닿지 못했다. 카탈로그 가격을 쓴다.
    }
    return null;
  }

  global.UMSHAppBilling = {
    isAvailable: isAvailable,
    payOrder: payOrder,
    recoverPending: recoverPending,
    priceText: priceText,
  };
})(window);
