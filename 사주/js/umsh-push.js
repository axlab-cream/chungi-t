/**
 * 앱 푸시 알림 등록. 운명상회 안드로이드 앱(Capacitor 셸) 안에서만 동작한다.
 *
 * 웹 브라우저에서는 아무것도 하지 않는다. 플러그인 JS 는 번들하지 않고, 셸이 원격 페이지에
 * 주입하는 window.Capacitor.Plugins.PushNotifications 를 바로 쓴다(app-billing.js 와 같은 방식).
 * 플러그인이 없는 옛 APK 에서도 조용히 넘어간다.
 *
 * 흐름
 *   1. 이미 알림 권한이 있으면(안드로이드 12 이하는 기본 허용) 바로 토큰을 받아 서버에 등록한다.
 *      비로그인 기기도 등록한다. 로그인 상태면 서버가 회원과 묶는다.
 *   2. 권한을 아직 묻지 않았고 로그인한 상태면 안내 시트를 먼저 보여 준다. 처음 로그인한 직후의
 *      첫 화면이 여기에 해당한다. "알림 받기"를 눌렀을 때만 OS 권한 창을 연다.
 *      "나중에"는 7일 동안 다시 묻지 않는다. OS 창에서 거부하면 다시 묻지 않는다.
 *   3. 알림을 눌렀을 때의 이동은 셸(MainActivity)이 직접 한다. 여기서는 받지 않는다.
 *
 * 서버 등록은 하루 한 번, 또는 토큰·로그인 계정이 바뀌었을 때만 다시 한다.
 */
