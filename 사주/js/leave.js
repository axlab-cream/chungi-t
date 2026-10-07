(function attachLeavePage(global) {
  'use strict';

  const form = document.querySelector('#leave-form');
  const status = document.querySelector('[data-leave-status]');
  function setStatus(message) { status.textContent = message || ''; }

  async function init() {
    const authConfig = await fetch('/api/auth/config').then((response) => response.json());
    if (!authConfig.enabled || !global.supabase?.createClient) {
      const returnTo = `${global.location.pathname}${global.location.search}`;
      global.location.replace(window.UMSHCommonAuth?.commonLoginUrl('leave', returnTo) || `/signup?entry=leave&returnTo=${encodeURIComponent(returnTo)}#login`);
      return;
    }
    const client = global.supabase.createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: global.localStorage } });
    const session = (await client.auth.getSession()).data.session;
    if (!session) { global.location.replace(window.UMSHCommonAuth.commonLoginUrl('leave', `${global.location.pathname}${global.location.search}`)); return; }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      setStatus('삭제 중입니다.');
      try {
        // 오래 열어 둔 화면이면 처음 받은 토큰이 만료됐을 수 있다. 보낼 때 세션을 다시 읽는다.
        const current = (await client.auth.getSession()).data.session || session;
        const response = await fetch('/api/user/account', { method: 'DELETE', headers: { Authorization: `Bearer ${current.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || '탈퇴 처리에 실패했습니다.');
        // 계정이 이미 지워져 서버 로그아웃이 실패해도, 이 기기의 로그인 정보는 지운다.
        await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
        setStatus('탈퇴 처리가 완료됐습니다. 홈으로 이동합니다.');
        global.setTimeout(() => global.location.assign('/'), 700);
      } catch (error) {
        setStatus(error.message || '탈퇴 처리에 실패했습니다.');
        submit.disabled = false;
      }
    });
  }

  init().catch((error) => setStatus(error.message || '탈퇴 화면을 불러오지 못했습니다.'));
})(window);
