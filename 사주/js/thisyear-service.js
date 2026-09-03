/**
 * Bridges the 올해 연애운 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships as a static mock so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — takes the saju off the account so the birth date is never asked twice
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — the group/item copy, patched into the page's own JSON by thisyear-report-store.js
 *   06 — same, one section's six paragraphs into the six authored blocks
 *
 * Everything reads from POST /api/love/this-year/analyze, which computes 사주 server side
 * and grounds each section in the KMS corpus, so no reading is invented in the browser.
 */
(() => {
  if (!/^\/love\/this-year(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'love_this_year',
    entry: 'love-this-year',
    title: '올해 연애운',
    price: '12,900원',
  };

  const STORAGE = {
    draft: 'umsh:love_thisyear:session_draft',
    report: 'umsh:report:love_this_year',
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
   * A reading opens on bookkeeping — the 문 label, the item title and the 일간·일지 it
   * reads from. Previews want the sentence that says something, so skip that paragraph.
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
    const host = $('.phone');
    document.body.dataset.umshChrome = 'off';
    window.UMSHChrome.mount({
      root: '.phone',
      service: host?.dataset.service || SERVICE.title,
      price: host?.dataset.price || SERVICE.price,
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
    return window.UMSHCommonAuth?.commonLoginUrl(SERVICE.entry, returnTo)
      || `/signup?entry=${SERVICE.entry}&returnTo=${encodeURIComponent(returnTo)}#login`;
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
  const BIRTH_TIME_UNKNOWN = '시간 모름';

  function formatBirth(profile) {
    const birth = profile?.birth;
    if (!birth) return '';
    const date = `${birth.year}년 ${birth.month}월 ${birth.day}일`;
    const calendar = birth.calendar === 'lunar' ? '음력' : '양력';
    const time = Number.isFinite(birth.hour) ? `${String(birth.hour).padStart(2, '0')}시` : BIRTH_TIME_UNKNOWN;
    return `${calendar} ${date} · ${time}`;
  }

  /**
   * The design already offers a "저장된 기본 프로필 사용" mode. The account is the source
   * of truth for the saju — the analyze endpoint reads it server side either way — so
   * take that offer and show what is being used instead of asking for it again.
   */
  async function enhanceSajuInput() {
    const form = $('#loveIntakeForm');
    if (!form) return;

    const session = await initAuth();
    if (!session) return;

    let profile = null;
    try {
      profile = (await api('/api/user/profile'))?.profile || null;
    } catch {
      return;
    }
    if (!profile?.birth) return;

    const saved = form.querySelector('input[name="profile_mode"][value="saved_profile"]');
    if (saved && !saved.checked) {
      saved.checked = true;
      saved.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // The name still travels with the report, so hand the page what the account holds
    // rather than leaving the field for the visitor to retype.
    if (!form.display_name.value && profile.name) form.display_name.value = profile.name;

    const notice = $('#savedProfileNotice');
    if (!notice || $('.thisyear-saved-profile')) return;
    const card = document.createElement('div');
    card.className = 'thisyear-saved-profile';
    const title = document.createElement('b');
    title.textContent = `${profile.name || '내'} 사주로 이어갑니다`;
    const detail = document.createElement('span');
    detail.textContent = `${formatBirth(profile)} — 계정에 저장된 값이라 다시 입력하지 않아도 됩니다. 아래에서는 애인성 기준과 현재 관계 상태만 골라 주세요.`;
    const change = document.createElement('button');
    change.type = 'button';
    change.textContent = '저장된 사주 수정하기';
    change.addEventListener('click', () => {
      location.assign(`/profile?returnTo=${encodeURIComponent(location.pathname)}`);
    });
    card.append(title, detail, change);
    notice.parentNode.insertBefore(card, notice);
  }

  // ------------------------------------------------------- report retrieval
  /** Step 02 stores the design's own draft shape; map it onto the analyze payload. */
  function buildRequest(draft) {
    if (!draft || draft.service_key !== 'love_thisyear') return null;
    if (!draft.relationship_status || !draft.partner_star_basis) return null;
    return {
      relationshipStatus: draft.relationship_status,
      partnerStarBasis: draft.partner_star_basis,
      gender: draft.gender || '',
      displayName: draft.display_name || '',
    };
  }

  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length) return { report: cached };

      const request = buildRequest(readJson('sessionStorage', STORAGE.draft));
      if (!request) return { reason: 'input' };

      const session = await initAuth();
      if (!session) return { reason: 'login' };

      try {
        const response = await api('/api/love/this-year/analyze', { method: 'POST', body: JSON.stringify(request) });
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
        if (error.code === 'PROFILE_REQUIRED') return { reason: 'profile' };
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
      const response = await api('/api/love/this-year/analyze', {
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
    input: '입력 화면에서 애인성 기준과 현재 관계 상태를 고르면, 이 자리에 내 사주 기준 풀이가 들어옵니다.',
    login: '로그인하면 계정에 저장된 내 사주로 올해 흐름을 계산합니다. 지금 화면의 문장은 예시입니다.',
    profile: '기본 사주 정보를 등록하면 올해 도화와 세운 흐름을 바로 계산합니다.',
    payment: '결제가 확인되면 8개 대분류 48개 항목이 모두 열립니다.',
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
  /**
   * The design ships a mock CTA that walks guest → unpaid → 목록 with no server in the
   * loop. Replace the button so the real gate decides, and keep the design's own
   * status panel as the place that explains where the visitor stands.
   */
  function takeOverCta(label, handler) {
    const cta = $('#primaryCta');
    if (!cta) return null;
    const fresh = cta.cloneNode(true);
    cta.replaceWith(fresh);
    fresh.disabled = false;
    fresh.textContent = label;
    fresh.addEventListener('click', handler);
    return fresh;
  }

  function setStatus(title, pill, copy) {
    const titleNode = $('#stateTitle');
    const pillNode = $('#statePill');
    const copyNode = $('#stateCopy');
    if (titleNode) titleNode.textContent = title;
    if (pillNode) pillNode.textContent = pill;
    if (copyNode) copyNode.textContent = copy;
  }

  function goReportIndex() {
    const params = new URLSearchParams();
    params.set('service_key', 'love_thisyear');
    params.set('service_slug', 'thisyear');
    const report = readJson('sessionStorage', STORAGE.report);
    if (report?.reportId) params.set('report_id', report.reportId);
    params.set('analysis_period', 'this_year');
    params.set('report_version', 'love-thisyear-v1');
    params.set('entitlement', 'server_required');
    location.assign(`/love/this-year/05-step-5-chat/chat.html?${params.toString()}#step-5-chat`);
  }

  async function enhanceTeaser() {
    const summary = $('#freeSummary');
    if (!summary || !$('#step-4-report')) return;

    await resumeAfterPayment();
    const outcome = await loadReport();
    const signals = document.querySelectorAll('.signal-list .signal');

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      // The sample verdict must not stay on screen as if it were a personal reading.
      summary.textContent = GATE_COPY[reason] || GATE_COPY.error;
      signals.forEach((signal) => {
        const body = signal.querySelector('span');
        if (body) body.textContent = '아직 계산 전입니다. 위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.';
      });

      if (reason === 'login') {
        setStatus('로그인하면 내 사주로 계산합니다', '비로그인', GATE_COPY.login);
        takeOverCta('로그인하고 내 풀이 보기', () => location.assign(loginUrl()));
      } else if (reason === 'profile') {
        setStatus('기본 사주 정보가 필요합니다', '프로필 필요', GATE_COPY.profile);
        takeOverCta('내 사주 등록하기', () => {
          location.assign(`/profile?returnTo=${encodeURIComponent(location.pathname)}`);
        });
      } else if (reason === 'payment') {
        setStatus('결제 후 전체 리포트가 열립니다', '미결제', GATE_COPY.payment);
        takeOverCta(`${SERVICE.price} 결제하고 전체 보기`, () => {
          location.assign(outcome.paymentUrl || `/payment?service=${SERVICE.apiKey}`);
        });
      } else if (reason === 'input') {
        setStatus('입력을 먼저 마쳐 주세요', '입력 전', GATE_COPY.input);
        takeOverCta('입력 화면으로 가기', () => location.assign('/love/this-year/02-step-2-saju-input/index.html'));
      } else {
        setStatus('풀이를 계산하지 못했습니다', '오류', GATE_COPY.error);
        takeOverCta('다시 시도하기', () => location.reload());
      }
      return;
    }

    // Free teaser: the opening lines of three representative 대분류, nothing more.
    const groups = groupOrder(outcome.report);
    const greeting = $('#userGreeting');
    if (greeting) greeting.textContent = outcome.report.subtitle || '내 올해 연애 흐름';
    summary.textContent = clamp(readingLine(groups[0].sections[0]), 170);

    const picks = [
      groups.find((group) => group.title === '올해 연애 가능성 총평') || groups[0],
      groups.find((group) => group.title === '만남 타이밍') || groups[2],
      groups.find((group) => group.title === '주의 신호') || groups[groups.length - 2],
    ];
    signals.forEach((signal, index) => {
      const group = picks[index];
      if (!group) return;
      const title = signal.querySelector('strong');
      const body = signal.querySelector('span');
      if (title) title.textContent = `${title.textContent.split(':')[0]}: ${group.title}`;
      if (body) body.textContent = clamp(readingLine(group.sections[0]), 130);
    });

    // The paid-scope tiles mirror the real 대분류 rather than sample labels.
    document.querySelectorAll('.scope-grid .paid-item').forEach((tile, index) => {
      const group = groups[index];
      if (!group) return;
      const title = tile.querySelector('strong');
      const body = tile.querySelector('span');
      if (title) title.textContent = group.title;
      if (body) body.textContent = group.sections.map((section) => section.classification).slice(0, 3).join(', ');
    });

    setStatus('내 사주로 계산한 리포트가 준비됐어요', '열람 가능', `${groups.length}개 대분류 ${outcome.report.sections.length}개 항목이 열려 있습니다.`);
    takeOverCta('전체 리포트 목록 보기', goReportIndex);
  }

  // ------------------------------------------------------- steps 05 / 06_1
  /**
   * thisyear-report-store.js patches those pages' JSON before their own script parses
   * it, but only when the report is already cached. Landing on 05 or 06 directly leaves
   * nothing cached, so fetch it once and reload so the store can do its job.
   */
  async function ensureReportCached() {
    if (!$('#step-5-chat') && !$('#step-6_1-report')) return;
    if (readJson('sessionStorage', STORAGE.report)?.sections?.length) return;
    const outcome = await loadReport();
    if (outcome.report) location.reload();
  }

  function init() {
    mountChrome();
    enhanceSajuInput();
    enhanceTeaser();
    ensureReportCached();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
