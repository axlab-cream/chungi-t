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

  var INPUT_STEP = '/02-step-2-saju-input/';
  var TEASER_STEP = '/04-step-4-report/';
  var here0 = String(global.location.pathname);
  var onInput = here0.indexOf(INPUT_STEP) !== -1;
  var onTeaser = here0.indexOf(TEASER_STEP) !== -1;
  if (!onInput && !onTeaser) return;

  var doc = global.document;
  /** 검사가 늦어도 빈 화면으로 두지 않는다. 이 시각이 지나면 판정을 포기하고 연다. */
  var GIVE_UP_MS = 2500;
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

  /** 같은 서비스의 사주 입력 화면 주소. 04 에서 되돌릴 때 쓴다. */
  function inputUrl() {
    var parts = here0.split('/').filter(Boolean);
    return '/' + parts.slice(0, 2).join('/') + '/02-step-2-saju-input/index.html#step-2-saju-input';
  }

  function sentKey() { return SENT_KEY + serviceEntry() + ':' + (onTeaser ? '04' : '02'); }

  function alreadySent() {
    try { return global.sessionStorage.getItem(sentKey()) === '1'; }
    catch (_error) { return false; }
  }

  function markSent() {
    try { global.sessionStorage.setItem(sentKey(), '1'); }
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

  /**
   * 계정에 저장된 사주가 온전한지. 판단 기준은 umsh-auth-session 이 이미 갖고 있다
   * (isSharedProfileComplete) — 여기서 다시 정의하면 두 기준이 갈라진다.
   *
   * 조회가 실패하면 **있다고 본다.** 티저를 막는 것보다 통과시키는 쪽이 낫고,
   * 실제로 입력이 없으면 서비스 렌더러가 그 다음에 막는다.
   */
  async function hasSajuProfile(session) {
    try {
      var response = await fetch('/api/user/profile', {
        headers: { Authorization: 'Bearer ' + session.access_token },
      });
      if (!response.ok) return true;
      var payload = await response.json();
      var profile = payload && payload.profile;
      if (!profile) return false;
      var judge = global.UMSHAuthSession && global.UMSHAuthSession.isSharedProfileComplete;
      return judge ? judge(profile) : Boolean(profile.birth);
    } catch (_error) {
      return true;
    }
  }

  async function check(deadline) {
    try {
      var config = await fetch('/api/auth/config').then(function (response) { return response.json(); });
      if (!config || !config.enabled) return reveal();
      if (!(await waitForAuthScripts(deadline))) return reveal();

      var waitMs = Math.min(900, Math.max(200, deadline - Date.now()));
      var resolved = global.UMSHAuthSession.resolveLiveSession
        ? await global.UMSHAuthSession.resolveLiveSession(config, waitMs)
        : null;
      var client = resolved && resolved.client;
      var session = resolved && resolved.session;
      if (!client) {
        client = global.UMSHAuthSession.createClient(global.supabase, config.url, config.publishableKey);
        if (!client) return reveal();
        var result = await client.auth.getSession();
        session = await global.UMSHAuthSession.enforceDeviceAuthSession(result.data.session, client);
      }

      if (!session) {
        // 판정을 포기한 뒤라면 사용자는 이미 화면을 보고 있다. 그때 튕기면 타이핑을 뺏는다.
        if (settled || alreadySent()) return reveal();
        markSent();
        // replace 라야 뒤로 가기가 로그인↔화면을 왕복하지 않는다.
        global.location.replace(loginUrl());
        return;
      }

      // 04 무료 티저는 **결과 화면**이다. 사주 입력이 없으면 보여줄 결과가 없다.
      // 예전에는 입력 없이 들어와 "입력값 없음" 복구 패널을 보는 경로가 있었는데,
      // 그건 티저가 아니라 막다른 길이다. 입력 화면으로 되돌린다.
      if (onTeaser && !(await hasSajuProfile(session))) {
        if (settled || alreadySent()) return reveal();
        markSent();
        global.location.replace(inputUrl());
        return;
      }
      return reveal();
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
