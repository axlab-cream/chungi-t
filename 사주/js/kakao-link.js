(function attachKakaoLinkPage(global) {
  'use strict';

  /*
   * 카카오 챗봇 [보관함에 저장하기] → 이 화면(/kakao/link#t=일회용토큰) → 로그인 → POST /api/kakao/link.
   * 토큰은 주소 # 뒤에만 실어 서버 요청 기록에 남지 않게 한다. 로그인으로 넘어갈 때도 주소에 싣지 않고
   * 이 탭의 sessionStorage 에만 잠깐 둔다(로그인 화면 주소 returnTo 에 토큰이 남지 않게).
   */
  const TOKEN_KEY = 'umsh_kakao_link_token_v1';
  const message = document.querySelector('[data-kakao-link-message]');
  const status = document.querySelector('[data-kakao-link-status]');
  const actions = document.querySelector('#kakao-link-actions');

  function safeGet(key) { try { return global.sessionStorage.getItem(key) || ''; } catch (_error) { return ''; } }
  function safeSet(key, value) { try { global.sessionStorage.setItem(key, value); } catch (_error) { /* 저장소가 막힌 브라우저 */ } }
  function safeRemove(key) { try { global.sessionStorage.removeItem(key); } catch (_error) { /* 저장소가 막힌 브라우저 */ } }

  function takeToken() {
    const match = String(global.location.hash || '').match(/(?:^#|&)t=([A-Za-z0-9_-]{43})(?:&|$)/);
    if (match) {
      safeSet(TOKEN_KEY, match[1]);
      global.history.replaceState(null, '', global.location.pathname);
    }
    return safeGet(TOKEN_KEY);
  }

  function show(text, ok) {
    message.textContent = text;
    status.textContent = '';
    actions.hidden = !ok;
  }

  async function init() {
    const token = takeToken();
    if (!token) { show('연결 주소가 올바르지 않습니다. 카카오톡에서 [보관함에 저장하기]를 다시 눌러 주세요.', false); return; }
    const authConfig = await fetch('/api/auth/config').then((response) => response.json());
    const loginUrl = () => global.UMSHCommonAuth?.commonLoginUrl('kakao-link', global.location.pathname) || `/signup?entry=kakao-link&returnTo=${encodeURIComponent(global.location.pathname)}#login`;
    if (!authConfig.enabled || !global.supabase?.createClient) { global.location.replace(loginUrl()); return; }
    // 회원(SNS) 세션만 본다. 비회원 세션은 sessionStorage 에 있어 여기서는 로그아웃 상태로 보인다.
    const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: global.localStorage } });
    const session = (await client.auth.getSession()).data.session;
    if (!session || session.user?.is_anonymous === true) { global.location.replace(loginUrl()); return; }

    status.textContent = '연결하는 중입니다.';
    const response = await fetch('/api/kakao/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      // 로그인이 풀렸으면 한 번만 다시 로그인으로 보낸다(서버가 계속 거절할 때 화면이 맴돌지 않게).
      if (!safeGet(`${TOKEN_KEY}:relogin`)) { safeSet(`${TOKEN_KEY}:relogin`, '1'); global.location.replace(loginUrl()); return; }
      safeRemove(`${TOKEN_KEY}:relogin`);
      show(payload.error || 'SNS 로그인 후 다시 시도해 주세요.', false);
      return;
    }
    safeRemove(`${TOKEN_KEY}:relogin`);
    safeRemove(TOKEN_KEY);
    if (!response.ok) { show(payload.error || '연결하지 못했습니다. 카카오톡에서 버튼을 다시 눌러 주세요.', false); return; }
    show(payload.saved
      ? '연결했습니다. 카카오톡에서 본 명부를 보관함에 저장했습니다. 이제부터 챗봇에서 본 결과도 보관함에 함께 저장됩니다.'
      : '연결했습니다. 이제부터 챗봇에서 본 결과는 보관함에 함께 저장됩니다.', true);
  }

  init().catch(() => show('연결 화면을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.', false));
})(window);
