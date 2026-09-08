/**
 * 우리 결혼, 이날 해도 될까? — 01~06_1 흐름의 클라이언트 브리지.
 *
 * 디자인 페이지는 정적 목업으로 왔다. 02 는 본인 생년월일을 다시 묻고, 04·05·06 은
 * 예시 문장을 들고 있다. 이 파일이 그 자리를 계정의 실제 사주와 후보일 판정으로 바꾼다.
 *
 * 서버가 두 사람의 명식과 후보일 일주를 계산하므로 02 는 후보일과 상대 생년월일만 받고,
 * 본인 값은 저장된 프로필에서 온다. 결과는 sessionStorage 에 두고 04·05·06 이 다시 읽는다.
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

  var STORE_KEY = 'umsh_wedding_report_v1';
  var api = {};

  // ------------------------------------------------------------------ 저장소

  function readReport() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeReport(payload) {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch (err) {
      /* 저장이 막혀도 화면은 이번 응답으로 계속 그린다. */
    }
  }

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
        return await window.UMSHAuthSession.enforceDeviceAuthSession(got.data.session, client);
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
    var res = await fetch(path, {
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
    writeReport(payload);
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
      if (button) button.setAttribute('aria-busy', 'true');
      say('고른 후보일을 두 사람 명식과 겹쳐 조건을 세고 있습니다.');
      try {
        await analyze(input);
        say('비교를 마쳤습니다. 무료 방향으로 이동합니다.');
        location.assign(SERVICE.base + '/04-step-4-report/index.html#step-4-report');
      } catch (err) {
        if (button) button.removeAttribute('aria-busy');
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

  // ------------------------------------------------------------------ 04 티저

  /** 04 는 후보일 판정 몇 줄만 열고, 유료로 열리는 목차는 숨기지 않는다. */
  function renderTeaser(root, payload) {
    var sections = sectionsOf(payload);
    if (sections.length === 0) return;
    var meta = reportMeta(payload);
    var groups = groupSections(sections);
    var first = sections[0];

    var host = el('<section class="visual" data-wedding-teaser></section>');
    var body = el('<div class="copy section"></div>');
    body.appendChild(el('<div class="eyebrow"><span class="dot"></span> WEDDING DAY</div>'));
    body.appendChild(el('<h2>' + escapeHtml(first.hook || '') + '</h2>'));
    if (meta.subtitle) body.appendChild(el('<p>' + escapeHtml(meta.subtitle) + '</p>'));
    String(first.interpretation || '').split('\n\n').slice(0, 3).forEach(function (line) {
      body.appendChild(el('<p>' + escapeHtml(line) + '</p>'));
    });

    var scope = el('<div class="grid" data-wedding-scope></div>');
    groups.forEach(function (group) {
      scope.appendChild(el(
        '<article class="card"><h3>' + escapeHtml(group.title) + '</h3>'
        + '<p>' + escapeHtml(group.items.map(function (s) { return s.classification; }).join(' · ')) + '</p></article>',
      ));
    });
    body.appendChild(el('<h2 style="margin-top:22px">결제 후 이어서 봅니다</h2>'));
    body.appendChild(el('<p>' + groups.length + '개 대분류 · ' + sections.length + '개 중분류를 한 칸씩 봅니다.</p>'));
    body.appendChild(scope);
    body.appendChild(el('<a class="cta" href="' + SERVICE.base + '/05-step-5-chat/chat.html#step-5-chat">전체 보기 · ' + escapeHtml(SERVICE.price) + '</a>'));

    host.appendChild(body);
    root.appendChild(host);
  }

  // ------------------------------------------------------------------ 05 목차

  /** 05 는 실제 대분류·중분류 목록이고, 각 항목은 06 상세로 연결된다. */
  function renderIndex(root, payload) {
    var sections = sectionsOf(payload);
    if (sections.length === 0) return;
    var groups = groupSections(sections);

    var host = el('<section class="visual" data-wedding-index></section>');
    var body = el('<div class="copy section"></div>');
    body.appendChild(el('<div class="eyebrow"><span class="dot"></span> REPORT INDEX</div>'));
    body.appendChild(el('<h2>' + escapeHtml(reportMeta(payload).title || SERVICE.title) + '</h2>'));
    if (reportMeta(payload).subtitle) body.appendChild(el('<p>' + escapeHtml(reportMeta(payload).subtitle) + '</p>'));

    groups.forEach(function (group, order) {
      var block = el('<div style="margin-top:20px"></div>');
      block.appendChild(el('<div class="eyebrow"><span class="dot"></span> ' + escapeHtml(group.eyebrow || ('PART ' + (order + 1))) + '</div>'));
      block.appendChild(el('<h3 style="margin:0 0 8px">' + escapeHtml(group.title) + '</h3>'));
      var list = el('<div class="grid"></div>');
      group.items.forEach(function (section) {
        list.appendChild(el(
          '<a class="card" href="' + SERVICE.base + '/06-step-6_1-report-detail/index.html?section='
          + encodeURIComponent(section.id) + '#step-6_1-report">'
          + '<h3>' + escapeHtml(section.classification) + '</h3>'
          + '<p>' + escapeHtml(String(section.interpretation || '').split('\n\n')[0]) + '</p></a>',
        ));
      });
      block.appendChild(list);
      body.appendChild(block);
    });

    host.appendChild(body);
    root.appendChild(host);
  }

  // ------------------------------------------------------------------ 06 상세

  /**
   * 06 은 디자인의 하드코딩 예시를 실제 섹션으로 바꾼다. `?section=` 은 중분류 id
   * (`1-1`)이고, 디자인의 기존 링크는 대분류 번호(`3`)로 오므로 그 대분류의 첫 항목으로 받는다.
   */
  function renderDetail(root, payload) {
    var sections = sectionsOf(payload);
    if (sections.length === 0) return;
    var wanted = new URLSearchParams(location.search).get('section') || '';
    var current = sections.filter(function (s) { return String(s.id) === wanted; })[0];
    if (!current && /^\d+$/.test(wanted)) {
      // 디자인의 기존 링크는 대분류 번호(`3`)로 온다. 그 대분류의 첫 항목으로 받는다.
      current = sections.filter(function (s) { return String(s.id).indexOf(wanted + '-') === 0; })[0];
    }
    if (!current) current = sections[0];

    var at = sections.indexOf(current);
    var prev = sections[(at - 1 + sections.length) % sections.length];
    var next = sections[(at + 1) % sections.length];

    var detailRoot = root.querySelector('[data-detail-root]') || root;
    var paragraphs = String(current.interpretation || '').split('\n\n');

    function put(selector, value) {
      var node = detailRoot.querySelector(selector);
      if (node) node.textContent = value;
    }
    // 이 디자인의 06 은 data-title / data-subtitle / data-conclusion / data-evidence /
    // data-body / data-action 자리에 예시 문장을 넣어 둔다. 같은 자리에 실제 값을 쓴다.
    put('[data-title]', current.classification || '');
    put('[data-subtitle]', current.category || '');
    put('[data-conclusion]', paragraphs[1] || paragraphs[0] || '');
    put('[data-evidence]', (current.ragTopics || []).join(' · '));
    put('[data-body]', paragraphs[2] || paragraphs[1] || '');
    put('[data-action]', current.hook || '');

    // 남은 문단은 본문 자리 뒤에 이어 붙인다.
    var host = el('<div class="copy section" data-wedding-detail></div>');
    paragraphs.slice(3).forEach(function (line) {
      host.appendChild(el('<p>' + escapeHtml(line) + '</p>'));
    });
    if (host.children.length > 0) {
      var bodyNode = detailRoot.querySelector('[data-body]');
      if (bodyNode && bodyNode.parentNode) bodyNode.parentNode.appendChild(host);
      else detailRoot.appendChild(host);
    }

    var prevLink = detailRoot.querySelector('[data-prev], [data-prev-section]');
    var nextLink = detailRoot.querySelector('[data-next], [data-next-section]');
    if (prevLink) {
      prevLink.href = SERVICE.base + '/06-step-6_1-report-detail/index.html?section=' + encodeURIComponent(prev.id) + '#step-6_1-report';
      prevLink.textContent = '이전: ' + prev.classification;
    }
    if (nextLink) {
      nextLink.href = SERVICE.base + '/06-step-6_1-report-detail/index.html?section=' + encodeURIComponent(next.id) + '#step-6_1-report';
      nextLink.textContent = '다음: ' + next.classification;
    }
  }

  // ------------------------------------------------------------------ 진입

  /** 저장된 리포트가 있으면 그대로 쓰고, 없으면 저장된 입력으로 한 번만 계산한다. */
  async function ensureReport(root) {
    var stored = readReport();
    if (sectionsOf(stored).length > 0) return stored;
    var input = readInput();
    if (!input || !input.candidateDate1) {
      root.appendChild(noticeBar(
        '후보일을 먼저 골라 주세요. 날짜가 있어야 두 사람 명식과 겹쳐 조건을 셀 수 있습니다.',
        '후보일 입력하기',
        function () { location.assign(SERVICE.base + '/02-step-2-saju-input/index.html#step-2-saju-input'); },
      ));
      return null;
    }
    try {
      return await analyze(input);
    } catch (err) {
      if (err && (err.status === 401 || err.status === 403)) {
        root.appendChild(noticeBar(
          '로그인하면 계정에 저장된 사주로 후보일을 비교합니다. 지금 화면의 문장은 예시입니다.',
          '로그인하고 내 결과 보기',
          function () { location.assign(loginUrl()); },
        ));
        return null;
      }
      if (err && err.code === 'PROFILE_REQUIRED') {
        root.appendChild(noticeBar(
          '기본 사주 정보를 등록하면 바로 이어서 볼 수 있습니다.',
          '사주 등록하기',
          function () { location.assign('/signup?entry=' + SERVICE.entry); },
        ));
        return null;
      }
      if (err && err.status === 402) {
        root.appendChild(noticeBar(
          '결제 후 전체 풀이가 열립니다.',
          '결제하고 전체 보기 · ' + SERVICE.price,
          function () { location.assign(err.paymentUrl || (SERVICE.base + '/04-step-4-report/index.html')); },
        ));
        return null;
      }
      root.appendChild(noticeBar(err && err.message ? err.message : '풀이를 불러오지 못했습니다.', '', null));
      return null;
    }
  }

  async function start() {
    var input = document.querySelector('#step-2-saju-input');
    if (input) {
      setupInput(input);
      return;
    }

    var teaser = document.querySelector('#step-4-report');
    if (teaser) {
      var forTeaser = await ensureReport(teaser);
      if (forTeaser) renderTeaser(teaser, forTeaser);
      return;
    }

    var index = document.querySelector('#step-5-chat');
    if (index) {
      var forIndex = await ensureReport(index);
      if (forIndex) renderIndex(index, forIndex);
      return;
    }

    var detail = document.querySelector('#step-6_1-report');
    if (detail) {
      var forDetail = await ensureReport(detail);
      if (forDetail) renderDetail(detail, forDetail);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
