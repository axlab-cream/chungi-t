(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const C = window.UMSHSoloNaraContent;
  if (!C) { stage.innerHTML = '<p class="error">테스트를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.</p>'; return; }
  const KEY = 'umsh:solo-nara:v1';
  const N = C.questions.length;
  const AXES = ['direct', 'express', 'stability', 'independence'];
  const preview = location.pathname.endsWith('/preview.html');
  const track = (action, extra) => { try { if (!preview) window.UMSHSoloNaraTelemetry?.track(action, extra); } catch { /* Measurement must never block the game. */ } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? Math.min(ms, 60) : ms));
  let state = { gender: null, answers: [], at: Date.now() };
  let storageOK = true, busy = false, auth = {}, generation = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lines = value => esc(value).replace(/\n/g, '<br>');
  const isType = type => typeof type === 'string' && Object.hasOwn(C.characters, type);
  const candidates = gender => Object.entries(C.characters).filter(([, c]) => c.gender === gender);
  function save() { try { state.at = Date.now(); sessionStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; } }
  function clear() { try { sessionStorage.removeItem(KEY); } catch {} }
  function show(html, motion = 'pop') { stage.innerHTML = `<section class="screen ${motion}">${html}</section>`; stage.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function on(id, handler) { const el = document.getElementById(id); if (el) el.addEventListener('click', handler); }
  function notice(message) { const el = document.getElementById('notice'); el.textContent = message; el.className = 'show'; setTimeout(() => el.className = '', 3000); }
  const sparkles = () => `<div class="sparkles" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="--n:${i}"></i>`).join('')}</div>`;

  function home(shared) {
    generation++; busy = false;
    const friend = shared ? C.characters[shared] : null;
    const tags = Object.values(C.characters).map(c => `<span>${esc(c.name)}</span>`).join('');
    show(`${friend ? `<div class="sample-banner">친구는 솔로나라에서 <b>${esc(friend.name)}</b>(이)래요. 나는?</div>` : ''}<div class="intro">${sparkles()}<span class="pill">8문항 · 약 1분</span><h1 class="rise">${lines(C.copy.intro.title)}</h1><p class="muted rise d1">${lines(C.copy.intro.subtitle)}</p><div class="tag-rail rise d2" aria-hidden="true"><div>${tags}${tags}</div></div></div><button id="start" class="primary glow rise d3">${esc(C.copy.intro.cta)} →</button><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><button class="small-button copy-link" id="copy-link">테스트 링크만 복사하기</button><div id="share-fallback"></div><p class="fine center disclaimer">${esc(C.copy.disclaimer)}</p>`);
    on('invite', () => share());
    on('copy-link', () => share(undefined, true));
    on('start', () => { track('start'); state = { gender: null, answers: [], at: Date.now() }; save(); genderScreen(); });
  }

  function genderScreen() {
    busy = false;
    const card = (gender, label, side) => `<button class="gender-card from-${side}" data-gender="${gender}"><span class="gender-mark" aria-hidden="true">${gender === 'female' ? '♀' : '♂'}</span><b>${esc(label)}</b><small>${candidates(gender).map(([, c]) => esc(c.name)).join(' · ')}</small></button>`;
    show(`<p class="eyebrow">NAME TAG</p><h2>${lines(C.copy.genderSelect.question)}</h2><p class="muted">고른 쪽의 이름 7개 중 하나가 결과로 나와요.<br>질문과 계산 방식은 똑같아요.</p><div class="gender-grid">${card('female', C.copy.genderSelect.female, 'left')}${card('male', C.copy.genderSelect.male, 'right')}</div><button id="back-home" class="small-button" style="width:100%;margin-top:14px">← 처음으로</button>`, 'fade');
    on('back-home', () => home());
    stage.querySelectorAll('[data-gender]').forEach(button => button.addEventListener('click', () => {
      if (busy) return; busy = true;
      state.gender = button.dataset.gender; state.answers = []; save();
      stage.querySelectorAll('[data-gender]').forEach(b => { b.disabled = true; b.classList.toggle('chosen', b === button); });
      track('gender');
      setTimeout(() => question(0, 'next'), reduced() ? 0 : 280);
    }));
  }

  function question(index, direction = 'next') {
    busy = false;
    const q = C.questions[index];
    const prevWidth = Math.round(index / N * 100), width = Math.round((index + 1) / N * 100);
    show(`<div class="progress-label"><button id="back" class="small-button" aria-label="이전 단계">← 이전</button><span>SCENE ${String(index + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}</span></div><div class="progress" role="progressbar" aria-label="답변 진행률" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${index + 1}"><i style="--from:${prevWidth}%;width:${width}%"></i></div><div class="scene"><span class="scene-chip">${esc(q.scene)}</span>${q.sceneLine ? `<p class="scene-line">${esc(q.sceneLine)}</p>` : ''}</div><h2 class="q-text">${lines(q.question)}</h2><div class="answers">${q.answers.map((answer, i) => `<button class="answer" style="--i:${i}" data-answer="${i}" aria-pressed="${state.answers[index] === i}"><span class="key">${'ABCD'[i]}</span><span>${esc(answer.text)}</span><span class="emoji" aria-hidden="true">${esc(answer.emoji)}</span></button>`).join('')}</div><p class="intro-note">끌리는 답을 누르면 바로 다음 장면으로 넘어가요.</p>`, direction === 'next' ? 'slide-next' : 'slide-prev');
    on('back', () => { if (busy) return; index ? question(index - 1, 'prev') : genderScreen(); });
    stage.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      if (busy) return; busy = true;
      state.answers[index] = Number(button.dataset.answer); state.answers = state.answers.slice(0, index + 1); save();
      stage.querySelectorAll('button').forEach(b => b.disabled = true);
      button.classList.add('selected');
      button.insertAdjacentHTML('beforeend', '<span class="burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>');
      if (!reduced()) navigator.vibrate?.(15);
      track('progress', { question_id: q.id });
      setTimeout(() => index < N - 1 ? question(index + 1, 'next') : (track('complete'), analyze()), reduced() ? 0 : 260);
    }));
  }

  async function analyze() {
    const current = ++generation;
    const names = candidates(state.gender).map(([, c]) => c.name);
    const [first, second, third] = C.copy.analyzing;
    show(`<div class="loading"><p class="eyebrow">SOLO NARA</p><div class="analyze-art" data-phase="1" aria-hidden="true"><div class="phase phase-cards"><i></i><i></i><i></i></div><div class="phase phase-bars">${AXES.map(a => `<div><span>${esc(C.copy.result.axisLabels[a])}</span><b><i></i></b></div>`).join('')}</div><div class="phase phase-name"><div class="name-roll">${esc(names[0])}</div></div></div><h2 id="analyze-text">${esc(first)}</h2><div class="loadbar"><i></i></div></div>`, 'fade');
    const art = stage.querySelector('.analyze-art'), text = document.getElementById('analyze-text');
    await wait(900); if (current !== generation) return;
    art.dataset.phase = '2'; text.textContent = second;
    await wait(900); if (current !== generation) return;
    art.dataset.phase = '3'; text.textContent = third;
    const roll = stage.querySelector('.name-roll');
    if (!reduced()) for (let i = 1; i <= 9; i++) { await wait(70 + i * 8); if (current !== generation) return; roll.textContent = names[i % names.length]; }
    // The roll never lands on a name: the real result only exists after login, so it stops on a sealed tag.
    roll.textContent = '?'; roll.classList.add('sealed');
    await wait(450); if (current !== generation) return;
    busy = false; resolveResult();
  }

  function gate(message = '') {
    show(`<div class="center"><p class="eyebrow">READY TO REVEAL</p><h2>${lines(C.copy.loginGate.default)}</h2><div class="name-card sealed-card" aria-hidden="true"><small>${esc(C.copy.result.heading)}</small><div class="name-face">?</div><span class="pill">이름표 봉인 중</span></div></div><button id="login" class="primary glow">로그인하고 이름 확인하기 →</button><button id="retry" class="small-button" style="width:100%;margin-top:12px">이미 로그인했어요 · 다시 확인</button><p class="fine center">답변은 이 탭에서 최대 2시간 동안 유지돼요.<br>성별과 답변은 결과 계산에만 쓰고 공유하지 않아요.</p><p id="gate-error" class="error" role="alert">${esc(message)}</p>`, 'fade');
    on('login', () => { track('login'); save(); if (!storageOK) { document.getElementById('gate-error').textContent = '브라우저 저장 공간을 사용할 수 없어 답변을 보관하지 못했어요. 저장을 허용한 뒤 다시 눌러주세요.'; return; } location.href = window.UMSHCommonAuth ? window.UMSHCommonAuth.commonLoginUrl('solo-nara', '/play/solo-nara/') : '/signup?entry=solo-nara&returnTo=' + encodeURIComponent('/play/solo-nara/') + '#login'; });
    on('retry', resolveResult);
  }

  async function resolveResult() {
    if (busy || preview) return;
    busy = true; const current = generation;
    show(`<div class="loading"><p class="eyebrow">SOLO NARA</p><div class="name-card sealed-card small" aria-hidden="true"><div class="name-face">?</div></div><h2>이름표를 열고 있어요.</h2><p class="muted">로그인 상태를 확인하고 있어요.</p></div>`, 'fade');
    try {
      if (!window.UMSHAuthSession) throw Error('auth-unavailable');
      if (!auth.config) {
        const configResponse = await fetch('/api/auth/config', { signal: AbortSignal.timeout(10000) });
        if (!configResponse.ok) throw Error('auth-config');
        auth.config = await configResponse.json();
      }
      if (!auth.config.enabled) { gate('지금은 로그인 연결을 사용할 수 없어요. 잠시 후 다시 확인해주세요.'); return; }
      // Refresh from the live client on every attempt; never trust an old cached access token.
      auth.session = null;
      const session = await window.UMSHAuthSession.bindServiceSession(auth, 1600);
      if (auth.client && !auth.listening) {
        auth.listening = true;
        auth.client.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { generation++; busy = false; gate('로그아웃되었어요. 다시 로그인하면 결과를 확인할 수 있어요.'); } });
      }
      if (current !== generation) return;
      if (!session) { gate('로그인이 필요해요. 로그인하고 이름을 확인해주세요.'); return; }
      const response = await fetch('/api/play/solo-nara/result', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ gender: state.gender, answers: state.answers }), signal: AbortSignal.timeout(15000) });
      if (current !== generation) return;
      if (response.status === 401) { gate('로그인이 만료되었어요. 다시 로그인해주세요.'); return; }
      if (!response.ok) throw Error('result');
      const data = await response.json();
      if (!isType(data.type) || C.characters[data.type].gender !== state.gender || !data.scores || AXES.some(a => !Number.isFinite(data.scores[a]) || data.scores[a] < 0 || data.scores[a] > 100)) throw Error('result-shape');
      renderResult(data);
    } catch (error) { if (current === generation) gate(error.name === 'TimeoutError' ? '연결이 늦어지고 있어요. 잠시 후 다시 확인해주세요.' : '결과를 불러오지 못했어요. 답변은 유지되어 있으니 다시 확인해주세요.'); }
    finally { busy = false; }
  }

  function matchCard(kind, me, partnerType, reason) {
    const partner = C.characters[partnerType];
    return `<div class="match ${kind}"><p class="eyebrow">${kind === 'best' ? 'BEST MATCH' : 'DANGER MATCH'}</p><div class="match-pair" aria-hidden="true"><span class="mini-tag">${esc(me)}</span><i class="match-line"></i><span class="mini-tag partner">${esc(partner.name)}</span></div><p class="match-name"><b>${esc(partner.name)}</b><small> · ${esc(partner.title)}</small></p><p class="match-reason">${esc(reason)}</p></div>`;
  }

  function renderResult(data, sample = false) {
    const c = C.characters[data.type];
    if (!sample) track('result_view', { result_character: data.type });
    const robot = document.createElement('meta'); robot.name = 'robots'; robot.content = 'noindex'; document.head.appendChild(robot);
    const picker = sample ? `<div class="sample-banner">디자인 미리보기 · 실제 개인 결과가 아닌 샘플입니다</div><div class="sample-types">${Object.entries(C.characters).map(([id, x]) => `<button data-type="${id}" aria-pressed="${id === data.type}">${esc(x.name)}</button>`).join('')}</div>` : '';
    show(`${picker}<div class="reveal"><p class="eyebrow">${esc(C.copy.result.heading)}</p><div class="name-card revealing"><div class="name-flip"><div class="name-face back" aria-hidden="true">?</div><div class="name-face front"><small>SOLO NARA NAME</small><strong>${esc(c.name)}</strong></div></div></div><h1 class="result-title after">${esc(c.title)}</h1><p class="quote after">“${esc(c.oneLiner)}”</p><div class="keywords after">${c.keywords.map(k => `<span>#${esc(k)}</span>`).join('')}</div></div><div class="after-group"><p class="readout">${esc(c.description)}</p><div class="ticket"><div class="ticket-top"><span>나의 연애 스타일</span><span>✦ UMSH</span></div><div class="stats">${AXES.map(a => `<div class="stat"><div class="stat-label"><span>${esc(C.copy.result.axisLabels[a])}</span><b>${Math.round(data.scores[a])}<small> /100</small></b></div><div class="bar" role="meter" aria-label="${esc(C.copy.result.axisLabels[a])}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(data.scores[a])}"><i style="width:${data.scores[a]}%"></i></div></div>`).join('')}</div></div><div class="pros-cons"><div><b>연애할 때 강점</b><p>${esc(c.strength)}</p></div><div><b>연애할 때 주의점</b><p>${esc(c.weakness)}</p></div></div><div class="tip"><b>솔로나라 한 줄 팁</b><p>${esc(c.tip)}</p></div>${matchCard('best', c.name, c.best, c.bestReason)}${matchCard('danger', c.name, c.danger, c.dangerReason)}<div class="bridge"><p>${lines(C.copy.result.fortuneBridge.replace('{name}', c.name))}</p><a class="primary result-cta" id="fortune" href="${esc(C.copy.fortuneCta.url)}">${esc(C.copy.fortuneCta.label)} ↗</a></div><div class="action-row"><button class="secondary" id="share">${esc(C.copy.result.share)} ↗</button><button class="secondary" id="restart">${esc(C.copy.result.retry)} ↻</button></div><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><button class="small-button copy-link" id="copy-link">테스트 링크만 복사하기</button><div id="share-fallback"></div><details class="context"><summary>이 결과는 어떻게 나왔나요?</summary><p>8개 답변에 미리 정해 둔 점수를 더해 네 가지 성향을 계산하고, 가장 가까운 캐릭터를 골랐어요. 같은 답을 고르면 언제나 같은 결과가 나와요.</p><p>재미로 보는 성향 테스트이며 과학적 성격 진단이나 연애 예측이 아니에요.</p></details><p class="fine center">결과 공유에는 캐릭터 이름만 담겨요.<br>성별, 답변, 점수는 담기지 않아요.</p><p class="fine center disclaimer">${esc(C.copy.disclaimer)}</p></div>`, 'fade');
    on('fortune', () => track('fortune'));
    on('restart', () => { track('restart'); clear(); if (preview) location.href = './'; else home(); });
    on('share', () => share(data.type));
    on('invite', () => share());
    on('copy-link', () => share(undefined, true));
    stage.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => sampleResult(button.dataset.type)));
  }

  async function share(type, copyOnly = false) {
    track(copyOnly ? 'copy' : 'share');
    const valid = isType(type) ? type : null;
    const url = 'https://umsh.kr/play/solo-nara/' + (valid ? '?type=' + encodeURIComponent(valid) + '&src=share' : '?src=share');
    const payload = { title: C.copy.sharePreview.title, text: valid ? C.characters[valid].shareText : C.copy.sharePreview.description, url };
    try { if (!copyOnly && navigator.share) { await navigator.share(payload); track('share_success'); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); notice(valid ? '캐릭터 이름만 담은 링크를 복사했어요.' : '테스트 링크를 복사했어요. 친구에게 보내보세요!'); }
    catch { document.getElementById('share-fallback').innerHTML = `<p class="fine" style="margin-top:16px">아래 링크를 길게 눌러 복사해주세요.</p><input class="share-url" aria-label="공유 링크" readonly value="${esc(url)}">`; }
  }

  // Preview scores are fixed placeholders; real scores only come from the authenticated result API.
  function sampleResult(type = Object.keys(C.characters)[0]) { renderResult({ type, scores: { direct: 72, express: 58, stability: 41, independence: 66 } }, true); }

  if (preview) { sampleResult(); return; }
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    const fresh = saved && Date.now() - saved.at < 7200000 && Date.now() >= saved.at;
    const valid = fresh && (saved.gender === 'female' || saved.gender === 'male' || (saved.gender === null && Array.isArray(saved.answers) && !saved.answers.length)) && Array.isArray(saved.answers) && saved.answers.length <= N && saved.answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3);
    if (valid) state = saved; else clear();
  } catch { clear(); }
  const shared = new URLSearchParams(location.search).get('type');
  // Remove arbitrary tracking/PII parameters before any authentication redirect or share action.
  history.replaceState(null, '', location.pathname + (isType(shared) ? '?type=' + shared : ''));
  if (isType(shared)) home(shared);
  else if (state.gender && state.answers.length === N) resolveResult();
  else if (state.gender && state.answers.length) question(state.answers.length);
  else home();
})();
