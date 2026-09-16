(function attachPaymentPage(global) {
  'use strict';

  const query = new URLSearchParams(global.location.search);
  // 서버가 만드는 결제 주소는 `product=` 를 쓰지만, 각 서비스의 CTA 폴백은
  // `/payment?service=<키>` 로 보낸다. HTML 시드는 `save`처럼 카탈로그와 다른
  // 이름을 쓴다. 한쪽만 읽거나 별칭을 무시하면 상품 확인에서 막힌다.
  const rawProductKey = query.get('product') || query.get('service') || query.get('service_key') || query.get('productKey') || '';
  const reportId = query.get('reportId') || '';
  const returnTo = query.get('returnTo') || '';
  const form = document.querySelector('#payment-form');
  const status = document.querySelector('[data-payment-status]');
  const button = document.querySelector('[data-pay-button]');
  const sendForm = document.querySelector('#SendPayForm');
  let paymentConfig = null;
  let authClient = null;
  let session = null;
  let product = null;

  function isMobileWeb() {
    return Boolean(global.navigator?.userAgentData?.mobile)
      || /Android|iPhone|iPad|iPod|Mobile/i.test(global.navigator?.userAgent || '');
  }

  function canonicalProductKey(raw, config) {
    const value = String(raw || '').trim();
    const aliases = config?.aliases || {};
    if (value && (config?.catalog || []).some((item) => item.key === value)) return value;
    if (value && aliases[value]) return aliases[value];
    const prefixes = Array.isArray(config?.pathPrefixes) ? config.pathPrefixes : [];
    let pathname = '';
    try {
      pathname = returnTo ? new URL(returnTo, global.location.origin).pathname : '';
    } catch {
      pathname = String(returnTo || '').split('?')[0];
    }
    if (!pathname) {
      try {
        const referrer = global.document?.referrer || '';
        if (referrer) pathname = new URL(referrer, global.location.origin).pathname;
      } catch {
        pathname = '';
      }
    }
    const byPath = prefixes.find((entry) => {
      const prefix = entry && entry[0];
      return prefix && (pathname === prefix || pathname.indexOf(prefix + '/') === 0);
    });
    return (byPath && byPath[1]) || aliases[value] || value;
  }

  function findCatalogProduct(key, config) {
    return (config?.catalog || []).find((item) => item.key === key) || null;
  }

  function setStatus(message) {
    if (status) status.textContent = message || '';
  }

  function safeLocalReturnPath(value) {
    if (!value) return '';
    try {
      const target = new URL(value, global.location.origin);
      if (target.origin !== global.location.origin) return '';
      return `${target.pathname}${target.search}${target.hash}`;
    } catch {
      return '';
    }
  }

  function returnAfterPaymentClose() {
    const target = safeLocalReturnPath(returnTo)
      || safeLocalReturnPath(product?.returnPath)
      || '/';
    global.location.replace(target);
  }

  global.addEventListener('message', (event) => {
    if (event.origin !== global.location.origin) return;
    if (event.data?.type !== 'umsh:payment-closed') return;
    returnAfterPaymentClose();
  });

  function setProduct(next) {
    product = next;
    document.querySelector('[data-product-eyebrow]').textContent = next.eyebrow;
    document.querySelector('[data-product-title]').textContent = next.title;
    document.querySelector('[data-product-summary]').textContent = next.summary;
    document.querySelector('[data-product-price]').textContent = `${Number(next.amount).toLocaleString('ko-KR')}원`;
  }

  function openLogin() {
    const returnTo = `${global.location.pathname}${global.location.search}`;
    const href = window.UMSHCommonAuth?.commonLoginUrl('payment', returnTo)
      || `/signup?entry=payment&returnTo=${encodeURIComponent(returnTo)}#login`;
    global.location.replace(href);
  }

  function authHeaders() {
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  async function loadScript(url) {
    if (global.INIStdPay) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error('이니시스 결제창을 불러오지 못했습니다.'));
      document.head.appendChild(script);
    });
  }

  async function initAuth() {
    const authConfig = await fetch('/api/auth/config').then((response) => response.json());
    if (!authConfig.enabled || !global.supabase?.createClient) {
      openLogin();
      return;
    }
    authClient = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: global.localStorage } });
    const result = await authClient.auth.getSession();
    session = result.data.session;
    if (!session) openLogin();
    authClient.auth.onAuthStateChange((_event, nextSession) => { session = nextSession; });
  }

  function fillInicisForm(fields) {
    sendForm.innerHTML = Object.entries(fields).map(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = String(value ?? '');
      return input.outerHTML;
    }).join('');
  }

  function openTestPopup() {
    const width = 460;
    const height = 700;
    const left = Math.max(0, Math.round((global.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((global.screen.availHeight - height) / 2));
    return global.open('about:blank', 'umsh-payment-test', `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
  }

  async function startPayment(event) {
    event.preventDefault();
    if (!form.reportValidity() || !paymentConfig?.checkoutEnabled || !product || !session) return;
    const testPopup = paymentConfig.testMode ? openTestPopup() : null;
    if (paymentConfig.testMode && !testPopup) {
      setStatus('브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.');
      return;
    }
    button.disabled = true;
    setStatus('결제 주문을 확인하고 있습니다.');
    try {
      const response = await fetch('/api/payment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          productKey: product.key,
          reportId,
          buyerEmail: form.buyerEmail.value.trim(),
          buyerTel: form.buyerTel.value.trim(),
          paymentMode: isMobileWeb() ? 'mobile' : 'pc',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(payload.error || '결제 주문을 만들지 못했습니다.'), { code: payload.code });
      if (paymentConfig.testMode) {
        testPopup.location.replace(`/payment/test?orderId=${encodeURIComponent(payload.order.orderId)}`);
        setStatus('테스트 결제창을 열었습니다. 팝업에서 승인해 주세요.');
        return;
      }
      // 앱 안에서는 구글플레이 결제를 쓴다. 안드로이드 앱에서 디지털 콘텐츠를 팔 때
      // Play 결제를 쓰는 것은 정책 요구사항이다. 웹은 그대로 이니시스로 간다.
      if (global.UMSHAppBilling?.isAvailable()) {
        await global.UMSHAppBilling.payOrder({
          orderId: payload.order.orderId,
          productKey: product.key,
          authHeaders,
          onStatus: setStatus,
        });
        // 이니시스와 같은 착지점으로 보낸다. 이후 복귀 흐름을 한 갈래로 유지한다.
        global.location.replace(`/payment/result?orderId=${encodeURIComponent(payload.order.orderId)}`);
        return;
      }
      fillInicisForm(payload.fields);
      if (payload.paymentMode === 'mobile') {
        if (!payload.actionUrl) throw new Error('모바일 결제 주소를 확인하지 못했습니다.');
        sendForm.action = payload.actionUrl;
        sendForm.method = 'post';
        sendForm.acceptCharset = 'EUC-KR';
        sendForm.target = '_self';
        setStatus('이니시스 모바일 결제창으로 이동합니다.');
        sendForm.submit();
        return;
      }
      await loadScript(paymentConfig.scriptUrl);
      setStatus('이니시스 결제창을 여는 중입니다.');
      global.INIStdPay.pay(sendForm);
    } catch (error) {
      setStatus(error.code === 'PROFILE_REQUIRED' ? '결제 전에 사주 프로필을 먼저 등록해 주세요.' : error.message);
      button.disabled = false;
    }
  }

  async function init() {
    // Keep the caller's own return path across the PG round-trip, so a reader lands back
    // on the exact step they left instead of the product's generic entry page.
    paymentConfig = await fetch('/api/payment/config').then((response) => response.json());
    const productKey = canonicalProductKey(rawProductKey, paymentConfig);
    if (returnTo) global.UMSHPaymentBridge?.save(productKey || rawProductKey, { reportId }, returnTo);
    product = findCatalogProduct(productKey, paymentConfig);
    if (!product) {
      if ((paymentConfig.pausedKeys || []).includes(productKey)) {
        setStatus('현재 공개하지 않는 서비스입니다.');
        return;
      }
      setStatus('상품 정보를 확인하지 못했습니다. 홈에서 다시 선택해 주세요.');
      return;
    }
    setProduct(product);
    if (!paymentConfig.checkoutEnabled) {
      setStatus(paymentConfig.setupMessage || '결제 모듈 준비 중입니다.');
      return;
    }
    await initAuth();
    if (!session) return;
    form.buyerEmail.value = session.user?.email || '';
    if (paymentConfig.testMode) {
      button.textContent = '테스트 결제창 열기';
      setStatus('개발 환경 테스트 모드입니다. 실제 결제는 발생하지 않습니다.');
    }
    button.disabled = false;
    form.addEventListener('submit', startPayment);
    if (!paymentConfig.testMode) setStatus('결제 정보를 입력하면 안전한 결제창으로 이동합니다.');
  }

  init().catch((error) => setStatus(error.message || '결제 화면을 불러오지 못했습니다.'));
})(window);
