(function (global) {
  'use strict';

  var helper = global.UMSHAccountPages;
  var statusBox = document.querySelector('[data-my-status]');
  var logoutButton = document.querySelector('[data-my-logout]');
  var DAY = 24 * 60 * 60 * 1000;
  // 만료가 이 기간 안으로 들어온 쿠폰만 "곧 만료"로 알린다.
  var EXPIRY_NOTICE_DAYS = 14;
  // 이 기간 안에 올라온 공지가 있으면 "새 글"을 붙인다.
  var NEW_NOTICE_DAYS = 14;

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
      (profile.birthTimeKnown ? ' · ' + pad(birth.hour) + ':' + pad(birth.minute || 0) : ' · 태어난 시간 모름') +
      (birth.gender === 'female' ? ' · 여성' : birth.gender === 'male' ? ' · 남성' : '')
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
    if (provider) {
      provider.hidden = !provider.textContent;
      // 카카오·네이버는 각 회사의 로그인 버튼 색으로 칠한다(myhub.css).
      provider.dataset.kind = String((user.app_metadata && user.app_metadata.provider) || '').toLowerCase().replace(/[^a-z]/g, '');
    }
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
    return soon.length + '장이 ' + (first.getMonth() + 1) + '월 ' + first.getDate() + '일까지 사용 가능';
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
        var label = count >= 100 ? '100+' : count;
        setCount('vault', label);
        if (count) setText('[data-my-vault-note]', '보관한 풀이 ' + label + '개');
      })
      .catch(function () { setCount('vault', null); });

    getJson('/api/coupons', session)
      .then(function (payload) {
        var now = Date.now();
        var usable = usableCoupons(payload.items || [], now);
        setCount('coupons', usable.length);
        if (usable.length) {
          var right = setText('[data-my-coupon-right]', usable.length + '장');
          if (right) right.hidden = false;
        }
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

  function isNativeApp() {
    var cap = global.Capacitor;
    return Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  }

  function koreanDate(value) {
    var date = new Date(value);
    return date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
  }

  /**
   * 알림 설정 스위치. 광고성 알림은 동의·철회할 때마다 처리 날짜를 화면에 알린다
   * (정보통신망법: 수신 동의·거부 처리 결과를 받는 사람에게 알려야 한다).
   */
  function setupPrefs(session) {
    var switches = Array.prototype.slice.call(document.querySelectorAll('[data-pref]'));
    var note = document.querySelector('[data-pref-note]');
    if (!switches.length) return;
    var saving = false;
    function lock(locked) {
      saving = locked;
      switches.forEach(function (item) { item.setAttribute('aria-disabled', String(locked)); });
    }
    function render(prefs) {
      switches.forEach(function (button) {
        button.setAttribute('aria-checked', String(Boolean(prefs[button.dataset.pref])));
        button.disabled = false;
      });
      lock(false);
    }
    function setNote(text) { if (note) note.textContent = text; }
    if (!isNativeApp()) setNote('알림은 운명상회 앱에서 받습니다. 여기서 바꾼 설정은 앱에도 그대로 적용됩니다.');

    getJson('/api/user/notification-prefs', session)
      .then(function (payload) { render(payload.prefs || {}); })
      .catch(function () { setNote('알림 설정은 준비 중입니다. 곧 바꿀 수 있습니다.'); });

    switches.forEach(function (button) {
      button.addEventListener('click', function () {
        if (saving || button.disabled) return;
        var key = button.dataset.pref;
        var next = button.getAttribute('aria-checked') !== 'true';
        var body = {};
        body[key] = next;
        lock(true);
        fetch('/api/user/notification-prefs', {
          method: 'PUT',
          headers: helper.authHeaders(session, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(body),
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (payload) {
              if (!response.ok) throw new Error(payload.error || '알림 설정을 저장하지 못했습니다.');
              return payload.prefs;
            });
          })
          .then(function (prefs) {
            render(prefs);
            if (key === 'marketingPush') {
              var at = prefs.marketingPush ? prefs.marketingConsentedAt : prefs.marketingWithdrawnAt;
              setStatus('');
              setNote(koreanDate(at || Date.now()) + ' 이벤트 · 혜택 알림 수신에 ' + (prefs.marketingPush ? '동의했습니다.' : '동의를 철회했습니다.'));
            } else {
              setNote(prefs.servicePush ? '풀이 · 결제 알림을 다시 받습니다.' : '풀이 · 결제 알림을 받지 않습니다.');
            }
          })
          .catch(function (error) {
            lock(false);
            setNote(error.message);
          });
      });
    });
  }

  /** 공지는 로그인과 상관없이 보인다. 최근 공지가 있으면 "새 글"을 붙인다. */
  function loadNoticeBadge() {
    fetch('/api/notices', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : { notices: [] }; })
      .then(function (payload) {
        var latest = (payload.notices || [])[0];
        if (!latest || Date.now() - new Date(latest.publishedAt).getTime() > NEW_NOTICE_DAYS * DAY) return;
        var badge = document.querySelector('[data-my-notice-badge]');
        if (badge) badge.hidden = false;
      })
      .catch(function () { /* 공지가 없어도 메뉴는 그대로다. */ });
  }

  function loadInquiryNote(session) {
    getJson('/api/user/inquiries', session)
      .then(function (payload) {
        var answered = (payload.inquiries || []).filter(function (item) { return item.state === 'answered'; }).length;
        if (!answered) return;
        var element = setText('[data-my-inquiry-note]', '답변 도착 ' + answered + '건');
        if (element) element.classList.add('is-soon');
      })
      .catch(function () { /* 준비 전이거나 실패하면 기본 문구를 둔다. */ });
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

  /** 로그인 상태가 정해진 뒤에만 회원 카드나 안내 상자 중 하나를 보인다. */
  function settleAuthView(isMember) {
    var pending = document.querySelector('[data-my-pending]');
    if (pending) pending.hidden = true;
    var guest = document.querySelector('[data-my-guest]');
    if (guest) guest.hidden = isMember;
  }

  // 로그인 시트로 갈 때 MY 기록을 덮어쓴다. 로그인을 마치고 MY 로 돌아온 뒤 뒤로 가기를 누르면
  // 로그아웃 상태의 MY 나 로그인 시트가 아니라 MY 에 오기 전 화면으로 간다.
  var loginLink = document.querySelector('[data-my-login]');
  if (loginLink) {
    loginLink.addEventListener('click', function (event) {
      event.preventDefault();
      global.location.replace(loginLink.href);
    });
  }

  async function init() {
    if (helper && helper.mountAccountChrome) helper.mountAccountChrome('account');
    showAppVersion();
    loadNoticeBadge();
    if (!helper) { settleAuthView(false); return; }
    var auth;
    try {
      auth = await helper.requireSession('my', { optional: true });
    } catch (_error) {
      settleAuthView(false);
      setStatus('로그인 상태를 확인하지 못했습니다. 공개 안내는 계속 이용하실 수 있습니다.');
      return;
    }
    if (!auth) { settleAuthView(false); return; }
    document.querySelectorAll('[data-my-member], [data-my-user]').forEach(function (element) { element.hidden = false; });
    settleAuthView(true);

    renderUser(null, auth.session);
    loadCounts(auth.session);
    setupPrefs(auth.session);
    loadInquiryNote(auth.session);

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
    settleAuthView(false);
    setStatus((error && error.message) || '마이페이지를 불러오지 못했습니다.');
  });
})(window);
