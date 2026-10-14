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
  const inputLocalePrefix = window.location.pathname.match(/^\/(en|ja)(?=\/)/)?.[0] || '';
  const inputPath = window.location.pathname.replace(/^\/(?:en|ja)(?=\/)/, '');
  if (!/^\/work\/job-choice(?:\/|$)/.test(inputPath)) return;
  // Only the account-input bridge is enabled here. Locale paid/detail gates remain unchanged.
  if (inputLocalePrefix && !/\/02-step-2-saju-input(?:\/|$)/.test(inputPath)) return;

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
    // 비회원이 04 의 결제 버튼을 눌러 가입하러 갔다는 표시. 돌아오면 결제로 이어 준다.
    purchaseAfterAuth: 'umsh:job-choice:purchase-after-auth',
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
      if (!window.UMSHAuthSession?.bindServiceSession) return null;
      return await window.UMSHAuthSession.bindServiceSession(auth, 900);
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
    // A newly submitted offer must reach POST. The shared reader may otherwise turn
    // analyze into GET for the previous remembered report ID.
    const freshTeaser = path === '/api/work/job-choice/analyze' && /\/04-step-4-report\//.test(location.pathname) && options.method === 'POST';
    const transport = freshTeaser ? fetch : (window.UMSHReportAccess ? window.UMSHReportAccess.fetch : fetch);
    const response = await transport(path, {
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
      error.freeSearch = payload.freeSearch;
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

    // 가입 전에도 입력하고 티저까지 본다(천명사주와 같은 순서). 계정 사주가 없으면 이 탭에서 직접 입력한다.
    const openLocalInput = () => window.dispatchEvent(new CustomEvent('umsh-jobchoice-local-profile'));

    const session = await initAuth();
    if (!session) { openLocalInput(); return; }

    let profile = null;
    try {
      profile = (await api('/api/user/profile'))?.profile || null;
    } catch {
      return;
    }
    const birth = profile?.birth;
    if (!birth || !profile.name) { openLocalInput(); return; }

    const pad = (value) => String(value).padStart(2, '0');
    const stored = {
      name: profile.name,
      gender: birth.gender === 'female' ? 'female' : 'male',
      birthDate: `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`,
      birthTime: profile.birthTimeKnown !== false && Number.isInteger(birth.hour) && birth.hour >= 0 && birth.hour <= 23 && Number.isInteger(birth.minute ?? 0) && (birth.minute ?? 0) >= 0 && (birth.minute ?? 0) <= 59 ? `${pad(birth.hour)}:${pad(birth.minute ?? 0)}` : '',
      birthTimeKnown: profile.birthTimeKnown !== false,
      calendarType: birth.calendar === 'lunar' ? 'lunar' : 'solar',
      birthPlace: '',
      profileId: 'account',
    };
    writeJson('sessionStorage', STORAGE.profile, stored);
    window.dispatchEvent(new CustomEvent('umsh-jobchoice-account-profile', { detail: { profile: stored } }));

    // The input page owns the single saved-profile status block and its
    // "새 사주로 보기" state. Do not insert a second account-profile card here.
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

  /** 02 가 이 탭에 남긴 사주(비회원 입력)를 분석 요청의 birth 로 바꾼다. 없거나 모자라면 null. */
  function buildLocalBirth() {
    const stored = readJson('sessionStorage', STORAGE.profile);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stored?.birthDate || '');
    if (!match || !stored.name) return null;
    const known = stored.birthTimeKnown !== false;
    const time = /^(\d{2}):(\d{2})$/.exec(stored.birthTime || '');
    if (known && !time) return null;
    return {
      name: stored.name,
      birthTimeKnown: known,
      birth: {
        year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
        ...(known ? { hour: Number(time[1]), minute: Number(time[2]) } : {}),
        gender: stored.gender === 'female' ? 'female' : 'male',
        calendar: stored.calendarType === 'lunar' ? 'lunar' : 'solar',
      },
    };
  }

  /** 가입 직후에는 계정에 사주가 없다. 비회원으로 입력해 둔 사주를 계정에 저장한다. */
  async function saveLocalProfileToAccount() {
    const local = buildLocalBirth();
    if (!local) return false;
    try {
      await api('/api/user/profile', { method: 'PUT', body: JSON.stringify({ ...local, context: {} }) });
      return true;
    } catch {
      return false;
    }
  }

  /** 비회원 티저 요청. 서버는 아무것도 저장하지 않고 앞 두 항목과 목차만 돌려준다. */
  async function loadGuestTeaser(request) {
    const local = buildLocalBirth();
    if (!local) return { reason: 'input' };
    try {
      const response = await api('/api/work/job-choice/analyze', {
        method: 'POST',
        body: JSON.stringify({ ...request, ...local, preview: true, guestTeaser: true }),
      });
      const accepted = window.UMSHReportAccess?.acceptAnalyze?.(response);
      return accepted?.preview ? { ...accepted, guest: true } : { reason: 'error' };
    } catch (error) {
      // 입력이 틀린 경우(400)는 입력 화면으로 되돌리고 서버 문구를 그대로 보여 준다.
      if (error.status === 400) return { reason: 'input', message: error.message };
      return { reason: 'error', message: error.message };
    }
  }

  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'input', 'login', 'profile', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const linked = await window.UMSHReportAccess?.loadLinkedReport?.();
      if (linked?.report?.sections?.length) return linked;
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length && !window.UMSHReportAccess) return { report: cached };

      const request = buildRequest();
      if (!request) return { reason: 'input' };

      const teaserPage = /\/04-step-4-report\//.test(location.pathname);
      const session = await initAuth();
      if (!session) {
        // 04 티저는 가입 없이 연다. 05·06 은 결제한 계정의 화면이라 그대로 로그인을 요구한다.
        if (teaserPage) return loadGuestTeaser(request);
        reportPromise = null;
        return { reason: 'login' };
      }

      try {
        const analyze = () => api('/api/work/job-choice/analyze', {
          method: 'POST',
          body: JSON.stringify(teaserPage ? { ...request, preview: true } : request),
        });
        let response;
        try {
          response = await analyze();
        } catch (error) {
          // 가입 직후: 계정에 사주가 없으면 비회원으로 입력해 둔 사주를 저장하고 한 번만 다시 요청한다.
          if (!(teaserPage && error.code === 'PROFILE_REQUIRED' && await saveLocalProfileToAccount())) throw error;
          response = await analyze();
        }
        if (teaserPage) window.UMSHReportAccess?.remember?.(response);
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
        if (error.code === 'PROFILE_REQUIRED') return { reason: 'profile' };
        if (error.code === 'FREE_PREVIEW_LIMIT') return { reason: 'limit', paymentUrl: error.paymentUrl, freeSearch: error.freeSearch };
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
    limit: '무료 결과 조회 5회를 모두 사용했습니다. 전체 해석 보기를 결제해 주세요.',
  };

  function showFreeSearchCount(quota) {
    const retry = document.getElementById('retryButton');
    if (!retry || !quota || !Number.isInteger(quota.used) || quota.limit !== 5) return;
    const used = Math.min(5, Math.max(0, quota.used));
    retry.textContent = used >= 5 ? '무료 재검색 5/5회 사용' : `다시 검색하기 · ${used}/5회 사용`;
    retry.disabled = used >= 5;
    let count = document.getElementById('jobChoiceFreeSearchCount');
    if (!count) {
      count = document.createElement('p');
      count.id = 'jobChoiceFreeSearchCount';
      count.className = 'fineprint';
      retry.parentNode.insertBefore(count, retry.nextSibling);
    }
    count.textContent = used >= 5
      ? '무료 결과 조회 5회를 모두 사용했습니다. 전체 해석 보기를 결제해 주세요.'
      : `무료 결과 조회 ${used}/5회 사용 · ${5 - used}회 남음`;
  }

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
    if (outcome.preview) {
      if (outcome.payload?.teaserSections?.length === 2) {
        window.UMSHReportAccess?.showPreview?.(outcome.payload, buildRequest());
      }
      window.UMSHReportAccess?.paintTeaserPreview?.(outcome.preview);
      showFreeSearchCount(outcome.payload?.freeSearch);
      if (outcome.guest) {
        // 공용 스크립트가 그리는 결제 링크도 비회원이면 결제 대신 가입으로 보낸다.
        document.addEventListener('click', (event) => {
          if (!event.target.closest?.('.umsh-preview-checkout, #umsh-preview-checkout')) return;
          event.preventDefault();
          writeJson('sessionStorage', STORAGE.purchaseAfterAuth, '1');
          location.assign(loginUrl());
        }, true);
      }
      const pay = document.getElementById('payButton');
      if (pay) {
        const fresh = pay.cloneNode(true);
        pay.replaceWith(fresh);
        if (window.UMSHReportAccess?.isEntitled?.(outcome)) {
          fresh.textContent = '전체 목차 열기';
          fresh.addEventListener('click', () => {
            location.assign(window.UMSHReportAccess?.tocHref?.(outcome.payload?.reportId) || '../05-step-5-chat/chat.html#step-5-chat');
          });
        } else {
          fresh.textContent = `전체 보기 (${SERVICE.price})`;
          fresh.addEventListener('click', () => {
            if (outcome.guest) {
              // 가입은 여기서 받는다. 돌아오면 아래 purchase-after-auth 로 결제까지 이어 준다.
              writeJson('sessionStorage', STORAGE.purchaseAfterAuth, '1');
              location.assign(loginUrl());
              return;
            }
            location.assign(outcome.paymentUrl || `/payment?service=${SERVICE.apiKey}`);
          });
          // 가입 전 티저에서 결제 버튼을 눌러 가입한 사람은 다시 누르게 하지 않고 결제로 보낸다.
          if (!outcome.guest && readJson('sessionStorage', STORAGE.purchaseAfterAuth)) {
            try { window.sessionStorage.removeItem(STORAGE.purchaseAfterAuth); } catch { /* 저장소가 막혀 있으면 버튼을 한 번 더 누르면 된다. */ }
            location.assign(outcome.paymentUrl || `/payment?service=${SERVICE.apiKey}`);
          }
        }
      }
      return;
    }
    if (outcome.report) {
      if (!hadCache && !window.UMSHReportAccess) location.reload();
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
    copy.textContent = ((reason === 'input' || reason === 'error') && outcome.message) || GATE_COPY[reason] || GATE_COPY.error;
    const action = document.createElement('a');
    action.className = 'link-button';
    if (reason === 'login') {
      action.textContent = `로그인하고 전체 보기 (${SERVICE.price})`;
      action.href = loginUrl();
    } else if (reason === 'profile') {
      action.textContent = '내 사주 등록하기';
      action.href = `/profile?returnTo=${encodeURIComponent(location.pathname)}`;
    } else if (reason === 'payment' || reason === 'limit') {
      action.textContent = `전체 보기 (${SERVICE.price})`;
      action.href = outcome.paymentUrl || `/payment?service=${SERVICE.apiKey}`;
    } else if (reason === 'input') {
      action.textContent = '입력하러 가기';
      action.href = '/work/job-choice/02-step-2-saju-input/index.html#step-2-saju-input';
    } else {
      action.textContent = '다시 시도하기';
      action.href = location.href;
    }
    notice.append(eyebrow, heading, copy, action);
    stage.replaceChildren(notice);

    // The sample signal bodies must not stay on screen as if they were personal.
    document.querySelectorAll('.signal-item span').forEach((node) => {
      node.textContent = '아직 계산 전입니다. 위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.';
    });
  }

  // ------------------------------------------------------- steps 05 / 06_1
  function paragraphs(section) {
    return String(section?.interpretation || '')
      .split('\n\n')
      .map((text) => text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim())
      .filter(Boolean);
  }

  function escapeReading(value) {
    return window.JobChoice?.escapeHtml
      ? window.JobChoice.escapeHtml(value)
      : String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[char]));
  }

  /**
   * 스토어는 파싱 시점에 시안 해석을 비운다. 서버 리포트가 오면 상세 칸에만 실제 본문을 넣는다.
   */
  async function enhanceDetail() {
    const stage = document.getElementById('detailStage');
    if (!stage) return;
    const outcome = await loadReport();
    if (!outcome.report) return;
    if (typeof window.JobChoice?.markPaid === 'function') window.JobChoice.markPaid();
    const wanted = new URLSearchParams(location.search).get('section');
    const section = outcome.report.sections.find((item) => item.id === wanted) || outcome.report.sections[0];
    if (!section) return;
    const parts = paragraphs(section);
    const esc = escapeReading;
    stage.innerHTML = `
      <section class="hero-panel detail-hero">
        <span class="kicker">06_1 · ${esc(section.category)}</span>
        <h1>${esc(section.classification)}</h1>
        <p>${esc(parts[0] || '')}</p>
      </section>
      ${parts.slice(1).map((paragraph) => `
        <section class="detail-section">
          <p>${esc(paragraph)}</p>
        </section>
      `).join('')}
    `;
    window.UMSHReportAccess?.markFilled?.(stage);
  }

  function init() {
    if (inputLocalePrefix) { enhanceSajuInput(); return; }
    mountChrome();
    enhanceSajuInput();
    enhanceTeaser();
    enhanceDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
