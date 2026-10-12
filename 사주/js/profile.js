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

  // 서버(parseUserProfileRequest)와 같은 규칙. 풀이 문장에 이름이 들어가서 한글만 받는다.
  var NAME_RULE = /^[가-힣]{2,20}$/;

  /**
   * 오류 코드(2026-10-08). 회원이 고객센터에 코드만 알려 주면 원인을 바로 알 수 있게 모든 오류에 붙인다.
   * 규정과 전체 목록은 docs/ERROR-CODES.md. field 가 있으면 그 칸 바로 아래에 띄운다.
   */
  var ERRORS = {
    'PRF-01': { field: 'name', message: '이름을 입력해 주세요.' },
    'PRF-02': { field: 'name', message: '이름은 한글 2자 이상 20자 이하로 입력해 주세요.' },
    'PRF-03': { field: 'birth', message: '생년월일을 입력해 주세요.' },
    'PRF-04': { field: 'birth', message: '생년월일을 다시 확인해 주세요. 1900년 1월 1일부터 오늘까지만 저장할 수 있어요.' },
    'PRF-05': { field: 'time', message: '태어난 시각을 입력해 주세요. 모르면 "시간 모름"을 눌러 주세요.' },
    'PRF-06': { field: null, message: '성별을 선택해 주세요.' },
    'PRF-07': { field: null, message: '양력 또는 음력을 선택해 주세요.' },
    'PRF-10': { field: null, message: '로그인이 끝났어요. 다시 로그인한 뒤 저장해 주세요.' },
    'PRF-20': { field: null, message: '서버에 저장하지 못했어요. 잠시 뒤 다시 저장해 주세요. 계속되면 고객센터에 오류 코드를 알려 주세요.' },
    'PRF-21': { field: null, message: '인터넷 연결이 끊겼어요. 연결을 확인한 뒤 다시 저장해 주세요.' },
    'PRF-30': { field: null, message: '프로필을 불러오지 못했어요. 새로고침해 주세요. 계속되면 고객센터에 오류 코드를 알려 주세요.' },
  };
  var FIELDS = ['name', 'birth', 'time'];

  function fieldInput(field) {
    return form && form.elements[field];
  }

  function fieldSlot(field) {
    return document.querySelector('[data-error-for="' + field + '"]');
  }

  function codeChip(code) {
    var chip = document.createElement('span');
    chip.className = 'error-code';
    chip.textContent = code;
    return chip;
  }

  function clearFieldError(field) {
    var slot = fieldSlot(field);
    if (slot) { slot.hidden = true; slot.textContent = ''; }
    var input = fieldInput(field);
    if (input) input.removeAttribute('aria-invalid');
  }

  function clearErrors() {
    FIELDS.forEach(clearFieldError);
    setStatus('');
  }

  /** 코드 하나를 화면에 띄운다. 칸 오류는 그 칸 아래, 나머지는 저장 버튼 아래. */
  function showError(code, detail) {
    var entry = ERRORS[code] || ERRORS['PRF-20'];
    var message = detail || entry.message;
    var slot = entry.field && fieldSlot(entry.field);
    var target = slot || statusBox;
    if (!target) return;
    target.textContent = message + ' ';
    target.appendChild(codeChip(code));
    if (slot) {
      slot.hidden = false;
      var input = fieldInput(entry.field);
      if (input) input.setAttribute('aria-invalid', 'true');
    } else {
      statusBox.style.color = '';
    }
  }

  function focusField(code) {
    var field = ERRORS[code] && ERRORS[code].field;
    var input = field && fieldInput(field);
    if (input && typeof input.focus === 'function') input.focus();
  }

  /** 서버는 한국어 문장으로 거절한다(parseUserProfileRequest). 문장을 코드로 바꿔 같은 자리에 띄운다. */
  function serverErrorCode(status, message, name) {
    if (status === 401) return 'PRF-10';
    if (status >= 500) return 'PRF-20';
    var text = String(message || '');
    if (/이름/.test(text)) return name ? 'PRF-02' : 'PRF-01';
    if (/생년월일/.test(text)) return 'PRF-04';
    if (/태어난 시간|시각/.test(text)) return 'PRF-05';
    if (/성별/.test(text)) return 'PRF-06';
    if (/양력|음력/.test(text)) return 'PRF-07';
    return 'PRF-20';
  }

  /** 저장 전에 화면에서 먼저 확인한다. 틀린 칸을 모두 표시하고 첫 칸으로 커서를 옮긴다. */
  function validate() {
    var codes = [];
    var name = form.name.value.trim();
    if (!name) codes.push('PRF-01');
    else if (!NAME_RULE.test(name)) codes.push('PRF-02');
    var birth = String(form.birth.value || '');
    if (!birth) codes.push('PRF-03');
    else {
      var date = new Date(birth + 'T00:00:00');
      if (Number.isNaN(date.getTime()) || birth < '1900-01-01' || date.getTime() > Date.now()) codes.push('PRF-04');
    }
    if (birthTimeKnown && !String(form.time.value || '')) codes.push('PRF-05');
    codes.forEach(function (code) { showError(code); });
    if (codes.length) focusField(codes[0]);
    return codes.length === 0;
  }

  function fill(profile) {
    if (!profile || !form) return;
    form.name.value = profile.name || '';
    // 예전 경로로 영문 이름이 저장된 회원은 저장하려는 순간 막힌다. 열자마자 알려 준다.
    if (profile.name && !NAME_RULE.test(profile.name)) {
      showError('PRF-02', ERRORS['PRF-02'].message + ' 지금 이름(' + profile.name + ')을 한글로 바꿔 저장해 주세요.');
    }
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
      var selected = (btn.getAttribute('data-time-known') === '1') === birthTimeKnown;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
    if (timeFields) {
      timeFields.hidden = !birthTimeKnown;
      form.time.disabled = !birthTimeKnown;
    }
  }

  async function init() {
    if (helper.mountAccountChrome) helper.mountAccountChrome('account');
    var auth = await helper.requireSession('profile');
    if (!auth) return;
    document.querySelectorAll('[data-time-known]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        birthTimeKnown = btn.getAttribute('data-time-known') === '1';
        syncTimeUi();
        clearFieldError('time');
      });
    });
    // 고쳐 쓰면 그 칸의 오류는 바로 지운다. 생년월일은 연·월·일 고르기가 change 를 낸다.
    FIELDS.forEach(function (field) {
      var input = fieldInput(field);
      if (!input) return;
      input.addEventListener('input', function () { clearFieldError(field); });
      input.addEventListener('change', function () { clearFieldError(field); });
    });
    try {
      var response = await fetch('/api/user/profile', { headers: helper.authHeaders(auth.session) });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) { showError(response.status === 401 ? 'PRF-10' : 'PRF-30'); return; }
      fill(payload.profile);
    } catch (_error) {
      showError('PRF-30');
      return;
    }
    var submit = form.querySelector('[type="submit"]');
    var saving = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (saving) return;
      clearErrors();
      if (!validate()) return;
      saving = true;
      if (submit) submit.disabled = true;
      setStatus('저장 중입니다.');
      // 실패를 여기서 받지 않으면 "저장 중입니다."에서 멈춘다(2026-10-08 PC 에서 재현).
      try {
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
          // 회원이 이전에 저장한 현실 기준은 서버가 유지한다. 프로필 저장으로 지우지 않는다.
        };
        var save = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: helper.authHeaders(auth.session, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(body),
        });
        var saved = await save.json().catch(function () { return {}; });
        if (!save.ok) {
          setStatus('');
          var code = serverErrorCode(save.status, saved.error, body.name);
          showError(code);
          focusField(code);
          return;
        }
        fill(saved.profile);
        setStatus('프로필을 저장했습니다.', true);
      } catch (error) {
        // fetch 는 연결이 끊기면 TypeError 를 던진다.
        showError(error instanceof TypeError ? 'PRF-21' : 'PRF-20');
      } finally {
        saving = false;
        if (submit) submit.disabled = false;
      }
    });
  }

  init().catch(function () {
    showError('PRF-30');
  });
})(window);
