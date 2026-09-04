/**
 * Bridges the 커플궁합 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships with sample copy so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — seeds the saved-profile card from the account so the saju is never asked twice
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — puts each 대분류's own reading on its list card
 *   06 — fills the detail body with that section's full RAG interpretation
 *
 * Everything reads from POST /api/match/couple/analyze, which computes both 사주 server
 * side and grounds each section in the KMS corpus, so no reading is invented in the browser.
 */
(() => {
  if (!/^\/match\/couple(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'match_couple',
    slug: 'couple',
    title: '우리 둘, 진짜 잘 맞아?',
  };

  // The design pages read and write these; we fill them so their own renderers unlock.
  const STORAGE = {
    profile: 'cheongi_user_birth_profile_v1',
    input: 'umsh:couple-match:input',
    report: 'umsh:couple-match:report-v1',
  };

  const pad2 = (value) => String(value).padStart(2, '0');
  const $ = (selector, root = document) => root.querySelector(selector);

  // umsh-chrome.js auto-mounts against `main.stage, .stage, main`. These pages hang the
  // top bar straight off <body>, so stand it down and mount explicitly against body.
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
   * A reading opens on bookkeeping — the 문 label, the item title and the two 일지 being
   * compared. Previews want the sentence that says something, so skip that paragraph.
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
    document.body.dataset.umshChrome = 'off';
    window.UMSHChrome.mount({
      root: 'body',
      service: document.body.dataset.service || '커플궁합',
      price: document.body.dataset.price || '19,900원',
      active: document.body.dataset.active || 'home',
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
    return window.UMSHCommonAuth?.commonLoginUrl('match-couple', returnTo)
      || `/signup?entry=match-couple&returnTo=${encodeURIComponent(returnTo)}#login`;
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

  // --------------------------------------------------------------- step 02
  /**
   * The design already draws a saved-profile mode from the locally cached saju. The
   * account is the better source, so pull it into that same cache before the page reads
   * it — the visitor should never retype a birth date the site already holds.
   */
  async function enhanceSajuInput() {
    if (!$('#coupleForm')) return;
    const session = await initAuth();
    if (!session) return;
    try {
      const payload = await api('/api/user/profile');
      if (payload?.profile?.name && payload.profile.birth) {
        writeJson('localStorage', STORAGE.profile, payload.profile);
        const saved = $('#modeSaved');
        if (saved && !saved.disabled && !saved.checked) {
          saved.checked = true;
          saved.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } catch {
      // Keep whatever the browser already cached.
    }
  }

  // ------------------------------------------------------- report retrieval
  function buildRequest(payload) {
    const partner = payload?.partner || payload?.context?.partner || {};
    const birth = String(partner.birth_date || partner.birthDate || '').replace(/[^0-9]/g, '');
    if (birth.length !== 8) return null;
    const context = payload?.context || {};
    return {
      partnerName: partner.name || '',
      partnerBirthText: birth,
      partnerBirth: {
        gender: partner.gender === 'female' ? 'female' : 'male',
        calendar: partner.calendar === 'lunar' ? 'lunar' : 'solar',
      },
      partnerBirthTimeKnown: Boolean(partner.birth_time || partner.birthTime),
      relationshipStage: context.relation || partner.relation || '',
      conflictPattern: context.focus || '',
      concern: context.current_question || context.question || '',
    };
  }

  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length) return { report: cached };

      const request = buildRequest(readJson('sessionStorage', STORAGE.input));
      if (!request) return { reason: 'input' };

      const session = await initAuth();
      if (!session) return { reason: 'login' };

      try {
        const response = await api('/api/match/couple/analyze', { method: 'POST', body: JSON.stringify(request) });
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
      const response = await api('/api/match/couple/analyze', {
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
    input: '이전 입력을 찾지 못했습니다. 두 사람 정보를 다시 입력하면 같은 궁합으로 이어집니다.',
    login: '로그인하면 저장된 내 사주와 상대 정보로 풀이를 계산합니다. 지금 화면의 문장은 예시입니다.',
    payment: '결제가 확인되면 14개 대분류 70개 항목이 모두 열립니다.',
    error: '풀이를 계산하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  };

  function groupOrder(report) {
    const groups = [];
    report.sections.forEach((section) => {
      const last = groups[groups.length - 1];
      if (last && last.title === section.category) last.sections.push(section);
      else groups.push({ title: section.category, sections: [section] });
    });
    return groups;
  }

  // --------------------------------------------------------------- step 04
  async function enhanceTeaser() {
    const answer = $('#answerLine');
    if (!answer) return;

    await resumeAfterPayment();
    const outcome = await loadReport();

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      // The sample verdict must not stay on screen as if it were a personal reading.
      answer.textContent = GATE_COPY[reason] || GATE_COPY.error;
      const description = $('#accessDescription');
      if (description) description.textContent = GATE_COPY[reason] || GATE_COPY.error;
      const cta = $('#mainCta');
      if (cta && reason === 'login') {
        cta.textContent = '로그인하고 전체 보기';
        cta.addEventListener('click', (event) => {
          event.preventDefault();
          location.assign(loginUrl());
        });
      }
      return;
    }

    const report = outcome.report;
    const verdict = report.sections[0];
    answer.textContent = clamp(readingLine(verdict), 170);

    // The paid-scope grid mirrors the real 대분류 rather than sample labels.
    const groups = groupOrder(report);
    const tiles = document.querySelectorAll('#scopeGrid > *');
    tiles.forEach((tile, index) => {
      const group = groups[index];
      if (!group) return;
      const title = tile.querySelector('b, strong, h3');
      const body = tile.querySelector('small, span, p');
      if (title) title.textContent = group.title;
      if (body) body.textContent = clamp(readingLine(group.sections[0]), 80);
    });
  }

  // --------------------------------------------------------------- step 05
  async function enhanceList() {
    if (!$('#step-5-chat')) return;
    const outcome = await loadReport();
    if (!outcome.report) return;

    // Section ids are `<group>__<item>`, so the prefix gives the group's first reading.
    const byGroup = new Map();
    outcome.report.sections.forEach((section) => {
      const groupId = section.id.split('__')[0];
      if (!byGroup.has(groupId)) byGroup.set(groupId, section);
    });

    // Item previews stay as written: every 중분류 has its own line, and the reading
    // already opens with that same sentence. The group summary is where the
    // personalised line belongs, and the design re-renders it on every filter.
    const apply = () => {
      const active = document.querySelector('[data-group-id].is-active');
      const section = active ? byGroup.get(active.dataset.groupId) : null;
      const summary = document.getElementById('active-summary');
      if (!section || !summary || summary.dataset.coupleApplied === section.id) return;
      summary.textContent = clamp(readingLine(section), 130);
      summary.dataset.coupleApplied = section.id;
    };
    apply();
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------- step 06_1
  async function enhanceDetail() {
    const body = document.getElementById('detail-body');
    if (!body) return;
    const outcome = await loadReport();
    if (!outcome.report) return;

    const apply = () => {
      const wanted = new URLSearchParams(location.search).get('section');
      const section = outcome.report.sections.find((item) => item.id === wanted) || outcome.report.sections[0];
      if (!section || body.dataset.coupleApplied === section.id) return;

      const parts = paragraphs(section);
      if (!parts.length) return;

      const conclusion = document.getElementById('detail-conclusion');
      if (conclusion) conclusion.textContent = clamp(parts[1] || parts[0], 170);

      body.innerHTML = '';
      parts.slice(1).forEach((text) => {
        const p = document.createElement('p');
        p.textContent = text;
        body.appendChild(p);
      });

      const group = document.getElementById('detail-group');
      if (group) group.textContent = section.category;
      const title = document.getElementById('detail-title');
      if (title) title.textContent = section.classification;
      body.dataset.coupleApplied = section.id;
    };

    apply();
    new MutationObserver(apply).observe(body, { childList: true, subtree: false });
  }

  function init() {
    mountChrome();
    enhanceSajuInput();
    enhanceTeaser();
    enhanceList();
    enhanceDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
