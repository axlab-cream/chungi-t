(() => {
  if (!/\/me\/pass-angle(?:\/|$)/.test(window.location.pathname)) return;

  const STORAGE = {
    userProfile: 'cheongi_user_birth_profile_v1',
    input: 'umsh_pass_angle_input_payload_v1',
    report: 'umsh_pass_angle_report_v1',
    selectedSection: 'umsh:pass_angle:selected_section_v1',
  };

  const SERVICE = {
    service_key: 'pass_angle',
    title: '나, 붙을 각이야?',
    price_krw: 9900,
  };

  const pad2 = (value) => String(value).padStart(2, '0');

  function storageAvailable(kind) {
    try {
      const store = window[kind];
      const probe = '__umsh_probe__';
      store.setItem(probe, '1');
      store.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  function safeParse(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const localGet = (key) => (storageAvailable('localStorage') ? safeParse(localStorage.getItem(key)) : null);
  const sessionGet = (key) => (storageAvailable('sessionStorage') ? safeParse(sessionStorage.getItem(key)) : null);
  const sessionSet = (key, value) => {
    if (storageAvailable('sessionStorage')) sessionStorage.setItem(key, JSON.stringify(value));
  };

  /** The saju profile the account already saved, so step 2 never asks for it twice. */
  function readSavedProfile() {
    const profile = localGet(STORAGE.userProfile);
    const birth = profile?.birth || {};
    const gender = birth.gender === 'female' ? 'female' : birth.gender === 'male' ? 'male' : '';
    const calendar = birth.calendar === 'lunar' ? 'lunar' : 'solar';
    const birthTimeKnown = profile?.birthTimeKnown !== false && Number.isFinite(Number(birth.hour));
    const complete = Boolean(profile?.name && birth.year && birth.month && birth.day && gender);
    if (!complete) return { complete: false, profile: null, label: '' };
    const normalized = {
      name: profile.name,
      birthTimeKnown,
      birth: {
        year: Number(birth.year),
        month: Number(birth.month),
        day: Number(birth.day),
        hour: birthTimeKnown ? Number(birth.hour) : 12,
        minute: Number(birth.minute || 0),
        gender,
        calendar,
      },
    };
    const timeLabel = birthTimeKnown ? `${pad2(normalized.birth.hour)}:${pad2(normalized.birth.minute)}` : '시간 모름';
    return {
      complete: true,
      profile: normalized,
      label: `${normalized.name} · ${calendar === 'lunar' ? '음력' : '양력'} ${normalized.birth.year}.${pad2(normalized.birth.month)}.${pad2(normalized.birth.day)} · ${timeLabel}`,
    };
  }

  function saveProfileFromForm(form) {
    const name = form.querySelector('#name')?.value.trim();
    const birthRaw = form.querySelector('#birth')?.value;
    const timeRaw = form.querySelector('#time')?.value;
    const genderRaw = form.querySelector('#gender')?.value || '';
    if (!name || !birthRaw) return null;
    const [year, month, day] = birthRaw.split('-').map(Number);
    const [hour, minute] = (timeRaw || '').split(':').map(Number);
    const birthTimeKnown = Number.isFinite(hour);
    const profile = {
      name,
      birthTimeKnown,
      birth: {
        year,
        month,
        day,
        hour: birthTimeKnown ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        gender: genderRaw.includes('여') ? 'female' : 'male',
        calendar: 'solar',
      },
    };
    if (storageAvailable('localStorage')) {
      localStorage.setItem(STORAGE.userProfile, JSON.stringify(profile));
    }
    return profile;
  }

  // ---------------------------------------------------------------- step 02
  function enhanceSajuInput() {
    const form = document.querySelector('#step-2-saju-input form');
    if (!form) return;
    const saved = readSavedProfile();

    form.addEventListener('submit', () => {
      if (!saved.complete) saveProfileFromForm(form);
    });

    if (!saved.complete) return;

    // Already on file: show what we will use instead of asking for it again.
    const fields = form.querySelectorAll('.field, .grid');
    fields.forEach((node) => node.setAttribute('hidden', ''));

    const card = document.createElement('div');
    card.className = 'saved-profile';
    card.innerHTML = `
      <b>저장된 사주로 진행합니다</b>
      <span>${saved.label}</span>
      <button type="button" data-edit-profile>다른 정보로 입력하기</button>
    `;
    form.prepend(card);

    card.querySelector('[data-edit-profile]').addEventListener('click', () => {
      card.remove();
      fields.forEach((node) => node.removeAttribute('hidden'));
      const nameInput = form.querySelector('#name');
      if (nameInput) {
        nameInput.value = saved.profile.name;
        nameInput.focus();
      }
      const birth = saved.profile.birth;
      const birthInput = form.querySelector('#birth');
      if (birthInput) birthInput.value = `${birth.year}-${pad2(birth.month)}-${pad2(birth.day)}`;
      const timeInput = form.querySelector('#time');
      if (timeInput && saved.profile.birthTimeKnown) timeInput.value = `${pad2(birth.hour)}:${pad2(birth.minute)}`;
      const genderSelect = form.querySelector('#gender');
      if (genderSelect) genderSelect.value = birth.gender === 'female' ? '여성' : '남성';
    });
  }

  // ---------------------------------------------------------------- step 03
  function enhanceExamInput() {
    const form = document.querySelector('#step-3-service-input form');
    if (!form) return;

    const options = Array.from(form.querySelectorAll('.option'));
    let picked = '';
    options.forEach((option) => {
      option.setAttribute('role', 'button');
      option.setAttribute('tabindex', '0');
      const choose = () => {
        options.forEach((item) => item.classList.remove('is-picked'));
        option.classList.add('is-picked');
        picked = option.textContent.trim();
      };
      option.addEventListener('click', choose);
      option.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          choose();
        }
      });
    });

    form.addEventListener('submit', () => {
      sessionSet(STORAGE.input, {
        examName: form.querySelector('#exam')?.value.trim() || '',
        examDate: form.querySelector('#date')?.value || '',
        examType: form.querySelector('#type')?.value || '',
        priority: picked,
        worry: form.querySelector('#worry')?.value.trim() || '',
      });
    });
  }

  // ------------------------------------------------------------ report load
  let needsLogin = false;

  async function loadReport() {
    const cached = sessionGet(STORAGE.report);
    if (cached?.sections?.length) return cached;

    const saved = readSavedProfile();
    if (!saved.complete) return null;
    const exam = sessionGet(STORAGE.input) || {};

    const response = await fetch('/api/saju/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...saved.profile.birth,
        birthTimeKnown: saved.profile.birthTimeKnown,
        context: {
          serviceKey: SERVICE.service_key,
          name: saved.profile.name,
          concern: exam.worry || '',
          exam,
        },
      }),
    });
    // 401 means the shared login gate, not a failure. Surfacing it matters: without
    // this the page would keep the static sample copy on screen and a logged-out
    // visitor would read placeholder text as if it were their own reading.
    if (response.status === 401 || response.status === 403) {
      needsLogin = true;
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json();
    const report = data.report || data;
    if (!report?.sections?.length) return null;
    sessionSet(STORAGE.report, report);
    return report;
  }

  /**
   * Replace a step's body with a login prompt.
   * The static markup carries sample sentences written like a personal verdict, so it is
   * cleared here as well - a logged-out visitor must never read placeholder copy as their result.
   */
  function renderLoginGate(root, message) {
    const host = root.querySelector('.section') || root;
    root.querySelectorAll('.result, .grid, .list, .table, .actions, .detail-body').forEach((node) => node.remove());

    const heroCopy = root.querySelector('.hero .copy, .visual .copy');
    if (heroCopy) {
      const h1 = heroCopy.querySelector('h1');
      const lead = heroCopy.querySelector('p');
      if (h1) h1.textContent = '나, 붙을 각이야?';
      if (lead) lead.textContent = '시험운과 공부법, 멘탈, 시험 당일 컨디션까지 사주 기준으로 봅니다.';
    }

    const cta = root.querySelector('.button');
    const href = `/signup?entry=pass-angle&returnTo=${encodeURIComponent(location.pathname)}`;
    if (cta) {
      cta.textContent = '로그인하고 전체 보기';
      cta.setAttribute('href', href);
    }

    const gate = document.createElement('div');
    gate.className = 'login-gate';
    gate.innerHTML = `
      <b>로그인하면 내 사주로 풀이가 열립니다</b>
      <span>${message}</span>
      <a class="button" href="${href}">로그인하고 전체 보기</a>
    `;
    host.appendChild(gate);
  }

  /** Checkout is not wired yet, so every reading opens free until the PG goes live. */
  async function checkoutEnabled() {
    try {
      const response = await fetch('/api/payment/config');
      if (!response.ok) return false;
      const config = await response.json();
      return Boolean(config.checkoutEnabled);
    } catch {
      return false;
    }
  }

  function firstParagraph(text) {
    return String(text || '').split('\n\n')[0] || '';
  }

  // ---------------------------------------------------------------- step 04
  async function enhanceTeaser() {
    const root = document.querySelector('#step-4-report');
    if (!root) return;
    const report = await loadReport();
    if (!report) {
      if (needsLogin) renderLoginGate(root, '지금 화면의 문장은 예시입니다. 로그인 후 입력하신 사주와 시험 정보로 다시 계산합니다.');
      return;
    }

    const heroCopy = root.querySelector('.hero .copy');
    if (heroCopy) {
      const h1 = heroCopy.querySelector('h1');
      const lead = heroCopy.querySelector('p');
      if (h1) h1.textContent = report.sections[0].hook || h1.textContent;
      if (lead) lead.textContent = firstParagraph(report.sections[0].interpretation);
    }

    // Free teaser: the opening verdict only. Everything else stays behind checkout.
    const results = root.querySelectorAll('.result');
    const verdict = report.sections[0];
    if (results[0]) {
      results[0].querySelector('b').textContent = verdict.classification || verdict.category;
      results[0].querySelector('span').textContent = firstParagraph(verdict.interpretation);
    }
    if (results[1]) {
      const risk = report.sections.find((section) => section.id === 'mental-stamina') || report.sections[1];
      results[1].querySelector('b').textContent = risk.hook || risk.category;
      results[1].querySelector('span').textContent = firstParagraph(risk.interpretation);
    }

    // Paid index must mirror the real report sections, per the service contract.
    const grid = root.querySelector('.grid');
    if (grid) {
      grid.innerHTML = report.sections.map((section) => `
        <div class="item"><b>${section.category}</b><small>${section.classification || ''}</small></div>
      `).join('');
    }

    if (!(await checkoutEnabled())) {
      const heading = root.querySelectorAll('h2')[1];
      if (heading) heading.textContent = '지금은 전체 풀이가 무료로 열립니다';
      const eyebrow = root.querySelector('.section .eyebrow');
      if (eyebrow) eyebrow.textContent = 'FREE PREVIEW';
      const cta = root.querySelector('.button');
      if (cta) cta.textContent = '전체 리포트 무료로 보기';
      const footer = root.querySelector('.footer');
      if (footer) footer.textContent = '결제 모듈 연결 전이라 전체 풀이를 무료로 공개합니다. 결과는 확정 예언이 아니라 선택 기준입니다.';
    }
  }

  // ---------------------------------------------------------------- step 05
  async function enhanceList() {
    const root = document.querySelector('#step-5-chat');
    if (!root) return;
    const report = await loadReport();
    if (!report) {
      if (needsLogin) renderLoginGate(root, '결과 목록은 로그인 후 내 사주 기준으로 만들어집니다.');
      return;
    }
    const list = root.querySelector('.list');
    if (!list) return;

    list.innerHTML = report.sections.map((section, index) => `
      <a class="card" href="../06-step-6_1-report-detail/index.html#${section.id}" data-section="${section.id}">
        <small>${index === 0 ? 'OPEN' : 'READ'}</small>
        <b>${section.category}</b>
        <span>${firstParagraph(section.interpretation).slice(0, 90)}…</span>
      </a>
    `).join('');

    list.querySelectorAll('[data-section]').forEach((link) => {
      link.addEventListener('click', () => sessionSet(STORAGE.selectedSection, link.dataset.section));
    });
  }

  // -------------------------------------------------------------- step 06_1
  async function enhanceDetail() {
    const root = document.querySelector('#step-6_1-report');
    if (!root) return;
    const report = await loadReport();
    if (!report) {
      if (needsLogin) renderLoginGate(root, '상세 풀이는 로그인 후 내 사주 기준으로 열립니다.');
      return;
    }

    const wanted = window.location.hash.replace('#', '') || sessionGet(STORAGE.selectedSection);
    const section = report.sections.find((item) => item.id === wanted) || report.sections[0];

    const heroCopy = root.querySelector('.hero .copy');
    if (heroCopy) {
      heroCopy.querySelector('h1').textContent = section.category;
      heroCopy.querySelector('p').textContent = section.hook || '';
    }

    const summary = root.querySelector('.summary');
    if (summary) {
      summary.querySelector('b').textContent = section.classification || section.category;
      const body = summary.querySelector('p');
      if (body) body.textContent = firstParagraph(section.interpretation);
    }

    // Render the remaining paragraphs as the body of the reading.
    const paragraphs = String(section.interpretation || '').split('\n\n').slice(1);
    const host = root.querySelector('.section');
    if (host && paragraphs.length) {
      const wrap = document.createElement('div');
      wrap.className = 'detail-body';
      wrap.innerHTML = paragraphs.map((text) => `<p>${text}</p>`).join('');
      host.appendChild(wrap);
    }

    // The visual chapters below map to the other sections of the same report.
    const others = report.sections.filter((item) => item.id !== section.id).slice(0, 3);
    root.querySelectorAll('.visual').forEach((node, index) => {
      const other = others[index];
      if (!other) {
        node.remove();
        return;
      }
      node.id = other.id;
      const copy = node.querySelector('.copy');
      if (!copy) return;
      copy.querySelector('h2').textContent = other.category;
      copy.querySelector('p').textContent = firstParagraph(other.interpretation);
    });
  }

  function init() {
    enhanceSajuInput();
    enhanceExamInput();
    enhanceTeaser();
    enhanceList();
    enhanceDetail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
