(function (global) {
  'use strict';

  /**
   * umsh-funnel-auth-gate.js
   *
   * 모든 서비스의 순서를 하나로 만든다:
   *   인트로 → (로그인) → 사주 입력 → 무료 티저 → 결제 → 해석 목차 → 목차 상세
   *
   * 로그인 단계가 어디에도 없었다. 01 인트로의 CTA 는 14개 서비스 전부 곧장 02 로 갔고,
   * 로그인은 04 티저나 05 목록에서야 막아섰다. 그래서 사용자는 입력을 다 마친 뒤에야
   * 로그인을 요구받았다.
   *
   * 문을 01 이 아니라 02 에 세운 이유: 01 의 CTA 가 서비스마다 다르다. 정적 <a> 인 곳,
   * JS 가 location 을 바꾸는 곳(job-choice · cat · signal — 02 로 가는 <a> 가 아예 없다),
   * umsh-chrome.js 를 싣지 않는 곳(work/move)이 섞여 있다. 02 에서 한 번 막으면 어느
   * 경로로 들어왔든 순서가 같다.
   *
   * **로그인되어 있으면 아무 일도 하지 않는다** — 그대로 사주 입력 화면이다.
   *
   * 실패하면 열어 준다. 설정 조회가 죽든 스크립트가 없든 로그인이 꺼져 있든, 입력 화면을
   * 막아 세우는 것보다 통과시키는 쪽이 낫다. 04 티저·05 목록의 기존 차단이 그대로 남아 있다.
   */

  var STEP_PATH = '/02-step-2-saju-input/';
  if (String(global.location.pathname).indexOf(STEP_PATH) === -1) return;

  var doc = global.document;
  /** 검사가 늦어도 빈 화면으로 두지 않는다. 이 시각이 지나면 판정을 포기하고 연다. */
  var GIVE_UP_MS = 4000;
  /** supabase·umsh-auth-session 은 body 끝에서 실려 head 시점에는 없다. 그래서 기다린다. */
  var WAIT_STEP_MS = 60;
  /** 로그인에 실패해 되돌아온 사람을 다시 로그인으로 보내면 무한 왕복이 된다. */
  var SENT_KEY = 'umsh:funnel-auth-sent:';

  var settled = false;

  function reveal() {
    if (settled) return;
    settled = true;
    doc.documentElement.removeAttribute('data-umsh-auth-gate');
  }

  function hide() {
    doc.documentElement.setAttribute('data-umsh-auth-gate', 'checking');
    var style = doc.createElement('style');
    style.id = 'umsh-auth-gate-style';
    // 정적 마크업이 잠깐이라도 보였다가 로그인으로 튕기면 깜빡임으로 읽힌다.
    style.textContent = 'html[data-umsh-auth-gate="checking"] body{visibility:hidden}';
    (doc.head || doc.documentElement).appendChild(style);
  }

  /** 로그인 화면이 어디서 왔는지 알 수 있게, 서비스 경로를 그대로 쓴다. */
  function serviceEntry() {
    var parts = String(global.location.pathname).split('/').filter(Boolean);
    return parts.slice(0, 2).join('-') || 'saju-input';
  }

  function here() {
    return global.location.pathname + global.location.search + global.location.hash;
  }

  function loginUrl() {
    var entry = serviceEntry();
    if (global.UMSHCommonAuth && global.UMSHCommonAuth.commonLoginUrl) {
      return global.UMSHCommonAuth.commonLoginUrl(entry, here());
    }
    return '/signup?entry=' + encodeURIComponent(entry)
      + '&returnTo=' + encodeURIComponent(here()) + '#login';
  }

  function alreadySent() {
    try { return global.sessionStorage.getItem(SENT_KEY + serviceEntry()) === '1'; }
    catch (_error) { return false; }
  }

  function markSent() {
    try { global.sessionStorage.setItem(SENT_KEY + serviceEntry(), '1'); }
    catch (_error) { /* 저장소가 막혀 있으면 한 번 더 보낼 수는 있다. 막는 것보다 낫다. */ }
  }

  function waitForAuthScripts(deadline) {
    return new Promise(function (resolve) {
      (function poll() {
        if (global.supabase && global.UMSHAuthSession) return resolve(true);
        if (Date.now() >= deadline) return resolve(false);
        global.setTimeout(poll, WAIT_STEP_MS);
      })();
    });
  }

  async function check(deadline) {
    try {
      var config = await fetch('/api/auth/config').then(function (response) { return response.json(); });
      if (!config || !config.enabled) return reveal();
      if (!(await waitForAuthScripts(deadline))) return reveal();

      var client = global.UMSHAuthSession.createClient(global.supabase, config.url, config.publishableKey);
      if (!client) return reveal();
      var result = await client.auth.getSession();
      var session = await global.UMSHAuthSession.enforceDeviceAuthSession(result.data.session, client);
      if (session) return reveal();

      // 판정을 포기한 뒤라면 사용자는 이미 입력 화면을 보고 있다. 그때 튕기면 타이핑을 뺏는다.
      if (settled || alreadySent()) return reveal();
      markSent();
      // replace 라야 뒤로 가기가 로그인↔입력을 왕복하지 않는다.
      global.location.replace(loginUrl());
    } catch (_error) {
      reveal();
    }
  }

  hide();
  var deadline = Date.now() + GIVE_UP_MS;
  global.setTimeout(reveal, GIVE_UP_MS);
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { check(deadline); });
  else check(deadline);
})(window);
