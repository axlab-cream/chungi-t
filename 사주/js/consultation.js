/* Fork provenance: AIOS/Workspaces/aitalk/aitalk/index.html (2026-10-02).
 * Reused shared text/voice bubble flow. Real-time microphone transport now
 * uses consultation-live.js; interpretation and saved history stay server-owned.
 * Character images copied unchanged from aitalk/assets/generated/cheonmyeong-scenes.
 * Account, memory and endpoint contracts are 운명상회-only; no POC credentials.
 */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  let config, client, observedClient, observedOwner, authVersion = 0;
  let onSessionRevoked = () => {};
  async function liveAuth() {
    if (!config) {
      const response = await fetch('/api/auth/config', { cache: 'no-store' });
      if (!response.ok) throw Object.assign(new Error(), { code: 'AUTH_CONFIG' });
      config = await response.json();
    }
    if (!config.enabled || !window.UMSHAuthSession || !window.supabase) throw Object.assign(new Error(), { code: 'AUTH_CONFIG' });
    const live = await window.UMSHAuthSession.resolveLiveSession(config, 1200);
    if (!live?.session?.access_token) throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' });
    client = live.client;
    const owner = live.session.user?.id;
    if (observedOwner && owner !== observedOwner) { authVersion++; onSessionRevoked(); throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' }); }
    observedOwner = owner;
    if (observedClient !== client) {
      observedClient = client;
      client.auth.onAuthStateChange((event, session) => {
        const changedOwner = session?.user?.id && observedOwner && session.user.id !== observedOwner;
        if (event === 'SIGNED_OUT' || changedOwner) { authVersion++; onSessionRevoked(); }
      });
    }
    return live.session.access_token;
  }
  async function api(path, payload) {
    const token = await liveAuth();
    const version = authVersion;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch('/api/consultation' + path, {
        method: payload ? 'POST' : 'GET', cache: 'no-store', signal: controller.signal,
        headers: { Authorization: 'Bearer ' + token, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      const json = await response.json().catch(() => ({}));
      if (version !== authVersion) throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' });
      if (!response.ok) throw Object.assign(new Error(), { code: response.status === 401 ? 'AUTH_REQUIRED' : json.code, status: response.status, access: json.access });
      return json;
    } finally { clearTimeout(timer); }
  }
  function loginUrl(returnTo) {
    return window.UMSHCommonAuth?.commonLoginUrl('consultation', returnTo)
      || '/signup?entry=consultation&returnTo=' + encodeURIComponent(returnTo) + '#login';
  }
  function friendly(error) {
    if (error.code === 'AUTH_REQUIRED') return '로그인이 필요해요. 로그인한 뒤 상담을 이어가 주세요.';
    if (error.code === 'AUTH_CONFIG') return '로그인 연결을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.';
    if (/PROFILE/.test(error.code || '')) return '저장된 사주 정보가 필요해요. MY에서 본인 정보를 먼저 입력해 주세요.';
    if (error.status === 404) return '이 상담을 찾을 수 없어요. 보관함에서 다시 열어 주세요.';
    if (error.code === 'AUDIO_UNCLEAR') return '음성을 정확히 듣지 못했어요. 텍스트로 적어 주시거나 새로 녹음해 주세요.';
    if (error.code === 'CONVERSATION_LIMIT') return '이 상담의 대화 한도에 도달했어요. 보관함에서 다시 읽거나 새 상담을 시작해 주세요.';
    if (error.code === 'STORAGE_LIMIT') return '상담 보관 한도에 도달했어요. 기존 상담은 보관함에서 확인할 수 있어요.';
    if (error.code === 'DAILY_LIMIT') return '오늘의 상담 한도에 도달했어요. 저장된 상담은 보관함에서 확인하고, 내일 다시 이어가 주세요.';
    if (error.code === 'GENERATION_BUSY') return '이전 상담을 처리 중이에요. 잠시 후 같은 내용으로 다시 보내 주세요.';
    if (error.status === 429) return '현재 상담 요청이 많아요. 잠시 기다렸다 다시 보내 주세요.';
    if (error.status === 409) return '이전 요청을 처리 중이에요. 잠시 후 같은 내용으로 다시 시도해 주세요.';
    if (error.name === 'AbortError') return '응답을 확인하지 못했어요. 입력은 남아 있습니다. 같은 내용으로 다시 보내 주세요.';
    if (/DISABLED|CONFIG|UNAVAILABLE|SETUP_REQUIRED/.test(error.code || '')) return '현재 상담 연결을 준비 중이에요. 잠시 후 다시 방문해 주세요.';
    return '상담을 불러오지 못했어요. 입력은 남아 있습니다. 잠시 후 다시 시도해 주세요.';
  }
  function stateContent(target, title, copy, href, label) {
    target.replaceChildren();
    const strong = document.createElement('strong'); strong.textContent = title;
    const p = document.createElement('p'); p.textContent = copy;
    target.append(strong, p);
    if (href) { const a = document.createElement('a'); a.href = href; a.textContent = label; target.append(a); }
  }

  // Independent vault loader: never waits for purchased/today report endpoints.
  if ($('#consultation-vault')) {
    const host = $('#consultation-vault');
    let version = 0;
    onSessionRevoked = () => {
      version++;
      stateContent(host, '로그인이 필요해요', '회원 정보가 변경되어 저장된 상담을 닫았어요.', loginUrl('/vault?tab=consultation'), '로그인하기');
    };
    window.UMSHConsultationVault = async function (active) {
      host.hidden = !active;
      // Existing additional-reading history stays visible alongside consultation transcripts.
      const notice = $('[data-tab-only="paid"]'); if (active && notice) notice.hidden = true;
      const ticket = ++version;
      if (!active) return;
      document.querySelectorAll('.vault-tabs [data-tab]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.tab === 'history')));
      host.textContent = '저장된 천명상담을 불러오고 있어요.';
      try {
        const result = await api('/conversations');
        if (ticket !== version) return;
        if (!Array.isArray(result.conversations)) throw new Error('Invalid list');
        host.replaceChildren();
        if (!result.conversations.length) {
          host.className = 'consultation-vault-state';
          stateContent(host, '아직 저장된 상담이 없어요', '천명과 나눈 텍스트·음성 상담은 여기에서 다시 읽고 이어갈 수 있어요.', '/consultation/', '천명상담 시작하기');
          return;
        }
        host.className = '';
        result.conversations.forEach((row) => {
          const link = document.createElement('a'); link.className = 'consultation-vault-card';
          link.href = '/consultation/?conversationId=' + encodeURIComponent(row.id);
          const title = document.createElement('strong'); title.textContent = row.title || '천명상담';
          const p = document.createElement('p'); p.textContent = row.preview || '대화를 열어 이어서 읽어보세요.';
          const time = document.createElement('small'); const date = new Date(row.updatedAt);
          time.textContent = (Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR')) + ' · 이어서 상담하기 →';
          link.append(title, p, time); host.append(link);
        });
      } catch (error) {
        if (ticket !== version) return;
        host.className = 'consultation-vault-state';
        stateContent(host, '천명상담 기록을 열지 못했어요', friendly(error), error.code === 'AUTH_REQUIRED' ? loginUrl('/vault?tab=consultation') : null, '로그인하기');
        if (error.code !== 'AUTH_REQUIRED') { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '다시 불러오기'; retry.onclick = () => window.UMSHConsultationVault(true); host.append(retry); }
      }
    };
    document.querySelector('.vault-tabs').addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]'); if (!tab) return;
      const active = tab.dataset.tab === 'history';
      const url = new URL(location.href); url.searchParams.set('tab', tab.dataset.tab); history.replaceState(null, '', url);
      void window.UMSHConsultationVault(active);
      // Let the history tab render its existing saved readings too.
    }, true);
    if (['history', 'consultation'].includes(new URLSearchParams(location.search).get('tab'))) void window.UMSHConsultationVault(true);
    return;
  }
  if (!$('#consultation-app')) return;
  $('#consultation-enter')?.addEventListener('click', () => {
    document.body.classList.remove('consultation-intro');
    if (document.body.dataset.consultationMode === 'voice') void toggleVoice();
    else $('#chat-log').focus({ preventScroll: true });
  });
  const input = $('#message'), send = $('#send-button'), voice = $('#voice-button'), gate = $('#consultation-gate');
  const chat = $('#chat-log'), status = $('#consultation-status'), audio = $('#reply-audio');
  const paywall = $('#consultation-paywall'), checkout = $('#consultation-checkout');
  const draftKey = 'umsh:consultation:checkout-draft:v1';
  let access = null, returnFocus = null;
  let waitingTimer;
  let liveVoice = null, liveConnecting = false;
  const liveCaptions = { user: null, assistant: null };
  function selectMode(mode, initial) {
    if (!initial) liveVoice?.stop('상담 화면을 전환했어요.');
    document.body.dataset.consultationMode = mode;
    $('#consultation-mode-chat')?.setAttribute('aria-pressed', String(mode === 'chat'));
    $('#consultation-mode-voice')?.setAttribute('aria-pressed', String(mode === 'voice'));
    if (mode === 'chat') document.body.classList.remove('consultation-intro');
    else if (window.matchMedia?.('(max-width:767px)').matches) document.body.classList.add('consultation-intro');
  }
  $('#consultation-mode-chat')?.addEventListener('click', () => selectMode('chat'));
  $('#consultation-mode-voice')?.addEventListener('click', () => selectMode('voice'));
  selectMode(window.matchMedia?.('(max-width:767px)').matches ? 'voice' : 'chat', true);
  function waiting(active, voiceTurn) {
    clearTimeout(waitingTimer);
    $('#consultation-waiting').hidden = !active;
    if ($('#voice-progress')) $('#voice-progress').hidden = !active;
    if (active && voiceTurn) notify('천명 선생이 상담 내용을 신중히 살펴보고 있어요.');
    if (!active) return;
    $('#consultation-waiting-copy').textContent = '천명 선생이 사주와 상담 내용을 신중히 살펴보고 있어요.';
    $('#consultation-waiting-detail').textContent = voiceTurn ? '음성을 보내고 답변을 기다리고 있어요.' : '답변을 기다리고 있어요.';
    waitingTimer = setTimeout(() => { $('#consultation-waiting-detail').textContent = '조금 더 시간이 필요해요. 답변이 준비되면 바로 보여드릴게요.'; }, 12000);
  }
  let ready = false, busy = false, pending = null, renderedId = null, sessionVersion = 0, conversationId = new URLSearchParams(location.search).get('conversationId');
  let audioUrl;
  function character(state) {
    const frames = { idle: '01-idle', listen: '02-listen', think: '03-think', talk: '04-talk', finish: '05-finish' };
    const labels = { idle: 'AI 사주 상담자 · 천명', listen: '듣고 있어요 · 실시간 음성 상담', think: '사주의 흐름을 살피고 있어요', talk: '천명이 이야기하고 있어요', finish: '이야기를 이어가 주세요' };
    $('#character-image').src = '/assets/cheonmyeong-scenes/' + frames[state] + '.png'; if ($('#character-state')) $('#character-state').textContent = labels[state];
  }
  function notify(text, error) { if ($('#voice-scene-status')) $('#voice-scene-status').textContent = text; status.textContent = text; status.classList.toggle('is-error', Boolean(error)); }
  function clearDraft() { try { sessionStorage.removeItem(draftKey); } catch (_) {} }
  function restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (!draft) return;
      if (!observedOwner || draft.ownerId !== observedOwner || !Number.isFinite(draft.createdAt) || Date.now() - draft.createdAt > 30 * 60 * 1000 || draft.createdAt > Date.now()) { clearDraft(); return; }
      if ((draft.conversationId || null) !== (conversationId || null)) return;
      if (typeof draft.text === 'string') { input.value = draft.text.slice(0, 4000); notify('작성하던 질문을 불러왔어요. 남은 횟수를 확인한 뒤 보내기를 눌러 주세요.'); }
      clearDraft();
    } catch (_) { clearDraft(); }
  }
  function setAccess(value) {
    if (value && value.couponRemaining === undefined) value = { ...value, couponRemaining: 0 };
    if (!value || !['freeRemaining', 'couponRemaining', 'paidRemaining', 'remaining'].every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0)
      || value.remaining !== value.freeRemaining + value.couponRemaining + value.paidRemaining) throw Object.assign(new Error(), { code: 'ACCESS_UNAVAILABLE' });
    access = value;
    $('#consultation-access').textContent = value.freeRemaining > 0
      ? '회원 무료 상담 5회 · 무료 잔여 ' + value.freeRemaining + '회 · 전체 잔여 ' + value.remaining + '회'
      : '무료 질문 사용 완료 · 남은 질문 ' + value.remaining + '회';
    if (value.couponRemaining > 0) $('#consultation-access').textContent += ' · 쿠폰 ' + value.couponRemaining + '회 포함';
  }
  function openPaywall() {
    returnFocus = document.activeElement;
    if (!paywall.open) paywall.showModal();
    $('#consultation-paywall-dismiss').focus();
  }
  $('#consultation-paywall-dismiss').addEventListener('click', () => paywall.close());
  paywall.addEventListener('close', () => { if (returnFocus && !returnFocus.disabled) returnFocus.focus(); else input.focus(); });
  checkout.addEventListener('click', async () => {
    checkout.disabled = true;
    try {
      await liveAuth();
      if (!ready || !observedOwner || !access?.checkoutUrl) throw new Error('No checkout');
      const target = new URL(access.checkoutUrl, location.href);
      if (target.origin !== new URL(location.href).origin || target.pathname !== '/payment') throw new Error('Invalid checkout');
      sessionStorage.setItem(draftKey, JSON.stringify({ ownerId: observedOwner, conversationId: conversationId || null, text: input.value.slice(0, 4000), createdAt: Date.now() }));
      target.searchParams.set('returnTo', '/consultation/' + (conversationId ? '?conversationId=' + encodeURIComponent(conversationId) : ''));
      location.assign(target.pathname + target.search);
    } catch (_) { paywall.close(); notify('결제로 연결하지 못했어요. 작성한 질문은 그대로 남아 있어요. 다시 시도해 주세요.', true); }
    finally { checkout.disabled = false; }
  });
  function controls() {
    input.disabled = !ready || busy || liveConnecting;
    send.disabled = !ready || busy || liveConnecting;
    voice.disabled = !ready || (!liveVoice && busy);
    voice.textContent = liveVoice ? (liveConnecting ? '음성 연결 취소' : '실시간 음성 종료') : '◉ 음성으로 말하기';
    voice.setAttribute('aria-pressed', String(Boolean(liveVoice)));
    const sceneVoice = $('#voice-scene-button');
    if (sceneVoice) { sceneVoice.disabled = voice.disabled; sceneVoice.textContent = liveVoice ? voice.textContent : '음성 연결'; sceneVoice.setAttribute('aria-pressed', String(Boolean(liveVoice))); }
    $('#consultation-form').setAttribute('aria-busy', String(busy));
  }
  function showGate(error) {
    ready = false; gate.hidden = false;
    const missing = /PROFILE/.test(error.code || '');
    const login = error.code === 'AUTH_REQUIRED';
    access = null;
    $('#consultation-access').textContent = login ? '로그인 후 질문 횟수를 확인할 수 있어요.' : missing ? '사주 정보 연결 후 질문 횟수를 확인할 수 있어요.' : '연결이 복구되면 질문 횟수를 다시 확인할게요.';
    stateContent(gate, login ? '회원님만의 상담을 시작해요' : missing ? '먼저 본인 사주를 연결해 주세요' : '상담 연결을 확인해 주세요', friendly(error), login ? loginUrl(location.pathname + location.search) : missing ? '/profile' : null, login ? '로그인하고 상담하기' : '사주 정보 입력하기');
    if (!login && !missing) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '다시 연결하기'; retry.onclick = initialize; gate.append(retry); }
    const voiceGate = $('#voice-gate');
    if (voiceGate) { voiceGate.hidden = false; stateContent(voiceGate, login ? '로그인이 필요해요' : missing ? '사주 정보를 연결해 주세요' : '연결을 확인해 주세요', friendly(error), login ? loginUrl(location.pathname + location.search) : missing ? '/profile' : null, login ? '로그인하기' : '사주 정보 입력하기'); if (!login && !missing) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '다시 연결하기'; retry.onclick = initialize; voiceGate.append(retry); } }
    $('#profile-state').textContent = missing ? '사주 미등록' : login ? '회원 전용' : '연결 확인 필요'; controls();
  }
  // Original AI Talk addBubble: all user/model text stays in textContent.
  function addBubble(role, text) {
    if (!text) return;
    $('#chat-empty')?.remove();
    const row = document.createElement('div'); row.className = 'consultation-row ' + (role === 'user' ? 'me' : 'aria');
    if (role !== 'user') { const thumb = document.createElement('img'); thumb.className = 'consultation-thumb'; thumb.src = '/assets/cheonmyeong-scenes/01-idle.png'; thumb.alt = '천명'; row.append(thumb); }
    const bubble = document.createElement('div'); bubble.className = 'consultation-bubble'; bubble.textContent = text; row.append(bubble); chat.append(row); chat.scrollTop = chat.scrollHeight; return bubble;
  }
  function renderHistory(rows) { liveCaptions.user = liveCaptions.assistant = null; chat.replaceChildren(); for (const row of rows) if (row.role === 'user' || row.role === 'assistant') addBubble(row.role, row.content); }
  function stopAudio() { audio.pause(); audio.removeAttribute('src'); audio.hidden = true; if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = null; }
  function playReply(result) {
    stopAudio();
    if (!result.audio) { if (result.audioError) notify((result.saved ? '대화는 저장됐어요. ' : '대화 저장은 확인되지 않았어요. ') + '답변 음성을 준비하지 못해 텍스트로 보여드려요.'); return; }
    try {
      const bin = atob(result.audio), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      audioUrl = URL.createObjectURL(new Blob([bytes], { type: /^audio\//.test(result.audioMime || '') ? result.audioMime : 'audio/mpeg' }));
      audio.src = audioUrl; audio.hidden = false;
      audio.play().catch(() => notify((result.saved ? '대화가 저장됐어요. ' : '') + '재생 버튼을 누르면 답변을 들을 수 있어요.'));
    } catch (_) { notify('음성을 재생하지 못했어요. 답변은 텍스트로 확인해 주세요.'); }
  }
  audio.addEventListener('play', () => character('talk')); audio.addEventListener('pause', () => { if (!busy && !liveVoice) character('finish'); }); audio.addEventListener('ended', () => character('finish'));
  audio.addEventListener('error', () => { if (audio.src && !audio.hidden) notify('음성을 재생하지 못했어요. 답변은 텍스트로 확인해 주세요.'); });
  async function submit(payload) {
    if (!ready || busy) return;
    if (access?.remaining === 0) { openPaywall(); return; }
    const version = sessionVersion;
    liveVoice?.stop('텍스트 상담으로 전환했어요.');
    busy = true; waiting(true, Boolean(payload.audio)); controls(); stopAudio(); character('think'); notify('답변과 저장 결과를 기다리고 있어요.');
    try {
      const result = await api('/chat', payload);
      if (version !== sessionVersion) return;
      if (!result.text || !result.conversationId) throw new Error('Invalid turn');
      setAccess(result.access);
      conversationId = result.conversationId;
      if (Array.isArray(result.history)) renderHistory(result.history);
      else if (renderedId !== payload.requestId) { addBubble('user', result.heard || payload.text); addBubble('assistant', result.text); }
      renderedId = payload.requestId;
      const url = new URL(location.href); url.searchParams.set('conversationId', conversationId); history.replaceState(null, '', url);
      if (result.saved === true) { pending = null; clearDraft(); if (payload.text) input.value = ''; notify(result.charged === false ? '질문을 확인하는 대화는 횟수에서 차감하지 않았어요. 보관함에 저장됐어요.' : '보관함 ‘추가 풀이’에 저장됐어요.'); }
      else notify('답변은 받았지만 저장되지 않았어요. 같은 내용으로 다시 보내 저장을 확인해 주세요.', true);
      character('finish'); playReply(result);
    } catch (error) {
      if (version !== sessionVersion) return;
      character('idle'); notify(friendly(error), true);
      if (error.code === 'CONSULTATION_PAYMENT_REQUIRED') { try { if (error.access) setAccess(error.access); notify('무료 질문을 모두 사용했어요. 추가 질문 5회를 구매하면 이어갈 수 있어요.'); openPaywall(); } catch (_) { showGate({ code: 'ACCESS_UNAVAILABLE' }); } }
      if (error.code === 'AUDIO_UNCLEAR') pending = null;
      if (error.code === 'AUTH_REQUIRED' || /PROFILE/.test(error.code || '')) showGate(error);
    } finally { waiting(false); busy = false; controls(); }
  }
  $('#consultation-form').addEventListener('submit', (event) => {
    event.preventDefault(); const text = input.value.trim(); if (!text || !ready || busy) return;
    if (!pending || pending.text !== text) pending = { text, requestId: crypto.randomUUID(), ...(conversationId ? { conversationId } : {}) };
    void submit(pending);
  });
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); $('#consultation-form').requestSubmit(); } });
  async function toggleVoice() {
    if (liveVoice) { liveVoice.stop(); return; }
    if (!ready || busy) return;
    if (access?.remaining === 0) { openPaywall(); return; }
    if (!window.UMSHConsultationLive || !navigator.mediaDevices?.getUserMedia) { notify('음성 연결을 지원하지 않는 브라우저예요. 텍스트로 상담해 주세요.', true); return; }
    stopAudio(); liveConnecting = true;
    let connection;
    const version = sessionVersion;
    connection = window.UMSHConsultationLive({
      connect: () => api('/live-session', {}),
      ready: () => { if (liveVoice !== connection) return; liveConnecting = false; character('listen'); notify('실시간으로 듣고 있어요. 선생님이 말씀하는 중에도 이야기할 수 있어요.'); controls(); },
      notice: text => notify(text),
      error: error => notify(friendly(error), true),
      closed: text => { if (liveVoice !== connection) return; liveVoice = null; liveConnecting = false; character('idle'); notify(text); controls(); },
      transcript: (role, text) => {
        if (version !== sessionVersion || liveVoice !== connection) return;
        if (!liveCaptions[role]?.isConnected) liveCaptions[role] = addBubble(role, role === 'user' ? '음성 입력: ' : '천명 음성: ');
        liveCaptions[role].textContent += text;
        chat.scrollTop = chat.scrollHeight;
      },
      turnComplete: () => { liveCaptions.user = liveCaptions.assistant = null; },
      question: async (text, requestId) => {
        if (version !== sessionVersion || liveVoice !== connection || busy) throw new Error('INACTIVE_TURN');
        busy = true; waiting(true, true); controls(); character('think');
        try {
          const result = await api('/live-turn', { text, requestId, ...(conversationId ? { conversationId } : {}) });
          if (version !== sessionVersion) throw new Error('SESSION_CHANGED');
          if (!result.saved || !result.text || !Array.isArray(result.history)) throw new Error('INVALID_TURN');
          conversationId = result.conversationId; setAccess(result.access); renderHistory(result.history);
          const url = new URL(location.href); url.searchParams.set('conversationId', conversationId); history.replaceState(null, '', url);
          notify('음성 상담 질문과 답변을 보관함 ‘추가 풀이’에 저장했어요.');
          return result;
        } catch (error) {
          if (version === sessionVersion) {
            notify(friendly(error), true);
            if (error.code === 'CONSULTATION_PAYMENT_REQUIRED') { if (error.access) setAccess(error.access); connection.stop('남은 질문을 모두 사용했어요.'); openPaywall(); }
          }
          throw error;
        } finally { if (version === sessionVersion) { busy = false; waiting(false); controls(); } }
      },
    });
    liveVoice = connection; controls(); await connection.start();
  }
  voice.addEventListener('click', () => { selectMode('voice'); void toggleVoice(); });
  $('#voice-scene-button')?.addEventListener('click', toggleVoice);
  document.addEventListener('visibilitychange', () => { if (document.hidden) liveVoice?.stop('화면을 벗어나 음성 연결을 종료했어요.'); });
  window.addEventListener('pagehide', () => { sessionVersion++; liveVoice?.stop(); ready = false; waiting(false); stopAudio(); pending = null; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
  onSessionRevoked = () => { sessionVersion++; liveVoice?.stop(); waiting(false); clearDraft(); access = null; $('#consultation-access').textContent = '로그인 후 질문 횟수를 확인할 수 있어요.'; if (paywall.open) paywall.close(); stopAudio(); chat.replaceChildren(); input.value = ''; pending = null; showGate({ code: 'AUTH_REQUIRED' }); };
  async function initialize() {
    ready = false; controls(); gate.hidden = false; gate.textContent = '회원 정보와 저장된 사주를 확인하고 있어요.';
    try {
      const result = await api('/context');
      if (!result.profile) throw Object.assign(new Error(), { code: 'PROFILE_REQUIRED' });
      if (result.settings?.enabled === false) throw Object.assign(new Error(), { code: 'CONSULTATION_DISABLED' });
      setAccess(result.access);
      if (result.settings?.introduction && $('#character-introduction')) $('#character-introduction').textContent = result.settings.introduction;
      if (result.settings?.name && $('#consultation-title')) $('#consultation-title').textContent = result.settings.name + '상담';
      if (conversationId) { const saved = await api('/conversations/' + encodeURIComponent(conversationId)); if (!Array.isArray(saved.history)) throw new Error('Invalid history'); renderHistory(saved.history); notify('저장된 상담을 불러왔어요. 이어서 이야기해 주세요.'); }
      $('#profile-state').textContent = '본인 사주 연결됨'; gate.hidden = true; if ($('#voice-gate')) $('#voice-gate').hidden = true; ready = true; controls();
      restoreDraft();
    } catch (error) { showGate(error); }
  }
  void initialize();
})();
