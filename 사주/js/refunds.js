(function (global) {
  'use strict';
  var helper = global.UMSHAccountPages;
  var list = document.querySelector('[data-refund-list]');
  var statusBox = document.querySelector('[data-refunds-status]');

  function setStatus(message) { if (statusBox) statusBox.textContent = message || ''; }

  function mailtoFor(order) {
    var subject = encodeURIComponent('[운명상회 환불 문의] ' + (order.productTitle || order.orderId));
    var body = encodeURIComponent(
      '주문번호: ' + order.orderId + '\n상품: ' + (order.productTitle || '') + '\n금액: ' + Number(order.amount || 0).toLocaleString('ko-KR') + '원\n상태: ' + helper.orderStatusLabel(order.status) + '\n결제일: ' + helper.formatDate(order.createdAt) + '\n\n요청 사유:\n'
    );
    return 'mailto:axlab@crea-m.com?subject=' + subject + '&body=' + body;
  }

  async function init() {
    if (helper.mountAccountChrome) helper.mountAccountChrome('account');
    var auth = await helper.requireSession('refunds');
    if (!auth) return;
    var response = await fetch('/api/user/orders', { headers: helper.authHeaders(auth.session) });
    var payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '결제 내역을 불러오지 못했습니다.');
    var orders = (payload.orders || []).filter(function (order) {
      return ['paid', 'viewed', 'cancelled', 'failed'].indexOf(order.status) >= 0;
    });
    if (!orders.length) {
      list.innerHTML = '<p class="order-empty">환불 문의할 결제 건이 아직 없습니다.</p>';
      return;
    }
    list.innerHTML = orders.map(function (order) {
      var canAsk = order.status === 'paid' || order.status === 'viewed';
      return (
        '<article class="order-item">' +
        '<strong>' + helper.escapeHtml(order.productTitle) + '</strong>' +
        '<span>' + Number(order.amount).toLocaleString('ko-KR') + '원 · ' + helper.escapeHtml(helper.orderStatusLabel(order.status)) + '</span>' +
        '<span>' + helper.escapeHtml(helper.formatDate(order.createdAt)) + ' · 주문번호 ' + helper.escapeHtml(order.orderId) + '</span>' +
        (canAsk
          ? '<a href="' + mailtoFor(order) + '">환불 문의 메일 보내기</a> · <a href="/support#inquiry">고객센터 문의</a>'
          : '<span>현재 상태에서는 환불 문의 대상이 아닐 수 있습니다. 정책과 고객센터를 확인해 주세요.</span>') +
        '</article>'
      );
    }).join('');
  }

  init().catch(function (error) {
    setStatus((error && error.message) || '환불 화면을 불러오지 못했습니다.');
  });
})(window);