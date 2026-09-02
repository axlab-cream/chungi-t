(function (global) {
  'use strict';

  var LOGO_SRC = '/assets/umsh-brand-logo.png';
  var BOTTOM_ID = 'umsh-chrome-bottom-nav';

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

  function buildAppbar(options) {
    var header = document.createElement('header');
    header.className = 'umsh-chrome-appbar';
    header.setAttribute('data-umsh-chrome-appbar', '');
    header.innerHTML =
      '<button class="umsh-chrome-back" type="button" data-back aria-label="뒤로">‹</button>' +
      '<a class="umsh-chrome-brand" href="/" aria-label="운명상회 홈">' +
      '<img src="' + LOGO_SRC + '" alt="운명상회" width="132" height="50" />' +
      '</a>' +
      '<div class="umsh-chrome-meta">' +
      '<span class="umsh-chrome-service"></span>' +
      '<span class="umsh-chrome-price"></span>' +
      '</div>';
    header.querySelector('.umsh-chrome-service').textContent = options.service || '';
    header.querySelector('.umsh-chrome-price').textContent = options.price || '';
    return header;
  }

  function buildBottomNav(active) {
    var items = [
      { id: 'home', label: '홈', href: '/' },
      { id: 'destiny', label: '운명록', href: '/destiny' },
      { id: 'search', label: '검색', href: '/#search' },
      { id: 'vault', label: '보관함', href: '/signup?entry=vault' },
      { id: 'account', label: 'MY', href: '/my' },
    ];
    var nav = document.createElement('footer');
    nav.id = BOTTOM_ID;
    nav.className = 'umsh-chrome-bottom-nav';
    nav.setAttribute('aria-label', '주요 메뉴');
    nav.setAttribute('data-umsh-chrome-bottom', '');
    nav.innerHTML = items
      .map(function (item) {
        var isActive = active && active === item.id;
        return (
          '<a href="' +
          item.href +
          '"' +
          (isActive ? ' class="is-active" aria-current="page"' : '') +
          ' data-umsh-tab="' +
          item.id +
          '"><span class="tab-label">' +
          item.label +
          '</span></a>'
        );
      })
      .join('');
    return nav;
  }

  function mount(options) {
    options = options || {};
    var stage = document.querySelector(options.root || 'main.stage, .stage, main') || document.body;
    var legacy = stage.querySelector('header.appbar, header.umsh-chrome-appbar');
    var inferred = readFromLegacyAppbar(legacy);
    var service = text(options.service, inferred.service);
    var price = text(options.price, inferred.price);
    var active = text(options.active, '');

    var nextAppbar = buildAppbar({ service: service, price: price });
    if (legacy && legacy.parentNode) {
      legacy.replaceWith(nextAppbar);
    } else {
      stage.insertBefore(nextAppbar, stage.firstChild);
    }

    var existingBottom = document.getElementById(BOTTOM_ID);
    var nextBottom = buildBottomNav(active);
    if (existingBottom) existingBottom.replaceWith(nextBottom);
    else document.body.appendChild(nextBottom);

    document.body.classList.add('umsh-has-chrome');
    return { appbar: nextAppbar, bottomNav: nextBottom };
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
      active: host.getAttribute('data-active') || host.dataset.active || '',
      root: 'main.stage, .stage, main',
    });
  }

  global.UMSHChrome = {
    mount: mount,
    autoMount: autoMount,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})(typeof window !== 'undefined' ? window : globalThis);
