/**
 * 내 2027년, 풀릴 각이야? — 01~06_1 흐름의 클라이언트 브리지.
 *
 * 디자인 페이지는 정적 목업으로 왔다. 02 는 생년월일을 다시 묻고, 04·05·06 은 예시
 * 문장을 그대로 들고 있다. 이 파일이 그 자리를 계정의 실제 사주로 바꾼다.
 *
 * 서버가 사주를 계산하므로 02 는 저장된 프로필을 확인만 하고, 분석은
 * POST /api/flow/newyear/analyze 한 번으로 끝난다. 결과는 sessionStorage 에 두고
 * 04·05·06 이 같은 리포트를 다시 읽는다.
 */
(function () {
  'use strict';

  var SERVICE = {
    key: 'newyear_flow',
    slug: 'newyear',
    title: '내 2027년, 풀릴 각이야?',
    price: '19,900원',
    entry: 'newyear',
    year: 2027,
    base: '/flow/newyear',
  };

  var STORE_KEY = 'umsh_newyear_report_v1';
  var api = { config: null, client: null, session: null };

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
        api.config = await fetch('/api/auth/config').then(function (r) { return r.json(); });
        if (!api.config || !api.config.enabled) return null;
        api.client = window.UMSHAuthSession.createClient(window.supabase, api.config.url, api.config.publishableKey);
        var got = await api.client.auth.getSession();
        api.session = await window.UMSHAuthSession.enforceDeviceAuthSession(got.data.session, api.client);
        return api.session;
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

  async function request(path, options) {
    var session = await initAuth();
    var opts = options || {};
    var res = await fetch(path, {
      method: opts.method || 'GET',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        session && session.access_token ? { Authorization: 'Bearer ' + session.access_token } : {},
      ),
      body: opts.body,
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

  async function analyze() {
    var payload = await request('/api/flow/newyear/analyze', { method: 'POST', body: JSON.stringify({}) });
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
    var report = payload && (payload.report || payload.analysis && payload.analysis.report);
    return (report && report.sections) || [];
  }

  function reportMeta(payload) {
    var report = payload && (payload.report || payload.analysis && payload.analysis.report);
    return report || {};
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
      '<div class="copy section" data-newyear-notice style="border:1px solid rgba(212,175,106,.36);border-radius:12px;margin:14px 18px;padding:14px">'
      + '<p style="margin:0 0 10px">' + escapeHtml(message) + '</p>'
      + (actionLabel ? '<a class="cta" href="#" data-newyear-action>' + escapeHtml(actionLabel) + '</a>' : '')
      + '</div>',
    );
    var action = bar.querySelector('[data-newyear-action]');
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
   * 02 는 계정에 이미 있는 생년월일을 다시 묻지 않는다. 프로필이 있으면 확인만 하고
   * 바로 분석으로 넘기고, 없으면 사주 등록으로 보낸다.
   */
  function setupInput(root) {
    var form = root.querySelector('form[data-route]');
    if (!form) return;

    var status = el('<p data-newyear-status style="margin:12px 18px;color:#D4AF6A;font-size:13px"></p>');
    form.parentNode.insertBefore(status, form);
    function say(text) { status.textContent = text; }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var button = form.querySelector('button[type="submit"], .cta');
      if (button) button.setAttribute('aria-busy', 'true');
      say('계정에 저장된 사주로 ' + SERVICE.year + '년 흐름을 계산하고 있습니다.');
      try {
        await analyze();
        say('풀이를 준비했습니다. 무료 방향으로 이동합니다.');
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
        say(err && err.message ? err.message : '풀이를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }, true);
  }

  // ------------------------------------------------------------------ 04 티저

  /** 04 는 계산된 사실 몇 줄만 보여주고, 유료로 열리는 목차를 숨기지 않는다. */
  function renderTeaser(root, payload) {
    var sections = sectionsOf(payload);
    if (sections.length === 0) return;
    var meta = reportMeta(payload);
    var groups = groupSections(sections);
    var first = sections[0];

    var host = el('<section class="visual" data-newyear-teaser></section>');
    var body = el('<div class="copy section"></div>');
    body.appendChild(el('<div class="eyebrow"><span class="dot"></span> ' + escapeHtml(SERVICE.year) + ' FLOW</div>'));
    body.appendChild(el('<h2>' + escapeHtml(first.hook || '') + '</h2>'));
    if (meta.subtitle) body.appendChild(el('<p>' + escapeHtml(meta.subtitle) + '</p>'));

    // 첫 대분류의 첫 두 문단만 맛보기로 연다.
    var opening = String(first.interpretation || '').split('\n\n').slice(0, 2);
    opening.forEach(function (line) {
      body.appendChild(el('<p>' + escapeHtml(line) + '</p>'));
    });

    var scope = el('<div class="grid" data-newyear-scope></div>');
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

    var host = el('<section class="visual" data-newyear-index></section>');
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
   * (`1-1` 같은 값)이고, 예전 링크가 숫자로 오면 순번으로 받는다.
   */
  function renderDetail(root, payload) {
    var sections = sectionsOf(payload);
    if (sections.length === 0) return;
    var wanted = new URLSearchParams(location.search).get('section') || '';
    var current = sections.filter(function (s) { return String(s.id) === wanted; })[0];
    if (!current && /^\d+$/.test(wanted)) {
      var n = Math.min(Math.max(parseInt(wanted, 10), 1), sections.length);
      current = sections[n - 1];
    }
    if (!current) current = sections[0];

    var at = sections.indexOf(current);
    var prev = sections[(at - 1 + sections.length) % sections.length];
    var next = sections[(at + 1) % sections.length];

    // 디자인 목업이 채워 둔 자리를 비우고 실제 문장으로 다시 그린다.
    var mock = root.querySelector('[data-detail-cards]');
    if (mock) mock.innerHTML = '';
    var bars = root.querySelector('[data-detail-bars]');
    if (bars) bars.innerHTML = '';
    var table = root.querySelector('[data-detail-table]');
    if (table) table.innerHTML = '';

    function put(selector, value, asHtml) {
      var node = root.querySelector(selector);
      if (!node) return;
      if (asHtml) node.innerHTML = value;
      else node.textContent = value;
    }
    put('[data-detail-kicker]', current.category || '');
    put('[data-detail-title]', escapeHtml(current.classification || ''), true);
    put('[data-detail-summary]', String(current.interpretation || '').split('\n\n')[0]);
    put('[data-detail-verdict]', current.hook || '');
    put('[data-detail-basis]', (current.ragTopics || []).join(' · '));

    var host = el('<div class="copy section" data-newyear-detail></div>');
    String(current.interpretation || '').split('\n\n').slice(1).forEach(function (line) {
      host.appendChild(el('<p>' + escapeHtml(line) + '</p>'));
    });
    (root.querySelector('[data-detail-cards]') || root).appendChild(host);

    var prevLink = root.querySelector('[data-prev-section]');
    var nextLink = root.querySelector('[data-next-section]');
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

  /** 저장된 리포트가 있으면 그대로 쓰고, 없으면 한 번만 계산한다. */
  async function ensureReport(root) {
    var stored = readReport();
    if (sectionsOf(stored).length > 0) return stored;
    try {
      return await analyze();
    } catch (err) {
      if (err && (err.status === 401 || err.status === 403)) {
        root.appendChild(noticeBar(
          '로그인하면 계정에 저장된 사주로 ' + SERVICE.year + '년 흐름을 계산합니다. 지금 화면의 문장은 예시입니다.',
          '로그인하고 내 흐름 보기',
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
