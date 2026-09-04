/**
 * Bridges the 소비성향 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships with sample copy so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — fills the saved-profile card from the account so the saju is never asked twice
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — unlocks the 목차 and puts each 대분류's own reading on its card
 *   06 — fills the detail blocks with that section's full RAG interpretation
 *
 * Everything reads from POST /api/money/save/analyze, which computes the 사주 server side
 * and grounds each section in the KMS corpus, so no reading is ever invented in the browser.
 */
(() => {
  if (!/^\/money\/save(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'money_save',
    slug: 'save',
    title: '나는 왜 돈이 안 모일까?',
  };

  // The design pages read and write these; we fill them so their own renderers unlock.
  const STORAGE = {
    profile: 'cheongi_user_birth_profile_v1',
    input: 'umsh_save_step2_payload_v1',
    report: 'umsh_save_report_v1',
    reportId: 'umsh_save_report_id_v1',
    entitlement: 'umsh_save_entitlement_v1',
    teaser: 'umsh_save_step4_teaser_v1',
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  // umsh-chrome.js auto-mounts against `main.stage, .stage, main`, which on these pages
  // would drop a second app bar inside <main>. Stand it down and mount explicitly below.
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

  function clamp(text, limit) {
    const value = String(text || '').trim();
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  }

  /** Split a closing paragraph into the one-per-line actions the 실행 액션 list wants. */
  function sentences(text) {
    return String(text || '')
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 4);
  }

  function mountChrome() {
    if (!window.UMSHChrome) return;
    const host = $('.app, .phone');
    document.body.dataset.umshChrome = 'off';
    window.UMSHChrome.mount({
      root: '.app, .phone',
      service: host?.dataset.service || '소비성향',
      price: host?.dataset.price || '9,900원',
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
    return window.UMSHCommonAuth?.commonLoginUrl('money-save', returnTo)
      || `/signup?entry=money-save&returnTo=${encodeURIComponent(returnTo)}#login`;
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
   * The design already draws a "이 프로필로 진행" card from the locally cached saju.
   * The account is the better source, so pull it down into that same cache and take the
   * offer automatically — the visitor should never retype a birth date the site holds.
   */
  async function enhanceSajuInput() {
    const card = $('[data-profile-card]');
    if (!card) return;

    const session = await initAuth();
    if (session) {
      try {
        const payload = await api('/api/user/profile');
        if (payload?.profile?.name && payload.profile.birth) {
          writeJson('localStorage', STORAGE.profile, payload.profile);
        }
      } catch {
        // Keep whatever the browser already cached.
      }
    }

    // The design reads the cache once at load, so re-run its own card renderer.
    const profile = readJson('localStorage', STORAGE.profile);
    if (!profile) return;
    const useButton = card.querySelector('[data-action="use-profile"]');
    if (!card.classList.contains('is-visible')) {
      window.dispatchEvent(new Event('umsh:profile-cached'));
    }
    if (useButton && card.classList.contains('is-visible')) {
      useButton.click();
      const summary = $('[data-profile-summary]');
      if (summary && !summary.dataset.savePrefilled) {
        summary.dataset.savePrefilled = '1';
        summary.textContent = `${summary.textContent} · 저장된 사주로 진행합니다`;
      }
    }
  }

  // ------------------------------------------------------- report retrieval
  /** Step 02 stores its own shape; this maps it onto what the analyze endpoint expects. */
  function buildRequest(payload) {
    const money = payload?.money_context;
    if (!money) return null;
    const habit = [money.monthlyMood, money.leakPattern].filter(Boolean).join(' · ');
    if (habit.trim().length < 2) return null;
    return {
      moneyHabit: habit.slice(0, 80),
      incomePattern: String(money.incomeType || '').slice(0, 60),
      leakPoint: String(money.leakPattern || '').slice(0, 60),
      relationSpending: String(money.relationMoney || '').slice(0, 60),
      savingGoal: String(money.savingGoal || '').slice(0, 80),
      concern: String(money.currentConcern || '').slice(0, 160),
    };
  }

  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length) return { report: cached };

      const payload = readJson('sessionStorage', STORAGE.input);
      const request = buildRequest(payload);
      if (!request) return { reason: 'input' };

      const session = await initAuth();
      if (!session) return { reason: 'login' };

      try {
        const response = await api('/api/money/save/analyze', { method: 'POST', body: JSON.stringify(request) });
        const report = response.report || response;
        if (!report?.sections?.length) return { reason: 'error' };
        writeJson('sessionStorage', STORAGE.report, report);
        writeJson('sessionStorage', STORAGE.reportId, report.reportId || response.reportId || '');
        writeJson('sessionStorage', STORAGE.entitlement, { status: 'granted', verified_by: 'server' });
        return { report };
      } catch (error) {
        if (error.status === 401 || error.status === 403) return { reason: 'login' };
        if (error.code === 'PAYMENT_REQUIRED') {
          window.UMSHPaymentBridge?.save(SERVICE.apiKey, request, location.pathname);
          return { reason: 'payment', paymentUrl: error.paymentUrl, request };
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
      const response = await api('/api/money/save/analyze', {
        method: 'POST',
        body: JSON.stringify({ ...pending.payload, orderId }),
      });
      const report = response.report || response;
      if (!report?.sections?.length) return;
      writeJson('sessionStorage', STORAGE.report, report);
      writeJson('sessionStorage', STORAGE.entitlement, { status: 'granted', verified_by: 'server' });
      window.UMSHPaymentBridge?.clear();
      await api(`/api/payment/orders/${encodeURIComponent(orderId)}/viewed`, { method: 'POST' }).catch(() => {});
      history.replaceState(null, '', location.pathname);
      reportPromise = Promise.resolve({ report });
    } catch {
      // Fall through to the normal gate.
    }
  }

  const GATE_COPY = {
    input: '이전 입력을 찾지 못했습니다. 돈 쓰는 습관을 다시 입력하면 같은 풀이로 이어집니다.',
    login: '로그인하면 저장된 내 사주로 풀이를 계산합니다. 지금 화면의 문장은 예시입니다.',
    payment: '결제가 확인되면 8개 대분류 41개 항목이 모두 열립니다.',
    error: '풀이를 계산하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  };

  // --------------------------------------------------------------- step 04
  async function enhanceTeaser() {
    const answer = $('[data-one-line-answer]');
    if (!answer) return;

    await resumeAfterPayment();
    const outcome = await loadReport();

    const primary = $('[data-state-primary]');
    const secondary = $('[data-state-secondary]');
    const body = $('[data-state-body]');
    const title = $('[data-state-title]');
    const replace = (node) => {
      if (!node) return null;
      const clone = node.cloneNode(true);
      node.replaceWith(clone);
      return clone;
    };
    const nextPrimary = replace(primary);
    const nextSecondary = replace(secondary);

    // The sticky dock carries its own CTA; it must say the same thing as the state card,
    // or a reader with the report already open is still told to log in.
    const dock = replace($('.submit-dock [data-action="login"]'));
    const dockNote = $('.submit-dock .dock-note');

    if (nextSecondary) {
      nextSecondary.textContent = '입력 수정하기';
      nextSecondary.addEventListener('click', () => {
        location.assign('../02-step-2-saju-input/index.html#step-2-saju-input');
      });
    }

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      // The sample sentences read like a personal verdict, so they must not stay on screen.
      answer.textContent = GATE_COPY[reason] || GATE_COPY.error;
      const signals = $('[data-signal-list]');
      if (signals) signals.innerHTML = '';
      if (title) title.textContent = reason === 'login' ? '로그인이 필요합니다' : '입력을 먼저 마쳐 주세요';
      if (body) body.textContent = GATE_COPY[reason] || GATE_COPY.error;
      if (nextPrimary) {
        if (reason === 'login') {
          nextPrimary.textContent = '로그인하고 전체 보기';
          nextPrimary.addEventListener('click', () => location.assign(loginUrl()));
        if (dock) {
          dock.textContent = '로그인하고 전체 보기';
          dock.addEventListener('click', () => location.assign(loginUrl()));
        }
        } else if (reason === 'payment') {
          nextPrimary.textContent = '전체 보기';
          nextPrimary.addEventListener('click', () => {
            location.assign(outcome.paymentUrl || `/payment?product=${SERVICE.apiKey}&returnTo=${encodeURIComponent(location.pathname)}`);
          });
        } else {
          nextPrimary.textContent = '입력 다시 하기';
          nextPrimary.addEventListener('click', () => {
            location.assign('../02-step-2-saju-input/index.html#step-2-saju-input');
          });
        }
      }
      return;
    }

    renderTeaser(outcome.report, answer);
    if (title) title.textContent = '전체 리포트가 열렸습니다';
    if (body) body.textContent = '8개 대분류 41개 항목을 목록에서 하나씩 열어볼 수 있습니다.';
    if (nextPrimary) {
      nextPrimary.textContent = '전체 리포트 목록 열기';
      nextPrimary.addEventListener('click', () => location.assign('../05-step-5-chat/chat.html#step-5-chat'));
    if (dock) {
      dock.textContent = '전체 리포트 목록 열기';
      dock.addEventListener('click', () => location.assign('../05-step-5-chat/chat.html#step-5-chat'));
    }
    if (dockNote) dockNote.textContent = '8개 대분류 41개 항목이 열려 있습니다.';
    }
  }

  /** The free teaser: the leading line of the leak group plus two supporting signals. */
  function renderTeaser(report, answer) {
    const groups = groupOrder(report);
    const leak = groups.find((group) => group.title === '돈이 새는 패턴') || groups[0];
    const verdict = paragraphs(leak.sections[0]);
    answer.textContent = clamp(verdict[1] || verdict[0] || '', 160);

    const signals = $('[data-signal-list]');
    if (signals) {
      signals.innerHTML = '';
      groups.slice(0, 3).forEach((group) => {
        const line = paragraphs(group.sections[0])[1] || '';
        const item = document.createElement('div');
        item.className = 'signal-item';
        const strong = document.createElement('strong');
        strong.textContent = group.title;
        const span = document.createElement('span');
        span.textContent = clamp(line, 100);
        item.append(strong, span);
        signals.appendChild(item);
      });
    }

    const summary = $('[data-input-summary]');
    if (summary) summary.textContent = `${groups.length}개 대분류 · ${report.sections.length}개 항목으로 계산했습니다.`;
    writeJson('sessionStorage', STORAGE.teaser, { answer: answer.textContent });
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
    const list = $('[data-group-list]');
    if (!list) return;
    const outcome = await loadReport();
    if (!outcome.report) {
      showListGate(outcome.reason || 'error');
      return;
    }

    const byId = new Map(outcome.report.sections.map((section) => [section.id, section]));
    const byCategory = new Map();
    outcome.report.sections.forEach((section) => {
      if (!byCategory.has(section.category)) byCategory.set(section.category, section);
    });

    // The design re-renders the list on every search and filter, so keep the real copy
    // applied whenever it repaints rather than only once at load.
    const apply = () => {
      list.querySelectorAll('[data-section-id]').forEach((card) => {
        const section = byId.get(card.dataset.sectionId);
        if (!section) return;
        const lock = card.querySelector('.lock-label');
        if (lock) lock.textContent = '열람 가능';
      });
      list.querySelectorAll('details.group-card').forEach((group) => {
        const title = group.querySelector('.group-title strong')?.textContent?.trim();
        const section = title ? byCategory.get(title) : null;
        const summary = group.querySelector('.group-title span');
        if (section && summary) summary.textContent = clamp(paragraphs(section)[1] || '', 120);
      });
    };
    apply();
    new MutationObserver(apply).observe(list, { childList: true, subtree: true });

    const card = $('[data-access-card]');
    if (card) {
      const title = $('[data-access-title]', card);
      const body = $('[data-access-body]', card);
      const action = $('[data-access-action]', card);
      if (title) title.textContent = '전체 리포트 목차가 열렸어요';
      if (body) body.textContent = '보고 싶은 중분류를 누르면 해당 상세 풀이로 바로 이어집니다.';
      if (action) {
        action.textContent = '첫 항목 보기';
        action.addEventListener('click', () => {
          const first = outcome.report.sections[0];
          if (first) location.assign(`../06-step-6_1-report-detail/index.html?section=${encodeURIComponent(first.id)}#step-6_1-report`);
        });
      }
    }
  }

  function showListGate(reason) {
    const card = $('[data-access-card]');
    if (!card) return;
    const title = $('[data-access-title]', card);
    const body = $('[data-access-body]', card);
    const action = $('[data-access-action]', card);
    if (title) title.textContent = reason === 'login' ? '로그인이 필요합니다' : '리포트를 먼저 만들어 주세요';
    if (body) body.textContent = GATE_COPY[reason] || GATE_COPY.error;
    if (action) {
      action.textContent = reason === 'login' ? '로그인하고 전체 보기' : '입력 화면으로 이동';
      action.addEventListener('click', () => {
        location.assign(reason === 'login' ? loginUrl() : '../02-step-2-saju-input/index.html#step-2-saju-input');
      });
    }
  }

  // ------------------------------------------------------------- step 06_1
  async function enhanceDetail() {
    const detail = $('#detailContent');
    if (!detail) return;
    const outcome = await loadReport();
    if (!outcome.report) return;

    const apply = () => {
      const wanted = new URLSearchParams(location.search).get('section');
      const section = outcome.report.sections.find((item) => item.id === wanted) || outcome.report.sections[0];
      if (!section || detail.dataset.saveApplied === section.id) return;

      const parts = paragraphs(section);
      if (parts.length < 5) return;

      // The template writes the same six roles for every section, so each block takes
      // the paragraph that belongs under its heading instead of a running text dump.
      const [conclusion, reality, condition, focus, evidence, action] = parts;
      const set = (id, text) => {
        const node = document.querySelector(id);
        if (node && text) node.textContent = text;
      };
      // The 핵심 한 줄 block sits right under the group and section titles, so the
      // reading's own "第N門 ... 중 '...'일세" bookkeeping would just repeat them.
      set('#conclusionBody', conclusion.replace(/第[^\s]*門[^.]*?일세\.\s*/, ''));
      set('#realityBody', reality);
      set('#conditionBody', condition);
      set('#focusBody', focus);
      set('#evidenceBody', evidence);
      set('#groupTitle', section.category);
      set('#sectionTitle', section.classification);
      set('#sectionPreview', clamp(conclusion, 120));

      const actions = document.querySelector('#actionList');
      if (actions && action) {
        actions.innerHTML = '';
        sentences(action).forEach((line) => {
          const li = document.createElement('li');
          li.textContent = line;
          actions.appendChild(li);
        });
      }

      const chip = document.querySelector('#modeChip');
      if (chip) chip.textContent = '상세 열림';
      document.querySelector('#lockedState')?.classList.add('hidden');
      document.querySelector('#missingState')?.classList.add('hidden');
      detail.classList.remove('hidden');
      detail.dataset.saveApplied = section.id;
    };

    apply();
    new MutationObserver(apply).observe(detail, { childList: true, subtree: false });
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
