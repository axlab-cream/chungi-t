(function renderPaymentResult(global) {
  'use strict';

  const query = new URLSearchParams(global.location.search);
  const result = document.querySelector('[data-result]');
  const productKey = query.get('product') || '';
  const state = query.get('state') || 'failed';
  const orderId = query.get('orderId') || '';
  const reportId = query.get('reportId') || '';
  const message = query.get('message') || '';

  fetch('/api/payment/config')
    .then((response) => response.json())
    .then(async (config) => {
      const product = config.catalog?.find((item) => item.key === productKey) || config.catalog?.find((item) => item.returnPath === '/');
      if (productKey === 'cheonmyeong_consultation') { await renderConsultationResult(); return; }
      trackPurchase();
      const success = state === 'paid';
      const continueUrl = paidReadingUrl(product, reportId, orderId);
      result.classList.toggle('is-success', success);
      result.innerHTML = `
        <h2>${success ? '결제가 완료됐어요.' : state === 'cancelled' ? '결제를 취소했어요.' : '결제를 완료하지 못했어요.'}</h2>
        <p>${success ? `${product?.title || '선택한 풀이'} 전체 풀이를 확인할 수 있습니다.` : escapeHtml(message || '결제 상태를 다시 확인하거나 고객센터로 문의해 주세요.')}</p>
        ${orderId ? `<p>주문번호 <strong>${escapeHtml(orderId)}</strong></p>` : ''}
        <div class="payment-actions">
          ${success ? `<a class="primary" href="${escapeHtml(continueUrl)}">전체 풀이보기</a>` : '<a class="primary" href="/">운명상회로 돌아가기</a>'}
          <a href="/orders" data-member-only>결제 내역 보기</a>
          <a href="/refund">환불·취소 정책 보기</a>
        </div>
        <div class="payment-keep" data-guest-keep hidden>
          <p><strong>이 풀이를 오래 보관하려면</strong></p>
          <p>SNS로 로그인하면 내 보관함에 저장돼요. 폰을 바꿔도, 다른 기기에서도 다시 볼 수 있어요.</p>
          <div class="payment-actions"><a class="primary" data-guest-login href="#">로그인하고 보관하기</a></div>
          <p>로그인하지 않아도 이 기기에서는 다시 볼 수 있어요. 다른 기기에서는 <a href="/orders/lookup/">비회원 주문 조회</a>에 주문번호와 휴대폰 번호를 넣으면 열려요. 풀이 화면의 PDF 받기로 내 기기에 저장해 둘 수도 있어요.</p>
        </div>
      `;
      if (success) showGuestKeep(continueUrl).catch(() => undefined);
    })
    .catch(() => { result.innerHTML = '<h2>결제 결과를 불러오지 못했어요.</h2><p>잠시 후 결제 내역에서 상태를 확인해 주세요.</p><div class="payment-actions"><a class="primary" href="/orders">결제 내역 보기</a></div>'; });

  /**
   * 2026-10-16 비회원 결제 후 화면(docs/auth/guest-member-plan.md 8절): 로그인을 강요하지 않고 보관 방법을 고르게 한다.
   * 회원이면 보이지 않는다. 비회원에게는 결제 내역(회원 전용) 링크를 숨기고 "로그인하고 보관하기"와 주문 조회를 안내한다.
   */
  async function showGuestKeep(continueUrl) {
    const storage = global.UMSHAuthSession?.guestAwareStorage;
    if (!storage || !global.supabase?.createClient) return;
    const authConfig = await fetch('/api/auth/config', { cache: 'no-store' }).then((response) => response.json());
    const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce', storage } });
    const session = (await client.auth.getSession()).data.session;
    if (!session?.user?.is_anonymous) return;
    document.querySelectorAll('[data-member-only]').forEach((node) => { node.hidden = true; });
    const box = document.querySelector('[data-guest-keep]');
    if (!box) return;
    box.hidden = false;
    const login = box.querySelector('[data-guest-login]');
    if (!login) return;
    const url = global.UMSHCommonAuth?.commonLoginUrl?.('payment-keep', continueUrl) || '/signup?entry=payment-keep&returnTo=' + encodeURIComponent(continueUrl) + '#login';
    login.setAttribute('href', url);
    // 결제한 풀이를 저장하려고 로그인하는 것이니, 돌아와서 "저장할까요?"를 다시 묻지 않는다.
    login.addEventListener('click', () => { try { global.sessionStorage.setItem('umsh_claim_intent_v1', String(Date.now())); } catch (_error) { /* 못 남기면 한 번 더 묻는다 */ } });
  }

  async function renderConsultationResult() {
    const draftKey = 'umsh:consultation:checkout-draft:v1';
    const authConfig = await fetch('/api/auth/config', { cache: 'no-store' }).then(response => response.json());
    if (!authConfig.enabled || !global.supabase?.createClient) throw new Error('AUTH_UNAVAILABLE');
    const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: global.UMSHAuthSession?.guestAwareStorage || global.localStorage } });
    const session = (await client.auth.getSession()).data.session;
    const ownerId = session?.user?.id;
    let target = '/consultation/';
    try {
      const draft = JSON.parse(global.sessionStorage.getItem(draftKey) || 'null');
      if (draft && draft.ownerId === ownerId && Date.now() - Number(draft.createdAt) < 30 * 60 * 1000) {
        if (typeof draft.conversationId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(draft.conversationId)) target += '?conversationId=' + encodeURIComponent(draft.conversationId);
      } else if (draft) global.sessionStorage.removeItem(draftKey);
    } catch (_error) { /* Consultation page also validates and clears this draft. */ }
    let active = true;
    client.auth.onAuthStateChange((_event, next) => {
      if (next?.user?.id !== ownerId) {
        active = false;
        try { global.sessionStorage.removeItem(draftKey); } catch (_error) { /* Storage can be disabled. */ }
        result.classList.remove('is-success');
        result.innerHTML = '<h2>로그인 계정이 변경됐어요.</h2><p>상담으로 돌아가 이용 횟수를 다시 확인해 주세요.</p><div class="payment-actions"><a class="primary" href="/consultation/">상담으로 돌아가기</a></div>';
      }
    });
    let confirmed = false;
    if (session?.access_token && orderId) {
      const response = await fetch('/api/payment/orders/' + encodeURIComponent(orderId), { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' });
      if (!response.ok) throw new Error('ORDER_UNCONFIRMED');
      const order = (await response.json()).order;
      global.UMSHAnalytics?.purchase?.(order);
      confirmed = order?.productKey === 'cheonmyeong_consultation' && Number.isInteger(order.amount) && order.amount >= 1 && order.amount <= 4900 && ['paid', 'viewed'].includes(order.status);
    }
    if (!active) return;
    result.classList.toggle('is-success', confirmed);
    result.innerHTML = `<h2>${confirmed ? '질문 5회 구매가 확인됐어요.' : '질문권 결제를 확인해 주세요.'}</h2><p>${confirmed ? '상담으로 돌아가 준비해 둔 질문을 이어서 보내 주세요.' : '확인된 결제만 상담 횟수에 반영됩니다. 결제를 취소했다면 기존 상담으로 돌아갈 수 있어요.'}</p><div class="payment-actions"><a class="primary" href="${escapeHtml(target)}">상담 이어가기</a><a href="/orders">결제 내역 보기</a></div>`;
  }

  /**
   * GA4 구매 집계. 주소의 state=paid 는 누구나 붙일 수 있고 앱 결제는 state 없이 돌아오므로,
   * 서버에서 주문 상태를 확인한 뒤에만 보낸다. 실패해도 화면에는 영향이 없다.
   */
  async function trackPurchase() {
    if (!orderId || !global.UMSHAnalytics?.purchase || !global.supabase?.createClient) return;
    try {
      const authConfig = await fetch('/api/auth/config', { cache: 'no-store' }).then(response => response.json());
      if (!authConfig.enabled) return;
      const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: global.UMSHAuthSession?.guestAwareStorage || global.localStorage } });
      const token = (await client.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const response = await fetch('/api/payment/orders/' + encodeURIComponent(orderId), { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      if (response.ok) await global.UMSHAnalytics.purchase((await response.json()).order);
    } catch (_error) { /* Measurement must never affect the payment result. */ }
  }

  function paidReadingUrl(product, reportId, orderId) {
    const template = String(product?.readingPath || '').trim();
    const params = new URLSearchParams({ paid: '1' });
    if (orderId) params.set('orderId', orderId);
    if (template) {
      const hashAt = template.indexOf('#');
      const address = hashAt >= 0 ? template.slice(0, hashAt) : template;
      const hash = hashAt >= 0 ? template.slice(hashAt) : '';
      if (reportId && !address.includes('reportId=')) params.set('reportId', reportId);
      return `${address}${address.includes('?') ? '&' : '?'}${params.toString()}${hash}`;
    }
    if (reportId) return `/r/${encodeURIComponent(reportId)}`;
    return '/';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
})(window);
