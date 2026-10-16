/**
 * 결제 바텀시트 (2026-10-15, 대표 결정). 결과 화면을 뒤에 둔 채 아래에서 올라와 바로 결제한다.
 * 이전에는 "운명 거래하기 → 결제 안내 화면(동의·결제하기) → /payment(이메일·휴대폰·동의) → 이니시스"로
 * 동의를 세 번 받았다. 약관 동의는 로그인·운명 거래하기 때 이미 받으므로 여기서는 결제 안내 한 줄만 둔다.
 *
 * 서버 규칙은 /payment 와 같다(주문 생성 POST /api/payment/orders, 이미 결제 확인, 쿠폰). 그대로 쓰기 어려운 두 경우는
 * /payment 화면으로 넘긴다: 안드로이드 앱(구글플레이 결제)과 무료 이용권 쿠폰.
 * 휴대폰 번호는 이니시스가 요구한다. 처음 한 번 받고 이 브라우저에 회원별로 기억한다. 이메일은 로그인 계정 것을 쓴다.
 *
 *   UMSHPaySheet.open({ productKey, reportId, returnTo, session, originLabel, discountLabel, fallbackUrl })
 */
(function attachPaySheet(global) {
  'use strict';

  var TEL_PREFIX = 'umsh_buyer_tel_v1:';
  var CSS = [
    '.umsh-ps-backdrop{position:fixed;inset:0;z-index:9994;background:rgba(6,4,3,.4);opacity:0;transition:opacity .22s ease}',
    '.umsh-ps-backdrop.is-open{opacity:1}',
    '.umsh-ps{position:fixed;left:50%;bottom:0;z-index:9995;box-sizing:border-box;width:100%;max-width:480px;max-height:86vh;max-height:86dvh;overflow:auto;',
    'padding:10px 20px calc(16px + env(safe-area-inset-bottom));border-radius:18px 18px 0 0;border:1px solid rgba(214,178,110,.28);border-bottom:0;',
    'background:#15100d;color:#f6ead6;box-shadow:0 -12px 32px rgba(0,0,0,.42);transform:translate(-50%,105%);transition:transform .26s cubic-bezier(.2,.8,.2,1);',
    'font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;word-break:keep-all;line-height:1.45}',
    '.umsh-ps.is-open{transform:translate(-50%,0)}',
    '.umsh-ps *{box-sizing:border-box}',
    '.umsh-ps-handle{display:block;position:relative;height:22px;margin:-10px -20px 2px;touch-action:none;cursor:grab}.umsh-ps-handle::before{content:"";position:absolute;left:50%;top:10px;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:rgba(246,234,214,.28)}',
    '.umsh-ps-title{touch-action:none}',
    '.umsh-ps-close{position:absolute;top:8px;right:10px;width:36px;height:36px;border:0;background:transparent;color:rgba(246,234,214,.6);font-size:20px;line-height:1;cursor:pointer}',
    '.umsh-ps-title{margin:0 28px 12px 0;font-size:17px;font-weight:700}',
    '.umsh-ps-badge{display:inline-block;margin:0 0 12px;padding:5px 10px;border-radius:999px;background:rgba(232,92,92,.14);color:#ffb3a8;font-size:13px;font-weight:600}',
    '.umsh-ps-product{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:1px solid #d6b26e;border-radius:12px;background:rgba(214,178,110,.07)}',
    '.umsh-ps-product strong{display:block;font-size:15px}',
    '.umsh-ps-product small{display:block;margin-top:2px;font-size:12px;color:rgba(246,234,214,.6)}',
    '.umsh-ps-price{text-align:right;white-space:nowrap}',
    '.umsh-ps-price s{display:block;font-size:12px;color:rgba(246,234,214,.45)}',
    '.umsh-ps-price em{font-style:normal;color:#ff8a7a;font-size:12px;margin-right:4px}',
    '.umsh-ps-price b{font-size:17px}',
    '.umsh-ps-lines{margin:14px 0 0;padding:0;list-style:none;font-size:14px}',
    '.umsh-ps-lines li{display:flex;justify-content:space-between;gap:12px;padding:5px 0;color:rgba(246,234,214,.78)}',
    '.umsh-ps-lines li[hidden]{display:none}',
    '.umsh-ps-lines li.is-total{margin-top:6px;padding-top:12px;border-top:1px solid rgba(246,234,214,.14);color:#f6ead6;font-weight:700;font-size:15px}',
    '.umsh-ps-lines li.is-discount span:last-child{color:#ff8a7a}',
    '.umsh-ps-field{display:block;margin:14px 0 0;font-size:13px;color:rgba(246,234,214,.78)}',
    '.umsh-ps-field input,.umsh-ps-field select{display:block;width:100%;margin-top:6px;min-height:44px;padding:0 12px;border:1px solid rgba(246,234,214,.22);border-radius:10px;background:#f8f3ea;color:#15100d;font:inherit;font-size:15px}',
    '.umsh-ps-field small{display:block;margin-top:4px;color:rgba(246,234,214,.5)}',
    '.umsh-ps-pay{display:block;width:100%;min-height:52px;margin-top:16px;border:0;border-radius:12px;background:#d6b26e;color:#15100d;font:inherit;font-size:16px;font-weight:700;cursor:pointer}',
    '.umsh-ps-pay[disabled]{opacity:.55;cursor:default}',
    '.umsh-ps-note{margin:10px 0 0;font-size:12px;line-height:1.55;color:rgba(246,234,214,.55);text-align:center}',
    '.umsh-ps-note a{color:rgba(246,234,214,.75);text-decoration:underline;text-underline-offset:2px}',
    '.umsh-ps-status{min-height:18px;margin:8px 0 0;font-size:13px;color:#ffcf8a;text-align:center}',
    '.umsh-ps-done{display:block;width:100%;min-height:50px;margin-top:14px;border-radius:12px;background:#d6b26e;color:#15100d;font-size:16px;font-weight:700;text-align:center;line-height:50px;text-decoration:none}',
  ].join('');

  function injectStyle() {
    if (document.getElementById('umsh-ps-style')) return;
    var style = document.createElement('style');
    style.id = 'umsh-ps-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

/**
   * 2026-10-16 손잡이를 아래로 끌어 닫기. 손잡이·제목줄([data-drag-handle])을 잡고 내리면 시트가 손가락을 따라 내려가고,
   * 시트 높이의 1/4(최대 120px) 넘게 내리거나 빠르게 튕기면 닫는다. 덜 내리면 제자리로 돌아간다.
   * 본문은 스크롤해야 하므로 잡는 곳은 위쪽 줄로 한정한다(그 줄에만 touch-action:none).
   */
  function enableDragClose(sheet, onClose) {
    var startY = 0, dy = 0, pointerId = null, lastY = 0, lastAt = 0, speed = 0;
    sheet.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (!event.target.closest('[data-drag-handle]') || event.target.closest('button,a,input,label')) return;
      pointerId = event.pointerId; startY = lastY = event.clientY; lastAt = Date.now(); dy = 0; speed = 0;
      try { sheet.setPointerCapture(pointerId); } catch (_e) { /* 오래된 브라우저 */ }
    });
    sheet.addEventListener('pointermove', function (event) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      var now = Date.now();
      // 손을 떼기 직전 움직임의 속도(px/ms). 빠르게 튕기면 조금만 내려도 닫는다.
      if (now > lastAt) speed = (event.clientY - lastY) / (now - lastAt);
      lastY = event.clientY; lastAt = now;
      dy = Math.max(0, event.clientY - startY);
      sheet.style.transition = 'none';
      sheet.style.transform = 'translate(-50%,' + dy + 'px)';
    });
    function end(event) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      pointerId = null;
      var fast = dy > 30 && speed > 0.5 && Date.now() - lastAt < 120;
      sheet.style.transition = '';
      if (dy > Math.min(120, sheet.offsetHeight * 0.25) || fast) {
        sheet.style.transform = 'translate(-50%,105%)';
        onClose();
      } else {
        sheet.style.transform = '';
      }
    }
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
  }

  function escapeText(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; });
  }
  function won(amount) { return Number(amount || 0).toLocaleString('ko-KR') + '원'; }
  function isMobileWeb() {
    return Boolean(global.navigator && global.navigator.userAgentData && global.navigator.userAgentData.mobile)
      || /Android|iPhone|iPad|iPod|Mobile/i.test((global.navigator && global.navigator.userAgent) || '');
  }
  function safeGet(key) { try { return global.localStorage.getItem(key) || ''; } catch (_e) { return ''; } }
  function safeSet(key, value) { try { global.localStorage.setItem(key, value); } catch (_e) { /* 저장 불가면 다음에 다시 받는다 */ } }
  function normalizeTel(value) { return String(value || '').replace(/[^0-9]/g, ''); }
  function telLooksValid(value) { return /^01[016789][0-9]{7,8}$/.test(normalizeTel(value)); }
  function formatTel(value) {
    var digits = normalizeTel(value);
    if (digits.length === 11) return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);
    if (digits.length === 10) return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
    return digits;
  }

  /** 관리자 구매 퍼널: /payment 화면과 같은 이름으로 남긴다(결제 화면 → 결제창 열기). */
  function trackFunnel(name, productKey) {
    var item = { target: 'funnel:' + name, serviceKey: productKey };
    try {
      if (global.UMSHTrack && global.UMSHTrack.push) global.UMSHTrack.push('cta_click', item);
      else (global.__umshTrackQueue = global.__umshTrackQueue || []).push(item);
    } catch (_e) { /* 측정 실패가 결제를 막지 않는다 */ }
  }

  function loadScript(url) {
    if (global.INIStdPay) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('이니시스 결제창을 불러오지 못했습니다.')); };
      document.head.appendChild(script);
    });
  }

  function couponAmount(amount, item) {
    if (!item) return amount;
    if (item.kind === 'amount_off') return Math.max(1, amount - item.value);
    if (item.kind === 'percent_off') return Math.max(1, amount - Math.floor(amount * item.value / 100));
    return amount;
  }

  /** 결제 완료 화면의 "전체 풀이보기"와 같은 주소(payment.js paidReadingUrl 과 같은 규칙). */
  function paidReadingUrl(product, reportId, orderId) {
    var template = String((product && product.readingPath) || '').trim();
    var params = new URLSearchParams({ paid: '1' });
    if (orderId) params.set('orderId', orderId);
    if (!template) return reportId ? '/r/' + encodeURIComponent(reportId) : '/';
    var hashAt = template.indexOf('#');
    var address = hashAt >= 0 ? template.slice(0, hashAt) : template;
    var hash = hashAt >= 0 ? template.slice(hashAt) : '';
    if (reportId && address.indexOf('reportId=') < 0) params.set('reportId', reportId);
    return address + (address.indexOf('?') >= 0 ? '&' : '?') + params.toString() + hash;
  }

  var current = null;

  function close() {
    if (!current) return;
    var state = current;
    current = null;
    state.sheet.classList.remove('is-open');
    state.backdrop.classList.remove('is-open');
    global.removeEventListener('message', state.onMessage);
    document.removeEventListener('keydown', state.onKey);
    setTimeout(function () { state.sheet.remove(); state.backdrop.remove(); state.form.remove(); }, 280);
  }

  async function open(opts) {
    opts = opts || {};
    var session = opts.session;
    var fallback = opts.fallbackUrl || '/payment';
    // 앱 안에서는 구글플레이 결제(정책 요구)를 쓰는 /payment 로 보낸다.
    if (!session || !session.access_token || (global.UMSHAppBilling && global.UMSHAppBilling.isAvailable && global.UMSHAppBilling.isAvailable())) {
      global.location.assign(fallback);
      return null;
    }
    if (current) close();
    injectStyle();
    var token = session.access_token;
    var userId = session.user && session.user.id || '';
    var authHeaders = { Authorization: 'Bearer ' + token };

    var backdrop = document.createElement('div');
    backdrop.className = 'umsh-ps-backdrop';
    var sheet = document.createElement('section');
    sheet.className = 'umsh-ps';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'umsh-ps-title');
    sheet.innerHTML = '<span class="umsh-ps-handle" data-drag-handle aria-hidden="true"></span>'
      + '<button type="button" class="umsh-ps-close" data-ps-close aria-label="닫기">×</button>'
      + '<p class="umsh-ps-title" id="umsh-ps-title" data-drag-handle>결제 안내</p>'
      + '<div data-ps-body><p class="umsh-ps-status">결제 정보를 확인하는 중입니다.</p></div>';
    var form = document.createElement('form');
    form.id = 'SendPayForm';
    form.style.display = 'none';
    form.method = 'post';
    form.acceptCharset = 'UTF-8';
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    document.body.appendChild(form);
    var state = { sheet: sheet, backdrop: backdrop, form: form };
    state.onKey = function (event) { if (event.key === 'Escape') close(); };
    // PC 이니시스 창을 닫으면 /payment/close 가 알려 준다. 시트는 그대로 두고 다시 누를 수 있게 한다.
    state.onMessage = function (event) {
      if (event.origin !== global.location.origin || !event.data || event.data.type !== 'umsh:payment-closed') return;
      var button = sheet.querySelector('[data-ps-pay]');
      if (button) button.disabled = false;
      setStatus('결제창을 닫았습니다. 다시 결제하려면 버튼을 눌러 주세요.');
    };
    current = state;
    document.addEventListener('keydown', state.onKey);
    global.addEventListener('message', state.onMessage);
    backdrop.addEventListener('click', close);
    enableDragClose(sheet, close);
    sheet.querySelector('[data-ps-close]').addEventListener('click', close);
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('is-open'); backdrop.classList.add('is-open'); }); });

    function body() { return sheet.querySelector('[data-ps-body]'); }
    function setStatus(message) { var node = sheet.querySelector('[data-ps-status]'); if (node) node.textContent = message || ''; }

    var config, product;
    try {
      config = await fetch('/api/payment/config').then(function (response) { return response.json(); });
      product = (config.catalog || []).find(function (item) { return item.key === opts.productKey; }) || null;
    } catch (_e) { config = null; }
    if (state !== current) return null;
    if (!config || !product) { body().innerHTML = '<p class="umsh-ps-status">상품 정보를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>'; return state; }
    if (!config.checkoutEnabled) { body().innerHTML = '<p class="umsh-ps-status">' + escapeText(config.setupMessage || '결제 모듈 준비 중입니다.') + '</p>'; return state; }
    if (global.UMSHAnalytics && global.UMSHAnalytics.beginCheckout) global.UMSHAnalytics.beginCheckout(product);
    trackFunnel('checkout', product.key);

    // 이미 결제한 풀이면 결제 대신 풀이로 안내한다(결제 완료 뒤 뒤로 가기 등).
    if (opts.reportId) {
      try {
        var paidParams = new URLSearchParams({ productKey: product.key, reportId: opts.reportId });
        var paidResponse = await fetch('/api/payment/purchase-status?' + paidParams, { headers: authHeaders, cache: 'no-store' });
        var paid = paidResponse.ok ? await paidResponse.json() : null;
        if (state !== current) return null;
        if (paid && paid.paid) {
          body().innerHTML = '<p class="umsh-ps-status" data-ps-status>이미 결제한 풀이입니다. 다시 결제하지 않아도 됩니다.</p>'
            + '<a class="umsh-ps-done" href="' + escapeText(paidReadingUrl(product, opts.reportId, paid.orderId)) + '">풀이 보기</a>';
          return state;
        }
      } catch (_e) { /* 확인 실패면 서버가 주문 때 한 번 더 막는다 */ }
    }

    var coupons = [];
    try {
      var couponResponse = await fetch('/api/coupons', { headers: authHeaders, cache: 'no-store' });
      var couponPayload = couponResponse.ok ? await couponResponse.json() : { items: [] };
      coupons = (couponPayload.items || []).filter(function (item) {
        if (item.productKey !== product.key || ['service_free', 'amount_off', 'percent_off'].indexOf(item.kind) < 0) return false;
        if (item.reportId && item.reportId !== opts.reportId) return false;
        if (item.orderReportId && item.orderReportId !== opts.reportId) return false;
        if (item.orderStatus && item.orderStatus !== 'ready') return false;
        return item.orderId || item.reportId === opts.reportId || (item.enabled && Date.parse(item.expiresAt) > Date.now());
      });
    } catch (_e) { coupons = []; }
    if (state !== current) return null;

    var amount = Number(product.amount) || 0;
    var originAmount = Number(opts.originAmount) || 0;
    var saved = originAmount > amount ? originAmount - amount : 0;
    var rememberedTel = userId ? safeGet(TEL_PREFIX + userId) : '';
    var email = session.user && session.user.email || '';
    var couponOptions = coupons.map(function (item) {
      var suffix = item.kind === 'service_free' ? '무료 이용' : item.kind === 'percent_off' ? item.value + '% 할인' : Number(item.value).toLocaleString('ko-KR') + '원 할인';
      return '<option value="' + escapeText(item.id) + '">' + escapeText(item.title + ' · ' + suffix) + '</option>';
    }).join('');

    body().innerHTML = (saved ? '<p class="umsh-ps-badge">지금 결제하면 ' + won(saved) + ' 할인</p>' : '')
      + '<div class="umsh-ps-product"><div><strong>' + escapeText(product.title) + '</strong><small>' + escapeText(product.summary || product.eyebrow || '') + '</small></div>'
      + '<div class="umsh-ps-price">' + (saved ? '<s>' + won(originAmount) + '</s><em>' + escapeText(opts.discountLabel || '') + '</em>' : '') + '<b>' + won(amount) + '</b></div></div>'
      + '<ul class="umsh-ps-lines">'
      + (saved ? '<li><span>상품 판매가</span><span>' + won(originAmount) + '</span></li><li class="is-discount"><span>지금 결제 시 할인</span><span>-' + won(saved) + '</span></li>' : '')
      + '<li class="is-discount" data-ps-coupon-line hidden><span>쿠폰 할인</span><span data-ps-coupon-amount></span></li>'
      + '<li class="is-total"><span>최종 결제 금액</span><span data-ps-total>' + won(amount) + '</span></li></ul>'
      + (coupons.length ? '<label class="umsh-ps-field">쿠폰<select data-ps-coupon><option value="">쿠폰 없이 결제</option>' + couponOptions + '</select></label>' : '')
      + (rememberedTel ? '' : '<label class="umsh-ps-field">휴대폰 번호<input type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" data-ps-tel /><small>결제사(이니시스)가 결제 확인에 씁니다. 다음부터는 다시 묻지 않아요.</small></label>')
      + (email ? '' : '<label class="umsh-ps-field">결제 안내 이메일<input type="email" autocomplete="email" placeholder="you@example.com" data-ps-email /></label>')
      + '<button type="button" class="umsh-ps-pay" data-ps-pay>' + (config.testMode ? '테스트 결제하기' : '결제하기') + '</button>'
      + '<p class="umsh-ps-status" data-ps-status></p>'
      + '<p class="umsh-ps-note">결제 정보를 확인했으며 <a href="/terms" target="_blank" rel="noopener">이용약관</a>, <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>, <a href="/refund" target="_blank" rel="noopener">환불·취소 정책</a>에 동의합니다. 디지털 풀이는 열람을 시작하면 결제 취소가 제한됩니다. 카드·카카오페이·네이버페이는 다음 결제창에서 고릅니다.</p>';

    var couponSelect = sheet.querySelector('[data-ps-coupon]');
    var payButton = sheet.querySelector('[data-ps-pay]');
    function selectedCoupon() { return couponSelect ? coupons.find(function (item) { return item.id === couponSelect.value; }) || null : null; }
    function paintCoupon() {
      var item = selectedCoupon();
      var line = sheet.querySelector('[data-ps-coupon-line]');
      var total = couponAmount(amount, item);
      if (line) line.hidden = !item || item.kind === 'service_free';
      var couponText = sheet.querySelector('[data-ps-coupon-amount]');
      if (couponText) couponText.textContent = '-' + won(amount - total);
      sheet.querySelector('[data-ps-total]').textContent = item && item.kind === 'service_free' ? '무료 이용권' : won(total);
      payButton.textContent = item && item.kind === 'service_free' ? '무료 이용권으로 열기' : (config.testMode ? '테스트 결제하기' : '결제하기');
    }
    if (couponSelect) couponSelect.addEventListener('change', paintCoupon);
    var telInput = sheet.querySelector('[data-ps-tel]');
    if (telInput) telInput.addEventListener('blur', function () { if (telLooksValid(telInput.value)) telInput.value = formatTel(telInput.value); });

    payButton.addEventListener('click', async function () {
      var item = selectedCoupon();
      // 무료 이용권은 /payment 의 사용 흐름(이용권 사용 → 풀이 열기)을 그대로 쓴다.
      if (item && item.kind === 'service_free') {
        var free = new URL(fallback, global.location.origin);
        free.searchParams.set('couponId', item.id);
        global.location.assign(free.pathname + free.search);
        return;
      }
      var tel = rememberedTel || (telInput ? telInput.value : '');
      if (!telLooksValid(tel)) { setStatus('휴대폰 번호를 확인해 주세요.'); if (telInput) telInput.focus(); return; }
      var buyerEmail = email || ((sheet.querySelector('[data-ps-email]') || {}).value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) { setStatus('결제 안내 이메일을 확인해 주세요.'); return; }
      if (userId) safeSet(TEL_PREFIX + userId, formatTel(tel));
      if (global.UMSHAnalytics && global.UMSHAnalytics.addPaymentInfo) global.UMSHAnalytics.addPaymentInfo(product, couponAmount(amount, item));
      trackFunnel('pay_open', product.key);
      var testPopup = null;
      if (config.testMode) {
        var width = 460, height = 700;
        testPopup = global.open('about:blank', 'umsh-payment-test', 'popup=yes,width=' + width + ',height=' + height + ',left=' + Math.max(0, Math.round((global.screen.availWidth - width) / 2)) + ',top=' + Math.max(0, Math.round((global.screen.availHeight - height) / 2)));
        if (!testPopup) { setStatus('브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.'); return; }
      }
      payButton.disabled = true;
      setStatus('결제 주문을 확인하고 있습니다.');
      try {
        if (global.UMSHPaymentBridge && opts.returnTo) global.UMSHPaymentBridge.save(product.key, { reportId: opts.reportId || '' }, opts.returnTo);
        var response = await fetch('/api/payment/orders', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
          body: JSON.stringify({
            productKey: product.key,
            couponId: item ? item.id : undefined,
            billingProvider: 'web',
            reportId: opts.reportId || undefined,
            buyerEmail: buyerEmail,
            buyerTel: formatTel(tel),
            paymentMode: isMobileWeb() ? 'mobile' : 'pc',
          }),
        });
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok) throw Object.assign(new Error(payload.error || '결제 주문을 만들지 못했습니다.'), { code: payload.code, orderId: payload.orderId });
        if (config.testMode) {
          testPopup.location.replace('/payment/test?orderId=' + encodeURIComponent(payload.order.orderId));
          setStatus('테스트 결제창을 열었습니다. 팝업에서 승인해 주세요.');
          return;
        }
        form.innerHTML = Object.keys(payload.fields || {}).map(function (name) {
          var input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = String(payload.fields[name] == null ? '' : payload.fields[name]);
          return input.outerHTML;
        }).join('');
        if (payload.paymentMode === 'mobile') {
          if (!payload.actionUrl) throw new Error('모바일 결제 주소를 확인하지 못했습니다.');
          form.action = payload.actionUrl;
          form.acceptCharset = 'EUC-KR';
          form.target = '_self';
          setStatus('이니시스 모바일 결제창으로 이동합니다.');
          form.submit();
          return;
        }
        await loadScript(config.scriptUrl);
        setStatus('이니시스 결제창을 여는 중입니다.');
        global.INIStdPay.pay(form);
      } catch (error) {
        if (testPopup) testPopup.close();
        if (error.code === 'ALREADY_PAID') {
          body().innerHTML = '<p class="umsh-ps-status" data-ps-status>이미 결제한 풀이입니다. 다시 결제하지 않아도 됩니다.</p>'
            + '<a class="umsh-ps-done" href="' + escapeText(paidReadingUrl(product, opts.reportId, error.orderId)) + '">풀이 보기</a>';
          return;
        }
        setStatus(error.code === 'PROFILE_REQUIRED' ? '결제 전에 사주 정보를 먼저 저장해 주세요.' : (error.message || '결제를 시작하지 못했습니다.'));
        payButton.disabled = false;
      }
    });
    return state;
  }

  global.UMSHPaySheet = { open: open, close: close };
})(window);
