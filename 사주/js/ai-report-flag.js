/**
 * 생성형 AI 결과 신고.
 *
 * 정책은 결과를 만든 화면을 나가지 않고 신고할 수 있는 경로를 요구한다. 서비스별 렌더러가
 * 20개 파일에 흩어져 있어 각 파일을 고치는 대신, 공용 크롬이 이 파일 하나를 불러
 * 화면 위에 신고 버튼을 얹는다. 기존 화면 마크업은 건드리지 않는다.
 *
 * 리포트 식별자는 화면마다 저장 방식이 달라, 알려진 자리를 순서대로 훑어 찾는다.
 * 찾지 못하면 버튼을 아예 만들지 않는다. 신고할 대상이 없는 화면이기 때문이다.
 */
(function (global) {
  'use strict';

  var REASONS = [
    { value: 'inaccurate', label: '내용이 사실과 다릅니다' },
    { value: 'harmful', label: '위험하거나 불안을 부추깁니다' },
    { value: 'offensive', label: '불쾌하거나 차별적입니다' },
    { value: 'privacy', label: '개인정보가 잘못 쓰였습니다' },
    { value: 'other', label: '그 밖의 문제' }
  ];

  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function fromQuery() {
    var query = new URLSearchParams(global.location.search);
    return query.get('resultId') || query.get('reportId') || '';
  }

  /** 세션에 저장된 리포트에서 식별자를 찾는다. 서비스마다 키 이름이 다르다. */
  function fromStorage() {
    var stores = [global.sessionStorage, global.localStorage];
    for (var s = 0; s < stores.length; s += 1) {
      var store = stores[s];
      if (!store) continue;
      var keys;
      try {
        keys = Object.keys(store);
      } catch (error) {
        continue;
      }
      for (var k = 0; k < keys.length; k += 1) {
        if (!/report|result/i.test(keys[k])) continue;
        var raw;
        try {
          raw = store.getItem(keys[k]);
        } catch (error) {
          continue;
        }
        if (!raw || raw.charAt(0) !== '{') continue;
        var parsed;
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          continue;
        }
        var found = pickId(parsed);
        if (found) return found;
      }
    }
    return '';
  }

  function pickId(value) {
    if (!value || typeof value !== 'object') return '';
    var direct = value.resultId || value.reportId;
    if (typeof direct === 'string' && direct) return direct;
    if (value.report) return pickId(value.report);
    return '';
  }

  function reportId() {
    var id = fromQuery() || fromStorage();
    // 서버가 받는 것은 저장된 결과의 식별자다. 형태가 다르면 보내지 않는다.
    return UUID.test(id) || /^[0-9a-f]{16,}$/i.test(id) ? id : '';
  }

  /**
   * 로그인 토큰.
   *
   * 화면마다 Supabase 클라이언트를 따로 만들어 공용 헬퍼가 없다. 대신 클라이언트가
   * localStorage 에 두는 세션(`sb-<ref>-auth-token`)을 직접 읽는다. 저장 키를 바꾸지
   * 않았으므로 기본 형식이다.
   */
  function authHeaders() {
    var store = global.localStorage;
    if (!store) return {};
    var keys;
    try {
      keys = Object.keys(store);
    } catch (error) {
      return {};
    }
    for (var i = 0; i < keys.length; i += 1) {
      if (!/^sb-.*-auth-token$/.test(keys[i])) continue;
      var raw;
      try {
        raw = store.getItem(keys[i]);
      } catch (error) {
        continue;
      }
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        var token = parsed && (parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token));
        if (token) return { Authorization: 'Bearer ' + token };
      } catch (error) {
        // 다음 키를 본다.
      }
    }
    return {};
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      if (name === 'style') node.style.cssText = attrs[name];
      else node.setAttribute(name, attrs[name]);
    });
    if (text != null) node.textContent = text;
    return node;
  }

  function styles() {
    if (document.getElementById('umsh-flag-style')) return;
    var css = [
      '.umsh-flag-open{position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:2147483000;',
      'min-height:40px;padding:0 14px;border:1px solid rgba(242,191,107,.32);border-radius:999px;',
      'background:rgba(8,3,2,.86);color:#f2bf6b;font-size:12px;font-weight:800;cursor:pointer;',
      'font-family:inherit;backdrop-filter:blur(6px)}',
      '.umsh-flag-back{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:end center;',
      'background:rgba(0,0,0,.62);padding:0 0 env(safe-area-inset-bottom)}',
      '.umsh-flag-card{width:min(100%,430px);max-height:82vh;overflow:auto;padding:20px 18px 24px;',
      'border-top-left-radius:18px;border-top-right-radius:18px;background:#0e0705;color:#fff8ef;',
      'border-top:1px solid rgba(242,191,107,.24)}',
      '.umsh-flag-card h2{margin:0 0 6px;font-size:17px}',
      '.umsh-flag-card p{margin:0 0 14px;color:rgba(255,238,210,.72);font-size:13px;line-height:1.7}',
      '.umsh-flag-reason{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 12px;',
      'border:1px solid rgba(242,191,107,.18);border-radius:10px;margin-bottom:8px;cursor:pointer;font-size:14px}',
      '.umsh-flag-reason input{accent-color:#f2bf6b;width:18px;height:18px}',
      '.umsh-flag-card textarea{width:100%;min-height:80px;margin:6px 0 14px;padding:10px;',
      'border:1px solid rgba(242,191,107,.18);border-radius:10px;background:rgba(255,248,239,.045);',
      'color:inherit;font-family:inherit;font-size:14px;resize:vertical}',
      '.umsh-flag-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.umsh-flag-actions button{min-height:52px;border-radius:999px;font-family:inherit;font-size:15px;',
      'font-weight:800;cursor:pointer}',
      '.umsh-flag-send{border:none;background:#f2bf6b;color:#1a0705}',
      '.umsh-flag-cancel{border:1px solid rgba(242,191,107,.24);background:none;color:#f2bf6b}',
      '.umsh-flag-note{margin-top:12px;color:rgba(255,238,210,.52);font-size:12px;line-height:1.6}'
    ].join('');
    var tag = el('style', { id: 'umsh-flag-style' });
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /**
   * 붙일 자리.
   *
   * 04·05·06 화면은 umsh-report-access.js 가 `body > :not(#umsh-verified-layout)` 을
   * 전부 숨기는 스타일을 넣는다. body 에 그대로 붙이면 정작 해석이 보이는 화면에서
   * 신고 버튼만 사라진다. 그래서 그 레이아웃이 있으면 안으로 들어간다.
   */
  function host() {
    return document.getElementById('umsh-verified-layout') || document.body;
  }

  function openDialog(id) {
    styles();
    var back = el('div', { class: 'umsh-flag-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': '해석 신고' });
    var card = el('div', { class: 'umsh-flag-card' });
    card.appendChild(el('h2', {}, '이 해석을 신고합니다'));
    card.appendChild(el('p', {}, '어떤 점이 문제였는지 알려 주시면 확인 후 개선에 반영합니다. 접수 내용은 이 해석과 함께 보관됩니다.'));

    REASONS.forEach(function (reason, index) {
      var row = el('label', { class: 'umsh-flag-reason' });
      var input = el('input', { type: 'radio', name: 'umsh-flag-reason', value: reason.value });
      if (index === 0) input.checked = true;
      row.appendChild(input);
      row.appendChild(el('span', {}, reason.label));
      card.appendChild(row);
    });

    var detail = el('textarea', { placeholder: '어떤 문장이 문제였는지 적어 주시면 더 빠르게 확인할 수 있습니다. (선택)', maxlength: '1000' });
    card.appendChild(detail);

    var status = el('p', { class: 'umsh-flag-note' }, '');
    var actions = el('div', { class: 'umsh-flag-actions' });
    var cancel = el('button', { type: 'button', class: 'umsh-flag-cancel' }, '닫기');
    var send = el('button', { type: 'button', class: 'umsh-flag-send' }, '신고 보내기');
    actions.appendChild(cancel);
    actions.appendChild(send);
    card.appendChild(actions);
    card.appendChild(status);
    back.appendChild(card);
    host().appendChild(back);

    function close() {
      if (back.parentNode) back.parentNode.removeChild(back);
    }
    cancel.addEventListener('click', close);
    back.addEventListener('click', function (event) {
      if (event.target === back) close();
    });

    send.addEventListener('click', async function () {
      var picked = card.querySelector('input[name="umsh-flag-reason"]:checked');
      send.disabled = true;
      status.textContent = '보내는 중입니다.';
      try {
        var response = await fetch('/api/report/flag', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify({
            reportId: id,
            reason: picked ? picked.value : 'other',
            detail: detail.value.trim()
          })
        });
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(payload.error || '신고를 접수하지 못했습니다.');
        card.innerHTML = '';
        card.appendChild(el('h2', {}, '신고를 접수했습니다'));
        card.appendChild(el('p', {}, payload.message || '확인 후 개선에 반영합니다. 급한 문의는 고객센터로 연락해 주세요.'));
        var done = el('button', { type: 'button', class: 'umsh-flag-send', style: 'width:100%;min-height:52px;border-radius:999px;border:none;background:#f2bf6b;color:#1a0705;font-family:inherit;font-size:15px;font-weight:800' }, '닫기');
        done.addEventListener('click', close);
        card.appendChild(done);
      } catch (error) {
        send.disabled = false;
        status.textContent = error.message === 'Failed to fetch'
          ? '네트워크를 확인하고 다시 시도해 주세요.'
          : error.message;
      }
    });
  }

  function mount() {
    var id = reportId();
    if (!id) return;
    var existing = document.querySelector('.umsh-flag-open');
    var target = host();
    if (existing) {
      // 검증된 레이아웃이 늦게 생기는 화면이 있다. 자리가 바뀌었으면 옮긴다.
      if (existing.parentNode !== target) target.appendChild(existing);
      return;
    }
    styles();
    var button = el('button', { type: 'button', class: 'umsh-flag-open', 'aria-label': '이 해석 신고하기' }, '해석 신고');
    button.addEventListener('click', function () { openDialog(id); });
    target.appendChild(button);
  }

  /**
   * 해석은 항목이 하나씩 완성되며 나중에 그려지기도 한다. 처음 한 번으로 끝내지 않고
   * 리포트가 화면에 올라오는 시점까지 몇 초 동안 지켜본다.
   */
  function watch() {
    mount();
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      mount();
      if (tries >= 20) clearInterval(timer);
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }

  global.UMSHReportFlag = { mount: mount, open: openDialog };
})(window);
