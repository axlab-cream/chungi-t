/**
 * 결혼 택일: the form creates an authenticated, saved reading, then navigates to its
 * UUID. The shared reader owns 04/05/06, entitlement and bounded generation.
 * Never display or persist an unscoped browser copy of a customer's interpretation.
 */
(function () {
  'use strict';
  if (!/^\/day\/wedding(?:\/|$)/.test(location.pathname)) return;

  var SERVICE = { key: 'wedding_day', entry: 'wedding', base: '/day/wedding' };
  var sessionPromise = null;
  var currentOwner = '';

  function loginUrl() {
    var returnTo = location.pathname + location.search + location.hash;
    return window.UMSHCommonAuth && window.UMSHCommonAuth.commonLoginUrl
      ? window.UMSHCommonAuth.commonLoginUrl(SERVICE.entry, returnTo)
      : '/signup?entry=' + SERVICE.entry + '&returnTo=' + encodeURIComponent(returnTo) + '#login';
  }

  async function authenticatedSession() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async function () {
      if (!window.UMSHReportAccess) throw new Error('해석 화면을 준비하지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      var config = await fetch('/api/auth/config', { cache: 'no-store' }).then(function (response) { return response.json(); });
      if (!config.enabled || !window.supabase || !window.UMSHAuthSession) {
        var unavailable = new Error('로그인 후 계정에 저장된 사주로 이어서 볼 수 있습니다.');
        unavailable.status = 401;
        throw unavailable;
      }
      var client = window.UMSHAuthSession.createClient(window.supabase, config.url, config.publishableKey);
      var result = await client.auth.getSession();
      var session = await window.UMSHAuthSession.enforceDeviceAuthSession(result.data.session, client);
      if (!session || !session.access_token || !session.user) {
        var signedOut = new Error('로그인 후 계정에 저장된 사주로 이어서 볼 수 있습니다.');
        signedOut.status = 401;
        throw signedOut;
      }
      currentOwner = session.user.id;
      window.UMSHReportAccess.setOwner(session.user.id);
      client.auth.onAuthStateChange(function (_event, nextSession) {
        currentOwner = nextSession && nextSession.user ? nextSession.user.id : '';
        window.UMSHReportAccess.setOwner(nextSession && nextSession.user && nextSession.user.id);
        sessionPromise = null;
      });
      return session;
    })();
    try { return await sessionPromise; }
    catch (error) { sessionPromise = null; throw error; }
  }

  function resultUrl(payload, orderId) {
    var id = window.UMSHReportAccess.identity(payload);
    if (!id) throw new Error('저장된 해석 주소를 받지 못했습니다. 잠시 후 다시 시도해 주세요.');
    var url = new URL(SERVICE.base + '/04-step-4-report/index.html', location.origin);
    url.searchParams.set('reportId', id);
    if (orderId) url.searchParams.set('orderId', orderId);
    else if (payload.previewOnly === true) url.searchParams.set('preview', '1');
    url.hash = 'step-4-report';
    return url.pathname + url.search + url.hash;
  }

  /**
   * 본인 생년월일과 출생시간은 계정에 저장된 값을 쓴다. 화면에서 다시 묻지 않고,
   * 서버가 프로필에서 읽는다. 후보일과 상대 정보만 이 폼에서 받는다.
   */
  function useSavedProfile(form) {
    ['meBirth', 'meTime'].forEach(function (id) {
      var field = form.querySelector('#' + id);
      if (!field) return;
      field.required = false;
      var box = field.closest('.field');
      if (box) box.hidden = true;
    });
    if (!form.querySelector('[data-wedding-owned]')) {
      var note = document.createElement('p');
      note.className = 'notice';
      note.setAttribute('data-wedding-owned', '');
      note.style.cssText = 'margin:0 0 10px';
      note.textContent = '본인 생년월일과 출생시간은 로그인한 계정에 저장된 사주를 씁니다. 바꾸려면 사주 등록·수정으로 이동해 주세요.';
      form.insertBefore(note, form.firstElementChild);
    }
  }

  function setupInput(root) {
    var form = root.querySelector('[data-wedding-form]');
    if (!form) return;
    useSavedProfile(form);

    var status = form.querySelector('[data-form-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'notice';
      status.setAttribute('data-form-status', '');
      form.appendChild(status);
    }
    status.setAttribute('role', 'status');

    var busy = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (busy) return;

      var body = {
        candidateDate1: (form.querySelector('#date1') || {}).value || '',
        candidateDate2: (form.querySelector('#date2') || {}).value || '',
        candidateDate3: (form.querySelector('#date3') || {}).value || '',
        partnerBirth: (form.querySelector('#partnerBirth') || {}).value || '',
        partnerTime: (form.querySelector('#partnerTime') || {}).value || '',
        format: (form.querySelector('#format') || {}).value || '',
        familyLimit: (form.querySelector('#familyLimit') || {}).value || '',
      };
      if (!body.candidateDate1) {
        status.textContent = '후보일을 하나 이상 골라 주세요. 날짜가 있어야 조건을 비교할 수 있습니다.';
        var first = form.querySelector('#date1');
        if (first) first.focus();
        return;
      }

      busy = true;
      var button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      status.textContent = '고른 후보일을 두 사람 명식과 겹쳐 조건을 세고 있습니다.';
      try {
        var session = await authenticatedSession();
        if (currentOwner !== session.user.id) throw new Error('계정이 변경되었습니다. 새로고침 후 현재 계정으로 다시 확인해 주세요.');
        var query = new URLSearchParams(location.search);
        var orderId = query.get('orderId') || '';
        if (orderId) body.orderId = orderId;
        var response = await window.UMSHReportAccess.fetch('/api/day/wedding/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
          body: JSON.stringify(body),
        });
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok) {
          var failure = new Error(payload.error || '풀이를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          failure.status = response.status;
          failure.code = payload.code;
          throw failure;
        }
        location.assign(resultUrl(payload, orderId));
      } catch (error) {
        status.textContent = error.message || '풀이를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        if (error.status === 401) location.assign(loginUrl());
        else if (error.code === 'PROFILE_REQUIRED') location.assign('/profile?returnTo=' + encodeURIComponent(location.pathname + location.search));
      } finally {
        busy = false;
        if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
      }
    }, true);
  }

  function start() {
    var input = document.querySelector('#step-2-saju-input');
    if (input) setupInput(input);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
