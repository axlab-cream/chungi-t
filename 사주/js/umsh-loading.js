(function (global) {
  'use strict';

  var ROOT_ID = 'umsh-loading-root';
  var DEFAULT_TITLE = '잠시만 기다려 주세요';
  var DEFAULT_SUBTITLE = '';
  var HIDE_MS = 180;
  var open = false;
  var hideTimer = null;
  var root = null;
  var titleEl = null;
  var subtitleEl = null;
  var copy = { title: DEFAULT_TITLE, subtitle: DEFAULT_SUBTITLE };

  function ensureStyle() {
    if (document.querySelector('link[href*="umsh-loading.css"]') || document.getElementById('umsh-loading-style')) {
      return;
    }
    var link = document.createElement('link');
    link.id = 'umsh-loading-style';
    link.rel = 'stylesheet';
    link.href = '/css/umsh-loading.css';
    document.head.appendChild(link);
  }

  function ensureRoot() {
    if (root && document.body.contains(root)) {
      return root;
    }
    ensureStyle();
    root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML =
        '<div class="umsh-loading-card" role="status" aria-live="polite">' +
        '<div class="umsh-loading-spinner" aria-hidden="true"></div>' +
        '<strong class="umsh-loading-title"></strong>' +
        '<p class="umsh-loading-subtitle"></p>' +
        '</div>';
      document.body.appendChild(root);
    }
    titleEl = root.querySelector('.umsh-loading-title');
    subtitleEl = root.querySelector('.umsh-loading-subtitle');
    applyCopy();
    return root;
  }

  function applyCopy() {
    if (!titleEl || !subtitleEl) return;
    titleEl.textContent = copy.title || '';
    subtitleEl.textContent = copy.subtitle || '';
  }

  function normalizeCopy(next) {
    var source = next && typeof next === 'object' ? next : {};
    var title = typeof source.title === 'string' ? source.title : copy.title;
    var subtitle = typeof source.subtitle === 'string' ? source.subtitle : copy.subtitle;
    if (!title && !subtitle) {
      title = DEFAULT_TITLE;
      subtitle = DEFAULT_SUBTITLE;
    }
    return { title: title || '', subtitle: subtitle || '' };
  }

  function setBodyLock(locked) {
    var body = document.body;
    if (!body) return;
    body.classList.toggle('umsh-loading-lock', locked);
    if (locked) {
      body.setAttribute('aria-busy', 'true');
    } else {
      body.removeAttribute('aria-busy');
    }
  }

  function setCopy(next) {
    copy = normalizeCopy(next);
    ensureRoot();
    applyCopy();
  }

  function show(next) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (next && typeof next === 'object') {
      copy = normalizeCopy(next);
    } else if (!copy.title && !copy.subtitle) {
      copy = { title: DEFAULT_TITLE, subtitle: DEFAULT_SUBTITLE };
    }
    ensureRoot();
    applyCopy();
    root.classList.remove('is-closing');
    root.setAttribute('aria-hidden', 'false');
    setBodyLock(true);
    // Force reflow so opening transition plays when first injected.
    void root.offsetWidth;
    root.classList.add('is-open');
    open = true;
  }

  function hide() {
    if (!open && !(root && root.classList.contains('is-open'))) {
      open = false;
      return;
    }
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

  function isOpen() {
    return open;
  }

  function bindToggle(getDefaultCopy) {
    return function setLoading(on, nextCopy) {
      if (on) {
        var fallback = typeof getDefaultCopy === 'function' ? getDefaultCopy() : getDefaultCopy;
        show(nextCopy || fallback || { title: DEFAULT_TITLE, subtitle: DEFAULT_SUBTITLE });
      } else {
        hide();
      }
    };
  }

  global.UMSHLoading = {
    show: show,
    hide: hide,
    setCopy: setCopy,
    isOpen: isOpen,
    bindToggle: bindToggle,
  };
})(typeof window !== 'undefined' ? window : globalThis);
