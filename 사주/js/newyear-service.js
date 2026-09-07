/**
 * 2027 신년운세: the form creates an authenticated, saved preview, then navigates
 * to its UUID. The shared reader owns 04/05/06, entitlement and bounded generation.
 * Never display or persist an unscoped browser copy of a customer's interpretation.
 */
(function () {
  'use strict';
  if (!/^\/flow\/newyear(?:\/|$)/.test(location.pathname)) return;

  var SERVICE = { key: 'newyear_flow', entry: 'newyear', base: '/flow/newyear' };
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
        if (!nextSession || nextSession.user.id !== session.user.id) clearProfile();
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
    url.hash = 'step-4-report';
    return url.pathname + url.search + url.hash;
  }

  function clearProfile() {
    document.querySelectorAll('[data-newyear-profile-value]').forEach(function (field) { field.value = ''; });
    var name = document.querySelector('[name="display-name"]');
    if (name) name.value = '';
    var note = document.querySelector('[data-newyear-profile-note]');
    if (note) note.textContent = '로그인한 계정에 저장된 사주를 사용합니다. 변경된 계정은 새로고침 후 확인해 주세요.';
  }

  async function loadProfile(form) {
    var note = form.querySelector('[data-newyear-profile-note]');
    try {
      var session = await authenticatedSession();
      if (currentOwner !== session.user.id) return;
      var epoch = window.UMSHReportAccess.ownerEpoch();
      var response = await fetch('/api/user/profile', { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' });
      if (!response.ok) return;
      var payload = await response.json();
      if (epoch !== window.UMSHReportAccess.ownerEpoch() || currentOwner !== session.user.id) return;
      var profile = payload.profile;
      if (!profile || !profile.birth) {
        if (note) note.textContent = '저장된 사주가 없습니다. 사주 등록·수정에서 기본 정보를 먼저 알려 주세요.';
        return;
      }
      var birth = profile.birth;
      var values = {
        'birth-date': birth.year + '년 ' + birth.month + '월 ' + birth.day + '일',
        'birth-time': profile.birthTimeKnown !== false && Number.isFinite(birth.hour) ? String(birth.hour).padStart(2, '0') + ':' + String(birth.minute || 0).padStart(2, '0') : '시간 모름',
        calendar: (birth.calendar === 'lunar' ? '음력' : '양력') + (birth.isLeapMonth ? ' · 윤달' : ''),
      };
      Object.keys(values).forEach(function (key) { var field = form.querySelector('[name="' + key + '"]'); if (field) field.value = values[key]; });
      var name = form.querySelector('[name="display-name"]');
      if (name && !name.value) name.value = profile.name || '';
      if (note) note.textContent = '아래 사주 정보는 로그인한 계정에 저장된 값입니다. 바꾸려면 사주 등록·수정으로 이동해 주세요.';
    } catch (_error) {
      if (note) note.textContent = '로그인하면 계정에 저장된 사주를 확인할 수 있습니다. 아래 버튼으로 이어서 진행해 주세요.';
    }
  }

  function setupInput(root) {
    var form = root.querySelector('form[data-route]');
    if (!form) return;
    var status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('data-newyear-status', '');
    status.style.cssText = 'margin:12px 18px;color:#D4AF6A;font-size:13px';
    form.parentNode.insertBefore(status, form);
    var edit = form.querySelector('[data-newyear-edit-profile]');
    if (edit) edit.href = '/profile?returnTo=' + encodeURIComponent(location.pathname);
    loadProfile(form);
    var busy = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (busy) return;
      busy = true;
      var button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
      status.textContent = '계정에 저장된 사주로 2027년 흐름을 준비하고 있습니다.';
      try {
        var session = await authenticatedSession();
        if (currentOwner !== session.user.id) throw new Error('계정이 변경되었습니다. 새로고침 후 현재 계정으로 다시 확인해 주세요.');
        var query = new URLSearchParams(location.search);
        var orderId = query.get('orderId') || '';
        var name = form.querySelector('[name="display-name"]');
        var body = { displayName: name ? name.value.trim().slice(0, 20) : '' };
        if (orderId) body.orderId = orderId;
        var response = await window.UMSHReportAccess.fetch('/api/flow/newyear/analyze', {
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
    if (input) { setupInput(input); return; }
    // Shared boot performs a fresh authenticated GET, clears stale cache bodies,
    // displays previews only before payment and resumes only pending saved sections.
    if (document.querySelector('#step-4-report, #step-5-chat, #step-6_1-report')) return;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
