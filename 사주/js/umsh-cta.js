(function (global) {
  'use strict';

  function formatWon(amount) {
    if (typeof amount === 'string' && /원$/.test(amount.trim())) return amount.trim();
    var value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return '';
    return value.toLocaleString('ko-KR') + '원';
  }

  function withPrice(label, amount) {
    var price = formatWon(amount);
    if (!price) return label;
    return label + ' (' + price + ')';
  }

  function fullViewCta(state, amount) {
    if (state === 'entitled') return '전체 목차 열기';
    if (state === 'processing') return '결제 상태 다시 확인';
    if (state === 'guest') return withPrice('로그인하고 전체 보기', amount);
    if (state === 'retry' || state === 'failed') return withPrice('다시 결제하고 전체 보기', amount);
    return withPrice('전체 보기', amount);
  }

  global.UMSHCta = { formatWon: formatWon, withPrice: withPrice, fullViewCta: fullViewCta };
})(typeof window !== 'undefined' ? window : globalThis);
