(function (global) {
  'use strict';

  /**
   * 운명상회 공용 로딩 오버레이.
   *
   * 2026-09-14 통일: 화면은 /cmdg/ 의 해석 로딩(오브 + 진행 바 + 3단계 칩)으로 맞추고,
   * 서비스 이름만 주입해 같은 UI 안에서 어느 서비스인지 드러낸다. 서비스별로 따로
   * 로딩을 그리면 같은 제품인데 단계마다 다른 화면이 나온다.
   *
   * 서비스 이름은 넘기지 않아도 된다. 등록 디자인이 이미 `data-service` 로 들고 있다.
   */

  var ROOT_ID = 'umsh-loading-root';
  var HIDE_MS = 180;
  var DEFAULT_STEPS = ['기운 열기', '기운 맞춤', '풀이 열기'];
  var DEFAULT_TITLE = '해석을 준비하고 있습니다';
  var DEFAULT_SUBTITLE = '입력한 사주 기둥과 지금의 기운을 맞춰<br />자네에게만 열리는 풀이를 준비하네';

  var open = false;
  var hideTimer = null;
  var root = null;
  var pillEl = null;
  var copyEl = null;
  var stepsEl = null;
  var copy = { title: '', subtitle: '', service: '', steps: null };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * 페이지가 이미 들고 있는 서비스 이름. 호출부가 따로 넘길 필요가 없다.
   *
   * 주의: `umsh-report-access.js` 가 만드는 `#umsh-verified-layout` 도
   * `data-service="저장된 해석"` 을 달고 있다. 그걸 집으면 "저장된 해석 해석 중" 처럼
   * 겹친 문구가 나온다(2026-09-14 /place/home 확인). 등록 디자인 껍데기를 먼저 본다.
   */
  var GENERIC_SERVICE_NAMES = ['저장된 해석', '오늘운'];

  function detectService() {
    var selectors = [
      '#step-6_1-report[data-service]',
      '#step-5-chat[data-service]',
      '#step-4-report[data-service]',
      '.phone[data-service]',
      '[data-umsh-chrome][data-service]',
      '[data-service]',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        if (node.id === 'umsh-verified-layout') continue;
        if (node.closest && node.closest('#umsh-verified-layout')) continue;
        var name = String(node.getAttribute('data-service') || '').trim();
        if (name && GENERIC_SERVICE_NAMES.indexOf(name) === -1) return name;
      }
    }
    return '';
  }

  /** "…해석" 으로 끝나는 이름에 " 해석 중"을 붙이면 말이 겹친다. */
  function pillFor(service) {
    if (!service) return DEFAULT_TITLE;
    return /해석$/.test(service) ? service + ' 준비 중' : service + ' 해석 중';
  }

  function ensureStyle() {
    if (document.querySelector('link[href*="umsh-loading.css"]') || document.getElementById('umsh-loading-style')) return;
    var link = document.createElement('link');
    link.id = 'umsh-loading-style';
    link.rel = 'stylesheet';
    link.href = '/css/umsh-loading.css';
    document.head.appendChild(link);
  }

  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    ensureStyle();
    root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML =
        '<div class="umsh-loading-card" role="status" aria-live="polite">' +
          '<div class="umsh-loading-orb" aria-hidden="true"></div>' +
          '<div class="umsh-loading-copy">' +
            '<div class="umsh-loading-pill"></div>' +
            '<p class="umsh-loading-subtitle"></p>' +
          '</div>' +
          '<div class="umsh-loading-progress" aria-hidden="true"></div>' +
          '<div class="umsh-loading-steps" aria-hidden="true"></div>' +
        '</div>';
      document.body.appendChild(root);
    }
    pillEl = root.querySelector('.umsh-loading-pill');
    copyEl = root.querySelector('.umsh-loading-subtitle');
    stepsEl = root.querySelector('.umsh-loading-steps');
    applyCopy();
    return root;
  }

  function applyCopy() {
    if (!pillEl || !copyEl || !stepsEl) return;

    var service = copy.service || detectService();
    // 제목을 직접 준 쪽이 우선. 아니면 서비스 이름으로 만든다.
    var pill = copy.title || pillFor(service);
    pillEl.textContent = pill;

    // 부제는 줄바꿈만 허용한다. 나머지는 그대로 이스케이프한다.
    var subtitle = typeof copy.subtitle === 'string' && copy.subtitle !== '' ? copy.subtitle : DEFAULT_SUBTITLE;
    copyEl.innerHTML = escapeHtml(subtitle).replace(/&lt;br\s*\/?&gt;/gi, '<br />');

    var steps = Array.isArray(copy.steps) && copy.steps.length ? copy.steps.slice(0, 3) : DEFAULT_STEPS;
    stepsEl.innerHTML = steps.map(function (label) {
      return '<span>' + escapeHtml(label) + '</span>';
    }).join('');
  }

  function normalizeCopy(next) {
    var source = next && typeof next === 'object' ? next : {};
    return {
      title: typeof source.title === 'string' ? source.title : '',
      subtitle: typeof source.subtitle === 'string' ? source.subtitle : '',
      service: typeof source.service === 'string' ? source.service : '',
      steps: Array.isArray(source.steps) ? source.steps : null,
    };
  }

  function setBodyLock(locked) {
    var body = document.body;
    if (!body) return;
    body.classList.toggle('umsh-loading-lock', locked);
    if (locked) body.setAttribute('aria-busy', 'true');
    else body.removeAttribute('aria-busy');
  }

  function setCopy(next) {
    copy = normalizeCopy(next);
    ensureRoot();
    applyCopy();
  }

  function show(next) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (next && typeof next === 'object') copy = normalizeCopy(next);
    ensureRoot();
    applyCopy();
    root.classList.remove('is-closing');
    root.setAttribute('aria-hidden', 'false');
    setBodyLock(true);
    void root.offsetWidth; // 최초 주입 시에도 열기 전환이 재생되게 한다
    root.classList.add('is-open');
    open = true;
  }

  function hide() {
    if (!open && !(root && root.classList.contains('is-open'))) { open = false; return; }
    ensureRoot();
    root.classList.add('is-closing');
    root.classList.remove('is-open');
    open = false;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      hideTimer = null;
      if (!root) return;
      root.classList.remove('is-closing');
      root.setAttribute('aria-hidden', 'true');
      setBodyLock(false);
    }, HIDE_MS);
  }

  function isOpen() { return open; }

  function bindToggle(getDefaultCopy) {
    return function setLoading(on, nextCopy) {
      if (on) {
        var fallback = typeof getDefaultCopy === 'function' ? getDefaultCopy() : getDefaultCopy;
        show(nextCopy || fallback || {});
      } else {
        hide();
      }
    };
  }

  var api = {
    show: show,
    hide: hide,
    setCopy: setCopy,
    isOpen: isOpen,
    bindToggle: bindToggle,
    detectService: detectService,
  };

  global.UMSHLoading = api;
  // `umsh-progressive-report.js` 는 `UmshLoading` 으로 부르고 있었다. 철자가 달라
  // 가드에 걸려 조용히 무시돼 왔다(2026-09-14 확인). 두 이름을 같이 내보낸다.
  global.UmshLoading = api;
})(typeof window !== 'undefined' ? window : globalThis);
