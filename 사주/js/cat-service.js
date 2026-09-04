/**
 * Bridges the 고양이 궁합 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships as a static mock so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — writes the account's saju into the cache the page already looks in, so the
 *        birth date is never asked twice; only the cat's side is collected here
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — puts each 대분류's and 중분류's own reading on its card
 *   06 — served by cat-report-store.js, which answers the page's own data request
 *
 * Everything reads from POST /api/match/cat/analyze, which computes 사주 server side and
 * grounds each section in the KMS corpus, so no reading is invented in the browser.
 */
(() => {
  if (!/^\/match\/cat(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'cat_compatibility',
    entry: 'cat-compatibility',
    title: '고양이 궁합',
    price: '9,900원',
  };

  const STORAGE = {
    // The design's own keys.
    profile: 'cheongi_user_birth_profile_v1',
    payload: 'cat_compatibility_step2_payload',
    report: 'umsh:report:cat_compatibility',
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
   * A reading opens on bookkeeping — the 문 label, the item title and the chart it reads
   * from. Previews want the sentence that says something, so skip that paragraph.
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
  /**
   * The design already folds the guardian's birth fields away when it finds a saved
   * profile, and it looks in `cheongi_user_birth_profile_v1` — the same cache the rest
   * of the site writes. The account is the source of truth (the analyze endpoint reads
   * it server side either way), so fill that cache and take the offer.
   */
  async function enhanceSajuInput() {
    const form = $('#compatibility-form');
    if (!form) return;

    const session = await initAuth();
    if (!session) return;

    let profile = null;
    try {
      profile = (await api('/api/user/profile'))?.profile || null;
    } catch {
      return;
    }
    if (!profile?.birth || !profile.name) return;

    const already = readJson('localStorage', STORAGE.profile);
    writeJson('localStorage', STORAGE.profile, profile);
    // The page read the cache once at load, so reload the first time it lands here.
    if (!already) {
      location.reload();
      return;
    }

    const saved = form.querySelector('#profile-existing');
    if (saved && !saved.disabled && !saved.checked) {
      saved.checked = true;
      saved.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const status = $('#profile-status');
    if (!status || $('.cat-saved-profile')) return;
    const birth = profile.birth;
    const pad = (value) => String(value).padStart(2, '0');
    const card = document.createElement('div');
    card.className = 'cat-saved-profile';
    const title = document.createElement('b');
    title.textContent = `${profile.name}님의 저장된 사주로 이어갑니다`;
    const detail = document.createElement('span');
    detail.textContent = `${birth.calendar === 'lunar' ? '음력' : '양력'} ${birth.year}년 ${birth.month}월 ${birth.day}일 ${pad(birth.hour ?? 12)}시 — 계정에 저장된 값이라 다시 입력하지 않아도 됩니다. 이 화면에서는 고양이 쪽만 알려 주세요.`;
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
  /** The design stores its own payload shape; map the cat's side onto the analyze body. */
  function buildRequest() {
    const cat = readJson('sessionStorage', STORAGE.payload)?.cat;
    if (!cat?.nickname || !cat.household || !cat.touch_style || !cat.play_energy || !cat.focus_area) return null;
    return {
      catName: cat.nickname,
      household: cat.household,
      ageBand: cat.age_band || (cat.birth_known ? 'adult' : 'unknown'),
      behaviorTags: cat.behavior_tags || [],
      touchStyle: cat.touch_style,
      playEnergy: cat.play_energy,
      routineFlags: cat.routine_flags || [],
      focusArea: cat.focus_area,
      upcomingEvent: cat.upcoming_event || 'none',
      note: cat.note || '',
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
        const response = await api('/api/match/cat/analyze', { method: 'POST', body: JSON.stringify(request) });
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
      const response = await api('/api/match/cat/analyze', {
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
    input: '02 입력 화면에서 고양이 정보를 넣으면, 이 자리에 내 사주 기준 풀이가 들어옵니다.',
    login: '로그인하면 계정에 저장된 내 사주로 이 궁합을 계산합니다. 지금 화면의 문장은 예시입니다.',
    profile: '기본 사주 정보를 등록하면 우리 둘의 생활 박자를 바로 계산합니다.',
    payment: '결제가 확인되면 10개 대분류 50개 항목이 모두 열립니다.',
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

  /** The 05 목차 link the real report belongs behind. */
  function reportListUrl(report) {
    const params = new URLSearchParams();
    params.set('service_key', SERVICE.apiKey);
    if (report.reportId) params.set('report_id', report.reportId);
    params.set('analysis_period', 'current-12m');
    params.set('report_version', 'cat-compatibility-v1');
    // The design's own gate reads this; the server already decided access.
    params.set('entitlement', 'verified');
    return `/match/cat/05-step-5-chat/chat.html?${params.toString()}#step-5-chat`;
  }

  // --------------------------------------------------------------- step 04
  function setText(selector, value) {
    const node = $(selector);
    if (node && value) node.textContent = value;
  }

  /**
   * The design ships a mock CTA that walks guest → unpaid → 목록 with no server in the
   * loop. Replace the button so the real gate decides.
   */
  function takeOverCta(label, handler) {
    const cta = $('#primary-cta');
    if (!cta) return null;
    const fresh = cta.cloneNode(true);
    cta.replaceWith(fresh);
    fresh.disabled = false;
    fresh.textContent = label;
    fresh.addEventListener('click', handler);
    return fresh;
  }

  async function enhanceTeaser() {
    if (!$('#step-4-report')) return;

    await resumeAfterPayment();
    const outcome = await loadReport();

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      // The sample verdict must not stay on screen as if it were a personal reading.
      setText('#signal-main-title', '아직 계산 전입니다');
      setText('#signal-main-copy', GATE_COPY[reason] || GATE_COPY.error);
      setText('#condition-signal', '위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.');
      setText('#blocker-signal', '위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.');

      if (reason === 'login') {
        setText('#state-pill', '비로그인');
        setText('#state-title', '로그인하면 내 사주로 계산합니다');
        setText('#state-copy', GATE_COPY.login);
        takeOverCta('로그인하고 전체 보기', () => location.assign(loginUrl()));
      } else if (reason === 'profile') {
        setText('#state-pill', '프로필 필요');
        setText('#state-title', '기본 사주 정보가 필요합니다');
        setText('#state-copy', GATE_COPY.profile);
        takeOverCta('내 사주 등록하기', () => {
          location.assign(`/profile?returnTo=${encodeURIComponent(location.pathname)}`);
        });
      } else if (reason === 'payment') {
        setText('#state-pill', '미결제');
        setText('#state-title', '결제 후 전체 리포트가 열립니다');
        setText('#state-copy', GATE_COPY.payment);
        takeOverCta(`전체 보기 · ${SERVICE.price}`, () => {
          location.assign(outcome.paymentUrl || `/payment?service=${SERVICE.apiKey}`);
        });
      } else if (reason === 'input') {
        setText('#state-pill', '입력 전');
        setText('#state-title', '입력을 먼저 마쳐 주세요');
        setText('#state-copy', GATE_COPY.input);
        takeOverCta('입력 화면으로 가기', () => location.assign('/match/cat/02-step-2-saju-input/index.html'));
      } else {
        setText('#state-pill', '오류');
        setText('#state-title', '풀이를 계산하지 못했습니다');
        setText('#state-copy', GATE_COPY.error);
        takeOverCta('다시 시도하기', () => location.reload());
      }
      return;
    }

    // Free teaser: the opening lines of three representative 대분류, nothing more.
    const groups = groupOrder(outcome.report);
    setText('#signal-main-title', outcome.report.subtitle || '우리 둘의 생활 박자');
    setText('#signal-main-copy', clamp(readingLine(groups[0].sections[0]), 170));
    setText('#condition-signal', clamp(readingLine((groups[3] || groups[1]).sections[0]), 150));
    setText('#blocker-signal', clamp(readingLine((groups[5] || groups[2]).sections[0]), 150));

    const tags = $('#signal-tags');
    if (tags) {
      tags.innerHTML = '';
      groups.slice(0, 3).forEach((group) => {
        const span = document.createElement('span');
        span.textContent = group.title;
        tags.appendChild(span);
      });
    }

    setText('#state-pill', '열람 가능');
    setText('#state-title', '내 사주로 계산한 리포트가 준비됐어요');
    setText('#state-copy', `${groups.length}개 대분류 ${outcome.report.sections.length}개 항목이 열려 있습니다.`);
    takeOverCta('전체 리포트 목록 보기', () => location.assign(reportListUrl(outcome.report)));
  }

  // --------------------------------------------------------------- step 05
  /**
   * The 목차 re-renders on every 대분류 switch, so the real copy is applied whenever it
   * repaints rather than only once at load.
   */
  async function enhanceList() {
    const grid = $('#group-grid');
    if (!grid || !$('#step-5-chat')) return;

    const outcome = await loadReport();
    if (!outcome.report) return;

    const byGroupTitle = new Map();
    const byId = new Map();
    outcome.report.sections.forEach((section) => {
      if (!byGroupTitle.has(section.category)) byGroupTitle.set(section.category, section);
      byId.set(section.id, section);
    });

    const apply = () => {
      document.querySelectorAll('#group-grid .group-card').forEach((card) => {
        const title = card.querySelector('strong')?.textContent?.trim();
        const section = title ? byGroupTitle.get(title) : null;
        const body = card.querySelector('em');
        if (section && body && body.dataset.catApplied !== section.id) {
          body.textContent = clamp(readingLine(section), 110);
          body.dataset.catApplied = section.id;
        }
      });
      document.querySelectorAll('#section-panel [data-section-id]').forEach((button) => {
        const section = byId.get(button.dataset.sectionId);
        const body = button.querySelector('em');
        if (section && body && body.dataset.catApplied !== section.id) {
          body.textContent = clamp(readingLine(section), 130);
          body.dataset.catApplied = section.id;
        }
      });
    };

    apply();
    const panel = $('#section-panel');
    new MutationObserver(apply).observe(grid, { childList: true, subtree: true });
    if (panel) new MutationObserver(apply).observe(panel, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------- step 06_1
  /**
   * cat-report-store.js answers the page's own data request, but only when the report is
   * already cached. Landing on 06 directly leaves nothing cached, so fetch it once and
   * reload so the store can do its job.
   */
  async function ensureReportCached() {
    if (!$('#step-6_1-report')) return;
    if (readJson('sessionStorage', STORAGE.report)?.sections?.length) return;
    const outcome = await loadReport();
    if (outcome.report) location.reload();
  }

  function init() {
    mountChrome();
    enhanceSajuInput();
    enhanceTeaser();
    enhanceList();
    ensureReportCached();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
