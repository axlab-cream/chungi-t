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
      const success = state === 'paid';
      const continueUrl = paidReadingUrl(product, reportId, orderId);
      result.classList.toggle('is-success', success);
      result.innerHTML = `
        <h2>${success ? '결제가 완료됐어요.' : state === 'cancelled' ? '결제를 취소했어요.' : '결제를 완료하지 못했어요.'}</h2>
        <p>${success ? `${product?.title || '선택한 풀이'} 전체 풀이를 확인할 수 있습니다.` : escapeHtml(message || '결제 상태를 다시 확인하거나 고객센터로 문의해 주세요.')}</p>
        ${orderId ? `<p>주문번호 <strong>${escapeHtml(orderId)}</strong></p>` : ''}
        <div class="payment-actions">
          ${success ? `<a class="primary" href="${escapeHtml(continueUrl)}">전체 풀이보기</a>` : '<a class="primary" href="/">운명상회로 돌아가기</a>'}
          <a href="/orders">결제 내역 보기</a>
          <a href="/refund">환불·취소 정책 보기</a>
        </div>
      `;
    })
    .catch(() => { result.innerHTML = '<h2>결제 결과를 불러오지 못했어요.</h2><p>잠시 후 결제 내역에서 상태를 확인해 주세요.</p><div class="payment-actions"><a class="primary" href="/orders">결제 내역 보기</a></div>'; });

  async function renderConsultationResult() {
    const draftKey = 'umsh:consultation:checkout-draft:v1';
    const authConfig = await fetch('/api/auth/config', { cache: 'no-store' }).then(response => response.json());
    if (!authConfig.enabled || !global.supabase?.createClient) throw new Error('AUTH_UNAVAILABLE');
    const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: global.localStorage } });
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
      confirmed = order?.productKey === 'cheonmyeong_consultation' && Number.isInteger(order.amount) && order.amount >= 1 && order.amount <= 4900 && ['paid', 'viewed'].includes(order.status);
    }
    if (!active) return;
    result.classList.toggle('is-success', confirmed);
    result.innerHTML = `<h2>${confirmed ? '질문 5회 구매가 확인됐어요.' : '질문권 결제를 확인해 주세요.'}</h2><p>${confirmed ? '상담으로 돌아가 준비해 둔 질문을 이어서 보내 주세요.' : '확인된 결제만 상담 횟수에 반영됩니다. 결제를 취소했다면 기존 상담으로 돌아갈 수 있어요.'}</p><div class="payment-actions"><a class="primary" href="${escapeHtml(target)}">상담 이어가기</a><a href="/orders">결제 내역 보기</a></div>`;
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
