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
    price: '19,900원',
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

  /**
   * 공용 크롬은 mount 가 잰 스테이지 폭을 --umsh-page-width 로 발행하고, 상단바와 하단
   * 메뉴가 그 폭을 따른다. 이 서비스만 root 를 'body' 로 넘겨서 내용은 430px 프레임인데
   * 크롬만 문서 폭(1265px)으로 늘어났다. 형제 서비스들처럼 프레임에 마운트한다.
   */
  function mountChrome() {
    if (!window.UMSHChrome) return;
    const host = document.querySelector('.app, .page, #step-4-report');
    const root = host?.id ? `#${host.id}` : '.app';
    document.body.dataset.umshChrome = 'off';
    window.UMSHChrome.mount({
      root,
      service: host?.dataset.service || '커플궁합',
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
    return window.UMSHCommonAuth?.commonLoginUrl('match-couple', returnTo)
      || `/signup?entry=match-couple&returnTo=${encodeURIComponent(returnTo)}#login`;
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
      error.freeSearch = payload.freeSearch;
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

  function coupleRequestFromForm(form) {
    const digits = String($('#partnerBirth', form)?.value || '').replace(/\D/g, '');
    const partnerName = String($('#partnerName', form)?.value || '').trim();
    const relationshipStage = String($('#partnerRelation', form)?.value || '').trim();
    const gender = String($('#partnerGender', form)?.value || '').trim();
    const calendar = String($('#partnerCalendar', form)?.value || '').trim();
    const focus = String($('#focus', form)?.value || '').trim();
    const relationshipTemperature = String($('#relationshipTemperature', form)?.value || '').trim();
    const concern = String($('#question', form)?.value || '').trim();
    const privacy = $('#privacyAgree', form)?.checked === true;
    if (digits.length !== 8 || !partnerName || !relationshipStage || !gender || !calendar || !focus || !privacy) return null;
    const timeUnknown = $('#partnerTimeUnknown', form)?.checked === true;
    const time = String($('#partnerTime', form)?.value || '');
    const parts = time.split(':').map(Number);
    if (!timeUnknown && (!/^\d{2}:\d{2}$/.test(time) || !Number.isInteger(parts[0]) || parts[0] < 0 || parts[0] > 23 || !Number.isInteger(parts[1]) || parts[1] < 0 || parts[1] > 59)) return null;
    const manualSelf = $('#modeManual', form)?.checked === true;
    const selfDigits = String($('#selfBirth', form)?.value || '').replace(/\D/g, '');
    const selfTimeUnknown = $('#selfTimeUnknown', form)?.checked === true;
    const selfTime = String($('#selfTime', form)?.value || '');
    const selfParts = selfTime.split(':').map(Number);
    if (manualSelf && (selfDigits.length !== 8 || !String($('#selfName', form)?.value || '').trim() || !String($('#selfGender', form)?.value || '') || (!selfTimeUnknown && !/^\d{2}:\d{2}$/.test(selfTime)))) return null;
    return {
      ...(manualSelf ? {
        selfName: String($('#selfName', form)?.value || '').trim(),
        selfBirth: {
          year: Number(selfDigits.slice(0, 4)), month: Number(selfDigits.slice(4, 6)), day: Number(selfDigits.slice(6, 8)),
          hour: selfTimeUnknown ? 12 : selfParts[0], minute: selfTimeUnknown ? 0 : selfParts[1],
          gender: $('#selfGender', form)?.value === 'female' ? 'female' : 'male',
          calendar: $('#selfCalendar', form)?.value === 'lunar' ? 'lunar' : 'solar',
        },
        selfBirthTimeKnown: !selfTimeUnknown,
      } : {}),
      partnerName,
      partnerBirthText: digits,
      partnerBirth: {
        gender: gender === 'female' ? 'female' : 'male',
        calendar: calendar === 'lunar' ? 'lunar' : 'solar',
        ...(timeUnknown ? {} : { hour: Number.isFinite(parts[0]) ? parts[0] : 12, minute: Number.isFinite(parts[1]) ? parts[1] : 0 }),
      },
      partnerBirthTimeKnown: !timeUnknown,
      relationshipStage,
      focus,
      relationshipTemperature,
      concern,
      preview: true,
    };
  }

  function teaserUrl(reportId) {
    const url = new URL('../04-step-4-report/index.html', location.href);
    if (reportId) url.searchParams.set('reportId', reportId);
    url.hash = 'step-4-report';
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function setupStep2Preview() {
    const form = $('#coupleForm');
    if (!form || form.dataset.livePreviewBound === '1') return;
    form.dataset.livePreviewBound = '1';
    form.addEventListener('submit', async (event) => {
      const request = coupleRequestFromForm(form);
      if (!request) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const button = $('button[type="submit"]', form);
      const status = $('#formStatus', form);
      const loading = $('#loadingPanel');
      if (button) button.disabled = true;
      if (status) status.textContent = '두 사람의 실제 입력과 사주로 무료 해석을 준비하고 있습니다.';
      if (loading) {
        loading.classList.add('is-visible');
        loading.setAttribute('aria-hidden', 'false');
        loading.setAttribute('data-umsh-step', '03-loading');
      }
      try {
        const session = await initAuth();
        if (!session) throw new Error('로그인 후 저장된 사주로 무료 해석을 볼 수 있습니다.');
        const response = await api('/api/match/couple/analyze', { method: 'POST', body: JSON.stringify(request) });
        const reportId = response.reportId || response.resultId || response.report?.reportId || '';
        const cachedInput = {
          subjects: {
            ...(request.selfBirth ? { self: {
              source: 'manual', display_name: request.selfName,
              birth: { ...request.selfBirth, birthTimeKnown: request.selfBirthTimeKnown },
            } } : {}),
            partner: {
            name: request.partnerName,
            display_name: request.partnerName,
            relationship_to_user: request.relationshipStage,
            birth_date: request.partnerBirthText,
            birth: { ...request.partnerBirth, birthTimeKnown: request.partnerBirthTimeKnown },
          } },
          context: {
            focus: request.focus,
            relationship_temperature: request.relationshipTemperature,
            current_question: request.concern,
          },
        };
        writeJson('sessionStorage', STORAGE.input, cachedInput);
        location.assign(teaserUrl(reportId));
      } catch (error) {
        if (loading) {
          loading.classList.remove('is-visible');
          loading.setAttribute('aria-hidden', 'true');
        }
        if (button) button.disabled = false;
        if (status) status.textContent = error?.message || '무료 해석을 준비하지 못했습니다. 잠시 후 다시 눌러 주세요.';
      }
    }, true);
  }

  // ------------------------------------------------------- report retrieval
  function buildRequest(payload) {
    const partner = payload?.subjects?.partner || payload?.partner || payload?.context?.partner || {};
    const partnerBirth = partner.birth || {};
    const birth = String(partner.birth_date || partner.birthDate || `${partnerBirth.year || ''}${pad2(partnerBirth.month || '')}${pad2(partnerBirth.day || '')}`).replace(/[^0-9]/g, '');
    if (birth.length !== 8) return null;
    const context = payload?.context || {};
    const self = payload?.subjects?.self || {};
    const selfBirth = self.birth || {};
    return {
      ...(self.source === 'manual' ? {
        selfName: self.display_name || '',
        selfBirth,
        selfBirthTimeKnown: selfBirth.birthTimeKnown !== false,
      } : {}),
      partnerName: partner.name || '',
      partnerBirthText: birth,
      partnerBirth: {
        gender: (partner.gender || partnerBirth.gender) === 'female' ? 'female' : 'male',
        calendar: (partner.calendar || partnerBirth.calendar) === 'lunar' ? 'lunar' : 'solar',
        ...(partnerBirth.birthTimeKnown === false ? {} : { hour: partnerBirth.hour, minute: partnerBirth.minute || 0 }),
      },
      partnerBirthTimeKnown: partnerBirth.birthTimeKnown !== false && Number.isInteger(Number(partnerBirth.hour)),
      relationshipStage: context.relation || partner.relationship_to_user || partner.relation || '',
      conflictPattern: context.conflict_pattern || '',
      focus: context.focus || '',
      relationshipTemperature: context.relationship_temperature || '',
      concern: context.current_question || context.question || '',
    };
  }

  let reportPromise = null;

  async function loadSavedReport() {
    const reportId = new URLSearchParams(location.search).get('reportId');
    if (!reportId) return null;
    const session = await initAuth();
    if (!session) return { reason: 'login' };
    try {
      const teaser = /\/04-step-4-report(?:\/|$)/.test(location.pathname);
      const response = await api(`/api/report/${encodeURIComponent(reportId)}${teaser ? '?preview=1' : ''}`);
      return window.UMSHReportAccess?.acceptAnalyze?.(response) || null;
    } catch (error) {
      if (error.status === 401 || error.status === 403) return { reason: 'login' };
      if (error.status === 404) return null;
      if (error.code === 'FREE_PREVIEW_LIMIT') {
        return { reason: 'payment', paymentUrl: error.paymentUrl, freeSearch: error.freeSearch };
      }
      throw error;
    }
  }

  /** Resolves to { report } or { reason } — 'input', 'login', 'payment', 'error'. */
  function loadReport() {
    if (reportPromise) return reportPromise;
    reportPromise = (async () => {
      const cached = readJson('sessionStorage', STORAGE.report);
      if (cached?.sections?.length && !window.UMSHReportAccess) return { report: cached };

      const savedReport = await loadSavedReport();
      if (savedReport) return savedReport;

      const request = buildRequest(readJson('sessionStorage', STORAGE.input));
      if (!request) return { reason: 'input' };

      const session = await initAuth();
      if (!session) {
        reportPromise = null;
        return { reason: 'login' };
      }

      try {
        const response = await api('/api/match/couple/analyze', { method: 'POST', body: JSON.stringify(request) });
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
    login: '로그인하면 저장된 내 사주와 상대 정보로 두 사람의 무료 해석을 준비합니다.',
    payment: '결제가 확인되면 두 사람의 전체 해석 목차가 열립니다.',
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

    if (outcome.preview) {
      if (outcome.payload) {
        const entitled = window.UMSHReportAccess?.isEntitled?.(outcome) === true;
        const previewCta = window.UMSHReportAccess?.previewCta?.(outcome.payload);
        window.UMSHReportAccess?.showPreview?.(outcome.payload);
        const renderedCta = document.querySelector('#umsh-preview-host .umsh-preview-checkout');
        if (renderedCta && previewCta) {
          renderedCta.href = previewCta.href;
          renderedCta.textContent = previewCta.label;
          renderedCta.dataset.entitled = String(entitled);
        }
      }
      return;
    }

    if (!outcome.report) {
      const reason = outcome.reason || 'error';
      if (reason === 'login') {
        if (!answer.dataset.boundPreview) answer.textContent = '입력한 사주로 계산하고 있습니다.';
        window.UMSHAuthSession?.watchSignedIn?.(auth, () => {
          reportPromise = null;
          enhanceTeaser();
        });
      } else {
        answer.textContent = GATE_COPY[reason] || GATE_COPY.error;
      }
      const description = $('#accessDescription');
      if (description) description.textContent = GATE_COPY[reason] || GATE_COPY.error;
      const cta = $('#mainCta');
      if (cta && reason === 'login') {
        cta.textContent = `로그인하고 전체 보기 (${SERVICE.price})`;
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
      window.UMSHReportAccess?.markFilled?.(body);
      window.UMSHReportAccess?.markFilled?.(document.getElementById('detail-conclusion'));
    };

    apply();
    new MutationObserver(apply).observe(body, { childList: true, subtree: false });
  }

  function init() {
    mountChrome();
    setupStep2Preview();
    enhanceSajuInput();
    enhanceTeaser();
    enhanceList();
    enhanceDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
