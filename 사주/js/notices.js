(function (global) {
  'use strict';

  // 마이페이지 › 공지·이벤트. 관리자 콘텐츠에서 위치가 notice/ 로 시작하는 게시된 공지를 보여 준다.
  var helper = global.UMSHAccountPages;
  var list = document.querySelector('[data-notice-list]');
  var statusBox = document.querySelector('[data-notices-status]');

  function koreanDate(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
  }

  function render(notices) {
    list.replaceChildren();
    if (!notices.length) {
      var empty = document.createElement('p');
      empty.className = 'myhub-empty';
      empty.textContent = '아직 올라온 공지가 없습니다.';
      list.appendChild(empty);
      return;
    }
    notices.forEach(function (notice, index) {
      var item = document.createElement('details');
      item.className = 'myhub-notice';
      if (index === 0) item.open = true;
      var summary = document.createElement('summary');
      var title = document.createElement('b');
      title.textContent = notice.title;
      var date = document.createElement('small');
      date.textContent = koreanDate(notice.publishedAt);
      summary.append(title, date);
      var body = document.createElement('p');
      body.textContent = notice.body;
      item.append(summary, body);
      // 서버(content-store)도 거르지만 화면에서 한 번 더 막는다: 내부 주소(/…)와 https 만 링크로 만든다.
      if (typeof notice.href === 'string' && /^(\/(?!\/)|https:\/\/)/.test(notice.href)) {
        var link = document.createElement('a');
        link.href = notice.href;
        link.className = 'myhub-notice-link';
        link.textContent = '자세히 보기 ›';
        item.appendChild(link);
      }
      list.appendChild(item);
    });
  }

  if (helper && helper.mountAccountChrome) helper.mountAccountChrome('account');
  fetch('/api/notices', { cache: 'no-store' })
    .then(function (response) { return response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status)); })
    .then(function (payload) { render(payload.notices || []); })
    .catch(function () { statusBox.textContent = '공지를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.'; });
})(window);
