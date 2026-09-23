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

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  /** 날짜 컨트롤은 1998-02-14 를 준다. 저장 형식은 연·월·일 숫자다. */
  function birthParts() {
    var parts = String(form.birth.value || '').split('-');
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }

  /** 시간 컨트롤은 13:30 을 준다. 시간 모름이면 호출되지 않는다. */
  function timeParts() {
    var parts = String(form.time.value || '12:00').split(':');
    return [parts[0] || 12, parts[1] || 0];
  }

  function fill(profile) {
    if (!profile || !form) return;
    form.name.value = profile.name || '';
    var birth = profile.birth || {};
    form.gender.value = birth.gender === 'male' ? 'male' : 'female';
    form.calendar.value = birth.calendar === 'lunar' ? 'lunar' : 'solar';
    form.birth.value = birth.year && birth.month && birth.day
      ? birth.year + '-' + pad2(birth.month) + '-' + pad2(birth.day)
      : '';
    birthTimeKnown = profile.birthTimeKnown !== false;
    var hour = Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12;
    var minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
    form.time.value = pad2(hour) + ':' + pad2(minute);
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
          year: Number(birthParts()[0]),
          month: Number(birthParts()[1]),
          day: Number(birthParts()[2]),
          hour: birthTimeKnown ? Number(timeParts()[0]) : 12,
          minute: birthTimeKnown ? Number(timeParts()[1]) : 0,
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