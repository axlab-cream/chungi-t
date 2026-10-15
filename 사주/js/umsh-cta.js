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

  // 2026-10-15: 결제창(PG)이 열리기 전에는 금액을 보이지 않는다. amount 는 호출부 호환을 위해 받기만 한다.
  function fullViewCta(state, amount) {
    if (state === 'entitled') return '전체 목차 열기';
    if (state === 'processing') return '결제 상태 다시 확인';
    if (state === 'guest') return '로그인하고 전체 보기';
    if (state === 'retry' || state === 'failed') return '다시 결제하고 전체 보기';
    return '전체 보기';
  }

  global.UMSHCta = { formatWon: formatWon, withPrice: withPrice, fullViewCta: fullViewCta };
})(typeof window !== 'undefined' ? window : globalThis);
