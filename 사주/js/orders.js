(function renderOrders(global) {
  'use strict';

  const list = document.querySelector('[data-order-list]');
  const status = document.querySelector('[data-orders-status]');

  function setStatus(message) { status.textContent = message || ''; }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR'); }
  function label(statusValue) { return ({ ready: '결제 대기', approving: '승인 확인 중', paid: '결제 완료', viewed: '풀이 열람', failed: '결제 실패', cancelled: '결제 취소' })[statusValue] || statusValue; }

  async function init() {
    const authConfig = await fetch('/api/auth/config').then((response) => response.json());
    if (!authConfig.enabled || !global.supabase?.createClient) {
      const returnTo = `${global.location.pathname}${global.location.search}`;
      global.location.replace(window.UMSHCommonAuth?.commonLoginUrl('orders', returnTo) || `/signup?entry=orders&returnTo=${encodeURIComponent(returnTo)}#login`);
      return;
    }
    const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    const session = (await client.auth.getSession()).data.session;
    if (!session) { global.location.replace(window.UMSHCommonAuth.commonLoginUrl('orders', `${global.location.pathname}${global.location.search}`)); return; }
    const response = await fetch('/api/user/orders', { headers: { Authorization: `Bearer ${session.access_token}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '결제 내역을 불러오지 못했습니다.');
    const orders = payload.orders || [];
    if (!orders.length) { list.innerHTML = '<p class="order-empty">아직 결제한 풀이가 없습니다.</p>'; return; }
    list.innerHTML = orders.map((order) => `
      <article class="order-item">
        <strong>${escapeHtml(order.productTitle)}</strong>
        <span>${Number(order.amount).toLocaleString('ko-KR')}원 · ${escapeHtml(label(order.status))}</span>
        <span>${escapeHtml(formatDate(order.createdAt))} · 주문번호 ${escapeHtml(order.orderId)}</span>
        ${order.status === 'paid' || order.status === 'viewed' ? `<a href="${escapeHtml(`${productPath(order.productKey)}?paid=1&orderId=${encodeURIComponent(order.orderId)}`)}">풀이 화면 열기</a>` : ''}
      </article>
    `).join('');
  }

  function productPath(key) {
    return ({ cmdg: '/cmdg/', love_this_year: '/love/this-year', home_pungsu: '/place/home', work_move: '/work/move', work_job: '/work/job', money_save: '/money/save', marry_match: '/match/marry', match_couple: '/match/couple', love_mind: '/love/mind', love_again: '/love/again', love_spouse: '/love/spouse' })[key] || '/';
  }

  init().catch((error) => setStatus(error.message || '결제 내역을 불러오지 못했습니다.'));
})(window);
