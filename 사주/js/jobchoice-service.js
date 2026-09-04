/**
 * Bridges the 자미두수 직장 선택 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships as a static mock so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — seeds the design's own profile cache from the account so the saju is never
 *        asked twice, and posts the offer to the server on submit
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — 대분류/중분류 copy, injected by jobchoice-report-store.js
 *   06 — one section's paragraphs into the three authored blocks
 *
 * Everything reads from POST /api/work/job-choice/analyze, which computes 사주 server
 * side and grounds each section in the KMS corpus, so no reading is invented here.
 */
(() => {
  if (!/^\/work\/job-choice(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'job_choice',
    entry: 'job-choice',
    title: '직장 선택',
    price: '9,900원',
  };

  const STORAGE = {
    // The design's own keys; loadStoredProfile/loadJobInput read these.
    profile: 'umsh_job_choice_profile',
    input: 'umsh_job_choice_input',
    report: 'umsh:report:job_choice',
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
  /**
   * The design already folds the birth fields away when it finds a stored profile, and
   * `loadStoredProfile` looks in `umsh_job_choice_profile` first. The account is the
   * source of truth — the analyze endpoint reads it server side either way — so write
   * the account's saju into that cache and let the page's own logic take it from there.
   */
  async function enhanceSajuInput() {
    const form = $('#jobChoiceForm');
    if (!form) return;

    const session = await initAuth();
    if (!session) return;

    let profile = null;
    try {
      profile = (await api('/api/user/profile'))?.profile || null;
    } catch {
      return;
    }
    const birth = profile?.birth;
    if (!birth || !profile.name) return;

    const pad = (value) => String(value).padStart(2, '0');
    const stored = {
      name: profile.name,
      gender: birth.gender === 'female' ? 'female' : 'male',
      birthDate: `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`,
      birthTime: `${pad(Number.isFinite(birth.hour) ? birth.hour : 12)}:${pad(birth.minute || 0)}`,
      calendarType: birth.calendar === 'lunar' ? 'lunar' : 'solar',
      birthPlace: '',
      profileId: 'account',
    };
    const already = readJson('sessionStorage', STORAGE.profile);
    writeJson('sessionStorage', STORAGE.profile, stored);
    // The page read the cache once at load, so reload the first time it lands here.
    if (!already) {
      location.reload();
      return;
    }

    const status = $('#profileStatus');
    if (!status || $('.jobchoice-saved-profile')) return;
    const card = document.createElement('div');
    card.className = 'jobchoice-saved-profile';
    const title = document.createElement('b');
    title.textContent = `${stored.name}님의 저장된 사주로 이어갑니다`;
    const detail = document.createElement('span');
    detail.textContent = `${stored.calendarType === 'lunar' ? '음력' : '양력'} ${stored.birthDate} ${stored.birthTime} — 계정에 저장된 값이라 다시 입력하지 않아도 됩니다. 이 화면에서는 회사와 오퍼 조건만 받습니다.`;
    const change = document.createElement('button');
    change.type = 'button';
    change.textContent = '저장된 사주 수정하기';
    change.addEventListener('click', () => {
      location.assign(`/profile?returnTo=${encodeURIComponent(location.pathname)}`);
    });
    card.append(title, detail, change);
    status.parentNode.insertBefore(card, status);
  }

  // ------------------------------------------------------- report retrieval
  /** The design stores its own input shape; map the offer onto the analyze payload. */
  function buildRequest() {
    const saved = readJson('sessionStorage', STORAGE.input);
    const offer = saved?.offer || saved?.input?.offer;
    if (!offer?.companyName || !offer?.roleName || !offer?.workMode || !offer?.commute || !offer?.salaryFeeling || !offer?.concernPoint) {
      return null;
    }
    return {
      companyName: offer.companyName,
      roleName: offer.roleName,
      workMode: offer.workMode,
      commute: offer.commute,
      salaryFeeling: offer.salaryFeeling,
      decisionDate: offer.decisionDate || '',
      concernPoint: offer.concernPoint,
    };
  }

  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'profile', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length) return { report: cached };

      const request = buildRequest();
      if (!request) return { reason: 'input' };

      const session = await initAuth();
      if (!session) return { reason: 'login' };

      try {
        const response = await api('/api/work/job-choice/analyze', { method: 'POST', body: JSON.stringify(request) });
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
      const response = await api('/api/work/job-choice/analyze', {
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
    input: '02 입력 화면에서 회사와 오퍼 조건을 넣으면, 이 자리에 내 사주 기준 풀이가 들어옵니다.',
    login: '로그인하면 계정에 저장된 내 사주로 이 오퍼를 계산합니다. 지금 화면의 문장은 예시입니다.',
    profile: '기본 사주 정보를 등록하면 이 오퍼를 내 원국 기준으로 바로 계산합니다.',
    payment: '결제가 확인되면 10개 대분류 57개 항목이 모두 열립니다.',
    error: '풀이를 계산하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  };

  // --------------------------------------------------------------- step 04
  /**
   * The page renders its whole teaser from the store's wrapped buildTeaser, so with a
   * report there is nothing left to do here. Without one the sample verdict is still on
   * screen, and it must not read as a personal reading — replace it with the gate that
   * actually applies and point the CTA at the step that clears it.
   */
  async function enhanceTeaser() {
    if (!$('#step-4-report')) return;

    await resumeAfterPayment();
    // The store only patches what was already cached when the page parsed, so a report
    // fetched just now needs one repaint. Whether the cache was cold decides that, which
    // is also what keeps this from looping.
    const hadCache = Boolean(readJson('sessionStorage', STORAGE.report)?.sections?.length);
    const outcome = await loadReport();
    if (outcome.report) {
      if (!hadCache) location.reload();
      return;
    }

    const reason = outcome.reason || 'error';
    const stage = $('#reportStage');
    if (!stage) return;
    const notice = document.createElement('div');
    notice.className = 'notice-card';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = '아직 계산 전';
    const heading = document.createElement('h2');
    heading.textContent = '지금 화면의 문장은 예시입니다';
    const copy = document.createElement('p');
    copy.textContent = GATE_COPY[reason] || GATE_COPY.error;
    const action = document.createElement('a');
    action.className = 'link-button';
    if (reason === 'login') {
      action.textContent = '로그인하고 전체 보기';
      action.href = loginUrl();
    } else if (reason === 'profile') {
      action.textContent = '내 사주 등록하기';
      action.href = `/profile?returnTo=${encodeURIComponent(location.pathname)}`;
    } else if (reason === 'payment') {
      action.textContent = `전체 보기 · ${SERVICE.price}`;
      action.href = outcome.paymentUrl || `/payment?service=${SERVICE.apiKey}`;
    } else if (reason === 'input') {
      action.textContent = '입력하러 가기';
      action.href = '/work/job-choice/02-step-2-saju-input/index.html#step-2-saju-input';
    } else {
      action.textContent = '다시 시도하기';
      action.href = location.href;
    }
    notice.append(eyebrow, heading, copy, action);
    stage.insertBefore(notice, stage.firstChild);

    // The sample signal bodies must not stay on screen as if they were personal.
    document.querySelectorAll('.signal-item span').forEach((node) => {
      node.textContent = '아직 계산 전입니다. 위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.';
    });
  }

  // ------------------------------------------------------- steps 05 / 06_1
  /**
   * jobchoice-report-store.js patches those pages before their own script parses, but
   * only when the report is already cached. Landing on 05 or 06 directly leaves nothing
   * cached, so fetch it once and reload so the store can do its job.
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
