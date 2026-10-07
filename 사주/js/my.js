(function (global) {
  'use strict';

  var helper = global.UMSHAccountPages;
  var statusBox = document.querySelector('[data-my-status]');
  var logoutButton = document.querySelector('[data-my-logout]');
  var DAY = 24 * 60 * 60 * 1000;
  // 만료가 이 기간 안으로 들어온 쿠폰만 "곧 만료"로 알린다.
  var EXPIRY_NOTICE_DAYS = 14;

  function setStatus(message) {
    if (statusBox) statusBox.textContent = message || '';
  }

  function setText(selector, text) {
    var element = document.querySelector(selector);
    if (element) element.textContent = text;
    return element;
  }

  function setCount(key, value) {
    setText('[data-my-count="' + key + '"]', value === null ? '–' : String(value));
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  /** Supabase 가 돌려주는 로그인 수단 이름을 화면 문구로 바꾼다. 모르는 값은 표시하지 않는다. */
  function providerLabel(user) {
    var provider = String((user && user.app_metadata && user.app_metadata.provider) || '').toLowerCase();
    if (provider.indexOf('kakao') >= 0) return '카카오 로그인';
    if (provider.indexOf('naver') >= 0) return '네이버 로그인';
    if (provider.indexOf('google') >= 0) return '구글 로그인';
    if (provider.indexOf('apple') >= 0) return '애플 로그인';
    if (provider === 'email') return '이메일 로그인';
    return '';
  }

  function birthLine(profile) {
    var birth = profile && profile.birth;
    if (!birth) return '';
    return (
      (birth.calendar === 'lunar' ? '음력 ' : '양력 ') +
      birth.year + '.' + pad(birth.month) + '.' + pad(birth.day) +
      (profile.birthTimeKnown ? ' · ' + pad(birth.hour) + ':' + pad(birth.minute || 0) : ' · 태어난 시간 모름')
    );
  }

  function renderUser(profile, session) {
    var user = session.user || {};
    var meta = user.user_metadata || {};
    setText('[data-my-name]', (profile && profile.name) || meta.name || '회원');
    var birth = setText('[data-my-birth]', birthLine(profile) || '사주 프로필을 등록하면 풀이가 정확해집니다.');
    if (birth) birth.classList.toggle('is-missing', !profile);
    setText('[data-my-email]', user.email || meta.email || '');
    var provider = setText('[data-my-provider]', providerLabel(user));
    if (provider) provider.hidden = !provider.textContent;
  }

  /** coupons.js 의 "사용 가능" 판정과 같은 기준이다. */
  function usableCoupons(items, now) {
    return items.filter(function (item) {
      var used = item.status === 'used' || !!item.reportId || (item.kind === 'consultation_questions' && item.remaining === 0);
      var reserved = item.status === 'reserved' || !!item.orderId;
      var expired = new Date(item.expiresAt).getTime() <= now;
      var future = item.startsAt && new Date(item.startsAt).getTime() > now;
      return !used && !reserved && item.enabled !== false && !expired && !future;
    });
  }

  function couponNote(usable, now) {
    var soon = usable
      .map(function (item) { return new Date(item.expiresAt).getTime(); })
      .filter(function (time) { return time - now <= EXPIRY_NOTICE_DAYS * DAY; })
      .sort(function (a, b) { return a - b; });
    if (!soon.length) return '';
    var first = new Date(soon[0]);
    return soon.length + '장이 ' + (first.getMonth() + 1) + '월 ' + first.getDate() + '일까지 쓸 수 있어요';
  }

  function getJson(url, session) {
    return fetch(url, { headers: helper.authHeaders(session), cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  /** 숫자는 메뉴를 그린 뒤에 채운다. 하나가 실패해도 그 칸만 "–" 로 남는다. */
  function loadCounts(session) {
    getJson('/api/user/reports?limit=100&view=list', session)
      .then(function (payload) {
        var count = (payload.reports || []).length;
        setCount('vault', count >= 100 ? '100+' : count);
      })
      .catch(function () { setCount('vault', null); });

    getJson('/api/coupons', session)
      .then(function (payload) {
        var now = Date.now();
        var usable = usableCoupons(payload.items || [], now);
        setCount('coupons', usable.length);
        var note = couponNote(usable, now);
        if (note) {
          var element = setText('[data-my-coupon-note]', note);
          if (element) element.classList.add('is-soon');
        }
      })
      .catch(function () { setCount('coupons', null); });

    getJson('/api/user/orders?limit=100', session)
      .then(function (payload) {
        var settled = (payload.orders || []).filter(function (order) {
          return order.status === 'paid' || order.status === 'viewed';
        });
        setCount('orders', settled.length >= 100 ? '100+' : settled.length);
      })
      .catch(function () { setCount('orders', null); });
  }

  /** 앱 안에서만 버전을 보여 준다. 문의 받을 때 버전을 묻지 않아도 되게. */
  function showAppVersion() {
    var cap = global.Capacitor;
    var app = cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform() && cap.Plugins && cap.Plugins.App;
    if (!app || typeof app.getInfo !== 'function') return;
    app.getInfo().then(function (info) {
      if (!info || !info.version) return;
      var element = setText('[data-my-app-version]', '앱 버전 ' + info.version);
      if (element) element.hidden = false;
    }).catch(function () { /* 버전을 못 읽어도 화면은 그대로다. */ });
  }

  async function init() {
    if (helper && helper.mountAccountChrome) helper.mountAccountChrome('account');
    showAppVersion();
    if (!helper) return;
    var auth;
    try {
      auth = await helper.requireSession('my', { optional: true });
    } catch (_error) {
      setStatus('로그인 상태를 확인하지 못했습니다. 공개 안내는 계속 이용하실 수 있습니다.');
      return;
    }
    if (!auth) return;
    document.querySelectorAll('[data-my-member], [data-my-user]').forEach(function (element) { element.hidden = false; });
    var guest = document.querySelector('[data-my-guest]');
    if (guest) guest.hidden = true;

    renderUser(null, auth.session);
    loadCounts(auth.session);

    if (logoutButton) {
      logoutButton.addEventListener('click', async function () {
        setStatus('로그아웃 중입니다.');
        try {
          if (global.UMSHAuthSession) global.UMSHAuthSession.clearDeviceAuthSession();
          await auth.client.auth.signOut({ scope: 'local' });
          global.location.assign('/');
        } catch (error) {
          setStatus((error && error.message) || '로그아웃에 실패했습니다.');
        }
      });
    }

    try {
      var payload = await getJson('/api/user/profile', auth.session);
      renderUser(payload.profile || null, auth.session);
    } catch (_error) {
      // 프로필 요약이 없어도 마이페이지는 쓸 수 있다.
    }
  }

  init().catch(function (error) {
    setStatus((error && error.message) || '마이페이지를 불러오지 못했습니다.');
  });
})(window);
