/**
 * Bridges the 퇴사운 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships as a static mock so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — reuses the saved 사주 and asks only the 퇴사 이유
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — puts each 리딩's own reading on its list row
 *   06 — fills the reading points with that section's full RAG interpretation
 *
 * Everything reads from POST /api/work/quit/analyze, which computes the 사주 server side
 * and grounds each section in the KMS corpus, so no reading is ever invented in the browser.
 */
(() => {
  if (!/^\/work\/quit(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'quit_fortune',
    slug: 'quit',
    title: '나 지금 그만둬도 될까?',
  };

  const STORAGE = {
    profile: 'cheongi_user_birth_profile_v1',
    input: 'umsh_quit_input_payload_v1',
    report: 'umsh_quit_report_v1',
  };

  const INPUT_PATH = '../02-step-2-saju-input/index.html#step-2-saju-input';
  const TEASER_PATH = '../04-step-4-report/index.html#step-4-report';

  const pad2 = (value) => String(value).padStart(2, '0');
  const $ = (selector, root = document) => root.querySelector(selector);

  // umsh-chrome.js auto-mounts against `main.stage, .stage, main`, which would drop a
  // second app bar into these pages. Stand it down and mount explicitly against `.app`.
  if (document.body) document.body.dataset.umshChrome = 'off';

  function storageAvailable(kind) {
    try {
      const store = window[kind];
      store.setItem('__umsh_probe__', '1');
      store.removeItem('__umsh_probe__');
      return true;
    } catch {
      return false;
    }
  }

  function readJson(kind, key) {
    if (!storageAvailable(kind)) return null;
    try {
      return JSON.parse(window[kind].getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  function writeJson(kind, key, value) {
    if (storageAvailable(kind)) window[kind].setItem(key, JSON.stringify(value));
  }

  function paragraphs(section) {
    return String(section?.interpretation || '')
      .split('\n\n')
      .map((text) => text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim())
      .filter(Boolean);
  }

  /**
   * A reading opens on bookkeeping — the 문 label, the item title and the 월주. Previews
   * want the sentence that actually says something, so skip that paragraph.
   */
  function readingLine(section, preferred = 1) {
    const parts = paragraphs(section);
    return parts[preferred] || parts[0] || '';
  }

    function clamp(text, limit) {
    var max = typeof limit === 'number' && limit > 0 ? Math.max(limit, 220) : 220;
    if (window.UMSHTextClip && window.UMSHTextClip.clipCompleteSentences) {
      return window.UMSHTextClip.clipCompleteSentences(text, max);
    }
    var value = String(text || '').trim();
    if (value.length <= max) return value;
    var ends = [];
    var re = /[.!?。]/g;
    var match;
    while ((match = re.exec(value)) !== null) ends.push(match.index + 1);
    var fitting = ends.filter(function (index) { return index <= max; });
    if (fitting.length) return value.slice(0, fitting[fitting.length - 1]).trim();
    if (ends.length) return value.slice(0, ends[0]).trim();
    return value;
  }

  function mountChrome() {
    if (!window.UMSHChrome) return;
    const host = $('.app');
    document.body.dataset.umshChrome = 'off';
    window.UMSHChrome.mount({
      root: '.app',
      service: host?.dataset.service || '퇴사운',
      price: host?.dataset.price || '14,900원',
      active: host?.dataset.active || 'home',
    });
  }

  // -------------------------------------------------------------------- auth
  const auth = { config: null, client: null, session: null };

  async function initAuth() {
    if (auth.session) return auth.session;
    try {
      if (!window.UMSHAuthSession?.bindServiceSession) return null;
      return await window.UMSHAuthSession.bindServiceSession(auth, 900);
    } catch {
      return null;
    }
  }

  function loginUrl() {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return window.UMSHCommonAuth?.commonLoginUrl('work-quit', returnTo)
      || `/signup?entry=work-quit&returnTo=${encodeURIComponent(returnTo)}#login`;
  }

  async function api(path, options = {}) {
    const response = await (window.UMSHReportAccess ? window.UMSHReportAccess.fetch : fetch)(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth.session?.access_token ? { Authorization: `Bearer ${auth.session.access_token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || '요청을 처리하지 못했습니다.');
      error.status = response.status;
      error.code = payload.code;
      error.paymentUrl = payload.paymentUrl;
      throw error;
    }
    return payload;
  }

  // ----------------------------------------------------------------- profile
  async function loadSavedProfile() {
    const session = await initAuth();
    if (session) {
      try {
        const payload = await api('/api/user/profile');
        if (payload?.profile?.name && payload.profile.birth) return normalizeProfile(payload.profile);
      } catch {
        // fall through to the locally cached profile
      }
    }
    const local = readJson('localStorage', STORAGE.profile);
    return local ? normalizeProfile(local) : null;
  }

  function normalizeProfile(profile) {
    const birth = profile.birth || {};
    if (!profile.name || !birth.year || !birth.month || !birth.day) return null;
    const birthTimeKnown = profile.birthTimeKnown !== false && Number.isFinite(Number(birth.hour));
    return {
      name: profile.name,
      birthTimeKnown,
      calendar: birth.calendar === 'lunar' ? 'lunar' : 'solar',
      gender: birth.gender === 'female' ? 'female' : 'male',
      year: Number(birth.year),
      month: Number(birth.month),
      day: Number(birth.day),
      hour: birthTimeKnown ? Number(birth.hour) : 12,
      minute: Number(birth.minute || 0),
    };
  }

  function profileLabel(profile) {
    const calendar = profile.calendar === 'lunar' ? '음력' : '양력';
    const time = profile.birthTimeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : '태어난 시 모름';
    return `${profile.name} · ${calendar} ${profile.year}.${pad2(profile.month)}.${pad2(profile.day)} · ${time}`;
  }

  // --------------------------------------------------------------- step 02
  /** Saved 사주 stays folded. The only extra question is the 퇴사 이유. */
  async function enhanceSajuInput() {
    const form = $('#step-2-saju-input form');
    if (!form) return;

    bindTimeUnknown(form);
    const profileFields = $('#profileFields', form);
    const profile = await loadSavedProfile();
    if (profile && profileFields) {
      profileFields.setAttribute('hidden', '');
      const card = document.createElement('div');
      card.className = 'quit-saved-profile';
      card.innerHTML = '<b>저장된 사주로 진행합니다</b><span></span><button type="button" data-edit-profile>다른 정보로 입력하기</button>';
      card.querySelector('span').textContent = `${profileLabel(profile)} 기준으로 관성과 대운을 봅니다. 지금은 나가려는 이유만 고르면 됩니다.`;
      form.prepend(card);
      card.querySelector('[data-edit-profile]').addEventListener('click', () => {
        card.remove();
        profileFields.removeAttribute('hidden');
        fillProfileFields(form, profile);
        form.querySelector('#name')?.focus();
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = $('#quit-input-error', form);
      if (error) error.textContent = '';
      const picked = form.querySelector('input[name="reason"]:checked');
      if (!picked?.value) {
        if (error) error.textContent = '퇴사를 고민하게 된 이유를 선택해 주세요.';
        return;
      }
      if (!profileFields?.hasAttribute('hidden')) {
        const saved = saveProfileFromForm(form, error);
        if (!saved) return;
        await syncProfileToAccount(saved);
      }
      writeJson('sessionStorage', STORAGE.input, { reason: picked.value });
      location.assign(TEASER_PATH);
    });
  }

  function bindTimeUnknown(form) {
    const time = form.querySelector('#time');
    const unknown = form.querySelector('#birthTimeUnknown');
    if (!time || !unknown) return;
    const apply = () => {
      time.disabled = unknown.checked;
      if (unknown.checked) time.value = '';
    };
    unknown.addEventListener('change', apply);
    apply();
  }

  function fillProfileFields(form, profile) {
    const set = (id, value) => {
      const node = form.querySelector(id);
      if (node && value != null) node.value = value;
    };
    set('#name', profile.name);
    set('#birth', `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`);
    const unknown = form.querySelector('#birthTimeUnknown');
    if (unknown) unknown.checked = !profile.birthTimeKnown;
    if (profile.birthTimeKnown) set('#time', `${pad2(profile.hour)}:${pad2(profile.minute)}`);
    else set('#time', '');
    const gender = form.querySelector(`input[name="gender"][value="${profile.gender}"]`);
    if (gender) gender.checked = true;
    set('#calendar', profile.calendar === 'lunar' ? 'lunar' : 'solar');
    form.querySelector('#birthTimeUnknown')?.dispatchEvent(new Event('change'));
  }

  function readGender(form) {
    const picked = form.querySelector('input[name="gender"]:checked')?.value;
    if (picked === 'female' || picked === 'male') return picked;
    const select = form.querySelector('#gender')?.value || '';
    if (select.includes('여')) return 'female';
    if (select.includes('남')) return 'male';
    return '';
  }

  function saveProfileFromForm(form, error) {
    const name = form.querySelector('#name')?.value.trim() || '';
    const birthRaw = form.querySelector('#birth')?.value || '';
    const unknown = form.querySelector('#birthTimeUnknown')?.checked;
    const [year, month, day] = birthRaw.split('-').map(Number);
    const [hour, minute] = (form.querySelector('#time')?.value || '').split(':').map(Number);
    const gender = readGender(form);
    const calendarRaw = form.querySelector('#calendar')?.value || '';
    const calendar = calendarRaw.includes('음') || calendarRaw === 'lunar' ? 'lunar' : 'solar';
    const fail = (message) => {
      if (error) error.textContent = message;
      return null;
    };
    if (!/^[가-힣]{2,20}$/.test(name)) return fail('이름은 한글 2자 이상 20자 이하로 입력해 주세요.');
    if (!year || !month || !day) return fail('생년월일을 입력해 주세요.');
    if (!unknown && !Number.isFinite(hour)) return fail('태어난 시를 입력하거나 모름을 선택해 주세요.');
    if (!gender) return fail('성별을 선택해 주세요.');
    const profile = {
      name,
      birthTimeKnown: !unknown,
      birth: {
        year,
        month,
        day,
        hour: !unknown && Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        gender,
        calendar,
      },
    };
    writeJson('localStorage', STORAGE.profile, profile);
    return profile;
  }

  async function syncProfileToAccount(profile) {
    const session = await initAuth();
    if (!session) return;
    try {
      await api('/api/user/profile', { method: 'POST', body: JSON.stringify(profile) });
    } catch {
      // Local cache still carries the 사주; STEP4 will ask again if the account is empty.
    }
  }

  function enhanceSituationInput() {
    if (!/^\/work\/quit\/03-step-3-service-input/.test(location.pathname)) return;
    location.replace(INPUT_PATH);
  }

  // ------------------------------------------------------- report retrieval
  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length && !window.UMSHReportAccess) return { report: cached };

      const request = readJson('sessionStorage', STORAGE.input);
      if (!request?.reason) return { reason: 'input' };

      const session = await initAuth();
      if (!session) {
        reportPromise = null;
        return { reason: 'login' };
      }

      try {
        const response = await api('/api/work/quit/analyze', { method: 'POST', body: JSON.stringify(request) });
        const accepted = window.UMSHReportAccess?.acceptAnalyze?.(response);
        if (accepted?.preview && !window.UMSHReportAccess?.hasPaidReading?.(accepted.report)) return accepted;
        const report = accepted?.report || response.report || response;
        if (!report?.sections?.length) return accepted?.preview ? accepted : { reason: 'error' };
        writeJson('sessionStorage', STORAGE.report, report);
        return { report };
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          reportPromise = null;
          return { reason: 'login' };
        }
        if (error.code === 'PAYMENT_REQUIRED') {
          window.UMSHPaymentBridge?.save(SERVICE.apiKey, request, location.pathname);
          return { reason: 'payment', paymentUrl: error.paymentUrl };
        }
        if (error.code === 'PROFILE_REQUIRED') return { reason: 'input' };
        return { reason: 'error', message: error.message };
      }
    })();
    return reportPromise;
  }

  async function resumeAfterPayment() {
    const params = new URLSearchParams(location.search);
    if (params.get('paid') !== '1') return;
    const orderId = params.get('orderId');
    const pending = window.UMSHPaymentBridge?.load(SERVICE.apiKey);
    if (!orderId || !pending) return;
    const session = await initAuth();
    if (!session) return;
    try {
      const response = await api('/api/work/quit/analyze', {
        method: 'POST',
        body: JSON.stringify({ ...pending.payload, orderId }),
      });
      const report = response.report || response;
      if (!report?.sections?.length) return;
      writeJson('sessionStorage', STORAGE.report, report);
      window.UMSHPaymentBridge?.clear();
      await api(`/api/payment/orders/${encodeURIComponent(orderId)}/viewed`, { method: 'POST' }).catch(() => {});
      history.replaceState(null, '', location.pathname);
      reportPromise = Promise.resolve({ report });
    } catch {
      // Fall through to the normal gate.
    }
  }

    const GATE_COPY = {
    input: '퇴사 고민 이유를 먼저 고르면 같은 흐름으로 이어집니다.',
    login: '로그인하면 저장된 내 사주로 풀이를 계산합니다. 지금 화면의 문장은 예시입니다.',
    payment: '결제가 확인되면 10개 리딩이 모두 열립니다.',
    error: '풀이를 계산하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function insightBodies(preview) {
    const items = (preview && (preview.signals || preview.insights)) || [];
    return items.map((item) => {
      if (item && typeof item === 'object') return String(item.body || item.text || item.title || '').trim();
      return String(item || '').trim();
    }).filter(Boolean);
  }

  function paintQuitReading(root, headline, summary, grounds) {
    const title = root.querySelector('[data-teaser-headline]');
    const lead = root.querySelector('[data-teaser-summary]');
    if (title && headline) title.textContent = headline;
    if (lead && summary) lead.textContent = summary;
    const list = root.querySelector('[data-signal-list]');
    if (list && grounds && grounds.length) {
      list.innerHTML = grounds.slice(0, 2).map((item, index) => {
        const body = typeof item === 'string' ? item : String(item.body || item.text || '');
        return '<div class="signal-item"><strong>근거 ' + (index + 1) + '</strong><span>' + escapeHtml(body) + '</span></div>';
      }).join('');
    }
  }

  /** Point every CTA on the page at one destination. */
  function retargetCtas(label, handler) {
    document.querySelectorAll('.cta .button, .sticky .button').forEach((node) => {
      const clone = node.cloneNode(true);
      clone.textContent = label;
      clone.removeAttribute('href');
      clone.style.cursor = 'pointer';
      clone.addEventListener('click', (event) => {
        event.preventDefault();
        handler();
      });
      node.replaceWith(clone);
    });
  }

  // --------------------------------------------------------------- step 04
  async function enhanceTeaser() {
    const root = $('#step-4-report');
    if (!root) return;

    await resumeAfterPayment();
    const outcome = await loadReport();

    if (outcome.preview) {
      window.UMSHReportAccess?.paintTeaserPreview?.(outcome.preview);
      paintQuitReading(
        root,
        outcome.preview.headline,
        outcome.preview.summary || outcome.preview.headline,
        insightBodies(outcome.preview),
      );
      if (!window.UMSHReportAccess?.isEntitled?.(outcome)) {
        retargetCtas('전체 보기 (14,900원)', () => {
          location.assign(outcome.paymentUrl || `/payment?product=${SERVICE.apiKey}&returnTo=${encodeURIComponent(location.pathname)}`);
        });
        return;
      }
      retargetCtas('전체 목차 열기', () => location.assign(window.UMSHReportAccess?.tocHref?.(outcome.payload?.reportId) || '../05-step-5-chat/chat.html#step-5-chat'));
      return;
    }

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      // 해석 칸은 로그인·결제 안내로 덮지 않는다. 시드/동결 판정을 유지하고 CTA만 바꾼다.
      if (reason === 'login') {
        window.UMSHAuthSession?.watchSignedIn?.(auth, () => {
          reportPromise = null;
          enhanceTeaser();
        });
        retargetCtas('로그인하고 전체 보기 (14,900원)', () => location.assign(loginUrl()));
      } else if (reason === 'payment') {
        retargetCtas('전체 보기 (14,900원)', () => {
          location.assign(outcome.paymentUrl || `/payment?product=${SERVICE.apiKey}&returnTo=${encodeURIComponent(location.pathname)}`);
        });
      } else {
        retargetCtas('나가려는 이유 고르기', () => {
          location.assign(INPUT_PATH);
        });
      }
      return;
    }

    const report = outcome.report;
    const verdict = report.sections.find((section) => section.id === 'flow-1') || report.sections[0];
    const headline = String(verdict.hook || '').trim() || clamp(readingLine(verdict, 0), 80);
    const summary = clamp(paragraphs(verdict).slice(1).join(' ') || readingLine(verdict, 1), 420);
    const grounds = report.sections.slice(1, 3).map((section) => {
      const scene = paragraphs(section).find((part) => /예를 들어|대화창|기록|장면/.test(part));
      return clamp(scene || readingLine(section, 1), 280);
    }).filter(Boolean);
    paintQuitReading(root, headline, summary, grounds);

    const tiles = root.querySelectorAll('#index .tile');
    const groups = groupOrder(report);
    tiles.forEach((tile, index) => {
      const group = groups[index];
      if (!group) return;
      const title = tile.querySelector('b');
      const small = tile.querySelector('small');
      if (title) title.textContent = group.title;
      if (small) small.textContent = clamp(readingLine(group.sections[0]), 180);
    });

    retargetCtas('전체 목차 열기', () => location.assign('../05-step-5-chat/chat.html#step-5-chat'));
  }

  function groupOrder(report) {
    const groups = [];
    report.sections.forEach((section) => {
      const last = groups[groups.length - 1];
      if (last && last.title === section.category) last.sections.push(section);
      else groups.push({ title: section.category, sections: [section] });
    });
    return groups;
  }

  // --------------------------------------------------------------- step 05
  async function enhanceList() {
    const root = $('#step-5-chat');
    if (!root) return;
    const outcome = await loadReport();
    const items = root.querySelectorAll('.list .item');

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      const lead = root.querySelector('.hero .copy p');
      if (lead) lead.textContent = GATE_COPY[reason] || GATE_COPY.error;
      items.forEach((item) => {
        item.setAttribute('aria-disabled', 'true');
        item.addEventListener('click', (event) => {
          event.preventDefault();
          location.assign(reason === 'login' ? loginUrl() : INPUT_PATH);
        });
      });
      return;
    }

    // Each row keeps its designed title and gains this reading's own opening line.
    const groups = groupOrder(outcome.report);
    items.forEach((item, index) => {
      const group = groups[index];
      if (!group) return;
      const span = item.querySelector('span');
      const bold = span?.querySelector('b');
      if (!span || !bold) return;
      span.textContent = '';
      span.appendChild(bold);
      span.appendChild(document.createTextNode(clamp(readingLine(group.sections[0]), 96)));
    });
  }

  // ------------------------------------------------------------- step 06_1
  async function enhanceDetail() {
    const root = $('#step-6_1-report');
    if (!root) return;
    const outcome = await loadReport();
    if (!outcome.report) return;

    const wanted = new URLSearchParams(location.search).get('section');
    let sections = wanted
      ? outcome.report.sections.filter((section) => (
        section.id === wanted
        || section.id.startsWith(`${wanted}-`)
        || section.category === wanted
      ))
      : [];
    if (!sections.length && outcome.report.sections[0]) {
      const first = outcome.report.sections[0];
      sections = outcome.report.sections.filter((section) => section.category === first.category);
    }
    if (!sections.length) return;

    // The summary reads at group level; the cards below carry each point's own line,
    // so it takes the 십신 paragraph instead of repeating the first card.
    const summary = $('#summary');
    if (summary) summary.textContent = clamp(readingLine(sections[0], 3), 170);

    /**
     * The design draws one card per reading point. Each point is its own report section,
     * so the card keeps the designed title and takes that section's reading as its body.
     */
    const points = $('#points');
    if (points) {
      points.innerHTML = '';
      sections.forEach((section) => {
        const card = document.createElement('div');
        card.className = 'card';
        const b = document.createElement('b');
        b.textContent = section.classification;
        const span = document.createElement('span');
        span.textContent = section.interpretation || '';
        span.style.whiteSpace = 'pre-wrap';
        card.append(b, span);
        points.appendChild(card);
      });
    }

    const badge = $('#badge');
    if (badge) badge.textContent = sections[0].categoryEn || badge.textContent;
  }

  function init() {
    mountChrome();
    enhanceSajuInput();
    enhanceSituationInput();
    enhanceTeaser();
    enhanceList();
    enhanceDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
