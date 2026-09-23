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
    .then((config) => {
      const product = config.catalog?.find((item) => item.key === productKey) || config.catalog?.find((item) => item.returnPath === '/');
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
