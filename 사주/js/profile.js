(function (global) {
  'use strict';
  var helper = global.UMSHAccountPages;
  var form = document.querySelector('#profile-form');
  var statusBox = document.querySelector('[data-profile-status]');
  var timeFields = document.querySelector('[data-time-fields]');
  var birthTimeKnown = true;

  function setStatus(message, ok) {
    if (!statusBox) return;
    statusBox.textContent = message || '';
    statusBox.style.color = ok ? '#e8c76f' : '';
  }

  function fill(profile) {
    if (!profile || !form) return;
    form.name.value = profile.name || '';
    var birth = profile.birth || {};
    form.gender.value = birth.gender === 'male' ? 'male' : 'female';
    form.calendar.value = birth.calendar === 'lunar' ? 'lunar' : 'solar';
    form.year.value = birth.year || '';
    form.month.value = birth.month || '';
    form.day.value = birth.day || '';
    birthTimeKnown = profile.birthTimeKnown !== false;
    form.hour.value = Number.isFinite(Number(birth.hour)) ? birth.hour : 12;
    form.minute.value = Number.isFinite(Number(birth.minute)) ? birth.minute : 0;
    syncTimeUi();
  }

  function syncTimeUi() {
    document.querySelectorAll('[data-time-known]').forEach(function (btn) {
      btn.classList.toggle('is-selected', (btn.getAttribute('data-time-known') === '1') === birthTimeKnown);
    });
    if (timeFields) timeFields.hidden = !birthTimeKnown;
  }

  async function init() {
    if (helper.mountAccountChrome) helper.mountAccountChrome('account');
    var auth = await helper.requireSession('profile');
    if (!auth) return;
    document.querySelectorAll('[data-time-known]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        birthTimeKnown = btn.getAttribute('data-time-known') === '1';
        syncTimeUi();
      });
    });
    var response = await fetch('/api/user/profile', { headers: helper.authHeaders(auth.session) });
    var payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '프로필을 불러오지 못했습니다.');
    fill(payload.profile);
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      setStatus('저장 중입니다.');
      var body = {
        name: form.name.value.trim(),
        birthTimeKnown: birthTimeKnown,
        birth: {
          year: Number(form.year.value),
          month: Number(form.month.value),
          day: Number(form.day.value),
          hour: birthTimeKnown ? Number(form.hour.value) : 12,
          minute: birthTimeKnown ? Number(form.minute.value || 0) : 0,
          gender: form.gender.value,
          calendar: form.calendar.value,
          isLeapMonth: false,
        },
        context: {},
      };
      var save = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: helper.authHeaders(auth.session, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      var saved = await save.json();
      if (!save.ok) throw new Error(saved.error || '프로필 저장에 실패했습니다.');
      fill(saved.profile);
      setStatus('프로필을 저장했습니다.', true);
    });
  }

  init().catch(function (error) {
    setStatus((error && error.message) || '개인정보 수정 화면을 불러오지 못했습니다.');
  });
})(window);