(function (global) {
  'use strict';

  /**
   * 마음 위기 안내(공통 절대 선 2번, 2026-10-16).
   *
   * 서버가 고객 글에서 자해·자살 신호를 찾으면(또는 그런 리포트·상담 기록을 돌려주면) 응답에
   * X-UMSH-Care: crisis 표시를 붙인다(src/safety/crisis-signal.ts). 이 스크립트는 모든 화면의 fetch 를
   * 한 번 감싸 그 표시를 보면 화면 맨 위에 109 안내를 띄운다. 서비스마다 고칠 필요가 없게 공용 크롬이 싣는다.
   * 문구는 서버(/api/safety/care-notice ← data/safety/crisis-signals.json) 한 곳에서 받는다.
   */
  if (global.__umshCareNotice || typeof global.fetch !== 'function') return;
  global.__umshCareNotice = true;

  var HEADER = 'x-umsh-care';
  var NOTICE_URL = '/api/safety/care-notice';
  var originalFetch = global.fetch.bind(global);
  var requested = false;

  function render(notice) {
    if (!notice || document.querySelector('.umsh-care-notice')) return;
    var box = document.createElement('section');
    box.className = 'umsh-care-notice';
    box.setAttribute('role', 'alert');

    var title = document.createElement('p');
    title.className = 'umsh-care-notice__title';
    title.textContent = notice.title;

    var body = document.createElement('p');
    body.className = 'umsh-care-notice__body';
    body.textContent = notice.body;

    var call = document.createElement('a');
    call.className = 'umsh-care-notice__call';
    call.href = 'tel:' + notice.tel;
    call.textContent = notice.callLabel;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'umsh-care-notice__close';
    close.setAttribute('aria-label', notice.closeLabel);
    close.textContent = '×';
    close.addEventListener('click', function () { box.remove(); });

    box.append(title, body, call, close);
    document.body.appendChild(box);
  }

  function showOnce() {
    if (requested) return;
    requested = true;
    originalFetch(NOTICE_URL, { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (notice) {
        if (document.body) render(notice);
        else document.addEventListener('DOMContentLoaded', function () { render(notice); });
      })
      .catch(function () { requested = false; });
  }

  global.fetch = function () {
    return originalFetch.apply(null, arguments).then(function (response) {
      try {
        if (response && response.headers && response.headers.get(HEADER) === 'crisis') showOnce();
      } catch (error) { /* 안내 실패가 본 요청을 막지 않게 한다 */ }
      return response;
    });
  };
})(window);
