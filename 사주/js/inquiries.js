(function (global) {
  'use strict';

  // 마이페이지 › 1:1 문의. 문의는 관리자 고객 지원에 "고객 문의"로 들어가고,
  // 관리자가 "고객에게 답변"으로 남긴 글만 여기 보인다(서버 hub-store.ts).
  var helper = global.UMSHAccountPages;
  var form = document.querySelector('[data-inquiry-form]');
  var list = document.querySelector('[data-inquiry-list]');
  var formStatus = document.querySelector('[data-inquiry-status]');
  var counter = document.querySelector('[data-inquiry-count]');
  var auth = null;

  function when(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return (date.getMonth() + 1) + '월 ' + date.getDate() + '일 ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }

  function empty(text) {
    var p = document.createElement('p');
    p.className = 'myhub-empty';
    p.textContent = text;
    return p;
  }

  function render(inquiries) {
    list.replaceChildren();
    if (!inquiries.length) { list.appendChild(empty('아직 남긴 문의가 없습니다.')); return; }
    inquiries.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'myhub-inquiry';
      card.dataset.state = item.state;
      var top = document.createElement('div');
      top.className = 'myhub-inquiry-top';
      var category = document.createElement('b');
      category.textContent = item.categoryLabel;
      var state = document.createElement('span');
      state.className = 'myhub-inquiry-state';
      state.textContent = item.stateLabel;
      top.append(category, state);
      card.appendChild(top);
      (item.messages || []).forEach(function (message) {
        var bubble = document.createElement('div');
        bubble.className = 'myhub-message' + (message.from === 'staff' ? ' is-staff' : '');
        var meta = document.createElement('small');
        meta.textContent = (message.from === 'staff' ? '운명상회 답변' : '내 문의') + ' · ' + when(message.createdAt);
        var text = document.createElement('p');
        text.textContent = message.text;
        bubble.append(meta, text);
        card.appendChild(bubble);
      });
      list.appendChild(card);
    });
  }

  async function load() {
    var response = await fetch('/api/user/inquiries', { headers: helper.authHeaders(auth.session), cache: 'no-store' });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || '문의 내역을 불러오지 못했습니다.');
    render(payload.inquiries || []);
  }

  form.text.addEventListener('input', function () {
    counter.textContent = form.text.value.trim().length.toLocaleString('ko-KR') + ' / 2,000자';
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!form.reportValidity() || !auth) return;
    var button = form.querySelector('[type="submit"]');
    button.disabled = true;
    formStatus.textContent = '문의를 보내는 중입니다.';
    try {
      var response = await fetch('/api/user/inquiries', {
        method: 'POST',
        headers: helper.authHeaders(auth.session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ category: form.category.value, text: form.text.value }),
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || '문의를 보내지 못했습니다.');
      form.reset();
      counter.textContent = '0 / 2,000자';
      formStatus.textContent = '문의를 받았습니다. 답변이 오면 이 화면과 마이페이지에 표시됩니다.';
      render(payload.inquiries || []);
    } catch (error) {
      formStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  async function init() {
    if (helper.mountAccountChrome) helper.mountAccountChrome('account');
    auth = await helper.requireSession('inquiries');
    if (!auth) return;
    try { await load(); } catch (error) { list.replaceChildren(empty(error.message)); }
  }

  init().catch(function (error) { list.replaceChildren(empty((error && error.message) || '화면을 불러오지 못했습니다.')); });
})(window);
