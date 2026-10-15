/**
 * 비회원 무료 결과 저장 바텀시트 (2026-10-14).
 * 비회원(Supabase 익명 계정)이 무료 결과를 보면 화면 아래 3분의 1 이하로 올라와
 * "SNS로 로그인하면 이 결과가 저장돼요"를 알린다. 결과 하나에 한 번만 띄우고,
 * 닫으면 결과 맨 아래에 한 줄짜리 저장 안내만 남긴다. 계획: docs/auth/guest-member-plan.md
 * 2026-10-15: 같은 시트에서 약관 동의(필수 3·선택 1, umsh-consent.js)를 받고 SNS 로그인으로 바로 넘긴다.
 * 필수를 빼고 SNS 버튼을 누르면 빠진 줄이 흔들린다. 누른 SNS 는 로그인 화면이 바로 이어서 시작한다.
 */
(function (global) {
  'use strict';

  var SEEN_PREFIX = 'umsh:guest-save-sheet:';
  /** 로그인 화면(/signup#login)이 이어서 시작할 SNS. 이 탭에만 둔다. */
  var LOGIN_PROVIDER_KEY = 'umsh_login_provider_v1';
  var CONSENT_SRC = '/js/umsh-consent.js?v=20261015a';
  var MARKS = {
    kakao: '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#000" d="M9 1.5C4.58 1.5 1 4.32 1 7.8c0 2.24 1.49 4.2 3.73 5.32-.16.6-.6 2.2-.69 2.54-.11.42.15.42.32.3.13-.09 2.1-1.43 2.95-2.01.55.08 1.11.12 1.69.12 4.42 0 8-2.82 8-6.3S13.42 1.5 9 1.5Z"/></svg>',
    naver: '<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="#fff" d="M13.56 10.7 6.17 0H0v20h6.44V9.3L13.83 20H20V0h-6.44v10.7Z"/></svg>',
    google: '<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>',
  };
  var LABELS = { kakao: '카카오', naver: '네이버', google: '구글' };

  var CSS = [
    '.umsh-gs-backdrop{position:fixed;inset:0;z-index:9990;background:rgba(6,4,3,.28);opacity:0;transition:opacity .22s ease}',
    '.umsh-gs-backdrop.is-open{opacity:1}',
    '.umsh-gs{position:fixed;left:50%;bottom:0;z-index:9991;box-sizing:border-box;width:100%;max-width:480px;max-height:60vh;max-height:60dvh;overflow:auto;',
    'padding:10px 20px calc(14px + env(safe-area-inset-bottom));border-radius:18px 18px 0 0;border:1px solid rgba(214,178,110,.28);border-bottom:0;',
    'background:#15100d;color:#f6ead6;box-shadow:0 -12px 32px rgba(0,0,0,.38);transform:translate(-50%,105%);transition:transform .26s cubic-bezier(.2,.8,.2,1);',
    'font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;word-break:keep-all;line-height:1.45}',
    '.umsh-gs.is-open{transform:translate(-50%,0)}',
    '.umsh-gs *{box-sizing:border-box}',
    '.umsh-gs-handle{display:block;width:36px;height:4px;margin:0 auto 12px;border-radius:2px;background:rgba(246,234,214,.28)}',
    '.umsh-gs-close{position:absolute;top:8px;right:10px;width:36px;height:36px;border:0;background:transparent;color:rgba(246,234,214,.6);font-size:20px;line-height:1;cursor:pointer}',
    '.umsh-gs-title{margin:0 28px 4px 0;font-size:16px;font-weight:700;color:#f6ead6}',
    '.umsh-gs-sub{margin:0 0 10px;font-size:13px;color:rgba(246,234,214,.66)}',
    '.umsh-gs-consent:empty{min-height:4px}',
    '.umsh-gs-btn.is-waiting{opacity:.55}',
    '.umsh-gs-row{display:grid;grid-template-columns:repeat(var(--umsh-gs-cols,3),1fr);gap:8px}',
    '.umsh-gs-btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;min-height:46px;padding:0 10px;border-radius:10px;border:1px solid transparent;font:inherit;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer}',
    '.umsh-gs-btn.kakao{background:#fee500;color:rgba(0,0,0,.85)}',
    '.umsh-gs-btn.naver{background:#03c75a;color:#fff}',
    '.umsh-gs-btn.google{background:#fff;color:#1f1f1f;border-color:#747775}',
    '.umsh-gs-wide{min-height:50px;font-size:15px}',
    '.umsh-gs-btn.save{background:#d6b26e;color:#15100d}',
    '.umsh-gs-alt{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:10px;font-size:13px;color:rgba(246,234,214,.66)}',
    '.umsh-gs-alt a{color:#f6ead6;text-decoration:underline;text-underline-offset:3px}',
    '.umsh-gs-later{display:block;margin:8px auto 0;padding:6px 12px;border:0;background:transparent;color:rgba(246,234,214,.6);font:inherit;font-size:13px;cursor:pointer}',
    '.umsh-gs-inline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:20px 0 8px;padding:14px 16px;border:1px solid rgba(214,178,110,.32);border-radius:12px;background:#15100d;color:#f6ead6;font-size:14px;word-break:keep-all}',
    '.umsh-gs-inline button{flex:none;min-height:40px;padding:0 14px;border:0;border-radius:9px;background:#fee500;color:rgba(0,0,0,.85);font:inherit;font-weight:700;font-size:13px;cursor:pointer}',
    '@media (prefers-reduced-motion:reduce){.umsh-gs,.umsh-gs-backdrop{transition:none}}',
  ].join('');

  function injectStyle() {
    if (document.getElementById('umsh-gs-style')) return;
    var style = document.createElement('style');
    style.id = 'umsh-gs-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function seenKey(resultKey) { return SEEN_PREFIX + String(resultKey || location.pathname); }
  function wasSeen(resultKey) { try { return global.sessionStorage.getItem(seenKey(resultKey)) === '1'; } catch (_e) { return false; } }
  function markSeen(resultKey) { try { global.sessionStorage.setItem(seenKey(resultKey), '1'); } catch (_e) { /* 저장 불가여도 시트는 동작한다 */ } }

  function track(action, opts) {
    try {
      if (global.UMSHTrack && typeof global.UMSHTrack.push === 'function') global.UMSHTrack.push('cta_click', { target: 'guest_save:' + action + ':' + (opts.entry || 'unknown') });
    } catch (_e) { /* 측정은 화면을 막지 않는다 */ }
  }

  function providerButton(provider, wide) {
    var label = wide ? LABELS[provider] + '로 3초 만에 저장' : LABELS[provider];
    return '<button type="button" class="umsh-gs-btn ' + provider + (wide ? ' umsh-gs-wide' : '') + '" data-provider="' + provider + '">' + MARKS[provider] + '<span>' + label + '</span></button>';
  }

  function sheetBody(opts) {
    var providers = (opts.providers || ['kakao', 'naver', 'google']).filter(function (p) { return MARKS[p]; });
    var head = '<span class="umsh-gs-handle" aria-hidden="true"></span>'
      + '<button type="button" class="umsh-gs-close" data-action="close" aria-label="닫기">×</button>'
      + '<p class="umsh-gs-title" id="umsh-gs-title">SNS로 로그인하면 이 결과가 저장돼요</p>'
      + '<p class="umsh-gs-sub">로그인하지 않으면 1시간 뒤 사라져요.</p>'
      + '<div class="umsh-gs-consent" data-consent-host></div>';
    if (opts.variant === 'b') {
      var rest = providers.slice(1).map(function (p) { return '<a href="#" data-provider="' + p + '">' + LABELS[p] + '</a>'; }).join('');
      return head + providerButton(providers[0], true)
        + (rest ? '<div class="umsh-gs-alt"><span>다른 방법</span>' + rest + '</div>' : '')
        + '<button type="button" class="umsh-gs-later" data-action="close">나중에 할게요</button>';
    }
    return head + '<div class="umsh-gs-row" style="--umsh-gs-cols:' + providers.length + '">' + providers.map(function (p) { return providerButton(p, false); }).join('') + '</div>'
      + '<button type="button" class="umsh-gs-later" data-action="close">나중에 할게요</button>';
  }

  function close(state, reason) {
    if (!state.sheet) return;
    var sheet = state.sheet, backdrop = state.backdrop;
    sheet.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    setTimeout(function () { sheet.remove(); backdrop.remove(); }, 280);
    state.sheet = null;
    document.removeEventListener('keydown', state.onKey);
    if (reason !== 'login') {
      track('dismiss', state.opts);
      showInline(state.opts);
    }
  }

  function withProvider(url, provider) {
    try {
      var parsed = new URL(url, location.origin);
      parsed.searchParams.set('provider', provider);
      return parsed.origin === location.origin ? parsed.pathname + parsed.search + parsed.hash : parsed.toString();
    } catch (_e) {
      return url;
    }
  }

  function login(opts, provider) {
    track('login_' + provider, opts);
    // 로그인 화면이 방금 누른 SNS 로 바로 이어 가게 남긴다. 화면마다 onLogin 주소를 고치지 않아도 된다.
    try { global.sessionStorage.setItem(LOGIN_PROVIDER_KEY, JSON.stringify({ provider: provider, at: Date.now() })); } catch (_e) { /* 저장 불가면 로그인 화면에서 다시 고른다 */ }
    if (typeof opts.onLogin === 'function') { opts.onLogin(provider); return; }
    var entry = opts.entry || 'guest-save';
    var returnTo = opts.returnTo || (location.pathname + location.search);
    location.href = withProvider(global.UMSHCommonAuth && global.UMSHCommonAuth.commonLoginUrl
      ? global.UMSHCommonAuth.commonLoginUrl(entry, returnTo)
      : '/signup?entry=' + encodeURIComponent(entry) + '&returnTo=' + encodeURIComponent(returnTo) + '#login', provider);
  }

  var consentLoading = null;
  function loadConsent() {
    if (global.UMSHConsent) return Promise.resolve(global.UMSHConsent);
    if (consentLoading) return consentLoading;
    consentLoading = new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = CONSENT_SRC;
      script.onload = function () { resolve(global.UMSHConsent || null); };
      script.onerror = function () { consentLoading = null; resolve(null); };
      document.head.appendChild(script);
    });
    return consentLoading;
  }

  function recordVisit(opts) {
    try {
      var auth = global.UMSHAuthSession;
      if (auth && typeof auth.recordGuestVisit === 'function') auth.recordGuestVisit(opts.service || opts.entry || location.pathname);
    } catch (_e) { /* 집계는 화면을 막지 않는다 */ }
  }

  /** 동의 묶음이 아직 안 그려졌으면(스크립트 로딩 중) 버튼을 흐리게 둔다. 그려진 뒤 필수 상태에 맞춰 칠한다. */
  function paintProviders(state) {
    if (!state.sheet) return;
    var ready = Boolean(state.consent) && state.consent.isValid();
    state.sheet.querySelectorAll('[data-provider]').forEach(function (button) {
      button.classList.toggle('is-waiting', !ready);
    });
  }

  function mountConsent(state) {
    var host = state.sheet && state.sheet.querySelector('[data-consent-host]');
    if (!host) return;
    loadConsent().then(function (consent) {
      if (!consent || !state.sheet || !host.isConnected) { state.consentFailed = !consent; paintProviders(state); return; }
      state.consent = consent.render(host, { source: 'guest-sheet' });
      state.consent.onChange(function () { paintProviders(state); });
      paintProviders(state);
    });
  }

  /**
   * SNS 버튼: 필수 동의가 빠졌으면 흔들고 멈춘다. 다 됐으면 동의를 이 탭에 들고(로그인 뒤 회원 계정에 기록),
   * 비회원 계정에도 바로 남긴 뒤 로그인으로 넘어간다. 동의 스크립트를 못 받았으면 로그인 화면이 다시 묻는다.
   */
  function onProvider(state, provider) {
    var opts = state.opts;
    if (state.consent && !state.consent.isValid()) {
      state.consent.shakeMissing();
      track('consent_missing', opts);
      return;
    }
    if (!state.consent && !state.consentFailed) {
      // 동의 묶음을 그리는 중이다. 막 열린 시트에서 바로 눌렀을 때 그대로 넘어가지 않는다.
      return;
    }
    if (state.consent) {
      var values = state.consent.values();
      global.UMSHConsent.savePending(values);
      var auth = global.UMSHAuthSession;
      var guestToken = auth && typeof auth.currentGuestToken === 'function' ? auth.currentGuestToken() : '';
      if (guestToken) global.UMSHConsent.postConsent(guestToken, values);
      track('consent_ok' + (values.marketing ? '_marketing' : ''), opts);
    }
    close(state, 'login');
    login(opts, provider);
  }

  /** 닫은 뒤 결과 맨 아래에 남기는 한 줄. opts.inlineHost 가 없으면 남기지 않는다. */
  function showInline(opts) {
    var host = typeof opts.inlineHost === 'string' ? document.querySelector(opts.inlineHost) : opts.inlineHost;
    if (!host || host.querySelector('.umsh-gs-inline')) return;
    var box = document.createElement('div');
    box.className = 'umsh-gs-inline';
    box.innerHTML = '<span>로그인하면 이 결과가 저장돼요</span><button type="button">로그인하고 저장</button>';
    box.querySelector('button').addEventListener('click', function () { open(Object.assign({}, opts, { force: true })); });
    host.appendChild(box);
  }

  function open(opts) {
    opts = opts || {};
    if (!opts.force && wasSeen(opts.resultKey)) { showInline(opts); return null; }
    markSeen(opts.resultKey);
    injectStyle();
    var state = { opts: opts };
    var backdrop = document.createElement('div');
    backdrop.className = 'umsh-gs-backdrop';
    var sheet = document.createElement('section');
    sheet.className = 'umsh-gs';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-labelledby', 'umsh-gs-title');
    sheet.innerHTML = sheetBody(opts);
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    state.sheet = sheet;
    state.backdrop = backdrop;
    state.onKey = function (event) { if (event.key === 'Escape') close(state, 'escape'); };
    document.addEventListener('keydown', state.onKey);
    backdrop.addEventListener('click', function () { close(state, 'backdrop'); });
    sheet.addEventListener('click', function (event) {
      var target = event.target.closest('[data-provider],[data-action]');
      if (!target) return;
      event.preventDefault();
      if (target.getAttribute('data-action') === 'close') { close(state, 'close'); return; }
      onProvider(state, target.getAttribute('data-provider'));
    });
    mountConsent(state);
    paintProviders(state);
    recordVisit(opts);
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('is-open'); backdrop.classList.add('is-open'); }); });
    track('view', opts);
    return state;
  }

  /**
   * 무료 결과를 "본 뒤"에 연다: opts.anchor(요소나 선택자)가 화면에 들어오거나, 결과를 60% 넘게 내렸을 때.
   * 결과가 뜨기 전에 가리면 로그인 벽과 다를 게 없다. 앵커가 늦게 그려져도 기다린다.
   */
  function openWhenSeen(opts) {
    opts = opts || {};
    // 결과가 그려진 시점에 방문을 남긴다. 시트를 보기 전에 떠나도 무료 결과를 본 비회원으로 센다.
    recordVisit(opts);
    loadConsent();
    var fired = false;
    var observer = null, mutation = null;
    function fire(anchor) {
      if (fired) return;
      fired = true;
      global.removeEventListener('scroll', onScroll);
      if (observer) observer.disconnect();
      if (mutation) mutation.disconnect();
      open(Object.assign({}, opts, { inlineHost: opts.inlineHost || (anchor && anchor.parentNode) || document.querySelector('main') || document.body }));
    }
    function findAnchor() {
      return typeof opts.anchor === 'string' ? document.querySelector(opts.anchor) : opts.anchor || null;
    }
    function onScroll() {
      var max = document.documentElement.scrollHeight - global.innerHeight;
      if (max > 0 && global.scrollY / max >= 0.6) fire(findAnchor());
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    if (typeof global.IntersectionObserver !== 'function') return;
    observer = new global.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) fire(entry.target); });
    });
    function watch() {
      var anchor = findAnchor();
      if (!anchor) return false;
      observer.observe(anchor);
      return true;
    }
    if (!watch() && typeof global.MutationObserver === 'function') {
      mutation = new global.MutationObserver(function () { if (watch()) mutation.disconnect(); });
      mutation.observe(document.body, { childList: true, subtree: true });
    }
  }

  /**
   * 3단계: 로그인 직후 "방금 본 결과를 내 계정에 저장할까요?" — 공용 PC에서 남의 결과를 가져가지 않게 묻는다.
   * 이름·생년월일은 보이지 않고 개수만 보인다. 저장하면 true, 아니면 false.
   */
  function confirmClaim(plan) {
    plan = plan || {};
    injectStyle();
    return new Promise(function (resolve) {
      var backdrop = document.createElement('div');
      backdrop.className = 'umsh-gs-backdrop';
      var sheet = document.createElement('section');
      sheet.className = 'umsh-gs';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-labelledby', 'umsh-gs-claim-title');
      var what = plan.reports ? '비회원으로 본 결과 ' + plan.reports + '개' + (plan.profile ? '와 입력한 사주 정보' : '') : '비회원으로 입력한 사주 정보';
      sheet.innerHTML = '<span class="umsh-gs-handle" aria-hidden="true"></span>'
        + '<p class="umsh-gs-title" id="umsh-gs-claim-title">방금 본 결과를 내 계정에 저장할까요?</p>'
        + '<p class="umsh-gs-sub">' + what + '를 로그인한 계정으로 옮겨요. 내가 본 게 아니면 저장하지 마세요.</p>'
        + '<div class="umsh-gs-row" style="--umsh-gs-cols:1"><button type="button" class="umsh-gs-btn save" data-answer="yes">내 계정에 저장</button></div>'
        + '<button type="button" class="umsh-gs-later" data-answer="no">저장하지 않기</button>';
      document.body.appendChild(backdrop);
      document.body.appendChild(sheet);
      requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('is-open'); backdrop.classList.add('is-open'); }); });
      function finish(answer) {
        sheet.classList.remove('is-open');
        backdrop.classList.remove('is-open');
        setTimeout(function () { sheet.remove(); backdrop.remove(); }, 280);
        resolve(answer);
      }
      sheet.addEventListener('click', function (event) {
        var target = event.target.closest('[data-answer]');
        if (target) finish(target.getAttribute('data-answer') === 'yes');
      });
    });
  }

  global.UMSHGuestSaveSheet = { open: open, openWhenSeen: openWhenSeen, confirmClaim: confirmClaim, LOGIN_PROVIDER_KEY: LOGIN_PROVIDER_KEY };
})(window);
