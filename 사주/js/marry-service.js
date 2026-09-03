/**
 * Bridges the 결혼궁합 design pages (01 → 02 → 04 → 05 → 06_1) to the real service.
 *
 * The design HTML ships with sample copy and a mock payment state machine so it can be
 * reviewed standalone. This file leaves that markup untouched and swaps in the live pieces:
 *   02 — reuses the saju already on the account instead of asking for it a second time
 *   04 — replaces the sample teaser with the first paragraphs of the real RAG report
 *   05 — replaces every 중분류 preview with that section's own opening line
 *   06 — replaces the detail panels with the section's full RAG interpretation
 *
 * Everything reads from POST /api/match/marry/analyze, which computes the 사주 server side
 * and grounds each section in the KMS corpus, so no reading is ever invented in the browser.
 */
(() => {
  if (!/^\/match\/marry(?:\/|$)/.test(window.location.pathname)) return;

  const SERVICE = {
    apiKey: 'marry_match',
    designKey: 'marriage_compatibility',
    slug: 'marry',
    title: '연애 말고 결혼까지 가능?',
    price: 24900,
  };

  // The design pages read and write these; we fill them so their own renderers unlock.
  const STORAGE = {
    profile: 'cheongi_user_birth_profile_v1',
    input: 'umsh_marry_input_payload',
    report: 'umsh_marry_report_v1',
    reportContext: 'umsh_marry_report_context',
    accessState: 'umsh_marry_access_state',
    generationState: 'umsh_marry_generation_state',
    networkState: 'umsh_marry_network_state',
  };

  const RELATION_LABEL = {
    talking: '썸 타는 중',
    dating: '연애 중',
    reunion: '재회 고민',
    family_meeting: '상견례 전',
    wedding_prep: '결혼 준비 중',
  };

  const FOCUS_LABEL = {
    marriage_signal: '결혼각을 먼저 보고 싶음',
    timing: '타이밍을 먼저 보고 싶음',
    red_flags: '레드플래그를 먼저 보고 싶음',
    daily_life: '생활궁합을 먼저 보고 싶음',
    conversation: '대화 액션을 먼저 보고 싶음',
  };

  const pad2 = (value) => String(value).padStart(2, '0');
  const $ = (selector, root = document) => root.querySelector(selector);

  // umsh-chrome.js auto-mounts against `main.stage, .stage, main`. On step 02 the top bar
  // sits outside <main>, so the auto-mount would insert a second app bar mid-page instead of
  // replacing the design's. Stand it down here and mount explicitly against `.phone` below.
  // This runs before DOMContentLoaded because the tag is deferred, which is when it listens.
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

  function firstParagraph(text) {
    return String(text || '').split('\n\n')[0] || '';
  }

  /**
   * A reading's opening paragraph is bookkeeping — the 문 label, the item title and the two
   * 일지 being compared. The teaser and the list previews want the sentence that actually says
   * something, so skip that paragraph and drop the [주요 포인트] / [해법] section markers.
   */
  function readingLine(section, preferred = 2) {
    const paragraphs = String(section?.interpretation || '').split('\n\n').filter(Boolean);
    const chosen = paragraphs[preferred] || paragraphs[1] || paragraphs[0] || '';
    return chosen.replace(/^\[[^\]]{1,12}\]\s*/, '').trim();
  }

  function clamp(text, limit) {
    const value = String(text || '').trim();
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  }

  // ------------------------------------------------------------------ chrome
  /**
   * The design's own top bar carries the class `appbar`, so UMSHChrome swaps it for the
   * shared logo + GNB and appends the fixed bottom nav. Mounting against `.phone` matters:
   * on step 02 the bar sits outside <main>, which the auto-mount selector would miss.
   */
  function mountChrome() {
    if (!window.UMSHChrome) return;
    const host = $('.phone');
    document.body.dataset.umshChrome = 'off';
    window.UMSHChrome.mount({
      root: '.phone',
      service: host?.dataset.service || '결혼궁합',
      price: host?.dataset.price || '24,900원',
      active: host?.dataset.active || 'home',
    });
    const back = $('.umsh-chrome-appbar [data-back]');
    if (back) {
      back.addEventListener('click', () => {
        if (window.history.length > 1) window.history.back();
        else window.location.assign('/match/marry/01-step-1-story/index.html');
      });
    }
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
    return window.UMSHCommonAuth?.commonLoginUrl('match-marry', returnTo)
      || `/signup?entry=match-marry&returnTo=${encodeURIComponent(returnTo)}#login`;
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
  /** The saju the account already holds, so step 02 never asks for it twice. */
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
  async function enhanceSajuInput() {
    const form = $('#marry-input-form');
    if (!form) return;
    const selfFields = $('#self-fields');
    const savedRadio = form.querySelector('input[name="self_profile_mode"][value="saved"]');
    const newRadio = form.querySelector('input[name="self_profile_mode"][value="new"]');
    if (!selfFields || !savedRadio || !newRadio) return;

    const profile = await loadSavedProfile();
    if (!profile) {
      // Nothing on file yet: asking once is the only way to get the 사주, so open the fields.
      newRadio.checked = true;
      newRadio.dispatchEvent(new Event('change', { bubbles: true }));
      const help = $('#self-mode-help');
      if (help) help.textContent = '아직 저장된 사주가 없어 이번 한 번만 입력하면, 다음부터는 다시 묻지 않습니다.';
      return;
    }

    savedRadio.checked = true;
    savedRadio.dispatchEvent(new Event('change', { bubbles: true }));

    const card = document.createElement('div');
    card.className = 'marry-saved-profile';
    card.innerHTML = '<b>저장된 사주로 진행합니다</b><span></span><button type="button" data-edit-profile>다른 정보로 입력하기</button>';
    card.querySelector('span').textContent = `${profileLabel(profile)} 기준으로 배우자궁과 대운을 봅니다. 이름·생년월일·태어난 시는 다시 입력하지 않아도 됩니다.`;
    selfFields.parentElement.insertBefore(card, selfFields);

    card.querySelector('[data-edit-profile]').addEventListener('click', () => {
      newRadio.checked = true;
      newRadio.dispatchEvent(new Event('change', { bubbles: true }));
      card.remove();
      // Prefill so "다른 정보" starts from what we know rather than an empty form.
      const set = (name, value) => {
        const node = form.elements[name];
        if (node && value) node.value = value;
      };
      set('self_name', profile.name);
      set('self_gender', profile.gender);
      set('self_birth_date', `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`);
      set('self_calendar', profile.calendar);
      if (profile.birthTimeKnown) {
        const known = form.querySelector('input[name="self_birth_time_known"][value="known"]');
        if (known) {
          known.checked = true;
          known.dispatchEvent(new Event('change', { bubbles: true }));
        }
        set('self_birth_time', `${pad2(profile.hour)}:${pad2(profile.minute)}`);
      }
      form.elements.self_name?.focus();
    });
  }

  // ------------------------------------------------------- report retrieval
  function buildRequest(payload) {
    const partner = payload?.partner || {};
    if (!partner.known || !partner.birth_date) return null;
    const relation = payload.relationship_context || {};
    return {
      partnerName: partner.name || '',
      partnerBirthText: String(partner.birth_date).replace(/[^0-9]/g, ''),
      partnerBirth: {
        gender: partner.gender === 'female' ? 'female' : 'male',
        calendar: partner.calendar === 'lunar' ? 'lunar' : 'solar',
      },
      partnerBirthTimeKnown: partner.birth_time_known === 'known',
      relationshipStage: RELATION_LABEL[relation.relationship_status] || '',
      marriagePlan: FOCUS_LABEL[relation.question_focus] || '',
      concern: relation.main_concern || '',
    };
  }

  /** Push the self saju the visitor typed in step 02 up to the account before analysing. */
  async function syncSelfProfile(payload) {
    const self = payload?.self;
    if (!self || self.use_saved_profile || !self.birth_date || !self.name) return;
    const [year, month, day] = String(self.birth_date).split('-').map(Number);
    const [hour, minute] = String(self.birth_time || '').split(':').map(Number);
    const birthTimeKnown = self.birth_time_known === 'known' && Number.isFinite(hour);
    await api('/api/user/profile', {
      method: 'POST',
      body: JSON.stringify({
        name: self.name,
        birthTimeKnown,
        birth: {
          year,
          month,
          day,
          hour: birthTimeKnown ? hour : 12,
          minute: Number.isFinite(minute) ? minute : 0,
          gender: self.gender === 'female' ? 'female' : 'male',
          calendar: self.calendar === 'lunar' ? 'lunar' : 'solar',
        },
      }),
    }).catch(() => undefined);
  }

  let reportPromise = null;

  function cachedReport() {
    const cached = readJson('sessionStorage', STORAGE.report);
    return cached?.sections?.length ? cached : null;
  }

  /**
   * Resolves to { report } on success, or { reason } describing why nothing can be shown:
   * 'input' (step 02 not done), 'partner' (no partner birth date), 'login', 'payment', 'error'.
   */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = cachedReport();
      if (cached) return { report: cached };

      const payload = readJson('sessionStorage', STORAGE.input);
      if (!payload || payload.service_slug !== SERVICE.slug) return { reason: 'input' };

      const request = buildRequest(payload);
      if (!request) return { reason: 'partner' };

      const session = await initAuth();
      if (!session) return { reason: 'login' };

      try {
        await syncSelfProfile(payload);
        const response = await api('/api/match/marry/analyze', { method: 'POST', body: JSON.stringify(request) });
        const report = response.report || response;
        if (!report?.sections?.length) return { reason: 'error' };
        writeJson('sessionStorage', STORAGE.report, report);
        writeJson('sessionStorage', STORAGE.reportContext, {
          service_key: SERVICE.designKey,
          service_slug: SERVICE.slug,
          service_title: SERVICE.title,
          report_id: report.reportId || response.reportId || '',
          price_krw: SERVICE.price,
        });
        if (storageAvailable('sessionStorage')) {
          sessionStorage.setItem(STORAGE.accessState, 'entitled');
          sessionStorage.removeItem(STORAGE.generationState);
          sessionStorage.removeItem(STORAGE.networkState);
        }
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

  /** Come back from the PG with ?paid=1&orderId=... and finish the reading. */
  async function resumeAfterPayment() {
    const params = new URLSearchParams(location.search);
    if (params.get('paid') !== '1') return false;
    const orderId = params.get('orderId');
    const pending = window.UMSHPaymentBridge?.load(SERVICE.apiKey);
    if (!orderId || !pending) return false;
    const session = await initAuth();
    if (!session) return false;
    try {
      const response = await api('/api/match/marry/analyze', {
        method: 'POST',
        body: JSON.stringify({ ...pending.payload, orderId }),
      });
      const report = response.report || response;
      if (!report?.sections?.length) return false;
      writeJson('sessionStorage', STORAGE.report, report);
      writeJson('sessionStorage', STORAGE.reportContext, {
        service_key: SERVICE.designKey,
        service_slug: SERVICE.slug,
        service_title: SERVICE.title,
        report_id: report.reportId || response.reportId || '',
        price_krw: SERVICE.price,
      });
      if (storageAvailable('sessionStorage')) sessionStorage.setItem(STORAGE.accessState, 'entitled');
      window.UMSHPaymentBridge?.clear();
      await api(`/api/payment/orders/${encodeURIComponent(orderId)}/viewed`, { method: 'POST' }).catch(() => {});
      history.replaceState(null, '', location.pathname);
      reportPromise = Promise.resolve({ report });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------- step 04
  const STEP_04_MESSAGES = {
    input: '이전 입력을 찾지 못했습니다. 두 사람 정보를 다시 입력하면 같은 결혼궁합으로 이어집니다.',
    partner: '상대 생년월일이 없어 두 사람의 궁합 계산을 아직 열지 못했습니다. 상대 정보를 채우면 배우자궁·합충까지 함께 봅니다.',
    login: '로그인하면 저장된 내 사주와 상대 정보로 풀이를 계산합니다. 지금 화면의 문장은 예시입니다.',
    payment: '결제가 확인되면 10개 대분류 70개 항목이 모두 열립니다.',
    error: '풀이를 계산하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  };

  async function enhanceTeaser() {
    const root = $('#step-4-report');
    if (!root) return;

    await resumeAfterPayment();
    const outcome = await loadReport();

    // The design ships a mock payment state machine on these buttons; the real flow
    // replaces them so a visitor can never "pay" client-side.
    const primary = $('#primary-action');
    const secondary = $('#secondary-action');
    const stateCopy = $('#state-copy');
    const message = $('#state-message');
    const agreeWrap = $('#payment-agree-wrap');
    const replace = (node) => {
      if (!node) return null;
      const clone = node.cloneNode(true);
      node.replaceWith(clone);
      return clone;
    };
    const nextPrimary = replace(primary);
    const nextSecondary = replace(secondary);
    if (agreeWrap) agreeWrap.style.display = 'none';

    if (nextSecondary) {
      nextSecondary.style.display = 'inline-flex';
      nextSecondary.textContent = '입력 수정하기';
      nextSecondary.addEventListener('click', () => {
        location.assign('../02-step-2-saju-input/index.html#step-2-saju-input');
      });
    }

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      clearSampleTeaser(STEP_04_MESSAGES[reason] || STEP_04_MESSAGES.error);
      if (stateCopy) stateCopy.textContent = STEP_04_MESSAGES[reason] || STEP_04_MESSAGES.error;
      if (message) message.textContent = outcome.message || '';
      const notice = $('#expired-notice');
      if (notice && (reason === 'input' || reason === 'partner')) notice.classList.add('is-visible');
      if (nextPrimary) {
        if (reason === 'login') {
          nextPrimary.textContent = '로그인하고 내 풀이 보기';
          nextPrimary.addEventListener('click', () => location.assign(loginUrl()));
        } else if (reason === 'payment') {
          nextPrimary.textContent = '24,900원 결제하고 전체 목차 열기';
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

    renderTeaser(outcome.report);
    if (stateCopy) stateCopy.textContent = '권한 확인이 끝났습니다. 10개 대분류 70개 항목을 목록에서 하나씩 열어볼 수 있습니다.';
    if (message) message.textContent = '결혼각, 타이밍, 레드플래그, 액션 문장까지 이어서 볼 수 있습니다.';
    if (nextPrimary) {
      nextPrimary.textContent = '전체 리포트 목록 열기';
      nextPrimary.addEventListener('click', () => {
        location.assign('../05-step-5-chat/chat.html#step-5-chat');
      });
    }
  }

  /**
   * The design's teaser cards read like a personal verdict. Until the real reading exists
   * they must not stay on screen, or a visitor would take sample sentences as their own result.
   */
  function clearSampleTeaser(reason) {
    const summary = $('#hero-summary');
    if (summary) summary.textContent = reason;
    document.querySelectorAll('.teaser-grid .mini-card span').forEach((node) => {
      node.textContent = '아직 계산 전입니다. 위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.';
    });
    const signalMain = $('#signal-main');
    if (signalMain) signalMain.textContent = '아직 계산 전입니다. 위 안내를 마치면 이 자리에 내 사주 기준 풀이가 들어옵니다.';
    [['#person-chip', '계산 대기'], ['#partner-chip', '10개 대분류'], ['#focus-chip', '70개 항목']].forEach(([selector, text]) => {
      const node = $(selector);
      if (node) node.textContent = text;
    });
  }

  /** The free teaser: the opening line of three representative sections, nothing more. */
  function renderTeaser(report) {
    const find = (id) => report.sections.find((section) => section.id === id);
    const verdict = find('marry-04-01') || report.sections[0];
    const timing = find('marry-05-01') || report.sections[1] || verdict;
    const flag = find('marry-06-01') || report.sections[2] || verdict;

    const summary = $('#hero-summary');
    if (summary) summary.textContent = clamp(readingLine(verdict), 150);

    // 강한 신호 = the group's own angle, 시기 조건 = the 대운·세운 paragraph,
    // 방해 요인 = the closing action line of the 레드플래그 group.
    const cards = document.querySelectorAll('.teaser-grid .mini-card');
    [[verdict, '강한 신호', 2], [timing, '시기 조건', 3], [flag, '방해 요인', 5]].forEach(([section, label, index], slot) => {
      const card = cards[slot];
      if (!card || !section) return;
      const title = card.querySelector('b');
      const body = card.querySelector('span');
      if (title) title.textContent = label;
      if (body) body.textContent = clamp(readingLine(section, index), 110);
    });

    // The "여기까지 봅니다" list mirrors the real 대분류 titles rather than sample copy.
    const signals = document.querySelectorAll('.signal-list li');
    const groups = groupOrder(report);
    signals.forEach((item, index) => {
      const group = groups[index];
      if (!group) return;
      const title = item.querySelector('strong');
      const body = item.querySelector('span');
      if (title) title.textContent = group.title;
      if (body) body.textContent = clamp(readingLine(group.sections[0]), 90);
    });

    const chips = [
      ['#person-chip', report.subtitle ? clamp(report.subtitle, 22) : '내 사주 기준'],
      ['#partner-chip', `${groups.length}개 대분류`],
      ['#focus-chip', `${report.sections.length}개 항목`],
    ];
    chips.forEach(([selector, text]) => {
      const node = $(selector);
      if (node) node.textContent = text;
    });
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
    if (!outcome.report) {
      showListGate(outcome.reason || 'error');
      return;
    }
    const byId = new Map(outcome.report.sections.map((section) => [section.id, section]));

    // The design renders the list itself and re-renders on search/filter, so keep the
    // real copy applied whenever it repaints instead of only once at load.
    const list = $('#group-list');
    if (!list) return;
    // Item previews stay as written: every 중분류 has its own line, while the report's
    // paragraphs for items inside one 대분류 open the same way and would repeat six times
    // in a row. The group summary is where the personalised reading belongs.
    const byCategory = new Map();
    outcome.report.sections.forEach((section) => {
      if (!byCategory.has(section.category)) byCategory.set(section.category, section);
    });

    const apply = () => {
      list.querySelectorAll('[data-section-id]').forEach((link) => {
        if (!byId.has(link.dataset.sectionId)) return;
        link.classList.remove('is-locked');
        link.setAttribute('aria-disabled', 'false');
      });
      list.querySelectorAll('.result-card').forEach((card) => {
        const title = card.querySelector('.cover-copy h3')?.textContent?.trim();
        const section = title ? byCategory.get(title) : null;
        const summary = card.querySelector('.group-summary');
        if (section && summary) summary.textContent = clamp(readingLine(section), 130);
      });
    };
    apply();
    new MutationObserver(apply).observe(list, { childList: true, subtree: false });
  }

  function showListGate(reason) {
    const notice = $('#access-notice');
    if (!notice) return;
    const title = $('#notice-title');
    const copy = $('#notice-copy');
    const actions = $('#notice-actions');
    if (title) title.textContent = reason === 'login' ? '로그인이 필요합니다' : '리포트를 먼저 만들어 주세요';
    if (copy) copy.textContent = STEP_04_MESSAGES[reason] || STEP_04_MESSAGES.error;
    if (actions) {
      actions.innerHTML = '';
      const link = document.createElement('a');
      link.className = 'notice-action';
      if (reason === 'login') {
        link.textContent = '로그인하고 결과 보기';
        link.href = loginUrl();
      } else {
        link.textContent = '입력 화면으로 이동';
        link.href = '../02-step-2-saju-input/index.html#step-2-saju-input';
      }
      actions.appendChild(link);
    }
  }

  // ------------------------------------------------------------- step 06_1
  async function enhanceDetail() {
    const root = $('#step-6_1-report');
    if (!root) return;
    const outcome = await loadReport();
    if (!outcome.report) return;

    const detail = $('#detail-root');
    if (!detail) return;

    const apply = () => {
      const wanted = new URLSearchParams(location.search).get('section');
      const section = outcome.report.sections.find((item) => item.id === wanted) || outcome.report.sections[0];
      if (!section || detail.dataset.marryApplied === section.id) return;

      const paragraphs = String(section.interpretation || '')
        .split('\n\n')
        .map((text) => text.replace(/^\[[^\]]{1,12}\]\s*/, '').trim())
        .filter(Boolean);
      if (paragraphs.length < 2) return;

      // The reading opens on bookkeeping — which 문, which item, which two 일지 are compared.
      // The panel headed 한 줄 결론 wants the verdict, so lead with the paragraph that states
      // the angle and let the bookkeeping line close out the supporting paragraphs.
      // The template writes the same six roles for every section, so each one lands under
      // the design heading that matches it instead of being poured in sequentially.
      const [ledger, palace, angle, timing, evidence, action] = paragraphs;
      const conclusion = angle || palace || ledger;
      const supporting = [palace, evidence, action, ledger].filter((text) => text && text !== conclusion);

      // Drop a panel left from the previous section before counting the design's own slots.
      detail.querySelector('[data-marry-full]')?.remove();
      const bodies = detail.querySelectorAll('.body-copy');
      const fill = (node, texts) => {
        if (!node) return;
        node.innerHTML = '';
        texts.filter(Boolean).forEach((text) => {
          const p = document.createElement('p');
          p.textContent = text;
          node.appendChild(p);
        });
      };
      fill(bodies[0], [conclusion]);
      if (timing) fill(bodies[1], [timing]);

      // The rest of the reading has no home in the design's panels, so it gets its own,
      // inserted right after 한 줄 결론 and rebuilt whenever the section changes.
      const anchor = bodies[0]?.closest('.panel');
      if (anchor && supporting.length) {
        const panel = document.createElement('section');
        panel.className = 'panel';
        panel.setAttribute('data-marry-full', '');
        panel.innerHTML = '<div class="panel-head"><h2>풀이 전문</h2><span>배우자궁 · 근거 · 행동</span></div><div class="body-copy"></div>';
        fill(panel.querySelector('.body-copy'), supporting);
        anchor.after(panel);
      }

      const hero = detail.querySelector('.hero-copy p');
      if (hero) hero.textContent = clamp(conclusion, 150);
      const heroImage = detail.querySelector('.hero img');
      if (heroImage && section.imageKey) {
        heroImage.src = `../assets/marry/06-${section.imageKey}-hero.webp`;
        heroImage.alt = `${section.category} 상세 풀이`;
      }
      const accessChip = $('#access-chip');
      if (accessChip) accessChip.textContent = '상세 열림';
      detail.dataset.marryApplied = section.id;
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
