(function (global) {
  'use strict';

  function returnToPath() {
    return `${global.location.pathname}${global.location.search}${global.location.hash || ''}`;
  }

  function loginRedirect(entry) {
    const returnTo = returnToPath();
    const url =
      (global.UMSHCommonAuth && global.UMSHCommonAuth.commonLoginUrl(entry, returnTo)) ||
      `/signup?entry=${encodeURIComponent(entry || 'my')}&returnTo=${encodeURIComponent(returnTo)}#login`;
    global.location.replace(url);
  }

  async function requireSession(entry, options) {
    const optional = Boolean(options && options.optional);
    const authConfig = await fetch('/api/auth/config').then(function (response) {
      return response.json();
    });
    if (!authConfig.enabled || !global.supabase || !global.supabase.createClient) {
      if (!optional) loginRedirect(entry);
      return null;
    }

    var client =
      (global.UMSHAuthSession &&
        global.UMSHAuthSession.createClient(global.supabase, authConfig.url, authConfig.publishableKey)) ||
      global.supabase.createClient(authConfig.url, authConfig.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storage: global.localStorage,
        },
      });

    var session = (await client.auth.getSession()).data.session || null;
    if (global.UMSHAuthSession && global.UMSHAuthSession.enforceDeviceAuthSession) {
      session = await global.UMSHAuthSession.enforceDeviceAuthSession(session, client);
    }
    if (!session || !session.access_token) {
      if (!optional) loginRedirect(entry);
      return null;
    }

    return { client: client, session: session, authConfig: authConfig };
  }

  function authHeaders(session, base) {
    var headers = Object.assign({}, base || {});
    if (session && session.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    return headers;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function formatDate(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR');
  }

  function orderStatusLabel(statusValue) {
    return (
      {
        ready: '결제 대기',
        approving: '승인 확인 중',
        paid: '결제 완료',
        viewed: '풀이 열람',
        failed: '결제 실패',
        cancelled: '결제 취소',
      }[statusValue] || statusValue
    );
  }

  function productPath(key) {
    return (
      {
        cmdg: '/cmdg/',
        love_this_year: '/love/this-year',
        home_pungsu: '/place/home',
        work_move: '/work/move',
        work_job: '/work/job',
        money_save: '/money/save',
        marry_match: '/match/marry',
        match_couple: '/match/couple',
        love_mind: '/love/mind',
        love_again: '/love/again',
        love_spouse: '/love/spouse',
        // 2026-10-12: 아래 상품이 빠져 결제 내역의 "풀이 화면 열기"가 홈으로 갔다. 주소는 src/payment/catalog.ts 와 같다.
        cheonmyeong_consultation: '/consultation',
        cat_compatibility: '/match/cat',
        couple_signal: '/love/signal',
        job_choice: '/work/job-choice',
        quit_fortune: '/work/quit',
        lucky_color: '/me/lucky',
        pass_angle: '/me/pass-angle',
        newyear_flow: '/flow/newyear',
        wedding_day: '/day/wedding',
      }[key] || '/'
    );
  }

  function mountAccountChrome(active) {
    if (!global.UMSHChrome || typeof global.UMSHChrome.mount !== 'function') return null;
    document.body.classList.add('umsh-has-chrome');
    return global.UMSHChrome.mount({
      service: 'MY',
      price: '',
      active: active || 'account',
      root: 'main.payment-page, main.stage, main',
    });
  }

  global.UMSHAccountPages = {
    requireSession: requireSession,
    loginRedirect: loginRedirect,
    authHeaders: authHeaders,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    orderStatusLabel: orderStatusLabel,
    productPath: productPath,
    mountAccountChrome: mountAccountChrome,
  };
})(typeof window !== 'undefined' ? window : globalThis);
