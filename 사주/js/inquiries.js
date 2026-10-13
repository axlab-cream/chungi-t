(function (global) {
  'use strict';

  // 마이페이지 › 1:1 문의. 문의는 관리자 고객 지원에 "고객 문의"로 들어가고,
  // 관리자가 "고객에게 답변"으로 남긴 글만 여기 보인다(서버 hub-store.ts).
  // 화면은 목록이 먼저 보이고, 새 문의는 버튼을 눌러야 쓰기 칸이 열린다.
  // 답변은 문의 글 아래 댓글처럼 붙는다.
  var helper = global.UMSHAccountPages;
  var form = document.querySelector('[data-inquiry-form]');
  var compose = document.querySelector('[data-inquiry-compose]');
  var openButton = document.querySelector('[data-inquiry-open]');
  var closeButton = document.querySelector('[data-inquiry-close]');
  var list = document.querySelector('[data-inquiry-list]');
  var total = document.querySelector('[data-inquiry-total]');
  var formStatus = document.querySelector('[data-inquiry-status]');
  var doneStatus = document.querySelector('[data-inquiry-done]');
  var counter = document.querySelector('[data-inquiry-count]');
  var auth = null;
  var hasInquiries = false;

  function when(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return (date.getMonth() + 1) + '월 ' + date.getDate() + '일 ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function empty(text) {
    return el('p', 'myhub-empty', text);
  }

  function setCompose(open) {
    compose.hidden = !open;
    // 문의가 없을 때는 빈 안내 상자 안의 버튼 하나만 보인다.
    openButton.hidden = open || !hasInquiries;
    openButton.setAttribute('aria-expanded', String(open));
    if (open) {
      doneStatus.textContent = '';
      compose.scrollIntoView({ block: 'start', behavior: 'smooth' });
      form.category.focus({ preventScroll: true });
    }
  }

  function emptyState() {
    var box = el('div', 'myhub-inquiry-empty');
    box.append(el('b', '', '문의한 내역이 없습니다.'), el('p', '', '궁금한 점이나 안 되는 부분이 있으면 새 문의를 남겨 주세요. 답변은 이 화면에서 확인할 수 있습니다.'));
    var start = el('button', 'myhub-inquiry-new', '새 문의 남기기');
    start.type = 'button';
    start.addEventListener('click', function () { setCompose(true); });
    box.appendChild(start);
    return box;
  }

  function comment(message) {
    var staff = message.from === 'staff';
    var node = el('div', 'myhub-comment' + (staff ? ' is-staff' : ''));
    var head = el('div', 'myhub-comment-head');
    head.append(el('b', '', staff ? '운명상회' : '나'), el('small', '', when(message.createdAt)));
    node.append(head, el('p', '', message.text));
    return node;
  }

  function render(inquiries, openId) {
    list.replaceChildren();
    hasInquiries = inquiries.length > 0;
    openButton.hidden = !compose.hidden || !hasInquiries;
    total.textContent = inquiries.length ? inquiries.length + '건' : '';
    if (!inquiries.length) { list.appendChild(emptyState()); return; }
    inquiries.forEach(function (item, index) {
      var messages = item.messages || [];
      var question = messages[0] || { text: '', createdAt: item.createdAt };
      var replies = messages.slice(1);
      var staffReplies = replies.filter(function (message) { return message.from === 'staff'; }).length;
      var card = el('details', 'myhub-inquiry');
      card.dataset.state = item.state;
      // 방금 쓴 문의, 아니면 맨 위 문의 하나만 펼쳐 둔다.
      card.open = openId ? item.id === openId : index === 0;
      var summary = el('summary', 'myhub-inquiry-summary');
      var top = el('div', 'myhub-inquiry-top');
      top.append(el('b', '', item.categoryLabel), el('span', 'myhub-inquiry-state', item.stateLabel));
      var meta = el('small', 'myhub-inquiry-meta', when(item.createdAt) + (staffReplies ? ' · 답변 ' + staffReplies + '개' : ''));
      summary.append(top, el('p', 'myhub-inquiry-preview', question.text), meta);
      card.appendChild(summary);
      var body = el('div', 'myhub-inquiry-body');
      body.appendChild(el('p', 'myhub-inquiry-question', question.text));
      var thread = el('div', 'myhub-thread');
      if (replies.length) replies.forEach(function (message) { thread.appendChild(comment(message)); });
      else thread.appendChild(el('p', 'myhub-thread-wait', '아직 답변 전입니다. 확인한 뒤 이 아래에 답변을 달아 드립니다.'));
      body.appendChild(thread);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  async function load() {
    var response = await fetch('/api/user/inquiries', { headers: helper.authHeaders(auth.session), cache: 'no-store' });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(payload.error || '문의 내역을 불러오지 못했습니다.');
    render(payload.inquiries || []);
  }

  openButton.addEventListener('click', function () { setCompose(true); });
  closeButton.addEventListener('click', function () { setCompose(false); formStatus.textContent = ''; });

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
      formStatus.textContent = '';
      var inquiries = payload.inquiries || [];
      setCompose(false);
      render(inquiries, inquiries[0] && inquiries[0].id);
      doneStatus.textContent = '문의를 받았습니다. 답변이 오면 이 화면과 마이페이지에 표시됩니다.';
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
    // 다른 화면에서 /inquiries#new 로 오면 쓰기 칸을 바로 연다.
    if (global.location.hash === '#new') setCompose(true);
    try { await load(); } catch (error) {
      // 목록을 못 불러와도 새 문의는 쓸 수 있어야 한다.
      list.replaceChildren(empty(error.message));
      hasInquiries = true;
      openButton.hidden = !compose.hidden;
    }
  }

  init().catch(function (error) { list.replaceChildren(empty((error && error.message) || '화면을 불러오지 못했습니다.')); });
})(window);
