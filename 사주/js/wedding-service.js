/**
 * 우리 결혼, 이날 해도 될까? — 01~06_1 흐름의 클라이언트 브리지.
 *
 * 디자인 페이지는 정적 목업으로 왔다. 02 는 본인 생년월일을 다시 묻고, 04·05·06 은
 * 예시 문장을 들고 있다. 이 파일이 그 자리를 계정의 실제 사주와 후보일 판정으로 바꾼다.
 *
 * 서버가 두 사람의 명식과 후보일 일주를 계산하므로 02 는 후보일과 상대 생년월일만 받고,
 * 본인 값은 저장된 프로필에서 온다. 결과는 소유권을 검증한 서버 응답만 표시한다.
 */
(function () {
  'use strict';

  var SERVICE = {
    key: 'wedding_day',
    title: '우리 결혼, 이날 해도 될까?',
    price: '24,900원',
    entry: 'wedding',
    base: '/day/wedding',
  };

  var api = {};

  // -------------------------------------------------------------------- 인증

  function initAuth() {
    if (api.sessionPromise) return api.sessionPromise;
    api.sessionPromise = (async function () {
      if (!window.supabase || !window.UMSHAuthSession) return null;
      try {
        var config = await fetch('/api/auth/config').then(function (r) { return r.json(); });
        if (!config || !config.enabled) return null;
        var client = window.UMSHAuthSession.createClient(window.supabase, config.url, config.publishableKey);
        var got = await client.auth.getSession();
        var session = await window.UMSHAuthSession.enforceDeviceAuthSession(got.data.session, client);
        window.UMSHReportAccess.setOwner(session && session.user && session.user.id);
        return session;
      } catch (err) {
        return null;
      }
    })();
    return api.sessionPromise;
  }

  function loginUrl() {
    var returnTo = location.pathname + location.search + location.hash;
    if (window.UMSHCommonAuth && window.UMSHCommonAuth.commonLoginUrl) {
      return window.UMSHCommonAuth.commonLoginUrl(SERVICE.entry, returnTo);
    }
    return '/signup?entry=' + SERVICE.entry + '&returnTo=' + encodeURIComponent(returnTo) + '#login';
  }

  async function request(path, body) {
    var session = await initAuth();
    var res = await window.UMSHReportAccess.fetch(path, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        session && session.access_token ? { Authorization: 'Bearer ' + session.access_token } : {},
      ),
      body: JSON.stringify(body || {}),
    });
    var payload = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var error = new Error(payload.error || '요청을 처리하지 못했습니다.');
      error.status = res.status;
      error.code = payload.code;
      error.paymentUrl = payload.paymentUrl;
      throw error;
    }
    return payload;
  }

  // -------------------------------------------------------------------- 입력

  var INPUT_KEY = 'umsh_wedding_input_v1';

  function readInput() {
    try {
      var raw = sessionStorage.getItem(INPUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  async function analyze(input) {
    var payload = await request('/api/day/wedding/analyze', input || readInput() || {});
    window.UMSHReportAccess.remember(payload);
    return payload;
  }

  // -------------------------------------------------------------------- 화면

  function el(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    return box.firstElementChild;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function sectionsOf(payload) {
    var report = payload && (payload.report || (payload.analysis && payload.analysis.report));
    return (report && report.sections) || [];
  }

  function reportMeta(payload) {
    return (payload && (payload.report || (payload.analysis && payload.analysis.report))) || {};
  }

  /** 대분류 단위로 묶는다. 섹션은 중분류이고 category 가 대분류 이름이다. */
  function groupSections(sections) {
    var groups = [];
    var index = {};
    sections.forEach(function (section) {
      var key = section.category || '풀이';
      if (!index[key]) {
        index[key] = { title: key, eyebrow: section.categoryEn || '', hook: section.hook, items: [] };
        groups.push(index[key]);
      }
      index[key].items.push(section);
    });
    return groups;
  }

  function noticeBar(message, actionLabel, onAction) {
    var bar = el(
      '<div class="copy section" data-wedding-notice style="border:1px solid rgba(212,175,106,.36);border-radius:12px;margin:14px 18px;padding:14px">'
      + '<p style="margin:0 0 10px">' + escapeHtml(message) + '</p>'
      + (actionLabel ? '<a class="cta" href="#" data-wedding-action>' + escapeHtml(actionLabel) + '</a>' : '')
      + '</div>',
    );
    var action = bar.querySelector('[data-wedding-action]');
    if (action && onAction) {
      action.addEventListener('click', function (event) {
        event.preventDefault();
        onAction();
      });
    }
    return bar;
  }

  // ------------------------------------------------------------------ 02 입력

  /**
   * 02 는 계정에 이미 있는 본인 생년월일을 다시 묻지 않는다. 후보일과 상대 정보만 받고,
   * 본인 값은 서버가 저장된 프로필에서 읽는다.
   */
  function setupInput(root) {
    var form = root.querySelector('[data-wedding-form]');
    if (!form) return;

    // 본인 생년월일·출생시간은 계정 값을 쓰므로 화면에서 뺀다.
    ['meBirth', 'meTime'].forEach(function (id) {
      var field = form.querySelector('#' + id);
      if (!field) return;
      field.required = false;
      var box = field.closest('.field');
      if (box) box.hidden = true;
    });
    var owned = form.querySelector('#meBirth');
    if (owned) {
      var note = el('<p class="notice" data-wedding-owned style="margin:0 0 10px">본인 생년월일과 출생시간은 계정에 저장된 사주를 씁니다. 다시 입력하지 않아도 됩니다.</p>');
      form.insertBefore(note, form.firstElementChild);
    }

    var status = form.querySelector('[data-form-status]') || el('<p class="notice" data-form-status></p>');
    if (!status.parentNode) form.appendChild(status);
    function say(text) { status.textContent = text; }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      var input = {
        candidateDate1: (form.querySelector('#date1') || {}).value || '',
        candidateDate2: (form.querySelector('#date2') || {}).value || '',
        candidateDate3: (form.querySelector('#date3') || {}).value || '',
        partnerBirth: (form.querySelector('#partnerBirth') || {}).value || '',
        partnerTime: (form.querySelector('#partnerTime') || {}).value || '',
        format: (form.querySelector('#format') || {}).value || '',
        familyLimit: (form.querySelector('#familyLimit') || {}).value || '',
      };
      if (!input.candidateDate1) {
        say('후보일을 하나 이상 골라 주세요. 날짜가 있어야 조건을 비교할 수 있습니다.');
        var first = form.querySelector('#date1');
        if (first) first.focus();
        return;
      }
      try {
        sessionStorage.setItem(INPUT_KEY, JSON.stringify(input));
      } catch (err) {
        /* 저장이 막히면 이번 요청만 진행한다. */
      }

      var button = form.querySelector('button[type="submit"], .cta');
      if (button) { if (button.disabled) return; button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      say('고른 후보일을 두 사람 명식과 겹쳐 조건을 세고 있습니다.');
      try {
        var result = await analyze(input);
        say('비교를 마쳤습니다. 무료 방향으로 이동합니다.');
        location.assign(SERVICE.base + '/04-step-4-report/index.html?reportId=' + encodeURIComponent(window.UMSHReportAccess.identity(result)) + '#step-4-report');
      } catch (err) {
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
        if (err && (err.status === 401 || err.status === 403)) {
          say('로그인 후 이어서 볼 수 있습니다. 로그인 화면으로 이동합니다.');
          location.assign(loginUrl());
          return;
        }
        if (err && err.code === 'PROFILE_REQUIRED') {
          say('기본 사주 정보를 먼저 등록해 주세요.');
          location.assign('/signup?entry=' + SERVICE.entry);
          return;
        }
        say(err && err.message ? err.message : '비교를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }, true);
  }


  // Only freshly authorized responses may populate the original design.
  function render(payload) {
    var root = document.querySelector('#step-4-report, #step-5-chat, #step-6_1-report');
    if (!root) return false;
    var report = payload.report;
    var preview = payload.preview || {};
    var teaser = root.id === 'step-4-report';
    if (!teaser && (!report || payload.previewOnly)) return false;
    var sections = sectionsOf(payload).map(function (s) {
      return s.status === 'complete' ? s : Object.assign({}, s, { interpretation: s.status === 'failed' ? '이 항목을 완성하지 못했습니다.' : '해석을 준비하고 있습니다.', hook: '' });
    });
    var id = window.UMSHReportAccess.identity(payload);
    function url(step, section) {
      return SERVICE.base + '/' + step + '?reportId=' + encodeURIComponent(id) + (section ? '&section=' + encodeURIComponent(section) : '');
    }
    var indexUrl = url('05-step-5-chat/chat.html');
    function put(scope, selector, value) {
      var node = scope.querySelector(selector);
      if (node) node.textContent = value || '';
    }
    if (teaser) {
      put(root, 'h1', preview.headline || preview.title || (report && report.title) || SERVICE.title);
      put(root, '.visual .copy > p', preview.summary || (report && report.subtitle) || '');
      var panels = root.querySelectorAll('.panel p');
      if (panels[0]) panels[0].textContent = preview.summary || (sections[0] && sections[0].interpretation.split('\n\n')[0]) || '해석을 준비하고 있습니다.';
      if (panels[1]) {
        var lines = preview.signals || preview.insights || [];
        panels[1].replaceChildren();
        lines.forEach(function(line) { var p = document.createElement('span'); p.className = 'preview-line'; p.textContent = line; panels[1].appendChild(p); });
        if (!lines.length) panels[1].textContent = preview.paidValue || '6개 주제 · 21개 항목을 전체 풀이에서 확인합니다.';
      }
      root.querySelectorAll('a.item, a.cta').forEach(function (link) {
        link.href = payload.previewOnly ? payload.paymentUrl || '/payment?product=wedding_day&reportId=' + encodeURIComponent(id) : indexUrl;
      });
      if (!payload.previewOnly) put(root, 'a.cta', '전체 해석 목차 보기');
    } else if (root.id === 'step-5-chat') {
      put(root, 'h1', report.title);
      put(root, '.visual .copy > p', report.subtitle);
      root.querySelectorAll('.chat').forEach(function(node) { node.hidden = true; });
      var groups = groupSections(sections);
      var lists = root.querySelectorAll('.list');
      lists.forEach(function(list) { list.replaceChildren(); });
      groups.forEach(function(group, n) {
        var list = lists[n < 2 ? 0 : 1] || lists[0];
        if (!list) return;
        list.appendChild(el('<h3 class="group-heading">' + escapeHtml(group.title) + '</h3>'));
        group.items.forEach(function(section) {
          list.appendChild(el('<a class="item" href="' + escapeHtml(url('06-step-6_1-report-detail/index.html', section.id)) + '"><strong>' + escapeHtml(section.classification) + '</strong><span>' + escapeHtml(section.hook || section.interpretation.split('\n\n')[0]) + '</span></a>'));
        });
      });
    } else {
      var wanted = new URLSearchParams(location.search).get('section');
      var current = sections.find(function(s) {return s.id === wanted || s.id === wanted + '-1';}) || sections[0];
      if (!current) return false;
      put(root, '[data-title]', current.classification);
      put(root, '[data-subtitle]', current.category);
      put(root, '[data-conclusion]', current.hook);
      put(root, '[data-evidence]', (current.ragTopics || []).join(' · ') || '입력한 후보일과 사주 정보를 바탕으로 비교합니다.');
      var body = root.querySelector('[data-body]');
      if (body) {
        body.replaceChildren();
        String(current.interpretation || '').split(/\n\s*\n/).filter(Boolean).forEach(function(block) {
          var section = document.createElement('div');
          var match = block.match(/^\s*\[([^\]]+)\]\s*/);
          if (match) { var heading = document.createElement('h3'); heading.textContent = match[1]; section.appendChild(heading); block = block.slice(match[0].length); }
          var p = document.createElement('p'); p.textContent = block; section.appendChild(p); body.appendChild(section);
        });
      }
      put(root, '[data-reading-progress]', '21개 항목 중 ' + (sections.indexOf(current) + 1) + '번째 · ' + (current.status === 'complete' ? '해석 완료' : current.status === 'failed' ? '다시 불러오기 필요' : '해석 작성 중'));
      var chooser = root.querySelector('[data-section-select]');
      if (chooser) {
        chooser.replaceChildren();
        sections.forEach(function(s) { var option = document.createElement('option'); option.value = s.id; option.textContent = s.id + ' · ' + s.classification; chooser.appendChild(option); });
        chooser.value = current.id;
        chooser.onchange = function() { location.assign(url('06-step-6_1-report-detail/index.html', chooser.value)); };
      }
      var retry = root.querySelector('[data-retry-section]');
      if (retry) { retry.hidden = current.status !== 'failed'; retry.dataset.retrySection = current.id; }

      put(root, '[data-action]', current.status === 'complete' ? '후보일마다 실제 준비 조건을 함께 확인하세요.' : '완료된 항목부터 확인할 수 있습니다.');
      var at = sections.indexOf(current);
      ['prev', 'next'].forEach(function (direction, n) {
        var section = sections[(at + (n ? 1 : sections.length - 1)) % sections.length];
        var link = root.querySelector('[data-' + direction + ']');
        if (link) { link.href = url('06-step-6_1-report-detail/index.html', section.id); link.textContent = (n ? '다음: ' : '이전: ') + section.classification; }
      });
      root.querySelectorAll('a[href*="05-step"]').forEach(function(link) { link.href = indexUrl; });
    }
    var guardLayout = document.getElementById('umsh-verified-layout');
    var sharedTop = guardLayout && guardLayout.querySelector('[data-umsh-service-top]');
    if (sharedTop) {
      root.querySelector('[data-umsh-service-top]')?.remove();
      root.prepend(sharedTop);
    }
    guardLayout?.remove();
    document.documentElement.removeAttribute('data-umsh-report-check');
    document.documentElement.removeAttribute('data-umsh-verified-reader');
    document.querySelectorAll('[data-report-concealed]').forEach(function(node) {
      node.hidden = false; node.style.removeProperty('display'); node.removeAttribute('data-report-concealed');
    });
    if (window.UMSHChrome && !root.querySelector('.umsh-service-shell')) window.UMSHChrome.mount({root: '#' + root.id, service: SERVICE.title, price: SERVICE.price, category: '택일'});
    return true;
  }
  window.UMSHWeddingReading = { render: render };
  function start() {
    var input = document.querySelector('#step-2-saju-input');
    if (input) setupInput(input);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
