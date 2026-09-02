(() => {
  if (!/\/work\/move(?:\/|$)/.test(window.location.pathname)) return;

  document.body.classList.add('work-move-page');

  const STORAGE = {
    service: 'umsh:work_move:service',
    legacyForm: 'umsh:work_move:form_v1',
    legacyIndex: 'umsh:work_move:interpretation_index_payload',
    legacyPaymentIntent: 'umsh:work_move:payment_intent_v1',
    input: 'umsh_work_move_input_payload_v1',
    report: 'umsh_work_move_report_v1',
    analysis: 'umsh_work_move_analysis_v1',
    selectedSection: 'umsh:work_move:selected_section_v1',
    userProfile: 'cheongi_user_birth_profile_v1',
    cheongiAnalysis: 'cheongi_analysis',
  };

  const SERVICE = {
    service_key: 'work_move',
    service_slug: 'move',
    category: '이직운',
    title: '나, 회사 옮겨도 될까?',
    price_krw: 14900,
    report_version: 'work-move-v1.0',
  };

  const LABELS = {
    decisionMode: {
      move_considering: '이직을 고민 중',
      offer_review: '오퍼를 받은 상태',
      resignation_timing: '퇴사 타이밍 고민',
      internal_transfer: '부서 이동·직무 전환 고민',
      job_search_start: '이력서부터 시작할지 고민',
    },
    currentCompanySignal: {
      role_blur: '역할이 흐림',
      authority_blur: '결정권이 애매함',
      boss_pressure: '상사 압박이 큼',
      peer_competition: '동료·경쟁 스트레스',
      recognition_gap: '인정받는 느낌이 부족함',
      burnout: '번아웃 신호가 있음',
    },
    workType: {
      office: '사무실 출근',
      hybrid: '하이브리드',
      remote: '원격 중심',
      shift: '교대·스케줄 근무',
      field: '현장·외근 중심',
      unknown: '아직 모름',
    },
    salaryFeeling: {
      clear_up: '확실히 상승',
      slight_up: '조금 상승',
      similar: '비슷함',
      down_for_growth: '성장 때문에 낮아져도 고민',
      unclear: '아직 조건이 불명확함',
    },
    priority: {
      money: '돈 조건',
      growth: '성장',
      mental: '멘탈',
      timing: '타이밍',
      people: '사람',
      stability: '안정감',
    },
    realityChecks: {
      resume_ready: '이력서·포트폴리오 정리됨',
      offer_terms_checked: '오퍼·계약 조건 확인',
      buffer_ready: '퇴사 전 현금 버퍼 확인',
      exit_script_ready: '퇴사·이동 대화 준비',
    },
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
  const safeParse = (raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const pad2 = (value) => String(Number(value || 0)).padStart(2, '0');
  const label = (group, value) => LABELS[group]?.[value] || value || '';

  function storageAvailable(type) {
    try {
      const store = window[type];
      const key = '__umsh_work_move_test__';
      store.setItem(key, key);
      store.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function sessionGet(key) {
    return storageAvailable('sessionStorage') ? sessionStorage.getItem(key) : null;
  }

  function sessionSet(key, value) {
    if (storageAvailable('sessionStorage')) sessionStorage.setItem(key, JSON.stringify(value));
  }

  function readSavedProfileState() {
    if (!storageAvailable('localStorage')) return { complete: false, label: '저장된 프로필을 읽을 수 없습니다.', profile: null };
    const profile = safeParse(localStorage.getItem(STORAGE.userProfile));
    const birth = profile?.birth || {};
    const gender = birth.gender === 'female' ? 'female' : birth.gender === 'male' ? 'male' : '';
    const calendar = birth.calendar === 'lunar' ? 'lunar' : birth.calendar === 'solar' ? 'solar' : '';
    const birthTimeKnown = profile?.birthTimeKnown !== false && Number.isFinite(Number(birth.hour));
    const normalized = {
      ...profile,
      name: profile?.name || '',
      birthTimeKnown,
      birth: {
        year: Number(birth.year),
        month: Number(birth.month),
        day: Number(birth.day),
        hour: birthTimeKnown ? Number(birth.hour) : 12,
        minute: Number(birth.minute || 0),
        gender,
        calendar,
      },
    };
    const complete = Boolean(normalized.name && normalized.birth.year && normalized.birth.month && normalized.birth.day && gender && calendar);
    const timeLabel = birthTimeKnown ? `${pad2(normalized.birth.hour)}:${pad2(normalized.birth.minute)}` : '시간 모름';
    return {
      complete,
      profile: complete ? normalized : null,
      label: complete
        ? `${normalized.name} · ${calendar === 'lunar' ? '음력' : '양력'} ${normalized.birth.year}.${pad2(normalized.birth.month)}.${pad2(normalized.birth.day)} · ${timeLabel}`
        : '저장된 프로필에 필요한 값이 부족합니다.',
    };
  }

  function value(form, name) {
    const field = form.elements[name];
    return field ? String(field.value || '').trim() : '';
  }

  function checkedValue(form, name) {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : '';
  }

  function checkedValues(form, name) {
    return $$(`input[name="${name}"]:checked`, form).map((field) => field.value);
  }

  function parseDateInput(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    return {
      year: Number(digits.slice(0, 4)),
      month: Number(digits.slice(4, 6)),
      day: Number(digits.slice(6, 8)),
    };
  }

  function parseTimeInput(raw, known) {
    if (!known) return { hour: 12, minute: 0 };
    const [hour, minute] = String(raw || '12:00').split(':').map(Number);
    return {
      hour: Number.isFinite(hour) ? hour : 12,
      minute: Number.isFinite(minute) ? minute : 0,
    };
  }

  function setFieldError(form, name, message) {
    const field = form.querySelector(`[data-field="${name}"]`);
    const error = $(`#${name}Error`, form);
    if (field) field.classList.toggle('has-error', Boolean(message));
    if (error) error.textContent = message || '';
  }

  function validateStep2(form) {
    const profileMode = checkedValue(form, 'profileMode') || 'new';
    let ok = true;
    ['nickname', 'genderContext', 'birthDate', 'birthTime', 'decisionMode', 'currentCompanySignal', 'targetRole', 'workType', 'salaryFeeling', 'discomfortPoint', 'priority'].forEach((name) => setFieldError(form, name, ''));
    const priorityError = $('#priorityError', form);
    if (priorityError) priorityError.textContent = '';

    if (profileMode === 'existing' && !readSavedProfileState().complete) {
      const notice = $('#profileNotice');
      if (notice) notice.textContent = '저장된 사주 프로필이 없어 새 사주 입력이 필요합니다.';
      ok = false;
    }

    if (profileMode === 'new') {
      ['nickname', 'genderContext', 'birthDate', 'calendarType'].forEach((name) => {
        if (!value(form, name)) {
          setFieldError(form, name, '이 항목을 입력해야 사주 기본 흐름을 계산할 수 있어요.');
          ok = false;
        }
      });
      if (!$('#birthTimeUnknown', form)?.checked && !value(form, 'birthTime')) {
        setFieldError(form, 'birthTime', '출생시간을 입력하거나 모름을 선택해 주세요.');
        ok = false;
      }
    }

    ['decisionMode', 'currentCompanySignal', 'targetRole', 'workType', 'salaryFeeling', 'discomfortPoint'].forEach((name) => {
      if (!value(form, name)) {
        setFieldError(form, name, '이직 판단에 필요한 핵심 항목입니다.');
        ok = false;
      }
    });
    if (value(form, 'discomfortPoint') && value(form, 'discomfortPoint').length < 8) {
      setFieldError(form, 'discomfortPoint', '찝찝한 포인트를 한 문장 이상으로 적어 주세요.');
      ok = false;
    }
    if (!checkedValue(form, 'priority')) {
      if (priorityError) priorityError.textContent = '이번 선택에서 제일 중요한 기준을 하나 골라 주세요.';
      ok = false;
    }

    if (!ok) {
      const firstError = form.querySelector('.has-error, #priorityError:not(:empty)');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
  }

  function updateProfileModeUi(mode) {
    const form = $('#moveForm');
    if (!form) return;
    const saved = readSavedProfileState();
    const nextMode = mode === 'existing' && saved.complete ? 'existing' : 'new';
    const radio = form.querySelector(`input[name="profileMode"][value="${nextMode}"]`);
    if (radio) radio.checked = true;
    const newProfileFields = $('#newProfileFields');
    if (newProfileFields) {
      newProfileFields.classList.toggle('hidden', nextMode !== 'new');
      $$('input, select, textarea', newProfileFields).forEach((field) => {
        field.disabled = nextMode !== 'new';
      });
    }
    const notice = $('#profileNotice');
    if (notice) {
      notice.textContent = nextMode === 'existing'
        ? `${saved.label} · 이름, 생년월일, 태어난 시간을 다시 입력하지 않고 이직 고민만 이어갑니다.`
        : '새 사주로 보는 흐름입니다. 입력값은 다음 단계 전달을 위해 이번 브라우저 세션에만 임시 보관합니다.';
    }
  }

  function birthStateFromForm(form, profileMode) {
    if (profileMode === 'existing') {
      const saved = readSavedProfileState();
      if (!saved.profile) throw new Error('저장된 사주 프로필이 없습니다.');
      return {
        name: saved.profile.name,
        birth: saved.profile.birth,
        birthTimeKnown: saved.profile.birthTimeKnown !== false,
        source: 'saved',
      };
    }

    const birthTimeKnown = !$('#birthTimeUnknown', form)?.checked;
    const calendarInput = value(form, 'calendarType');
    const calendar = calendarInput === 'lunar' || calendarInput === 'leap_lunar' ? 'lunar' : 'solar';
    const genderInput = value(form, 'genderContext');
    return {
      name: value(form, 'nickname'),
      birth: {
        ...parseDateInput(value(form, 'birthDate')),
        ...parseTimeInput(value(form, 'birthTime'), birthTimeKnown),
        gender: genderInput === 'female' ? 'female' : 'male',
        calendar,
        isLeapMonth: calendarInput === 'leap_lunar',
      },
      birthTimeKnown,
      source: 'new',
    };
  }

  function workMoveInputFromForm(form) {
    return {
      decisionMode: value(form, 'decisionMode'),
      currentCompanySignal: value(form, 'currentCompanySignal'),
      targetCompanyName: value(form, 'targetCompanyName'),
      targetRole: value(form, 'targetRole'),
      workType: value(form, 'workType'),
      commuteLocation: value(form, 'commuteLocation'),
      salaryFeeling: value(form, 'salaryFeeling'),
      decisionDate: value(form, 'decisionDate'),
      discomfortPoint: value(form, 'discomfortPoint'),
      priority: checkedValue(form, 'priority'),
      realityChecks: checkedValues(form, 'realityChecks'),
    };
  }

  function snakeWorkMove(workMove) {
    return {
      decision_mode: workMove.decisionMode,
      current_company_signal: workMove.currentCompanySignal,
      target_company_name: workMove.targetCompanyName,
      target_role: workMove.targetRole,
      work_type: workMove.workType,
      commute_location: workMove.commuteLocation,
      salary_feeling: workMove.salaryFeeling,
      decision_date: workMove.decisionDate,
      discomfort_point: workMove.discomfortPoint,
      priority: workMove.priority,
      reality_checks: workMove.realityChecks,
    };
  }

  function buildStep2Payload(form) {
    const profileMode = checkedValue(form, 'profileMode') || 'new';
    const birthState = birthStateFromForm(form, profileMode);
    const workMove = workMoveInputFromForm(form);
    const decisionText = label('decisionMode', workMove.decisionMode);
    const signalText = label('currentCompanySignal', workMove.currentCompanySignal);
    const salaryText = label('salaryFeeling', workMove.salaryFeeling);
    const priorityText = label('priority', workMove.priority);
    const context = {
      serviceKey: SERVICE.service_key,
      name: birthState.name,
      target: '본인',
      relationship: '직장·회사 이동',
      orientation: '이직 판단',
      work: [decisionText, workMove.targetRole].filter(Boolean).join(' · '),
      concern: [signalText, salaryText, priorityText, workMove.discomfortPoint].filter(Boolean).join(' · '),
      birthTimeKnown: birthState.birthTimeKnown,
      workMove,
    };

    return {
      service: SERVICE,
      service_key: SERVICE.service_key,
      service_slug: SERVICE.service_slug,
      schema_version: 'work-move-input-v1',
      report_version: SERVICE.report_version,
      stage: '02-step-2-saju-input',
      next_route: '../04-step-4-report/index.html#step-4-report',
      profile_mode: profileMode,
      birth_profile: profileMode === 'existing'
        ? { source: 'existing_authenticated_profile', ask_birth_profile_again: false, label: readSavedProfileState().label }
        : {
            nickname: birthState.name,
            gender_context: value(form, 'genderContext'),
            calendar_type: value(form, 'calendarType'),
            birth_date: value(form, 'birthDate'),
            birth_time: birthState.birthTimeKnown ? value(form, 'birthTime') : 'unknown',
            birth_place: value(form, 'birthPlace'),
          },
      birth: birthState.birth,
      birthTimeKnown: birthState.birthTimeKnown,
      context,
      workMove,
      career_context: snakeWorkMove(workMove),
      input: snakeWorkMove(workMove),
      created_at: new Date().toISOString(),
      privacy_policy: {
        url_query_contains_private_values: false,
        long_term_local_storage_contains_private_values: false,
        transfer_storage: 'sessionStorage',
      },
    };
  }

  async function requestAnalysis(payload) {
    const response = await fetch('/api/saju/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload.birth,
        birth: payload.birth,
        birthTimeKnown: payload.birthTimeKnown,
        serviceKey: SERVICE.service_key,
        service_key: SERVICE.service_key,
        context: payload.context,
        workMove: payload.workMove,
        input: payload.input,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || '분석 리포트를 생성하지 못했습니다.');
    return json;
  }

  function saveStep2Payload(payload) {
    sessionSet(STORAGE.service, SERVICE);
    sessionSet(STORAGE.legacyForm, payload);
    sessionSet(STORAGE.input, payload);
    if (payload.analysis) {
      sessionSet(STORAGE.analysis, payload.analysis);
      sessionSet(STORAGE.report, payload.analysis.report || null);
      sessionSet(STORAGE.cheongiAnalysis, payload.analysis);
    }
  }

  function renderStep2Saved(payload) {
    const summaryList = $('#summaryList');
    const savedResult = $('#savedResult');
    if (summaryList) {
      const ctx = payload.workMove;
      const rows = [
        ['상황', label('decisionMode', ctx.decisionMode)],
        ['현 회사 신호', label('currentCompanySignal', ctx.currentCompanySignal)],
        ['직무', ctx.targetRole],
        ['근무 형태', label('workType', ctx.workType)],
        ['조건 체감', label('salaryFeeling', ctx.salaryFeeling)],
        ['우선순위', label('priority', ctx.priority)],
        ['RAG 리포트', payload.analysis?.report ? `${payload.analysis.report.sections?.length || 0}개 섹션 생성` : '04 티저용 입력값 저장'],
      ];
      summaryList.innerHTML = rows.map(([name, text]) => `<div><span>${escapeHtml(name)}</span><strong>${escapeHtml(text || '미입력')}</strong></div>`).join('');
    }
    if (savedResult) {
      savedResult.classList.remove('hidden');
      savedResult.focus({ preventScroll: true });
      savedResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const goReport = $('#goReport');
    if (goReport) goReport.setAttribute('href', '../04-step-4-report/index.html#step-4-report');
  }

  function setupStep2() {
    const form = $('#moveForm');
    if (!form) return;
    const saved = readSavedProfileState();
    updateProfileModeUi(saved.complete ? 'existing' : 'new');
    $$('input[name="profileMode"]', form).forEach((input) => {
      input.addEventListener('change', (event) => {
        const canUseSaved = readSavedProfileState().complete;
        updateProfileModeUi(input.value);
        if (input.value === 'existing' && !canUseSaved) {
          event.stopImmediatePropagation();
        }
      }, true);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!validateStep2(form)) return;

      const submitButton = $('button[type="submit"]', form);
      const note = $('.submit-note', form);
      if (submitButton) submitButton.disabled = true;
      if (note) note.textContent = '입력값에 맞춰 이직운 무료 티저와 RAG 리포트를 생성하고 있습니다.';

      const payload = buildStep2Payload(form);
      try {
        payload.analysis = await requestAnalysis(payload);
        payload.reportId = payload.analysis.report?.reportId || '';
        if (note) note.textContent = '개인화 이직운 리포트를 저장했습니다. 04 무료 티저로 이어가세요.';
      } catch (error) {
        payload.analysis_error = error instanceof Error ? error.message : '분석 리포트를 생성하지 못했습니다.';
        if (note) note.textContent = `${payload.analysis_error} 입력값은 저장했고 04 무료 티저에서 계속 확인할 수 있습니다.`;
      } finally {
        saveStep2Payload(payload);
        renderStep2Saved(payload);
        if (submitButton) submitButton.disabled = false;
      }
    }, true);
  }

  function readPayload() {
    return safeParse(sessionGet(STORAGE.input)) || safeParse(sessionGet(STORAGE.legacyForm));
  }

  function readReport() {
    const report = safeParse(sessionGet(STORAGE.report));
    if (report?.sections?.length) return report;
    const payload = readPayload();
    return payload?.analysis?.report?.sections?.length ? payload.analysis.report : null;
  }

  function firstSentence(text) {
    return String(text || '').split(/\n\n|(?<=\.)\s+/).find(Boolean) || '';
  }

  function setupStep4() {
    if (!$('#step-4-report')) return;
    const report = readReport();
    if (report?.sections?.length) {
      const byId = new Map(report.sections.map((section) => [section.id, section]));
      const decision = byId.get('work-move-decision') || report.sections[0];
      const signal = byId.get('current-company-signal') || report.sections[1] || decision;
      const money = byId.get('money-terms') || report.sections[5] || decision;
      const risk = byId.get('risk-brake') || report.sections[7] || decision;
      const setText = (id, text) => {
        const node = document.getElementById(id);
        if (node && text) node.textContent = text;
      };
      setText('resultTitle', decision.hook || decision.category);
      setText('resultAnswer', firstSentence(decision.interpretation));
      setText('resultTypeChip', decision.category);
      setText('directionText', decision.classification);
      setText('directionBody', firstSentence(decision.interpretation));
      setText('signalText', signal.category);
      setText('signalBody', firstSentence(signal.interpretation));
      setText('conditionText', money.category);
      setText('conditionBody', firstSentence(money.interpretation));
      setText('brakeText', risk.category);
      setText('brakeBody', firstSentence(risk.interpretation));
      setText('signalNarrative', `${decision.category}. 전체 결과에서는 ${report.sections.length}개 섹션으로 대운·세운·관성·식상·재성 근거를 이어서 엽니다.`);
    }

    const purchase = $('[data-action="purchase"]');
    purchase?.addEventListener('click', () => {
      sessionSet(STORAGE.legacyPaymentIntent, {
        service_key: SERVICE.service_key,
        amount_krw: SERVICE.price_krw,
        from: '04-step-4-report',
        to: '../05-step-5-chat/chat.html#step-5-chat',
        requested_at: new Date().toISOString(),
      });
      window.setTimeout(() => {
        window.location.href = '../05-step-5-chat/chat.html#step-5-chat';
      }, 120);
    });
  }

  function sectionPreview(section) {
    return firstSentence(section.interpretation || section.hook || section.classification).slice(0, 96);
  }

  function setupStep5() {
    if (!$('#step-5-chat')) return;
    const report = readReport();
    if (!report?.sections?.length) return;

    const root = $('#reportGroups');
    const visibleCount = $('#visibleCount');
    const stateNotice = $('#stateNotice span');
    const filterInput = $('#filterInput');
    if (!root) return;

    root.innerHTML = `
      <details class="report-group" data-dynamic-work-report="true" open>
        <summary>
          <span class="order">01</span>
          <span class="group-title">
            <h3>${escapeHtml(report.title || '이직운 전체 결과')}</h3>
            <p>${escapeHtml(report.subtitle || '입력값과 사주 계산값을 바탕으로 생성한 개인화 결과입니다.')}</p>
          </span>
          <span class="group-count">${report.sections.length}개</span>
        </summary>
        <div class="section-list">
          ${report.sections.map((section) => `
            <a class="section-card" data-dynamic-work-section data-section-id="${escapeHtml(section.id)}" href="../06-step-6_1-report-detail/index.html?section=${encodeURIComponent(section.id)}#step-6_1-report">
              <span class="section-copy">
                <b>${escapeHtml(section.category)}</b>
                <small>${escapeHtml(sectionPreview(section))}</small>
                <em>${escapeHtml(section.ragTopics?.slice(0, 3).join(' · ') || section.classification)}</em>
              </span>
              <span class="arrow" aria-hidden="true">›</span>
            </a>
          `).join('')}
        </div>
      </details>
    `;
    if (visibleCount) visibleCount.textContent = `${report.sections.length}개`;
    if (stateNotice) stateNotice.textContent = 'RAG 기반 개인화 리포트를 불러왔습니다. 항목을 누르면 해당 상세 풀이로 이동합니다.';

    $$('[data-dynamic-work-section]', root).forEach((card) => {
      card.addEventListener('click', () => {
        const section = report.sections.find((item) => item.id === card.dataset.sectionId);
        if (!section) return;
        sessionSet(STORAGE.selectedSection, {
          service_key: SERVICE.service_key,
          report_id: report.reportId || '',
          section_id: section.id,
          section_title: section.category,
          preview: sectionPreview(section),
          route: card.getAttribute('href'),
        });
      });
    });

    filterInput?.addEventListener('input', () => {
      const term = filterInput.value.trim().toLowerCase();
      let count = 0;
      $$('[data-dynamic-work-section]', root).forEach((card) => {
        const match = !term || card.textContent.toLowerCase().includes(term);
        card.hidden = !match;
        if (match) count += 1;
      });
      if (visibleCount) visibleCount.textContent = `${count}개`;
      $('#emptyState')?.classList.toggle('is-visible', count === 0);
    });
  }

  function renderDynamicDetail(sectionId, pushState = false) {
    const report = readReport();
    if (!report?.sections?.length) return false;
    const section = report.sections.find((item) => item.id === sectionId)
      || report.sections.find((item) => item.id === safeParse(sessionGet(STORAGE.selectedSection))?.section_id)
      || report.sections[0];
    const paragraphs = String(section.interpretation || '').split(/\n\n+/).filter(Boolean);
    const related = report.sections.filter((item) => item.id !== section.id).slice(0, 3);
    const setText = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text || '';
    };
    const setHtml = (id, html) => {
      const node = document.getElementById(id);
      if (node) node.innerHTML = html;
    };

    document.title = `${section.category} | 나, 회사 옮겨도 될까?`;
    setText('topSubtitle', '이직운 상세 풀이');
    setText('groupLabel', '06 상세 풀이 · RAG 개인화');
    setText('detailTitle', section.category);
    setText('detailIntro', section.hook || section.classification);
    setHtml('heroTags', [section.category, ...(section.ragTopics || []).slice(0, 4)].map((tag, index) => `<span class="tag ${index === 0 ? 'gold' : ''}">${escapeHtml(tag)}</span>`).join(''));
    setText('conclusionText', firstSentence(section.interpretation));
    setHtml('evidenceGrid', `
      <article class="mini-card"><b>분류</b><p>${escapeHtml(section.classification)}</p></article>
      <article class="mini-card"><b>RAG 근거</b><p>${escapeHtml(section.ragTopics?.slice(0, 5).join(' · ') || '코퍼스 근거')}</p></article>
      <article class="mini-card"><b>패턴 키</b><p>${escapeHtml(section.patternKeys?.slice(0, 4).join(' · ') || '사주 계산값')}</p></article>
    `);
    setHtml('interpretationBlocks', paragraphs.map((paragraph, index) => `
      <article class="block">
        <h3><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(index === 0 ? '핵심 해석' : index === 1 ? '근거 대조' : '현실 적용')}</h3>
        <p>${escapeHtml(paragraph)}</p>
      </article>
    `).join(''));
    setHtml('actionsList', [
      ['돈 조건', '연봉, 수습, 성과급, 업무범위를 문서로 확인합니다.'],
      ['역할 범위', '보고 라인, 책임 경계, 평가 기준을 질문으로 좁힙니다.'],
      ['멘탈·타이밍', '퇴사 전 현금 버퍼와 회복 리듬을 같이 점검합니다.'],
    ].map((item, index) => `
      <article class="action-card">
        <span>${index + 1}</span>
        <div><strong>${escapeHtml(item[0])}</strong><p>${escapeHtml(item[1])}</p></div>
      </article>
    `).join(''));
    setHtml('cautionsList', `
      <article class="block">
        <h3><span>!</span>확정 표현 금지</h3>
        <p>이 풀이는 퇴사, 합격, 연봉 상승을 확정하지 않고 입력값과 사주 근거를 의사결정 기준으로 정리합니다.</p>
      </article>
    `);
    setHtml('relatedNav', related.map((item) => `
      <a class="related-card" href="index.html?section=${encodeURIComponent(item.id)}#step-6_1-report" data-dynamic-report-link="${escapeHtml(item.id)}">
        <span>연관 항목</span>
        <strong>${escapeHtml(item.category)}</strong>
      </a>
    `).join(''));
    const notice = $('#stateNotice span');
    if (notice) notice.textContent = 'RAG 기반 개인화 상세 항목입니다. 목록에서 선택한 섹션과 같은 리포트 결과를 재사용합니다.';
    sessionSet(STORAGE.selectedSection, {
      service_key: SERVICE.service_key,
      report_id: report.reportId || '',
      section_id: section.id,
      section_title: section.category,
      preview: sectionPreview(section),
    });
    if (pushState) history.pushState({ section_id: section.id }, '', `index.html?section=${encodeURIComponent(section.id)}#step-6_1-report`);
    return true;
  }

  function setupStep6() {
    if (!$('#step-6_1-report')) return;
    const sectionId = new URLSearchParams(location.search).get('section') || '';
    if (!renderDynamicDetail(sectionId)) return;
    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('[data-dynamic-report-link]');
      if (!link) return;
      event.preventDefault();
      renderDynamicDetail(link.dataset.dynamicReportLink, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  setupStep2();
  setupStep4();
  setupStep5();
  setupStep6();
})();
