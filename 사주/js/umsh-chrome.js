(function (global) {
  'use strict';

  /**
   * This file used to draw its own appbar and bottom nav, which left the consultation
   * pages (합격운, 연애, 결혼궁합, 직업운, MY ...) carrying a top bar that did not match the
   * service-shell pages: no category rail, no quick menu. It now mounts the shared
   * shell instead, so every page gets the identical logo + GNB + bottom menu while
   * keeping the back button and the service/price line these pages need.
   *
   * The public API (`UMSHChrome.mount` / `autoMount`) and the `[data-back]` hook are
   * unchanged, so no page markup had to move.
   */
  var SHELL_CSS = '/css/service-shell.css';
  var SHELL_JS = '/js/service-shell.js';

  /** Which category chip the shell highlights, chosen from the page path. */
  var CATEGORY_BY_PATH = [
    [/^\/cmdg(\/|$)/, '종합'],
    [/^\/money(\/|$)/, '재물'],
    [/^\/love(\/|$)/, '연애'],
    [/^\/match(\/|$)/, '궁합'],
    [/^\/work(\/|$)/, '직업'],
    [/^\/place(\/|$)/, '풍수'],
    [/^\/me(\/|$)/, '흐름'],
    [/^\/today(\/|$)/, '흐름'],
  ];

  function text(value, fallback) {
    var next = String(value == null ? '' : value).trim();
    return next || fallback || '';
  }

  function readFromLegacyAppbar(appbar) {
    if (!appbar) return { service: '', price: '' };
    var serviceNode = appbar.querySelector('.brand span, .umsh-chrome-service');
    var priceNode = appbar.querySelector('.small, .umsh-chrome-price');
    return {
      service: text(serviceNode && serviceNode.textContent),
      price: text(priceNode && priceNode.textContent),
    };
  }

  function categoryForPath(pathname) {
    for (var i = 0; i < CATEGORY_BY_PATH.length; i += 1) {
      if (CATEGORY_BY_PATH[i][0].test(pathname)) return CATEGORY_BY_PATH[i][1];
    }
    return 'all';
  }

  function ensureStylesheet(href) {
    if (document.querySelector('link[data-umsh-shell-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-umsh-shell-css', '');
    document.head.appendChild(link);
  }

  /** The shell reads its mount points once at load, so they must exist first. */
  function loadShellScript(src, onReady) {
    var existing = document.querySelector('script[data-umsh-shell-js]');
    if (existing) {
      onReady();
      return;
    }
    var script = document.createElement('script');
    script.src = src;
    script.setAttribute('data-umsh-shell-js', '');
    script.addEventListener('load', onReady);
    document.head.appendChild(script);
  }

  function buildTopHost(options) {
    var host = document.querySelector('[data-umsh-service-top]');
    if (!host) {
      host = document.createElement('div');
      host.setAttribute('data-umsh-service-top', '');
    }
    host.setAttribute('data-umsh-service-category', options.category);
    host.setAttribute('data-umsh-service-back', '');
    if (options.service) host.setAttribute('data-umsh-service-name', options.service);
    if (options.price) host.setAttribute('data-umsh-service-price', options.price);
    if (options.active) host.setAttribute('data-umsh-service-active', options.active);
    return host;
  }

  function buildBottomHost() {
    var host = document.querySelector('[data-umsh-service-bottom]');
    if (!host) {
      host = document.createElement('div');
      host.setAttribute('data-umsh-service-bottom', '');
      document.body.appendChild(host);
    }
    return host;
  }

  /**
   * `umsh-chrome.css` sizes the scrolling area with fixed 72px/74px chrome heights.
   * The shared shell is taller because of the category rail, so the real heights are
   * measured and written back into those variables - otherwise the last card on a
   * `.scroll` page ends up under the bottom menu.
   */
  function syncChromeHeights() {
    var top = document.querySelector('.umsh-service-shell');
    var bottom = document.querySelector('.umsh-service-bottom .bottom-nav');
    var root = document.documentElement;
    if (top) root.style.setProperty('--umsh-chrome-appbar-h', Math.round(top.getBoundingClientRect().height) + 'px');
    if (bottom) root.style.setProperty('--umsh-chrome-bottom-h', Math.round(bottom.getBoundingClientRect().height) + 'px');
  }

  function mount(options) {
    options = options || {};
    var stage = document.querySelector(options.root || 'main.stage, .stage, main') || document.body;
    var legacy = stage.querySelector('header.appbar, header.umsh-chrome-appbar')
      || document.querySelector('header.appbar, header.umsh-chrome-appbar');
    var inferred = readFromLegacyAppbar(legacy);

    var topHost = buildTopHost({
      service: text(options.service, inferred.service),
      price: text(options.price, inferred.price),
      category: text(options.category, categoryForPath(global.location.pathname)),
      active: text(options.active),
    });

    if (legacy && legacy.parentNode) legacy.replaceWith(topHost);
    else if (!topHost.parentNode) stage.insertBefore(topHost, stage.firstChild);

    var bottomHost = buildBottomHost();

    document.body.classList.add('umsh-has-chrome');
    ensureStylesheet(SHELL_CSS);
    loadShellScript(SHELL_JS, syncChromeHeights);

    return { appbar: topHost, bottomNav: bottomHost };
  }

  function autoMount() {
    var host = document.querySelector('[data-umsh-chrome], main.stage[data-service], main.stage');
    if (!host || document.body.dataset.umshChrome === 'off') return null;
    if (!document.querySelector('header.appbar, header.umsh-chrome-appbar') && !host.hasAttribute('data-umsh-chrome')) {
      return null;
    }
    return mount({
      service: host.getAttribute('data-service') || host.dataset.service,
      price: host.getAttribute('data-price') || host.dataset.price,
      category: host.getAttribute('data-category') || host.dataset.category,
      active: host.getAttribute('data-active') || host.dataset.active || '',
      root: 'main.stage, .stage, main',
    });
  }

  global.addEventListener('resize', syncChromeHeights);

  global.UMSHChrome = {
    mount: mount,
    autoMount: autoMount,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})(window);
