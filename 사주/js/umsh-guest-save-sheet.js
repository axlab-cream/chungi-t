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
  var CONSENT_SRC = '/js/umsh-consent.js?v=20261016a';
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
    '.umsh-gs-handle{display:block;position:relative;height:22px;margin:-10px -20px 2px;touch-action:none;cursor:grab}.umsh-gs-handle::before{content:"";position:absolute;left:50%;top:10px;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:rgba(246,234,214,.28)}',
    '.umsh-gs-title[data-drag-handle]{touch-action:none}',
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
    '.umsh-gs-inline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:20px 0 8px;padding:16px;border:1px solid rgba(214,178,110,.42);border-radius:14px;text-align:left;background:#15100d;color:#f6ead6;font-size:14px;word-break:keep-all}',
    '.umsh-gs-inline button{flex:none;min-height:42px;padding:0 16px;border:0;border-radius:10px;background:#d6b26e;color:#15100d;font:inherit;font-weight:700;font-size:14px;cursor:pointer}',
    '.umsh-gs-inline strong{display:block;font-size:15px;color:#f6ead6}',
    '.umsh-gs-inline small{display:block;margin-top:3px;font-size:12.5px;line-height:1.45;color:rgba(246,234,214,.66)}',
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

/**
   * 2026-10-16 손잡이를 아래로 끌어 닫기. 손잡이·제목줄([data-drag-handle])을 잡고 내리면 시트가 손가락을 따라 내려가고,
   * 시트 높이의 1/4(최대 120px) 넘게 내리거나 빠르게 튕기면 닫는다. 덜 내리면 제자리로 돌아간다.
   * 본문은 스크롤해야 하므로 잡는 곳은 위쪽 줄로 한정한다(그 줄에만 touch-action:none).
   */
  function enableDragClose(sheet, onClose) {
    var startY = 0, dy = 0, pointerId = null, lastY = 0, lastAt = 0, speed = 0;
    sheet.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (!event.target.closest('[data-drag-handle]') || event.target.closest('button,a,input,label')) return;
      pointerId = event.pointerId; startY = lastY = event.clientY; lastAt = Date.now(); dy = 0; speed = 0;
      try { sheet.setPointerCapture(pointerId); } catch (_e) { /* 오래된 브라우저 */ }
    });
    sheet.addEventListener('pointermove', function (event) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      var now = Date.now();
      // 손을 떼기 직전 움직임의 속도(px/ms). 빠르게 튕기면 조금만 내려도 닫는다.
      if (now > lastAt) speed = (event.clientY - lastY) / (now - lastAt);
      lastY = event.clientY; lastAt = now;
      dy = Math.max(0, event.clientY - startY);
      sheet.style.transition = 'none';
      sheet.style.transform = 'translate(-50%,' + dy + 'px)';
    });
    function end(event) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      pointerId = null;
      var fast = dy > 30 && speed > 0.5 && Date.now() - lastAt < 120;
      sheet.style.transition = '';
      if (dy > Math.min(120, sheet.offsetHeight * 0.25) || fast) {
        sheet.style.transform = 'translate(-50%,105%)';
        onClose();
      } else {
        sheet.style.transform = '';
      }
    }
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; });
  }

  function sheetBody(opts) {
    var providers = (opts.providers || ['kakao', 'naver', 'google']).filter(function (p) { return MARKS[p]; });
    var head = '<span class="umsh-gs-handle" data-drag-handle aria-hidden="true"></span>'
      + '<button type="button" class="umsh-gs-close" data-action="close" aria-label="닫기">×</button>'
      + '<p class="umsh-gs-title" id="umsh-gs-title" data-drag-handle>' + escapeText(opts.title || 'SNS로 로그인하면 이 결과가 저장돼요') + '</p>'
      + '<p class="umsh-gs-sub">' + escapeText(opts.sub || '로그인하지 않으면 1시간 뒤 사라져요.') + '</p>'
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
      // 2026-10-15 결제로 가는 시트(운명 거래하기)는 닫아도 저장 안내 줄을 남기지 않는다. 같은 버튼을 다시 누르면 된다.
      if (!state.opts.noInline) showInline(state.opts);
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
    // 2026-10-16: 저장하려고(또는 결제하려고) 로그인한 것이니, 돌아와서 결과를 옮길 때 "저장할까요?"를 다시 묻지 않는다.
    try { global.sessionStorage.setItem('umsh_claim_intent_v1', String(Date.now())); } catch (_e) { /* 못 남기면 한 번 더 묻는다 */ }
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
    injectStyle();
    var box = document.createElement('div');
    box.className = 'umsh-gs-inline';
    box.setAttribute('data-result-key', String(opts.resultKey || opts.entry || location.pathname));
    box.innerHTML = '<div><strong>이 결과를 저장할까요?</strong><small>약관에 동의하고 SNS로 로그인하면 내 보관함에 저장돼요.</small></div><button type="button">저장하기</button>';
    box.querySelector('button').addEventListener('click', function () { track('inline_click', opts); open(Object.assign({}, opts, { force: true })); });
    if (opts.after && opts.after.parentNode === host) opts.after.insertAdjacentElement('afterend', box);
    else host.appendChild(box);
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
    enableDragClose(sheet, function () { close(state, 'drag'); });
    mountConsent(state);
    paintProviders(state);
    recordVisit(opts);
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('is-open'); backdrop.classList.add('is-open'); }); });
    track('view', opts);
    return state;
  }

  /**
   * 2026-10-16 대표 결정(모든 서비스): 무료 결과에서 시트를 저절로 띄우지 않는다. 결과를 보다가 갑자기 가리면 안 된다.
   * 결과가 그려지면 결과 안에 "이 결과를 저장할까요?" 안내를 넣고, [저장하기]를 누를 때만 약관 동의 + SNS 로그인 시트를 연다.
   * 앵커(잠긴 목차·가격 카드 등)가 있으면 그 바로 뒤에, 4초 안에 앵커가 안 보이면 본문 끝에 둔다.
   * 화면을 다시 그려 안내가 지워지면(천명사주처럼 화면 전체를 갈아 끼우는 곳) 1분 동안은 다시 넣는다.
   */
  function openWhenSeen(opts) {
    opts = opts || {};
    // 결과가 그려진 시점에 방문을 남긴다. 저장하지 않고 떠나도 무료 결과를 본 비회원으로 센다.
    recordVisit(opts);
    loadConsent();
    injectStyle();
    var key = String(opts.resultKey || opts.entry || location.pathname);
    var mutation = null;
    function findAnchor() {
      return typeof opts.anchor === 'string' ? document.querySelector(opts.anchor) : opts.anchor || null;
    }
    function present() {
      return Array.prototype.some.call(document.querySelectorAll('.umsh-gs-inline'), function (node) { return node.getAttribute('data-result-key') === key && node.isConnected; });
    }
    function place(anchor, fallback) {
      if (present()) return;
      if (!anchor && !fallback) return;
      var host = anchor ? anchor.parentNode : (document.querySelector('main') || document.body);
      if (host) showInline(Object.assign({}, opts, { inlineHost: host, after: anchor || null }));
    }
    place(findAnchor(), false);
    if (typeof global.MutationObserver === 'function') {
      mutation = new global.MutationObserver(function () { place(findAnchor(), false); });
      mutation.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { if (mutation) mutation.disconnect(); }, 60000);
    }
    setTimeout(function () { place(findAnchor(), true); }, 4000);
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
