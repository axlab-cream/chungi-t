/**
 * 약관·개인정보 동의 묶음 (2026-10-15). 계획: docs/auth/guest-member-plan.md
 * 비회원 무료 결과 시트와 로그인 화면(/signup#login)이 같이 쓴다.
 * - 필수: 이용약관, 개인정보 수집·이용, 만 14세 이상. 선택: 마케팅 정보 수신.
 * - 필수를 빼고 SNS 버튼을 누르면 빠진 줄이 좌우로 흔들리고 빨간 테두리와 안내 한 줄이 나온다.
 * - 동의 값은 로그인으로 넘어가는 동안 이 탭(sessionStorage)에만 들고 있다가, 회원 세션이 생기면
 *   umsh-auth-session.js 가 서버(POST /api/consents)에 기록한다. 이 브라우저에 남기는 건 "동의했음" 버전 표시뿐이다.
 * - 동의 기록 API 가 실패해도 로그인을 막지 않는다.
 */
(function (global) {
  'use strict';

  var VERSION_FALLBACK = '2026-10-15';
  var PENDING_KEY = 'umsh_consent_pending_v1';
  var DRAFT_KEY = 'umsh_consent_draft_v1';
  var OK_KEY = 'umsh_consent_ok_v1';
  var PENDING_MAX_MS = 24 * 60 * 60 * 1000;
  var REQUIRED = ['terms', 'privacy', 'age14'];
  var ITEMS = [
    { key: 'terms', label: '이용약관', required: true, href: '/terms' },
    { key: 'privacy', label: '개인정보 수집·이용', required: true, href: '/privacy' },
    { key: 'age14', label: '만 14세 이상입니다', required: true },
    { key: 'marketing', label: '마케팅 정보 수신', required: false, href: '/privacy#marketing' },
  ];

  var CSS = [
    '.umsh-cs{position:relative;z-index:1;margin:0 0 12px;font-size:13px;line-height:1.4;color:#f6ead6;word-break:keep-all}',
    '.umsh-cs *{box-sizing:border-box}',
    '.umsh-cs-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:32px;padding:2px 8px;border:1px solid transparent;border-radius:8px}',
    '.umsh-cs-row label{display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer}',
    '.umsh-cs-row input{flex:none;width:18px;height:18px;margin:0;accent-color:#d6b26e;cursor:pointer}',
    '.umsh-cs-row a{flex:none;padding:4px 2px;color:rgba(246,234,214,.6);font-size:12px;text-decoration:underline;text-underline-offset:3px}',
    '.umsh-cs-all{margin-bottom:4px;border-color:rgba(214,178,110,.28);background:rgba(246,234,214,.05);font-weight:700}',
    '.umsh-cs-tag{flex:none;color:#d6b26e;font-weight:700}',
    '.umsh-cs-tag.optional{color:rgba(246,234,214,.55)}',
    '.umsh-cs-row.is-missing{border-color:#ff6b5e;background:rgba(255,107,94,.08)}',
    '.umsh-cs-row.is-shaking{animation:umsh-cs-shake .42s cubic-bezier(.36,.07,.19,.97)}',
    '@keyframes umsh-cs-shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}',
    '.umsh-cs-alert{min-height:0;margin:4px 8px 0;color:#ff8a7e;font-size:12px;font-weight:700}',
    '.umsh-cs-alert:empty{display:none}',
    '.umsh-cs-done{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(246,234,214,.05);color:rgba(246,234,214,.75)}',
    '.umsh-cs-done button{border:0;background:transparent;color:rgba(246,234,214,.6);font:inherit;font-size:12px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}',
    '.umsh-cs-sheet-backdrop{position:fixed;inset:0;z-index:9992;background:rgba(6,4,3,.4)}',
    '.umsh-cs-sheet{position:fixed;left:50%;bottom:0;z-index:9993;box-sizing:border-box;width:100%;max-width:480px;max-height:70vh;max-height:70dvh;overflow:auto;transform:translateX(-50%);',
    'padding:16px 20px calc(16px + env(safe-area-inset-bottom));border-radius:18px 18px 0 0;border:1px solid rgba(214,178,110,.28);border-bottom:0;background:#15100d;color:#f6ead6;',
    'box-shadow:0 -12px 32px rgba(0,0,0,.38);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;word-break:keep-all;line-height:1.45}',
    '.umsh-cs-sheet-title{margin:0 0 4px;font-size:16px;font-weight:700}',
    '.umsh-cs-sheet-sub{margin:0 0 12px;font-size:13px;color:rgba(246,234,214,.66)}',
    '.umsh-cs-submit{display:block;width:100%;min-height:48px;border:0;border-radius:10px;background:#d6b26e;color:#15100d;font:inherit;font-size:15px;font-weight:700;cursor:pointer}',
    '.umsh-cs-submit.is-inactive{opacity:.55}',
    '.umsh-cs-logout{display:block;margin:10px auto 0;padding:6px 12px;border:0;background:transparent;color:rgba(246,234,214,.6);font:inherit;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}',
    '@media (prefers-reduced-motion:reduce){.umsh-cs-row.is-shaking{animation:none}}',
  ].join('');

  function safeGet(store, key) { try { return store.getItem(key); } catch (_e) { return null; } }
  function safeSet(store, key, value) { try { store.setItem(key, value); } catch (_e) { /* 저장소가 막힌 브라우저 */ } }
  function safeRemove(store, key) { try { store.removeItem(key); } catch (_e) { /* 저장소가 막힌 브라우저 */ } }
  function readJson(store, key) { try { return JSON.parse(safeGet(store, key) || 'null'); } catch (_e) { return null; } }

  function injectStyle() {
    if (!global.document || global.document.getElementById('umsh-cs-style')) return;
    var style = global.document.createElement('style');
    style.id = 'umsh-cs-style';
    style.textContent = CSS;
    global.document.head.appendChild(style);
  }

  var currentVersion = VERSION_FALLBACK;
  var versionPromise = null;
  /** 지금 약관 버전. 서버 설정(/api/auth/config 의 consentVersion)을 한 번 읽고, 못 읽으면 기본값. */
  function loadVersion() {
    if (versionPromise) return versionPromise;
    if (typeof fetch !== 'function') return Promise.resolve(currentVersion);
    versionPromise = fetch('/api/auth/config', { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (config) {
        if (config && typeof config.consentVersion === 'string' && config.consentVersion) currentVersion = config.consentVersion;
        return currentVersion;
      })
      .catch(function () { return currentVersion; });
    return versionPromise;
  }
  function version() { return currentVersion; }
  function setVersion(next) { if (typeof next === 'string' && next) currentVersion = next; }

  function requiredOk(values) {
    return Boolean(values) && REQUIRED.every(function (key) { return values[key] === true; });
  }

  function savePending(values) {
    if (!requiredOk(values)) return;
    safeSet(global.sessionStorage, PENDING_KEY, JSON.stringify({
      version: values.version || currentVersion,
      terms: true, privacy: true, age14: true,
      marketing: values.marketing === true,
      source: values.source || 'login',
      at: Date.now(),
    }));
  }

  /** 로그인으로 넘어가는 동안 들고 있는 동의. 필수가 빠졌거나 하루가 지났으면 없는 것으로 본다. */
  function readPending() {
    var pending = readJson(global.sessionStorage, PENDING_KEY);
    if (!requiredOk(pending)) return null;
    if (!Number.isFinite(pending.at) || Date.now() - pending.at > PENDING_MAX_MS) { clearPending(); return null; }
    return pending;
  }
  function clearPending() { safeRemove(global.sessionStorage, PENDING_KEY); }

  function isAgreedOnDevice(ver) { return safeGet(global.localStorage, OK_KEY) === String(ver || currentVersion); }
  function markAgreed(ver) { safeSet(global.localStorage, OK_KEY, String(ver || currentVersion)); }

  function deviceId() {
    var auth = global.UMSHAuthSession;
    return auth && typeof auth.deviceId === 'function' ? auth.deviceId() : '';
  }

  /** 서버에 동의를 기록한다. 실패해도 던지지 않는다: { ok, status, body }. */
  function postConsent(token, values) {
    if (!token || !requiredOk(values) || typeof fetch !== 'function') return Promise.resolve({ ok: false, status: 0, body: {} });
    return fetch('/api/consents', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        version: values.version || currentVersion,
        terms: true, privacy: true, age14: true,
        marketing: values.marketing === true,
        source: values.source || 'login',
        deviceId: deviceId(),
      }),
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) { return { ok: response.ok, status: response.status, body: body }; });
    }).catch(function () { return { ok: false, status: 0, body: {} }; });
  }

  function itemRow(item) {
    var tag = item.required ? '<span class="umsh-cs-tag">[필수]</span>' : '<span class="umsh-cs-tag optional">[선택]</span>';
    var link = item.href ? '<a href="' + item.href + '" target="_blank" rel="noopener">보기</a>' : '';
    return '<div class="umsh-cs-row" data-consent-row="' + item.key + '">'
      + '<label><input type="checkbox" data-consent="' + item.key + '"' + (item.required ? ' aria-required="true"' : '') + ' />'
      + tag + '<span>' + item.label + '</span></label>' + link + '</div>';
  }

  /**
   * container 안에 동의 묶음을 그린다. options.source 는 기록할 출처(guest-sheet·login·reconsent).
   * options.compactIfAgreed 면 이 브라우저가 지금 버전에 이미 동의했을 때 한 줄로 줄인다(로그인 화면).
   */
  function render(container, options) {
    options = options || {};
    injectStyle();
    loadVersion();
    var listeners = [];
    var root = global.document.createElement('div');
    root.className = 'umsh-cs';
    root.setAttribute('data-umsh-consent', '');
    container.appendChild(root);

    var controller = {
      element: root,
      alreadyAgreed: false,
      isValid: function () { return controller.alreadyAgreed || requiredOk(controller.values()); },
      values: function () {
        var values = { version: currentVersion, source: options.source || 'login' };
        ITEMS.forEach(function (item) {
          var box = root.querySelector('[data-consent="' + item.key + '"]');
          values[item.key] = controller.alreadyAgreed && item.required ? true : Boolean(box && box.checked);
        });
        return values;
      },
      shakeMissing: shakeMissing,
      onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    };

    function notify() { listeners.forEach(function (fn) { try { fn(controller); } catch (_e) { /* 화면 갱신 실패가 동의를 막지 않는다 */ } }); }

    function saveDraft() {
      var values = controller.values();
      safeSet(global.sessionStorage, DRAFT_KEY, JSON.stringify({ terms: values.terms, privacy: values.privacy, age14: values.age14, marketing: values.marketing }));
    }

    function syncAll() {
      var boxes = ITEMS.map(function (item) { return root.querySelector('[data-consent="' + item.key + '"]'); });
      var all = root.querySelector('[data-consent-all]');
      if (all) all.checked = boxes.every(function (box) { return box && box.checked; });
      ITEMS.forEach(function (item, index) {
        if (boxes[index] && boxes[index].checked) {
          var row = root.querySelector('[data-consent-row="' + item.key + '"]');
          if (row) { row.classList.remove('is-missing'); boxes[index].removeAttribute('aria-invalid'); }
        }
      });
      if (requiredOk(controller.values())) { var alert = root.querySelector('.umsh-cs-alert'); if (alert) alert.textContent = ''; }
    }

    function drawFull() {
      controller.alreadyAgreed = false;
      root.innerHTML = '<div class="umsh-cs-row umsh-cs-all"><label><input type="checkbox" data-consent-all /><span>모두 동의</span></label></div>'
        + ITEMS.map(itemRow).join('')
        + '<div class="umsh-cs-alert" role="alert" aria-live="assertive"></div>';
      var draft = readJson(global.sessionStorage, DRAFT_KEY) || {};
      ITEMS.forEach(function (item) {
        var box = root.querySelector('[data-consent="' + item.key + '"]');
        if (box && draft[item.key] === true) box.checked = true;
      });
      syncAll();
    }

    function drawDone() {
      controller.alreadyAgreed = true;
      root.innerHTML = '<div class="umsh-cs-done"><span>약관에 동의했어요</span><button type="button" data-consent-edit>다시 보기</button></div>';
    }

    function shakeMissing() {
      if (controller.alreadyAgreed) return;
      var first = null;
      REQUIRED.forEach(function (key) {
        var box = root.querySelector('[data-consent="' + key + '"]');
        var row = root.querySelector('[data-consent-row="' + key + '"]');
        if (!box || !row || box.checked) return;
        box.setAttribute('aria-invalid', 'true');
        row.classList.add('is-missing');
        row.classList.remove('is-shaking');
        void row.offsetWidth; // 다시 누를 때마다 흔들리게 애니메이션을 처음부터 돌린다.
        row.classList.add('is-shaking');
        setTimeout(function () { row.classList.remove('is-shaking'); }, 480);
        if (!first) first = box;
      });
      var alert = root.querySelector('.umsh-cs-alert');
      if (alert) alert.textContent = '필수 항목에 동의해 주세요';
      if (first && typeof first.focus === 'function') { try { first.focus({ preventScroll: false }); } catch (_e) { first.focus(); } }
    }

    root.addEventListener('change', function (event) {
      var target = event.target;
      if (target.matches('[data-consent-all]')) {
        ITEMS.forEach(function (item) {
          var box = root.querySelector('[data-consent="' + item.key + '"]');
          if (box) box.checked = target.checked;
        });
      }
      syncAll();
      saveDraft();
      notify();
    });
    root.addEventListener('click', function (event) {
      if (event.target.closest('[data-consent-edit]')) { drawFull(); notify(); }
    });

    if (options.compactIfAgreed && isAgreedOnDevice()) drawDone();
    else drawFull();
    // 버전을 늦게 받았는데 그 버전에 동의한 적이 없으면 전체 목록으로 되돌린다.
    loadVersion().then(function () {
      if (controller.alreadyAgreed && !isAgreedOnDevice()) { drawFull(); notify(); }
    });
    return controller;
  }

  /**
   * 로그인한 회원인데 지금 버전 동의 기록이 없을 때(기존 회원, 다른 경로로 로그인) 한 번 받는다.
   * 동의하면 true. 기록 API 가 실패해도 시트는 닫고 true — 저장 실패로 회원을 가두지 않는다.
   */
  function openReconsent(options) {
    options = options || {};
    injectStyle();
    return new Promise(function (resolve) {
      var doc = global.document;
      var backdrop = doc.createElement('div');
      backdrop.className = 'umsh-cs-sheet-backdrop';
      var sheet = doc.createElement('section');
      sheet.className = 'umsh-cs-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-labelledby', 'umsh-cs-sheet-title');
      sheet.innerHTML = '<div class="umsh-cs-sheet-title" id="umsh-cs-sheet-title">약관에 동의해 주세요</div>'
        + '<div class="umsh-cs-sheet-sub">운명상회를 계속 이용하려면 아래 필수 항목에 동의해야 해요.</div>'
        + '<div data-consent-host></div>'
        + '<button type="button" class="umsh-cs-submit is-inactive" data-consent-submit>동의하고 계속</button>'
        + '<button type="button" class="umsh-cs-logout" data-consent-logout>로그아웃</button>';
      doc.body.appendChild(backdrop);
      doc.body.appendChild(sheet);
      var controller = render(sheet.querySelector('[data-consent-host]'), { source: 'reconsent' });
      var submit = sheet.querySelector('[data-consent-submit]');
      function paint() { submit.classList.toggle('is-inactive', !controller.isValid()); }
      controller.onChange(paint);
      paint();
      var busy = false;
      function finish(result) { sheet.remove(); backdrop.remove(); resolve(result); }
      sheet.addEventListener('click', function (event) {
        if (event.target.closest('[data-consent-logout]')) {
          if (typeof options.onLogout === 'function') options.onLogout();
          else logoutLocally();
          finish(false);
          return;
        }
        if (!event.target.closest('[data-consent-submit]') || busy) return;
        if (!controller.isValid()) { controller.shakeMissing(); return; }
        busy = true;
        var values = controller.values();
        postConsent(options.token, values).then(function (result) {
          if (result.status === 409 && result.body && result.body.version) {
            setVersion(result.body.version);
            values.version = result.body.version;
            return postConsent(options.token, values);
          }
          return result;
        }).then(function (result) {
          if (result.ok) markAgreed(values.version);
          finish(true);
        });
      });
    });
  }

  /** 다른 사람이 로그인해 둔 공용 PC일 수 있어, 동의하지 않으면 이 브라우저의 회원 세션을 지운다. */
  function logoutLocally() {
    try {
      var keys = [];
      for (var i = 0; i < global.localStorage.length; i += 1) {
        var key = global.localStorage.key(i);
        if (/^sb-.+-auth-token$/.test(String(key || ''))) keys.push(key);
      }
      keys.forEach(function (key) { global.localStorage.removeItem(key); });
    } catch (_e) { /* 저장소가 막힌 브라우저 */ }
    try { global.location.href = '/'; } catch (_e) { /* 테스트 환경 */ }
  }

  global.UMSHConsent = {
    VERSION_FALLBACK: VERSION_FALLBACK,
    PENDING_KEY: PENDING_KEY,
    OK_KEY: OK_KEY,
    REQUIRED: REQUIRED.slice(),
    loadVersion: loadVersion,
    version: version,
    render: render,
    savePending: savePending,
    readPending: readPending,
    clearPending: clearPending,
    isAgreedOnDevice: isAgreedOnDevice,
    markAgreed: markAgreed,
    postConsent: postConsent,
    openReconsent: openReconsent,
  };
})(typeof window !== 'undefined' ? window : globalThis);
