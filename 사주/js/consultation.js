/* Fork provenance: AIOS/Workspaces/aitalk/aitalk/index.html (2026-10-02).
 * Reused shared text/voice bubble flow, resampleTo16k, encodeWav, toB64 and
 * microphone PCM capture -> authenticated turn -> reply audio lifecycle.
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
    if (/DISABLED|CONFIG|UNAVAILABLE/.test(error.code || '')) return '현재 상담 연결을 준비 중이에요. 잠시 후 다시 방문해 주세요.';
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
        stateContent(host, '추가 풀이를 열지 못했어요', friendly(error), error.code === 'AUTH_REQUIRED' ? loginUrl('/vault?tab=consultation') : null, '로그인하기');
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
  const input = $('#message'), send = $('#send-button'), voice = $('#voice-button'), gate = $('#consultation-gate');
  const chat = $('#chat-log'), status = $('#consultation-status'), audio = $('#reply-audio');
  const paywall = $('#consultation-paywall'), checkout = $('#consultation-checkout');
  const draftKey = 'umsh:consultation:checkout-draft:v1';
  let access = null, returnFocus = null;
  let waitingTimer;
  function waiting(active, voiceTurn) {
    clearTimeout(waitingTimer);
    $('#consultation-waiting').hidden = !active;
    if (!active) return;
    $('#consultation-waiting-copy').textContent = '천명 선생이 사주와 상담 내용을 신중히 살펴보고 있어요.';
    $('#consultation-waiting-detail').textContent = voiceTurn ? '음성을 보내고 답변을 기다리고 있어요.' : '답변을 기다리고 있어요.';
    waitingTimer = setTimeout(() => { $('#consultation-waiting-detail').textContent = '조금 더 시간이 필요해요. 답변이 준비되면 바로 보여드릴게요.'; }, 12000);
  }
  let ready = false, busy = false, pending = null, renderedId = null, sessionVersion = 0, conversationId = new URLSearchParams(location.search).get('conversationId');
  let stream, micCtx, micProc, micSrc, micSink, micTimer, recording = false, requestingMic = false, chunks = [], sampleCount = 0, audioUrl;
  function character(state) {
    const frames = { idle: '01-idle', listen: '02-listen', think: '03-think', talk: '04-talk', finish: '05-finish' };
    const labels = { idle: 'AI 사주 상담자 · 천명', listen: '듣고 있어요 · 녹음 중', think: '사주의 흐름을 살피고 있어요', talk: '천명이 이야기하고 있어요', finish: '이야기를 이어가 주세요' };
    $('#character-image').src = '/assets/cheonmyeong-scenes/' + frames[state] + '.png'; $('#character-state').textContent = labels[state];
  }
  function notify(text, error) { status.textContent = text; status.classList.toggle('is-error', Boolean(error)); }
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
      ? '회원 첫 질문 무료 1회 · 남은 질문 ' + value.remaining + '회'
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
    input.disabled = !ready || busy || recording || requestingMic;
    send.disabled = !ready || busy || recording || requestingMic;
    voice.disabled = !ready || busy || requestingMic;
    voice.textContent = recording ? '녹음 끝내고 보내기' : pending?.audio ? '음성 다시 보내기' : '◉ 음성으로 말하기';
    voice.setAttribute('aria-pressed', String(recording));
    $('#consultation-form').setAttribute('aria-busy', String(busy));
  }
  function showGate(error) {
    ready = false; gate.hidden = false;
    const missing = /PROFILE/.test(error.code || '');
    const login = error.code === 'AUTH_REQUIRED';
    if (login) $('#consultation-access').textContent = '로그인 후 질문 횟수를 확인할 수 있어요.';
    stateContent(gate, login ? '회원님만의 상담을 시작해요' : missing ? '먼저 본인 사주를 연결해 주세요' : '상담 연결을 확인해 주세요', friendly(error), login ? loginUrl(location.pathname + location.search) : missing ? '/profile' : null, login ? '로그인하고 상담하기' : '사주 정보 입력하기');
    if (!login && !missing) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '다시 연결하기'; retry.onclick = initialize; gate.append(retry); }
    $('#profile-state').textContent = missing ? '사주 미등록' : login ? '회원 전용' : '연결 확인 필요'; controls();
  }
  // Original AI Talk addBubble: all user/model text stays in textContent.
  function addBubble(role, text) {
    if (!text) return;
    $('#chat-empty')?.remove();
    const row = document.createElement('div'); row.className = 'consultation-row ' + (role === 'user' ? 'me' : 'aria');
    if (role !== 'user') { const thumb = document.createElement('img'); thumb.className = 'consultation-thumb'; thumb.src = '/assets/cheonmyeong-scenes/01-idle.png'; thumb.alt = '천명'; row.append(thumb); }
    const bubble = document.createElement('div'); bubble.className = 'consultation-bubble'; bubble.textContent = text; row.append(bubble); chat.append(row); chat.scrollTop = chat.scrollHeight;
  }
  function renderHistory(rows) { chat.replaceChildren(); for (const row of rows) if (row.role === 'user' || row.role === 'assistant') addBubble(row.role, row.content); }
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
  audio.addEventListener('play', () => character('talk')); audio.addEventListener('pause', () => { if (!busy && !recording) character('finish'); }); audio.addEventListener('ended', () => character('finish'));
  audio.addEventListener('error', () => { if (audio.src && !audio.hidden) notify('음성을 재생하지 못했어요. 답변은 텍스트로 확인해 주세요.'); });
  async function submit(payload) {
    if (!ready || busy) return;
    if (access?.remaining === 0) { openPaywall(); return; }
    const version = sessionVersion;
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
    event.preventDefault(); const text = input.value.trim(); if (!text || !ready || busy || recording) return;
    if (!pending || pending.text !== text) pending = { text, requestId: crypto.randomUUID(), ...(conversationId ? { conversationId } : {}) };
    void submit(pending);
  });
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); $('#consultation-form').requestSubmit(); } });
  // Original PCM helpers retained to preserve the AI Talk WAV turn contract.
  function resampleTo16k(data, rate) {
    if (!rate || rate === 16000) return data;
    const ratio = rate / 16000, out = new Float32Array(Math.floor(data.length / ratio));
    for (let i = 0; i < out.length; i++) { const at = i * ratio, lo = Math.floor(at), hi = Math.min(lo + 1, data.length - 1), t = at - lo; out[i] = data[lo] * (1 - t) + data[hi] * t; } return out;
  }
  function toB64(bytes) { let value = ''; for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(value); }
  function encodeWav(samples, rate) {
    const n = samples.length, buffer = new ArrayBuffer(44 + n * 2), view = new DataView(buffer);
    const write = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    write(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) view.setInt16(44 + i * 2, samples[i], true); return new Uint8Array(buffer);
  }
  function releaseMic() {
    clearTimeout(micTimer); recording = false;
    if (micProc) micProc.onaudioprocess = null;
    for (const node of [micProc, micSrc, micSink]) { try { node?.disconnect(); } catch (_) {} }
    stream?.getTracks().forEach((track) => track.stop()); micCtx?.close().catch(() => {});
    stream = micCtx = micProc = micSrc = micSink = null;
  }
  function finishRecording() {
    if (!recording) return;
    releaseMic();
    if (sampleCount < 5600) { chunks = []; sampleCount = 0; notify('녹음이 너무 짧아요. 버튼을 눌러 다시 이야기해 주세요.', true); character('idle'); controls(); return; }
    const samples = new Int16Array(sampleCount); let offset = 0; for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
    chunks = []; sampleCount = 0;
    pending = { audio: toB64(encodeWav(samples, 16000)), mime: 'audio/wav', requestId: crypto.randomUUID(), ...(conversationId ? { conversationId } : {}) };
    void submit(pending);
  }
  voice.addEventListener('click', async () => {
    if (!ready || busy || requestingMic) return;
    if (access?.remaining === 0) { openPaywall(); return; }
    if (recording) { finishRecording(); return; }
    if (pending?.audio) { void submit(pending); return; }
    if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) { notify('이 브라우저에서는 음성 입력을 사용할 수 없어요. 텍스트로 상담해 주세요.', true); return; }
    requestingMic = true; controls(); stopAudio(); notify('마이크 사용 권한을 확인하고 있어요.');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (document.hidden || !ready) { releaseMic(); return; }
      micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 }); await micCtx.resume();
      micSrc = micCtx.createMediaStreamSource(stream); micProc = micCtx.createScriptProcessor(4096, 1, 1); micSink = micCtx.createGain(); micSink.gain.value = 0;
      micSrc.connect(micProc); micProc.connect(micSink); micSink.connect(micCtx.destination); chunks = []; sampleCount = 0; recording = true;
      micProc.onaudioprocess = (event) => {
        if (!recording || document.hidden) return;
        const data = resampleTo16k(event.inputBuffer.getChannelData(0), micCtx.sampleRate), pcm = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) { const v = Math.max(-1, Math.min(1, data[i])); pcm[i] = v < 0 ? v * 32768 : v * 32767; }
        chunks.push(pcm); sampleCount += pcm.length;
        if (sampleCount >= 16000 * 30) finishRecording();
      };
      micTimer = setTimeout(finishRecording, 30000); character('listen'); notify('녹음 중이에요. 끝내기를 누르면 전송합니다. 최대 30초까지 녹음해요.');
    } catch (error) { releaseMic(); character('idle'); notify(error.name === 'NotAllowedError' ? '마이크 권한이 꺼져 있어요. 브라우저에서 허용하거나 텍스트로 상담해 주세요.' : '마이크를 연결하지 못했어요. 기기를 확인하거나 텍스트로 상담해 주세요.', true); }
    finally { requestingMic = false; controls(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && recording) { releaseMic(); chunks = []; sampleCount = 0; character('idle'); notify('화면을 벗어나 녹음을 취소했어요. 음성은 전송하지 않았어요.'); controls(); } });
  window.addEventListener('pagehide', () => { sessionVersion++; ready = false; waiting(false); releaseMic(); stopAudio(); chunks = []; pending = null; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
  onSessionRevoked = () => { sessionVersion++; waiting(false); clearDraft(); access = null; $('#consultation-access').textContent = '로그인 후 질문 횟수를 확인할 수 있어요.'; if (paywall.open) paywall.close(); releaseMic(); stopAudio(); chat.replaceChildren(); input.value = ''; pending = null; showGate({ code: 'AUTH_REQUIRED' }); };
  async function initialize() {
    ready = false; controls(); gate.hidden = false; gate.textContent = '회원 정보와 저장된 사주를 확인하고 있어요.';
    try {
      const result = await api('/context');
      if (!result.profile) throw Object.assign(new Error(), { code: 'PROFILE_REQUIRED' });
      if (result.settings?.enabled === false) throw Object.assign(new Error(), { code: 'CONSULTATION_DISABLED' });
      setAccess(result.access);
      if (result.settings?.introduction) $('#character-introduction').textContent = result.settings.introduction;
      if (result.settings?.name) $('#consultation-title').textContent = result.settings.name + '상담';
      if (conversationId) { const saved = await api('/conversations/' + encodeURIComponent(conversationId)); if (!Array.isArray(saved.history)) throw new Error('Invalid history'); renderHistory(saved.history); notify('저장된 상담을 불러왔어요. 이어서 이야기해 주세요.'); }
      $('#profile-state').textContent = '본인 사주 연결됨'; gate.hidden = true; ready = true; controls();
      restoreDraft();
    } catch (error) { showGate(error); }
  }
  void initialize();
})();
