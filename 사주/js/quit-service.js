/**
 * Bridges the 퇴사운 design pages (01 → 02 → 03 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships as a static mock so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — reuses the saju already on the account instead of asking for it a second time
 *   03 — keeps the 퇴사 고민 answers for the analyze call
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
    const value = String(text || '').trim();
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
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
      auth.config = await fetch('/api/auth/config').then((res) => res.json());
      if (!auth.config?.enabled || !window.supabase || !window.UMSHAuthSession) return null;
      auth.client = window.UMSHAuthSession.createClient(window.supabase, auth.config.url, auth.config.publishableKey);
      const { data } = await auth.client.auth.getSession();
      auth.session = await window.UMSHAuthSession.enforceDeviceAuthSession(data.session, auth.client);
      return auth.session;
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
    const response = await fetch(path, {
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
  /** The saju the account already holds, so step 02 never asks for it twice. */
  async function enhanceSajuInput() {
    const form = $('#step-2-saju-input form');
    if (!form) return;

    const profile = await loadSavedProfile();
    if (!profile) {
      // Nothing on file yet: asking once is the only way to get the 사주.
      form.addEventListener('submit', () => saveProfileFromForm(form));
      return;
    }

    const fields = form.querySelectorAll('.field, .grid');
    fields.forEach((node) => node.setAttribute('hidden', ''));

    const card = document.createElement('div');
    card.className = 'quit-saved-profile';
    card.innerHTML = '<b>저장된 사주로 진행합니다</b><span></span><button type="button" data-edit-profile>다른 정보로 입력하기</button>';
    card.querySelector('span').textContent = `${profileLabel(profile)} 기준으로 관성과 대운을 봅니다. 이름·생년월일·태어난 시는 다시 입력하지 않아도 됩니다.`;
    form.prepend(card);

    card.querySelector('[data-edit-profile]').addEventListener('click', () => {
      card.remove();
      fields.forEach((node) => node.removeAttribute('hidden'));
      const set = (id, value) => {
        const node = form.querySelector(id);
        if (node && value) node.value = value;
      };
      set('#name', profile.name);
      set('#birth', `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`);
      if (profile.birthTimeKnown) set('#time', `${pad2(profile.hour)}:${pad2(profile.minute)}`);
      const gender = form.querySelector('#gender');
      if (gender) gender.value = profile.gender === 'female' ? '여성' : '남성';
      const calendar = form.querySelector('#calendar');
      if (calendar) calendar.value = profile.calendar === 'lunar' ? '음력' : '양력';
      form.querySelector('#name')?.focus();
      form.addEventListener('submit', () => saveProfileFromForm(form), { once: true });
    });
  }

  function saveProfileFromForm(form) {
    const name = form.querySelector('#name')?.value.trim();
    const birthRaw = form.querySelector('#birth')?.value;
    if (!name || !birthRaw) return;
    const [year, month, day] = birthRaw.split('-').map(Number);
    const [hour, minute] = (form.querySelector('#time')?.value || '').split(':').map(Number);
    const birthTimeKnown = Number.isFinite(hour);
    writeJson('localStorage', STORAGE.profile, {
      name,
      birthTimeKnown,
      birth: {
        year,
        month,
        day,
        hour: birthTimeKnown ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        gender: (form.querySelector('#gender')?.value || '').includes('여') ? 'female' : 'male',
        calendar: (form.querySelector('#calendar')?.value || '').includes('음') ? 'lunar' : 'solar',
      },
    });
  }

  // --------------------------------------------------------------- step 03
  /** The 퇴사 고민 answers the analyze call needs; the design page only navigated. */
  function enhanceSituationInput() {
    const form = $('#step-3-service-input form');
    if (!form) return;
    form.addEventListener('submit', () => {
      const picked = form.querySelector('input[name="reason"]:checked');
      const reasonLabel = picked?.closest('.option')?.textContent?.trim() || '복합';
      writeJson('sessionStorage', STORAGE.input, {
        reason: reasonLabel,
        tenure: form.querySelector('#tenure')?.value || '',
        candidateDate: form.querySelector('#candidate')?.value.trim() || '',
        nextPlan: form.querySelector('#next')?.value || '',
        concern: form.querySelector('#memo')?.value.trim() || '',
      });
    });
  }

  // ------------------------------------------------------- report retrieval
  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length) return { report: cached };

      const request = readJson('sessionStorage', STORAGE.input);
      if (!request?.reason) return { reason: 'input' };

      const session = await initAuth();
      if (!session) return { reason: 'login' };

      try {
        const response = await api('/api/work/quit/analyze', { method: 'POST', body: JSON.stringify(request) });
        const report = response.report || response;
        if (!report?.sections?.length) return { reason: 'error' };
        writeJson('sessionStorage', STORAGE.report, report);
        return { report };
      } catch (error) {
        if (error.status === 401 || error.status === 403) return { reason: 'login' };
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
    input: '퇴사 고민 정보를 먼저 입력하면 같은 흐름으로 이어집니다.',
    login: '로그인하면 저장된 내 사주로 풀이를 계산합니다. 지금 화면의 문장은 예시입니다.',
    payment: '결제가 확인되면 10개 리딩이 모두 열립니다.',
    error: '풀이를 계산하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  };

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

    const heroCopy = root.querySelector('.hero .copy');
    const lead = heroCopy?.querySelector('p');

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      // The sample verdict must not stay on screen as if it were a personal reading.
      if (lead) lead.textContent = GATE_COPY[reason] || GATE_COPY.error;
      if (reason === 'login') {
        retargetCtas('로그인하고 내 퇴사운 보기', () => location.assign(loginUrl()));
      } else if (reason === 'payment') {
        retargetCtas('결제하고 10개 리딩 열기', () => {
          location.assign(outcome.paymentUrl || `/payment?product=${SERVICE.apiKey}&returnTo=${encodeURIComponent(location.pathname)}`);
        });
      } else {
        retargetCtas('퇴사 고민 정보 입력하기', () => {
          location.assign('../03-step-3-service-input/index.html#step-3-service-input');
        });
      }
      return;
    }

    // Free teaser: the opening judgement only. The rest waits behind the list.
    const report = outcome.report;
    const verdict = report.sections.find((section) => section.id === 'flow-1') || report.sections[0];
    if (lead) lead.textContent = clamp(readingLine(verdict), 170);

    const tiles = root.querySelectorAll('#index .tile');
    const groups = groupOrder(report);
    tiles.forEach((tile, index) => {
      const group = groups[index];
      if (!group) return;
      const title = tile.querySelector('b');
      const small = tile.querySelector('small');
      if (title) title.textContent = group.title;
      if (small) small.textContent = clamp(readingLine(group.sections[0]), 80);
    });

    retargetCtas('내 퇴사 타이밍 열어보기', () => location.assign('../05-step-5-chat/chat.html#step-5-chat'));
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
          location.assign(reason === 'login' ? loginUrl() : '../03-step-3-service-input/index.html#step-3-service-input');
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

    const wanted = new URLSearchParams(location.search).get('section') || 'mental-people';
    const sections = outcome.report.sections.filter((section) => section.id.startsWith(`${wanted}-`));
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
        span.textContent = clamp(readingLine(section, 1), 220);
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
