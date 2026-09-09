(function (global) {
  'use strict';

  var helper = global.UMSHAccountPages;
  var userBox = document.querySelector('[data-my-user]');
  var statusBox = document.querySelector('[data-my-status]');
  var logoutButton = document.querySelector('[data-my-logout]');

  function setStatus(message) {
    if (statusBox) statusBox.textContent = message || '';
  }

  function renderUser(profile, session) {
    if (!userBox) return;
    var email =
      (session.user && (session.user.email || (session.user.user_metadata && session.user.user_metadata.email))) ||
      '';
    var name =
      (profile && profile.name) ||
      (session.user && session.user.user_metadata && session.user.user_metadata.name) ||
      '회원';
    var birth = profile && profile.birth;
    var birthLine = birth
      ? (birth.calendar === 'lunar' ? '음력' : '양력') +
        ' ' +
        birth.year +
        '.' +
        String(birth.month).padStart(2, '0') +
        '.' +
        String(birth.day).padStart(2, '0') +
        (profile.birthTimeKnown
          ? ' · ' + String(birth.hour).padStart(2, '0') + ':' + String(birth.minute || 0).padStart(2, '0')
          : ' · 시간 모름')
      : '사주 프로필이 아직 없습니다. 개인정보 수정에서 등록해 주세요.';
    userBox.innerHTML =
      '<strong>' +
      helper.escapeHtml(name) +
      '</strong><span>' +
      helper.escapeHtml(email || '소셜 로그인 계정') +
      '</span><span>' +
      helper.escapeHtml(birthLine) +
      '</span>';
  }

  async function init() {
    if (helper && helper.mountAccountChrome) helper.mountAccountChrome('account');
    if (!helper) return;
    var auth;
    try {
      auth = await helper.requireSession('my', { optional: true });
    } catch (_error) {
      setStatus('로그인 상태를 확인하지 못했습니다. 공개 안내는 계속 이용하실 수 있습니다.');
      return;
    }
    if (!auth) return;
    document.querySelectorAll('[data-my-member]').forEach(function (element) { element.hidden = false; });
    var loginLink = document.querySelector('[data-my-login]');
    if (loginLink) loginLink.hidden = true;

    var profile = null;
    try {
      var response = await fetch('/api/user/profile', {
        headers: helper.authHeaders(auth.session),
      });
      var payload = await response.json();
      if (response.ok) profile = payload.profile || null;
    } catch (_error) {
      // Hub still works without profile summary.
    }
    renderUser(profile, auth.session);

    if (logoutButton) {
      logoutButton.addEventListener('click', async function () {
        setStatus('로그아웃 중입니다.');
        try {
          if (global.UMSHAuthSession) global.UMSHAuthSession.clearDeviceAuthSession();
          await auth.client.auth.signOut({ scope: 'local' });
          global.location.assign('/');
        } catch (error) {
          setStatus((error && error.message) || '로그아웃에 실패했습니다.');
        }
      });
    }
  }

  init().catch(function (error) {
    setStatus((error && error.message) || '마이페이지를 불러오지 못했습니다.');
  });
})(window);
