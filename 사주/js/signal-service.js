/**
 * Bridges the 관계 신호 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships as a static mock so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — seeds the saved-profile mode from the account so the saju is never asked twice
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — puts each 대분류's own reading on its group card
 *   06 — fills the detail body with that section's full RAG interpretation
 *
 * Everything reads from POST /api/love/signal/analyze, which computes both 사주 server
 * side and grounds each section in the KMS corpus, so no reading is invented in the browser.
 */
(() => {
  if (!/^\/love\/signal(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'couple_signal',
    slug: 'couple-signal',
    title: '내 애인 바람필까?',
    price: '19,900원',
  };

  // The design pages read and write these; we fill them so their own renderers unlock.
  const STORAGE = {
    profile: 'cheongi_user_birth_profile_v1',
    input: 'umsh:report-input:couple_signal',
    report: 'umsh:report:couple_signal',
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  // umsh-chrome.js auto-mounts against `main.stage, .stage, main`, which would drop a
  // second app bar into these pages. Stand it down and mount explicitly below.
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
    const host = $('.app, .phone');
    document.body.dataset.umshChrome = 'off';
    window.UMSHChrome.mount({
      root: '.app, .phone',
      service: host?.dataset.service || '관계 신호',
      price: host?.dataset.price || '19,900원',
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
    return window.UMSHCommonAuth?.commonLoginUrl('love-signal', returnTo)
      || `/signup?entry=love-signal&returnTo=${encodeURIComponent(returnTo)}#login`;
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

  // --------------------------------------------------------------- step 02
  /**
   * The design already offers a "저장 프로필" mode from the locally cached saju, and
   * refuses it when the cache is empty. The account is the better source, so pull it
   * into that same cache and take the offer — the visitor should never retype a birth
   * date the site already holds.
   */
  async function enhanceSajuInput() {
    if (!$('#signalForm')) return;
    const session = await initAuth();
    if (!session) return;
    try {
      const payload = await api('/api/user/profile');
      if (!payload?.profile?.name || !payload.profile.birth) return;
      writeJson('localStorage', STORAGE.profile, payload.profile);
      // The page reads the cache once at load, so re-run its own choice handler.
      const saved = $('[data-choice="profileMode"][data-value="saved"]');
      if (saved && saved.getAttribute('aria-pressed') !== 'true') saved.click();
    } catch {
      // Keep whatever the browser already cached.
    }
  }

  // ------------------------------------------------------- report retrieval
  /** Step 02 stores its own shape; this maps it onto what the analyze endpoint expects. */
  function buildRequest(payload) {
    const input = payload?.input;
    const self = input?.self;
    const partner = input?.partner;
    if (!partner) return null;
    const birth = partner.birth || {};
    const text = [birth.year, birth.month, birth.day]
      .map((part, index) => String(part ?? '').padStart(index === 0 ? 4 : 2, '0'))
      .join('');
    if (!/^\d{8}$/.test(text)) return null;
    const request = {
      relationshipStage: partner.relationship_label || partner.relationship_status || '',
      signalFocus: input.signal_focus || input.signalFocus || '',
      partnerName: partner.alias || '',
      partnerBirthText: text,
      partnerBirth: {
        gender: partner.gender === 'female' ? 'female' : 'male',
        calendar: partner.calendar === 'lunar' ? 'lunar' : 'solar',
      },
      partnerBirthTimeKnown: Boolean(partner.birth_time_known),
      concern: input.concern || '',
    };
    if (self?.source === 'manual') {
      const selfBirth = self.birth || {};
      const time = String(self.time || '').split(':');
      request.selfName = self.alias || '나';
      request.selfBirthTimeKnown = Boolean(self.birth_time_known);
      request.selfBirth = {
        year: Number(selfBirth.year),
        month: Number(selfBirth.month),
        day: Number(selfBirth.day),
        hour: request.selfBirthTimeKnown ? Number(time[0]) : 12,
        minute: request.selfBirthTimeKnown ? Number(time[1] || 0) : 0,
        gender: self.gender === 'male' ? 'male' : 'female',
        calendar: self.calendar === 'lunar' ? 'lunar' : 'solar',
        birthTimeKnown: request.selfBirthTimeKnown,
      };
    }
    return request;
  }

  function reportIdentity(payload) {
    return payload?.reportId || payload?.resultId || payload?.publicId
      || payload?.preview?.reportId || payload?.report?.reportId || '';
  }

  function teaserUrl(reportId) {
    const url = new URL('../04-step-4-report/index.html', location.href);
    url.searchParams.set('service_key', SERVICE.apiKey);
    url.searchParams.set('service_slug', SERVICE.slug);
    url.searchParams.set('report_version', 'couple-signal-v1');
    url.searchParams.set('input_schema_version', 'couple-signal-input-v1');
    url.searchParams.set('entry', 'step-2-saju-input');
    if (reportId) url.searchParams.set('reportId', reportId);
    url.hash = 'step-4-report';
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function showAnalysisLoading() {
    const existing = document.querySelector('[data-signal-loading]');
    if (existing) return existing;
    const overlay = document.createElement('section');
    overlay.className = 'signal-analysis-loading';
    overlay.setAttribute('data-signal-loading', 'true');
    overlay.setAttribute('data-umsh-step', '03-loading');
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="signal-analysis-loading__card">
        <span>03 · 개인화 해석 준비</span>
        <h2>두 사람의 반응 차이를 사주와 지금 상황에 맞춰 보고 있어요</h2>
        <p>입력한 관계 장면 확인 → 두 사람의 네 기둥 계산 → 무료 해석 1·2 준비</p>
        <div class="signal-analysis-loading__bar" aria-hidden="true"><i></i></div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  async function createPreviewFromInput(payload) {
    const request = buildRequest(payload);
    if (!request) throw new Error('상대의 생년월일과 지금 걸리는 신호를 다시 확인해 주세요.');
    showAnalysisLoading();
    const session = await initAuth();
    if (!session) throw new Error('로그인 후 저장된 내 사주와 상대 정보로 무료 해석을 볼 수 있습니다.');
    const response = await api('/api/love/signal/analyze', {
      method: 'POST',
      body: JSON.stringify({ ...request, preview: true }),
    });
    const accepted = window.UMSHReportAccess?.acceptAnalyze?.(response) || response;
    const report = accepted?.report || response?.report;
    if (report?.sections?.length) writeJson('sessionStorage', STORAGE.report, report);
    const reportId = reportIdentity(response) || reportIdentity(accepted);
    if (!reportId) throw new Error('생성된 무료 해석 번호를 확인하지 못했습니다. 다시 눌러 주세요.');
    location.assign(teaserUrl(reportId));
    return response;
  }

  window.UMSHSignalService = Object.assign(window.UMSHSignalService || {}, { createPreviewFromInput });

  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length && !window.UMSHReportAccess) return { report: cached };

      const reportId = new URLSearchParams(location.search).get('reportId') || new URLSearchParams(location.search).get('report_id') || '';
      const request = buildRequest(readJson('sessionStorage', STORAGE.input));
      if (!reportId && (!request?.relationshipStage || !request?.signalFocus)) return { reason: 'input' };

      const session = await initAuth();
      if (!session) {
        reportPromise = null;
        return { reason: 'login' };
      }

      try {
        const response = await api('/api/love/signal/analyze', {
          method: 'POST',
          body: JSON.stringify(reportId ? { reportId, preview: true } : { ...request, preview: true }),
        });
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
      const response = await api('/api/love/signal/analyze', {
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
    input: '두 사람의 정보와 마음에 걸린 장면을 알려 주면 첫 해석부터 그 고민을 중심으로 풀어드립니다.',
    login: '로그인하면 저장된 내 사주와 상대 정보를 이어서 확인할 수 있습니다.',
    payment: '전체 해석에서는 관계 온도, 모임과 연락의 경계, 두 사람의 반응 차이와 실제 대화까지 이어서 봅니다.',
    error: '해석을 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.',
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
    const summary = $('[data-hero-summary]');
    if (!summary) return;

    await resumeAfterPayment();
    const outcome = await loadReport();

    const primary = $('[data-state-primary]');
    if (outcome.preview) {
      window.UMSHReportAccess?.showPreview?.(outcome.payload || outcome);
      const line = String(outcome.preview.headline || outcome.preview.summary || '').trim();
      if (line) summary.textContent = line;
      const insights = outcome.preview.signals || outcome.preview.insights || [];
      ['[data-flow-main]', '[data-flow-condition]', '[data-flow-obstacle]'].forEach((selector, index) => {
        const node = $(selector);
        const item = insights[index];
        if (node && item) node.textContent = item && typeof item === 'object' ? String(item.body || item.text || item.title || '') : String(item);
      });
      if (primary) {
        if (window.UMSHReportAccess?.isEntitled?.(outcome)) {
          primary.textContent = '전체 목차 열기';
          primary.addEventListener('click', (event) => {
            event.preventDefault();
            location.assign(window.UMSHReportAccess?.tocHref?.(outcome.payload?.reportId) || '../05-step-5-chat/chat.html#step-5-chat');
          });
        } else {
          primary.textContent = `전체 보기 (${SERVICE.price})`;
          primary.addEventListener('click', (event) => {
            event.preventDefault();
            location.assign(outcome.paymentUrl || `/payment?product=${SERVICE.apiKey}&returnTo=${encodeURIComponent(location.pathname)}`);
          });
        }
      }
      return;
    }

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      if (reason === 'login') {
        summary.textContent = '입력한 사주로 계산하고 있습니다.';
        window.UMSHAuthSession?.watchSignedIn?.(auth, () => {
          reportPromise = null;
          enhanceTeaser();
        });
      } else {
        summary.textContent = GATE_COPY[reason] || GATE_COPY.error;
      }
      ['[data-flow-main]', '[data-flow-condition]', '[data-flow-obstacle]'].forEach((selector) => {
        const node = $(selector);
        if (node) node.textContent = '아직 계산 전입니다. 위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.';
      });
      if (primary && reason === 'login') {
        primary.textContent = `로그인하고 전체 보기 (${SERVICE.price})`;
        primary.addEventListener('click', (event) => {
          event.preventDefault();
          location.assign(loginUrl());
        });
      }
      return;
    }

    // Free teaser: the opening lines of three representative 대분류, nothing more.
    const groups = groupOrder(outcome.report);
    summary.textContent = clamp(readingLine(groups[0].sections[0]), 170);
    const picks = [
      ['[data-flow-main]', groups.find((g) => g.title === '관계 밖 활동과 합의한 경계') || groups[1]],
      ['[data-flow-condition]', groups.find((g) => g.title === '시기별 흔들림 운') || groups[2]],
      ['[data-flow-obstacle]', groups.find((g) => g.title === '불안 원인 해석') || groups[3]],
    ];
    picks.forEach(([selector, group]) => {
      const node = $(selector);
      if (node && group) node.textContent = clamp(readingLine(group.sections[0]), 110);
    });

    // The paid-scope list mirrors the real 대분류 rather than sample labels.
    const scope = $('[data-paid-scope]');
    if (scope) {
      const tiles = scope.querySelectorAll('li, .tile, article');
      tiles.forEach((tile, index) => {
        const group = groups[index];
        if (!group) return;
        const title = tile.querySelector('b, strong, h3');
        const body = tile.querySelector('small, span, p');
        if (title) title.textContent = group.title;
        if (body) body.textContent = clamp(readingLine(group.sections[0]), 80);
      });
    }
  }

  // --------------------------------------------------------------- step 05
  async function enhanceList() {
    const list = $('[data-group-list]');
    if (!list) return;
    const outcome = await loadReport();
    if (!outcome.report) return;

    const byGroup = new Map();
    outcome.report.sections.forEach((section) => {
      if (!byGroup.has(section.category)) byGroup.set(section.category, section);
    });
    const byId = new Map(outcome.report.sections.map((section) => [section.id, section]));

    // The design re-renders the list on every tab switch, so keep the real copy applied
    // whenever it repaints rather than only once at load.
    const apply = () => {
      list.querySelectorAll('[data-group-card]').forEach((card) => {
        const title = card.querySelector('h3, h2, strong')?.textContent?.trim();
        const section = title ? byGroup.get(title) : null;
        const body = card.querySelector('p');
        if (section && body && body.dataset.signalApplied !== section.id) {
          body.textContent = clamp(readingLine(section), 120);
          body.dataset.signalApplied = section.id;
        }
      });
      list.querySelectorAll('[data-section-id]').forEach((node) => {
        const section = byId.get(node.dataset.sectionId);
        if (!section) return;
        node.setAttribute('aria-disabled', 'false');
      });
    };
    apply();
    new MutationObserver(apply).observe(list, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------- step 06_1
  async function enhanceDetail() {
    const root = $('#detail-root');
    if (!root) return;
    const outcome = await loadReport();
    if (!outcome.report) return;

    const apply = () => {
      const wanted = new URLSearchParams(location.search).get('section');
      const section = outcome.report.sections.find((item) => item.id === wanted) || outcome.report.sections[0];
      if (!section || root.dataset.signalApplied === section.id) return;

      const parts = paragraphs(section);
      if (!parts.length) return;

      // The design lays the detail out as text blocks; fill them in reading order and
      // append what is left so no paragraph of the reading is dropped.
      const blocks = root.querySelectorAll('p, .body-copy');
      let index = 1;
      blocks.forEach((block) => {
        if (block.children.length || index >= parts.length) return;
        block.textContent = parts[index];
        index += 1;
      });
      if (index < parts.length) {
        const rest = document.createElement('div');
        rest.className = 'signal-reading-rest';
        parts.slice(index).forEach((text) => {
          const p = document.createElement('p');
          p.textContent = text;
          rest.appendChild(p);
        });
        root.appendChild(rest);
      }

      const label = $('#context-label');
      if (label) label.textContent = `${section.category} · ${section.classification}`;
      root.dataset.signalApplied = section.id;
    };

    apply();
    new MutationObserver(apply).observe(root, { childList: true, subtree: false });
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
