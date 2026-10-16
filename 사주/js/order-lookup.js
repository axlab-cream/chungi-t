/**
 * 비회원 주문 조회·불러오기(2026-10-16, docs/auth/guest-member-plan.md 8절).
 * 주문번호 + 결제 때 넣은 휴대폰 번호가 맞으면 서버가 그 비회원 주문·풀이를 지금 요청한 사람에게 옮긴다.
 * - 로그인한 회원: 내 계정으로 불러온다(보관함에 저장).
 * - 비회원: 이 기기의 비회원 계정으로 옮긴다(다른 기기·폰 교체·브라우저 기록 삭제 뒤 다시 열기). 비회원 계정이 없으면 만든다.
 */
(function attachOrderLookup(global) {
  'use strict';

  const form = document.querySelector('[data-lookup-form]');
  const status = document.querySelector('[data-lookup-status]');
  const submit = document.querySelector('[data-lookup-submit]');
  const auth = {};

  function setStatus(message) { if (status) status.textContent = message || ''; }

  /** 결제 완료 화면의 "전체 풀이보기"와 같은 주소(payment-result.js paidReadingUrl 과 같은 규칙). */
  function paidReadingUrl(readingPath, reportId, orderId) {
    const template = String(readingPath || '').trim();
    const params = new URLSearchParams({ paid: '1' });
    if (orderId) params.set('orderId', orderId);
    if (!template) return reportId ? '/r/' + encodeURIComponent(reportId) : '/';
    const hashAt = template.indexOf('#');
    const address = hashAt >= 0 ? template.slice(0, hashAt) : template;
    const hash = hashAt >= 0 ? template.slice(hashAt) : '';
    if (reportId && !address.includes('reportId=')) params.set('reportId', reportId);
    return address + (address.includes('?') ? '&' : '?') + params.toString() + hash;
  }

  async function currentSession() {
    const helper = global.UMSHAuthSession;
    if (!helper) return null;
    if (!auth.config) auth.config = await fetch('/api/auth/config').then((response) => response.json());
    // 회원이면 회원 세션, 아니면 이 기기의 비회원 세션(없으면 만든다).
    return helper.ensureGuestSession ? helper.ensureGuestSession(auth, 4000) : helper.bindServiceSession(auth, 4000);
  }

  async function prepareIntro() {
    const session = await currentSession().catch(() => null);
    if (session && global.UMSHAuthSession?.isMemberSession?.(session)) {
      const title = document.getElementById('lookup-title');
      if (title) title.textContent = '비회원 주문 불러오기';
      const intro = document.querySelector('[data-lookup-intro]');
      if (intro) intro.textContent = '로그인하기 전에 비회원으로 결제한 풀이를 내 계정으로 불러옵니다. 주문번호와 결제할 때 넣은 휴대폰 번호를 입력해 주세요.';
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const orderId = form.orderId.value.trim();
    const tel = form.tel.value.trim();
    if (!orderId || !tel) { setStatus('주문번호와 휴대폰 번호를 입력해 주세요.'); return; }
    submit.disabled = true;
    setStatus('주문을 확인하고 있습니다.');
    try {
      const session = await currentSession();
      if (!session?.access_token) throw new Error('지금은 주문을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
      const response = await fetch('/api/guest/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ orderId, tel }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || '주문번호와 휴대폰 번호를 다시 확인해 주세요.');
      setStatus(payload.moved ? '주문을 불러왔어요. 풀이로 이동합니다.' : '이미 이 기기(계정)에 있는 주문이에요. 풀이로 이동합니다.');
      global.location.assign(paidReadingUrl(payload.readingPath, payload.reportId, payload.orderId));
    } catch (error) {
      setStatus(error.message);
      submit.disabled = false;
    }
  });

  prepareIntro().catch(() => undefined);
})(window);
