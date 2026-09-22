(function mountSignupBenefitPopup(global) {
  'use strict';

  var HIDE_UNTIL_KEY = 'umsh:signup-benefit-popup:hidden-until';
  var POPUP_ID = 'umsh-signup-benefit-popup';
  var DEFAULT_POPUP = {
    id: 'builtin-2026-09-today-fortune',
    startsAt: '2026-09-22T00:00:00+09:00',
    endsAt: '2026-10-01T23:59:59.999+09:00',
    imageSrc: '/assets/signup-benefit-popup-default-2026-09-22.png',
    ctaLabel: '내 사주로 오늘운 무료 보기'
  };

  function storageGet(key) {
    try { return global.localStorage.getItem(key); } catch (_error) { return ''; }
  }

  function storageSet(key, value) {
    try { global.localStorage.setItem(key, value); } catch (_error) { /* private browsing can still use the popup */ }
  }

  function campaignIsActive(popup, now) {
    var current = Number(now == null ? Date.now() : now);
    return popup && current >= Date.parse(popup.startsAt) && current <= Date.parse(popup.endsAt);
  }

  function isHiddenForThisWeek(popup, now) {
    return Number(storageGet(HIDE_UNTIL_KEY)) > Number(now == null ? Date.now() : now);
  }

  // 공용 크롬은 모든 서비스 화면에 올라가지만, 이 혜택 레이어는 운명상회 첫 화면에서만 연다.
  function isLandingPage() {
    var path = String(global.location && global.location.pathname || '/');
    return path === '/' || path === '/index.html';
  }

  function signupHref() {
    var returnTo = '/today/free?start=1';
    if (global.UMSHCommonAuth && global.UMSHCommonAuth.commonLoginUrl) {
      return global.UMSHCommonAuth.commonLoginUrl('today', returnTo);
    }
    return '/signup?entry=today&returnTo=' + encodeURIComponent(returnTo) + '#login';
  }

  function focusable(dialog) {
    return Array.prototype.slice.call(dialog.querySelectorAll('button, a[href]'));
  }

  function loadPopup() {
    if (!global.fetch) return Promise.resolve(DEFAULT_POPUP);
    return global.fetch('/api/public/signup-benefit-popup', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (response) {
        if (response.status === 204) return null;
        if (!response.ok) throw new Error('POPUP_LOOKUP_FAILED');
        return response.json();
      })
      .then(function (payload) { return payload && payload.popup ? payload.popup : null; })
      .catch(function () { return DEFAULT_POPUP; });
  }

  function show(popup) {
    if (!isLandingPage() || !campaignIsActive(popup) || isHiddenForThisWeek(popup) || document.getElementById(POPUP_ID)) return null;

    var previousFocus = document.activeElement;
    var overlay = document.createElement('section');
    overlay.id = POPUP_ID;
    overlay.className = 'umsh-signup-benefit-popup';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '천명보살의 오늘운 무료 혜택');
    overlay.innerHTML = [
      '<div class="umsh-signup-benefit-popup__art">',
      '  <img src="' + popup.imageSrc + '" alt="천명보살의 오늘운. 오늘, 밀어붙일까요? 한 번 더 지켜볼까요? 신규 회원 오늘운 무료 혜택">',
      '  <button class="umsh-signup-benefit-popup__close" type="button" aria-label="혜택 안내 닫기"></button>',
      '  <a class="umsh-signup-benefit-popup__cta" href="' + signupHref() + '" aria-label="' + (popup.ctaLabel || '내 사주로 오늘운 무료 보기') + '"></a>',
      '  <button class="umsh-signup-benefit-popup__hide" type="button" aria-pressed="false" aria-label="일주일간 다시 보지 않기"></button>',
      '</div>',
    ].join('');

    function close() {
      document.documentElement.classList.remove('umsh-signup-benefit-popup-open');
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      var controls = focusable(overlay);
      if (!controls.length) return;
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    overlay.querySelector('.umsh-signup-benefit-popup__close').addEventListener('click', close);
    overlay.querySelector('.umsh-signup-benefit-popup__hide').addEventListener('click', function () {
      storageSet(HIDE_UNTIL_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      close();
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) close();
    });

    document.body.appendChild(overlay);
    document.documentElement.classList.add('umsh-signup-benefit-popup-open');
    document.addEventListener('keydown', onKeydown);
    overlay.querySelector('.umsh-signup-benefit-popup__close').focus();
    return overlay;
  }

  function start() { if (isLandingPage()) loadPopup().then(show); }
  global.UMSHSignupBenefitPopup = Object.freeze({ campaignIsActive: campaignIsActive, isHiddenForThisWeek: isHiddenForThisWeek, isLandingPage: isLandingPage, loadPopup: loadPopup, show: show });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(window);