(function (global) {
  'use strict';
  // 공용 크롬과 홈이 각각 실을 수 있다. 두 번 돌면 안내 시트가 겹친다.
  if (global.UMSHPush) return;

  var STATE_KEY = 'umsh:push:v1';
  var SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
  var RESYNC_MS = 24 * 60 * 60 * 1000;

  function bridge() { return global.Capacitor || null; }
  function plugin() {
    var cap = bridge();
    return (cap && cap.Plugins && cap.Plugins.PushNotifications) || null;
  }
  function isNativeApp() {
    var cap = bridge();
    return Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform() && plugin());
  }
  function platform() {
    var cap = bridge();
    var name = cap && typeof cap.getPlatform === 'function' ? cap.getPlatform() : '';
    return name === 'ios' ? 'ios' : 'android';
  }

  function readState() {
    try { return JSON.parse(global.localStorage.getItem(STATE_KEY) || '{}') || {}; } catch (_) { return {}; }
  }
  function writeState(patch) {
    try { global.localStorage.setItem(STATE_KEY, JSON.stringify(Object.assign(readState(), patch))); } catch (_) {}
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = src; script.async = true;
      script.onload = function () { resolve(true); };
      script.onerror = function () { resolve(false); };
      document.head.appendChild(script);
    });
  }

  /** 로그인 세션. 홈(portal.html)처럼 umsh-auth-session.js 를 싣지 않는 화면도 있다. */
  async function currentSession() {
    try {
      if (!global.UMSHAuthSession) await loadScript('/js/umsh-auth-session.js');
      if (!global.UMSHAuthSession || !global.supabase) return null;
      return await global.UMSHAuthSession.bindServiceSession({}, 1500);
    } catch (_) { return null; }
  }

  async function appVersion() {
    try {
      var app = bridge().Plugins.App;
      if (!app || typeof app.getInfo !== 'function') return null;
      var info = await app.getInfo();
      return info && info.version ? String(info.version) + (info.build ? ' (' + info.build + ')' : '') : null;
    } catch (_) { return null; }
  }

  async function syncToken(token) {
    var session = await currentSession();
    var userId = session && session.user ? session.user.id : null;
    var state = readState();
    if (state.token === token && state.userId === userId && Date.now() - (state.syncedAt || 0) < RESYNC_MS) return;
    var headers = { 'Content-Type': 'application/json' };
    if (session && session.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    try {
      var response = await fetch('/api/push/devices', {
        method: 'POST', headers: headers, credentials: 'same-origin',
        body: JSON.stringify({ token: token, platform: platform(), appVersion: await appVersion() }),
      });
      if (response.ok) writeState({ token: token, userId: userId, syncedAt: Date.now() });
    } catch (_) { /* 다음에 앱을 열 때 다시 한다. */ }
  }

  var listening = false;
  async function register() {
    var push = plugin();
    if (!listening) {
      listening = true;
      await push.addListener('registration', function (event) { if (event && event.value) syncToken(event.value); });
      await push.addListener('registrationError', function () { /* 토큰을 못 받으면 다음 실행에 다시 한다. */ });
    }
    await push.register();
  }

  function sheetStyles() {
    if (document.getElementById('umsh-push-sheet-style')) return;
    var style = document.createElement('style');
    style.id = 'umsh-push-sheet-style';
    style.textContent = [
      '.umsh-push-sheet{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}',
      '.umsh-push-sheet__panel{width:100%;max-width:480px;box-sizing:border-box;padding:24px 20px calc(20px + env(safe-area-inset-bottom));border-radius:20px 20px 0 0;background:#1a0705;color:#f6ead2;font-family:inherit;box-shadow:0 -12px 40px rgba(0,0,0,.45)}',
      '.umsh-push-sheet__icon{font-size:28px;line-height:1}',
      '.umsh-push-sheet__title{margin:12px 0 6px;font-size:18px;font-weight:700;line-height:1.4}',
      '.umsh-push-sheet__body{margin:0 0 20px;font-size:14px;line-height:1.6;color:rgba(246,234,210,.78)}',
      '.umsh-push-sheet__actions{display:flex;gap:8px}',
      '.umsh-push-sheet__actions button{flex:1;min-height:48px;border-radius:12px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer}',
      '.umsh-push-sheet__later{border:1px solid rgba(246,234,210,.25);background:transparent;color:#f6ead2}',
      '.umsh-push-sheet__accept{border:0;background:#f2bf6b;color:#1a0705}',
    ].join('');
    document.head.appendChild(style);
  }

  function askWithSheet() {
    return new Promise(function (resolve) {
      sheetStyles();
      var root = document.createElement('div');
      root.className = 'umsh-push-sheet';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-labelledby', 'umsh-push-sheet-title');
      root.innerHTML = '<div class="umsh-push-sheet__panel">'
        + '<div class="umsh-push-sheet__icon" aria-hidden="true">🔮</div>'
        + '<p class="umsh-push-sheet__title" id="umsh-push-sheet-title">운명상회 소식을 알림으로 받을까요?</p>'
        + '<p class="umsh-push-sheet__body">오늘의 운세와 리포트 완성 소식, 혜택 안내를 알려 드려요. 알림은 휴대폰 설정에서 언제든 끌 수 있어요.</p>'
        + '<div class="umsh-push-sheet__actions">'
        + '<button type="button" class="umsh-push-sheet__later" data-push-later>나중에</button>'
        + '<button type="button" class="umsh-push-sheet__accept" data-push-accept>알림 받기</button>'
        + '</div></div>';
      function close(answer) { root.remove(); resolve(answer); }
      root.querySelector('[data-push-later]').addEventListener('click', function () { close(false); });
      root.querySelector('[data-push-accept]').addEventListener('click', function () { close(true); });
      document.body.appendChild(root);
      root.querySelector('[data-push-accept]').focus();
    });
  }

  async function start() {
    if (!isNativeApp()) return;
    var push = plugin();
    var status;
    try { status = await push.checkPermissions(); } catch (_) { return; }
    var receive = status && status.receive;
    if (receive === 'granted') { await register().catch(function () {}); return; }
    if (receive === 'denied') return;

    // 아직 묻지 않았다. 로그인한 사람에게만, 미뤄 둔 기간이 지났을 때만 묻는다.
    var state = readState();
    if (state.askedAt && Date.now() - state.askedAt < SNOOZE_MS) return;
    var session = await currentSession();
    if (!session || !session.access_token) return;
    if (document.querySelector('.umsh-push-sheet')) return;
    var accepted = await askWithSheet();
    writeState({ askedAt: Date.now() });
    if (!accepted) return;
    try {
      var result = await push.requestPermissions();
      if (result && result.receive === 'granted') await register();
    } catch (_) {}
  }

  global.UMSHPush = { start: start, isNativeApp: isNativeApp };

  function boot() {
    // 첫 화면 그리기와 겹치지 않게 조금 뒤에 시작한다. 스플래시(1.5초)가 닫힌 뒤가 된다.
    setTimeout(function () { start().catch(function () {}); }, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
