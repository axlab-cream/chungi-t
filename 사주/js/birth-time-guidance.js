(function () {
  'use strict';
  // Explicit customer input pages only. This is display guidance, never data normalization.
  var path = location.pathname.replace(/^\/(?:en|ja)(?=\/)/, '');
  if (!/^\/(?:work\/(?:quit|move)|money\/save|love\/signal|place\/home)\/02-step-2-saju-input(?:\/|$)/.test(path)) return;
  var lang = document.documentElement.lang;
  var hint = lang === 'en'
    ? 'If you do not know your birth time, choose unknown. You do not need to guess. A known time adds time-dependent details. A Zi Wei chart requires a known birth time.'
    : lang === 'ja'
      ? '出生時刻がわからない場合は、時刻不明を選んでください。推測で入力する必要はありません。わかる場合は、時刻に基づく項目も見られます。紫微斗数の命盤には出生時刻が必要です。'
      : '태어난 시각을 모르면 시각 모름을 선택해 주세요. 추측해서 입력하지 않아도 됩니다. 알고 있으면 시각에 따라 달라지는 항목도 볼 수 있습니다. 자미두수 명반에는 출생 시각이 필요합니다.';
  var count = 0;
  function refresh() {
    document.querySelectorAll('main input[type="time"]').forEach(function (input) {
      if (input.readOnly || input.hasAttribute('data-birth-time-guidance')) return;
      input.setAttribute('data-birth-time-guidance', '');
      var help = document.createElement('p');
      help.id = 'birth-time-guidance-' + (++count);
      help.textContent = hint;
      help.setAttribute('data-birth-time-help', '');
      help.style.cssText = 'font-size:13px;line-height:1.7;margin:8px 0;grid-column:1 / -1';
      var anchor = input.closest('label') || input;
      anchor.insertAdjacentElement('afterend', help);
      var existing = input.getAttribute('aria-describedby') || '';
      input.setAttribute('aria-describedby', (existing + ' ' + help.id).trim());
    });
  }
  function start() {
    refresh();
    if (typeof MutationObserver !== 'undefined') new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
