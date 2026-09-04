/**
 * Bridges the 나한테 운 붙는 색과 물건 design pages (01 → 02 → 04 → 05 → 06_1) to the
 * real service.
 *
 * The design HTML ships as a static mock so it can be reviewed standalone. This file
 * leaves that markup alone and swaps in the live pieces:
 *   02 — fills the form from the account so the birth date is never asked twice
 *   04 — replaces the sample teaser with the opening lines of the real RAG report
 *   05 — the group and item copy, patched by lucky-report-store.js
 *   06 — the same report, handed to the page's own renderer
 *
 * Everything reads from POST /api/me/lucky/analyze, which computes 사주 server side and
 * grounds each section in the KMS corpus, so no reading is invented in the browser.
 */
(() => {
  if (!/^\/me\/lucky(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'lucky_color',
    entry: 'me-lucky',
    title: '나한테 운 붙는 색과 물건',
    price: '4,900원',
  };

  const STORAGE = {
    draft: 'umsh:lucky:session_draft',
    report: 'umsh:report:lucky_color',
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
   * A reading opens on bookkeeping — the 대분류, the item title and the 일간·일지 it reads
   * from. Previews want the sentence that says something, so skip that paragraph.
   */
  function readingLine(section, preferred = 1) {
    const parts = paragraphs(section);
    // The grounded paragraph opens by announcing itself, which is fine mid-report and
    // pure noise in a two-line preview row.
    return (parts[preferred] || parts[0] || '').replace(/^이 대목에서 함께 볼 결은 이렇습니다\.\s*/, '');
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

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  /**
   * This service asks for nothing beyond the common saju, and the account already holds
   * it — the analyze endpoint reads it server side either way. So fill the form in and
   * say what is being used rather than making the visitor type it again.
   */
  async function enhanceSajuInput() {
    const form = $('#sajuForm');
    if (!form) return;

    // Whichever way this ends, step 04 should know the visitor came through here.
    form.addEventListener('submit', () => {
      writeJson('sessionStorage', STORAGE.draft, { service_key: 'lucky_color', at: Date.now() });
    });

    const session = await initAuth();
    if (!session) return;

    let profile = null;
    try {
      profile = (await api('/api/user/profile'))?.profile || null;
    } catch {
      return;
    }
    if (!profile?.birth) return;

    const birth = profile.birth;
    if (!form.name.value && profile.name) form.name.value = profile.name;
    if (!form.birth.value) form.birth.value = `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`;
    if (!form.time.value && Number.isFinite(birth.hour)) {
      form.time.value = `${pad(birth.hour)}:${pad(birth.minute || 0)}`;
    }
    if (!form.calendar.value) form.calendar.value = birth.calendar === 'lunar' ? 'lunar' : 'solar';
    if (!form.gender.value && birth.gender) form.gender.value = birth.gender;

    if ($('.lucky-saved-profile')) return;
    const card = document.createElement('section');
    card.className = 'panel lucky-saved-profile';
    const title = document.createElement('p');
    title.innerHTML = `<strong>${profile.name || '내'} 사주로 이어갑니다</strong>`;
    const detail = document.createElement('p');
    detail.className = 'note';
    detail.textContent = `${formatBirth(profile)} — 계정에 저장된 값이라 다시 입력하지 않아도 됩니다. 아래 버튼만 누르면 바로 무료 티저로 넘어갑니다.`;
    const change = document.createElement('a');
    change.href = `/profile?returnTo=${encodeURIComponent(location.pathname)}`;
    change.textContent = '저장된 사주 수정하기';
    card.append(title, detail, change);
    form.insertBefore(card, form.firstChild);

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = '저장된 사주로 무료 결과 보기';
  }

  // ------------------------------------------------------- report retrieval
  let reportPromise = null;

  /** Resolves to { report } or { reason } — 'login', 'profile', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length) return { report: cached };

      const session = await initAuth();
      if (!session) return { reason: 'login' };

      try {
        // The whole request is the account's saju, so there is nothing to collect.
        const response = await api('/api/me/lucky/analyze', { method: 'POST', body: JSON.stringify({}) });
        const report = response.report || response;
        if (!report?.sections?.length) return { reason: 'error' };
        writeJson('sessionStorage', STORAGE.report, report);
        return { report };
      } catch (error) {
        if (error.status === 401 || error.status === 403) return { reason: 'login' };
        if (error.code === 'PAYMENT_REQUIRED') {
          window.UMSHPaymentBridge?.save(SERVICE.apiKey, {}, location.pathname);
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
      const response = await api('/api/me/lucky/analyze', {
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
    login: '로그인하면 계정에 저장된 내 사주로 오행 균형을 계산합니다. 지금 화면의 문장은 예시입니다.',
    profile: '기본 사주 정보를 등록하면 채울 색과 덜어낼 색을 바로 계산합니다.',
    payment: '결제가 확인되면 6개 대분류 24개 항목이 모두 열립니다.',
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
   * The design ships a CTA that walks straight to 05 with no server in the loop.
   * Replace it so the real gate decides where the visitor goes.
   */
  function takeOverCta(label, handler) {
    const cta = $('.cta .button');
    if (!cta) return null;
    const fresh = document.createElement('button');
    fresh.type = 'button';
    fresh.className = cta.className;
    fresh.textContent = label;
    fresh.addEventListener('click', handler);
    cta.replaceWith(fresh);
    return fresh;
  }

  function goReportIndex() {
    location.assign('/me/lucky/05-step-5-chat/index.html#step-5-chat');
  }

  async function enhanceTeaser() {
    if (!$('#step-4-report')) return;

    await resumeAfterPayment();
    const outcome = await loadReport();
    const teaser = $('.teaser');
    const teaserItems = $$('.teaser .item');
    const scopeItems = $$('.scope .item');

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      // The sample verdict must not stay on screen as if it were a personal reading.
      const lead = teaser?.querySelector('p');
      if (lead) lead.textContent = GATE_COPY[reason] || GATE_COPY.error;
      teaserItems.forEach((item) => {
        const body = item.querySelector('p');
        if (body) body.textContent = '아직 계산 전입니다. 위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.';
      });

      if (reason === 'login') {
        takeOverCta('로그인하고 전체 보기', () => location.assign(loginUrl()));
      } else if (reason === 'profile') {
        takeOverCta('내 사주 등록하기', () => {
          location.assign(`/profile?returnTo=${encodeURIComponent(location.pathname)}`);
        });
      } else if (reason === 'payment') {
        takeOverCta(`전체 보기 · ${SERVICE.price}`, () => {
          location.assign(outcome.paymentUrl || `/payment?service=${SERVICE.apiKey}`);
        });
      } else {
        takeOverCta('다시 시도하기', () => location.reload());
      }
      return;
    }

    // Free teaser: the first 대분류 only, and only its opening lines.
    const groups = groupOrder(outcome.report);
    const free = groups[0];
    const lead = teaser?.querySelector('p');
    if (lead) lead.textContent = clamp(readingLine(free.sections[0], 2), 190);

    const headline = $('#step-4-report h1');
    if (headline && outcome.report.subtitle) headline.textContent = outcome.report.subtitle;

    teaserItems.forEach((item, index) => {
      const section = free.sections[index];
      if (!section) return;
      const title = item.querySelector('b');
      const body = item.querySelector('p');
      if (title) title.textContent = section.classification;
      if (body) body.textContent = clamp(readingLine(section, 1), 130);
    });

    // The paid-scope tiles mirror the real 대분류 rather than sample labels.
    scopeItems.forEach((tile, index) => {
      const group = groups[index + 1];
      if (!group) return;
      const title = tile.querySelector('b');
      const body = tile.querySelector('p');
      if (title) title.textContent = group.title;
      if (body) body.textContent = group.sections.map((section) => section.classification).slice(0, 3).join(', ');
    });

    takeOverCta('전체 리포트 목록 보기', goReportIndex);
  }

  // ------------------------------------------------------- steps 05 / 06_1
  /**
   * lucky-report-store.js publishes the report before those pages render, but only when
   * it is already cached. Landing on 05 or 06 directly leaves nothing cached, so fetch
   * it once and reload so the store can do its job.
   */
  async function ensureReportCached() {
    if (!$('#step-5-chat') && !$('#step-6_1-report')) return;
    if (readJson('sessionStorage', STORAGE.report)?.sections?.length) return;
    const outcome = await loadReport();
    if (outcome.report) location.reload();
  }

  function ensurePdfHelper() {
    if (window.UMSHReportPdf) return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/js/umsh-report-pdf.js';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  function bindPdfButton() {
    const host = $('#step-5-chat header') || $('#step-6_1-report header') || $('.phone header');
    if (!host) return;
    let button = $('#btn-pdf');
    if (!button) {
      button = document.createElement('button');
      button.id = 'btn-pdf';
      button.type = 'button';
      button.textContent = 'PDF 다운받기';
      button.style.cssText = 'display:block;margin:12px 0 0;width:100%;min-height:44px;border:1px solid #1f8a70;border-radius:8px;background:#1f8a70;color:#fff;font-weight:800;cursor:pointer';
      host.appendChild(button);
    }
    if (button.dataset.bound === '1') return;
    button.dataset.bound = '1';
    button.addEventListener('click', async () => {
      await ensurePdfHelper();
      const report = readJson('sessionStorage', STORAGE.report);
      if (!window.UMSHReportPdf?.open(report)) {
        button.textContent = '해석이 준비되면 PDF를 받을 수 있습니다';
      }
    });
  }

  function init() {
    mountChrome();
    enhanceSajuInput();
    enhanceTeaser();
    ensureReportCached();
    bindPdfButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
