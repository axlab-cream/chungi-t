(function attachPaymentTestPage(global) {
  'use strict';

  const orderId = new URLSearchParams(global.location.search).get('orderId') || '';
  const status = document.querySelector('[data-test-status]');
  const button = document.querySelector('[data-test-approve]');
  let session = null;
  let order = null;

  function setStatus(message) {
    status.textContent = message || '';
  }

  function headers() {
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  async function init() {
    const config = await fetch('/api/payment/config').then((response) => response.json());
    if (!config.testMode) {
      setStatus('개발 환경 테스트 모드가 비활성화되어 있습니다.');
      return;
    }
    const authConfig = await fetch('/api/auth/config').then((response) => response.json());
    if (!authConfig.enabled || !global.supabase?.createClient) {
      setStatus('로그인 설정을 확인할 수 없습니다.');
      return;
    }
    const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: global.localStorage } });
    session = (await client.auth.getSession()).data.session;
    if (!session) {
      setStatus('로그인 상태를 확인할 수 없습니다. 원래 창에서 다시 시작해 주세요.');
      return;
    }
    const response = await fetch(`/api/payment/orders/${encodeURIComponent(orderId)}`, { headers: headers() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.order) throw new Error(payload.error || '테스트 주문을 찾지 못했습니다.');
    order = payload.order;
    document.querySelector('[data-test-result]').insertAdjacentHTML('afterbegin', `<strong>${escapeHtml(order.productTitle)} · ${Number(order.amount).toLocaleString('ko-KR')}원</strong>`);
    button.disabled = order.status !== 'ready';
    setStatus('테스트 승인을 눌러 결제 완료 후 복귀 흐름을 확인하세요.');
    button.addEventListener('click', approve);
  }

  async function approve() {
    button.disabled = true;
    setStatus('테스트 승인 처리 중입니다.');
    const response = await fetch('/api/payment/test/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ orderId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '테스트 승인에 실패했습니다.');
    global.location.replace(`/payment/result?state=paid&product=${encodeURIComponent(order.productKey)}&orderId=${encodeURIComponent(orderId)}`);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  init().catch((error) => setStatus(error.message || '테스트 결제창을 불러오지 못했습니다.'));
})(window);
