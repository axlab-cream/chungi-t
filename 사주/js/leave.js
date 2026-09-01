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
      setStatus('삭제 중입니다.');
      const response = await fetch('/api/user/account', { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || '탈퇴 처리에 실패했습니다.');
      await client.auth.signOut();
      setStatus('탈퇴 처리가 완료됐습니다. 홈으로 이동합니다.');
      global.setTimeout(() => global.location.assign('/'), 700);
    });
  }

  init().catch((error) => setStatus(error.message || '탈퇴 화면을 불러오지 못했습니다.'));
})(window);
