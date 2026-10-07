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
  // Answers survive login even when the provider returns in another tab (email links, app hand-offs):
  // the tab copy is preferred, the device copy is the fallback. Both expire after 2 hours and hold no personal data.
  function save() {
    state.at = Date.now(); const json = JSON.stringify(state); let ok = false;
    for (const store of [sessionStorage, localStorage]) { try { store.setItem(KEY, json); ok = true; } catch {} }
    storageOK = ok;
  }
  function clear() { for (const store of [sessionStorage, localStorage]) { try { store.removeItem(KEY); } catch {} } }
  function readSaved() { for (const store of [sessionStorage, localStorage]) { try { const raw = store.getItem(KEY); if (raw) return JSON.parse(raw); } catch {} } return null; }
  function show(html, motion = 'pop') { stage.innerHTML = `<section class="screen ${motion}">${html}</section>`; stage.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function on(id, handler) { const el = document.getElementById(id); if (el) el.addEventListener('click', handler); }
  function notice(message) { const el = document.getElementById('notice'); el.textContent = message; el.className = 'show'; setTimeout(() => el.className = '', 3000); }
  // Upper-body silhouettes drawn inline (no image requests); the mark sits on the face.
  function silhouette(gender, mark = '?') {
    const body = gender === 'male'
      ? '<path class="b" d="M8 140c2-38 22-60 52-60s50 22 52 60Z"/><rect class="b" x="52" y="58" width="16" height="40" rx="4"/><circle class="h" cx="60" cy="46" r="21"/><path class="d" d="M38 46C35 26 46 17 60 17s25 9 22 29c-4-9-12-14-22-14s-18 5-22 14Z"/>'
      : '<path class="d" d="M32 72C27 42 39 16 60 16s33 26 28 56c3 16-1 32-5 40H37c-4-8-8-24-5-40Z"/><path class="b" d="M16 140c2-36 18-56 44-56s42 20 44 56Z"/><rect class="b" x="52" y="62" width="16" height="38" rx="4"/><circle class="h" cx="60" cy="48" r="21"/>';
    return `<svg class="sil ${gender}" viewBox="0 0 120 140" aria-hidden="true">${body}${mark ? `<text x="60" y="${gender === 'male' ? 55 : 57}" text-anchor="middle">${esc(mark)}</text>` : ''}</svg>`;
  }

  function home(shared) {
    generation++; busy = false;
    const friend = shared ? C.characters[shared] : null;
    const tags = Object.values(C.characters).map(c => `<span>${esc(c.name)}</span>`).join('');
    // Full-height portrait art carries the title; an editorial strip below holds the real start button.
    show(`${friend ? `<div class="sample-banner">친구는 솔로나라에서 <b>${esc(friend.name)}</b>(이)래요. 나는?</div>` : ''}<div class="hero grain"><img src="./hero.webp?v=4" width="900" height="1599" alt=""><h1 class="sr-only">${esc(C.copy.intro.title.replace(/\n/g, ' '))}</h1><div class="hero-cta"><p class="hero-meta"><span><b>${N}</b> 문항</span><span><b>${Object.keys(C.characters).length}</b> 가지 이름</span><span><b>1</b> 분이면 끝</span></p><button id="start" class="start-button">${esc(C.copy.intro.cta)}<span aria-hidden="true">→</span></button></div></div><div class="intro-strip"><div class="tag-rail" aria-hidden="true"><div>${tags}${tags}</div></div></div><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><button class="small-button copy-link" id="copy-link">테스트 링크만 복사하기</button><div id="share-fallback"></div><p class="fine center disclaimer">${esc(C.copy.disclaimer)}</p>`);
    on('invite', () => share());
    on('copy-link', () => share(undefined, true));
    const begin = () => { track('start'); state = { gender: null, answers: [], at: Date.now() }; save(); genderScreen(); };
    on('start', begin);
  }

  function genderScreen() {
    busy = false;
    const card = (gender, label, side) => `<button class="gender-card from-${side}" data-gender="${gender}">${silhouette(gender)}<b>${esc(label)}</b><small>${[0, 3].map(start => `<span>${candidates(gender).slice(start, start ? undefined : 3).map(([, c]) => esc(c.name)).join(' · ')}</span>`).join('')}</small></button>`;
    show(`<p class="eyebrow">이름 정하기</p><h2>${lines(C.copy.genderSelect.question)}</h2><p class="muted">고른 쪽의 이름 7개 중 하나가 결과로 나와요.<br>질문과 계산 방식은 똑같아요.</p><div class="gender-grid">${card('female', C.copy.genderSelect.female, 'left')}${card('male', C.copy.genderSelect.male, 'right')}</div><button id="back-home" class="small-button" style="width:100%;margin-top:14px">← 처음으로</button>`, 'fade');
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
    const pad = n => String(n).padStart(2, '0');
    show(`<div class="progress-label"><button id="back" class="small-button" aria-label="이전 단계">← 이전</button><span>${pad(index + 1)} / ${pad(N)}</span></div><div class="progress" role="progressbar" aria-label="답변 진행률" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${index + 1}"><i style="--from:${prevWidth}%;width:${width}%"></i></div><div class="q-num" aria-hidden="true">${pad(index + 1)}<small> / ${N}</small></div><p class="kicker">${esc(q.scene)}</p>${q.sceneLine ? `<p class="scene-line">${esc(q.sceneLine)}</p>` : ''}<h2 class="q-text">${lines(q.question)}</h2><div class="answers">${q.answers.map((answer, i) => `<button class="answer" style="--i:${i}" data-answer="${i}" aria-pressed="${state.answers[index] === i}"><span class="key">${'ABCD'[i]}</span><span>${esc(answer.text)}</span></button>`).join('')}</div><p class="intro-note">끌리는 답을 누르면 바로 다음 장면으로 넘어가요.</p>`, direction === 'next' ? 'slide-next' : 'slide-prev');
    on('back', () => { if (busy) return; index ? question(index - 1, 'prev') : genderScreen(); });
    stage.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      if (busy) return; busy = true;
      state.answers[index] = Number(button.dataset.answer); state.answers = state.answers.slice(0, index + 1); save();
      stage.querySelectorAll('button').forEach(b => b.disabled = true);
      button.classList.add('selected');
      if (!reduced()) navigator.vibrate?.(15);
      track('progress', { question_id: q.id });
      setTimeout(() => index < N - 1 ? question(index + 1, 'next') : (track('complete'), analyze()), reduced() ? 0 : 260);
    }));
  }

  async function analyze() {
    const current = ++generation;
    const [first, second, third] = C.copy.analyzing;
    show(`<div class="loading"><p class="eyebrow">솔로나라</p><div class="analyze-art" data-phase="1" aria-hidden="true"><div class="phase phase-cards"><i></i><i></i><i></i></div><div class="phase phase-bars">${AXES.map(a => `<div><span>${esc(C.copy.result.axisLabels[a])}</span><b><i></i></b></div>`).join('')}</div><div class="phase phase-reel"><div class="reel"><div class="reel-track">${Array.from({ length: 21 }, () => `<span class="reel-item">${silhouette(state.gender)}</span>`).join('')}</div></div></div></div><h2 id="analyze-text">${esc(first)}</h2><div class="loadbar"><i></i></div></div>`, 'fade');
    const art = stage.querySelector('.analyze-art'), text = document.getElementById('analyze-text');
    await wait(700); if (current !== generation) return;
    art.dataset.phase = '2'; text.textContent = second;
    await wait(700); if (current !== generation) return;
    art.dataset.phase = '3'; text.textContent = third;
    // Silhouettes slide past and slow down on one "?" figure; the real name only exists after login.
    const reel = stage.querySelector('.reel'), track = stage.querySelector('.reel-track'), items = track.children, pick = 17;
    const step = items[1].offsetLeft - items[0].offsetLeft;
    const end = -(items[pick].offsetLeft + items[pick].offsetWidth / 2 - reel.clientWidth / 2);
    if (reduced() || !track.animate) track.style.transform = `translateX(${end}px)`;
    else await track.animate([{ transform: `translateX(${end + step * 12}px)` }, { transform: `translateX(${end}px)` }], { duration: 1500, easing: 'cubic-bezier(.12,.7,.18,1)', fill: 'forwards' }).finished.catch(() => {});
    if (current !== generation) return;
    items[pick].classList.add('picked');
    await wait(550); if (current !== generation) return;
    busy = false; resolveResult();
  }

  function gate(message = '') {
    show(`<div class="center"><p class="eyebrow">이름 공개 직전</p><h2>${lines(C.copy.loginGate.default)}</h2><div class="name-card sealed-card" aria-hidden="true"><small>${esc(C.copy.result.heading)}</small>${silhouette(state.gender || 'female')}<span class="seal">이름표 봉인 중</span></div></div><button id="login" class="primary">로그인하고 이름 확인하기 →</button><button id="retry" class="small-button" style="width:100%;margin-top:12px">이미 로그인했어요 · 다시 확인</button><p class="fine center">로그인하고 돌아오면 답변이 그대로 남아 있어요. (최대 2시간)<br>성별과 답변은 결과 계산에만 쓰고 공유하지 않아요.</p><p id="gate-error" class="error" role="alert">${esc(message)}</p>`, 'fade');
    on('login', () => { track('login'); save(); if (!storageOK) { document.getElementById('gate-error').textContent = '브라우저 저장 공간을 사용할 수 없어 답변을 보관하지 못했어요. 저장을 허용한 뒤 다시 눌러주세요.'; return; } location.href = window.UMSHCommonAuth ? window.UMSHCommonAuth.commonLoginUrl('solo-nara', '/play/solo-nara/') : '/signup?entry=solo-nara&returnTo=' + encodeURIComponent('/play/solo-nara/') + '#login'; });
    on('retry', resolveResult);
  }

  async function resolveResult() {
    if (busy || preview) return;
    busy = true; const current = generation;
    new Image().src = './result-card.webp?v=2';
    show(`<div class="loading"><p class="eyebrow">솔로나라</p><div class="name-card sealed-card small" aria-hidden="true">${silhouette(state.gender || 'female')}</div><h2>이름표를 열고 있어요.</h2><p class="muted">로그인 상태를 확인하고 있어요.</p></div>`, 'fade');
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
    return `<div class="match ${kind}"><p class="eyebrow">${kind === 'best' ? '잘 맞는 상대' : '부딪히기 쉬운 상대'}</p><div class="match-pair" aria-hidden="true"><span class="mini-tag">${esc(me)}</span><i class="match-line"></i><span class="mini-tag partner">${esc(partner.name)}</span></div><p class="match-name"><b>${esc(partner.name)}</b><small> · ${esc(partner.title)}</small></p><p class="match-reason">${esc(reason)}</p></div>`;
  }

  function renderResult(data, sample = false) {
    const c = C.characters[data.type];
    if (!sample) track('result_view', { result_character: data.type });
    const robot = document.createElement('meta'); robot.name = 'robots'; robot.content = 'noindex'; document.head.appendChild(robot);
    show(`<div class="reveal"><p class="eyebrow">${esc(C.copy.result.heading)}</p><div class="name-card revealing"><div class="name-flip"><div class="name-face back" aria-hidden="true">${silhouette(c.gender)}</div><div class="name-face front"><img class="card-art" src="./result-card.webp?v=2" width="640" height="800" alt=""><span class="tag-text"><small>솔로나라 이름</small><strong>${esc(c.name)}</strong></span></div></div></div><h1 class="result-title after">${esc(c.title)}</h1><p class="quote after">“${esc(c.oneLiner)}”</p><div class="keywords after">${c.keywords.map(k => `<span>#${esc(k)}</span>`).join('')}</div></div><div class="after-group"><p class="readout">${esc(c.description)}</p><div class="ticket"><div class="ticket-top"><span>나의 연애 스타일</span></div><div class="stats">${AXES.map(a => `<div class="stat"><div class="stat-label"><span>${esc(C.copy.result.axisLabels[a])}</span><b>${Math.round(data.scores[a])}<small> /100</small></b></div><div class="bar" role="meter" aria-label="${esc(C.copy.result.axisLabels[a])}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(data.scores[a])}"><i style="width:${data.scores[a]}%"></i></div></div>`).join('')}</div></div><div class="pros-cons"><div><b>연애할 때 강점</b><p>${esc(c.strength)}</p></div><div><b>연애할 때 주의점</b><p>${esc(c.weakness)}</p></div></div><div class="tip"><b>솔로나라 한 줄 팁</b><p>${esc(c.tip)}</p></div>${matchCard('best', c.name, c.best, c.bestReason)}${matchCard('danger', c.name, c.danger, c.dangerReason)}<div class="bridge"><p>${lines(C.copy.result.fortuneBridge.replace('{name}', c.name))}</p><a class="primary result-cta" id="fortune" href="${esc(C.copy.fortuneCta.url)}">${esc(C.copy.fortuneCta.label)} ↗</a></div><div class="action-row"><button class="secondary" id="share">${esc(C.copy.result.share)} ↗</button><button class="secondary" id="restart">${esc(C.copy.result.retry)} ↻</button></div><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><button class="small-button copy-link" id="copy-link">테스트 링크만 복사하기</button><div id="share-fallback"></div></div>`, 'fade');
    on('fortune', () => track('fortune'));
    on('restart', () => { track('restart'); clear(); if (preview) location.href = './'; else home(); });
    on('share', () => share(data.type));
    on('invite', () => share());
    on('copy-link', () => share(undefined, true));
  }

  // Kakao JavaScript key is public by design (it only works on domains registered in Kakao Developers).
  const KAKAO_JS_KEY = '';
  const KAKAO_SDK = { src: 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js', integrity: 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka' };
  // Our Android app shell does not hand Kakao's intent:// links to KakaoTalk yet, so the button stays web-only.
  const kakaoShareOK = () => !!KAKAO_JS_KEY && !window.Capacitor?.isNativePlatform?.();
  let kakaoReady = null;
  function loadKakao() {
    if (!kakaoShareOK()) return Promise.reject(new Error('no key'));
    kakaoReady ||= new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = KAKAO_SDK.src; s.integrity = KAKAO_SDK.integrity; s.crossOrigin = 'anonymous';
      s.onload = () => { try { if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY); resolve(window.Kakao); } catch (e) { reject(e); } };
      s.onerror = () => { kakaoReady = null; reject(new Error('load failed')); };
      document.head.appendChild(s);
    });
    return kakaoReady;
  }
  // Android WebView (our app, KakaoTalk/Naver in-app browsers) has no navigator.share.
  function sharePayload(type) {
    const valid = isType(type) ? type : null;
    const url = 'https://umsh.kr/play/solo-nara/' + (valid ? '?type=' + encodeURIComponent(valid) + '&src=share' : '?src=share');
    return { valid, url, title: C.copy.sharePreview.title, text: valid ? C.characters[valid].shareText : C.copy.sharePreview.description };
  }
  function share(type, copyOnly = false) {
    if (copyOnly) { track('copy'); copyLink(sharePayload(type)); return; }
    track('share');
    // The phone's own share sheet wins wherever it exists (phone Chrome/Safari, the app once it ships
    // the Share plugin). Android WebViews (KakaoTalk/Naver in-app browsers) have none, so they get our sheet.
    const p = sharePayload(type), Native = window.Capacitor?.Plugins?.Share;
    if (navigator.share) nativeShare(p);
    else if (Native) Native.share({ title: p.title, text: p.text, url: p.url, dialogTitle: '친구에게 보내기' }).then(() => track('share_success'), () => {});
    else openSheet(p);
  }
  async function copyLink(p) {
    try { await navigator.clipboard.writeText(p.url); notice(p.valid ? '캐릭터 이름만 담은 링크를 복사했어요.' : '테스트 링크를 복사했어요. 친구에게 보내보세요!'); }
    catch { const box = document.getElementById('share-fallback'); if (box) box.innerHTML = `<p class="fine" style="margin-top:16px">아래 링크를 길게 눌러 복사해주세요.</p><input class="share-url" aria-label="공유 링크" readonly value="${esc(p.url)}">`; }
  }
  async function nativeShare(p) {
    try { await navigator.share({ title: p.title, text: p.text, url: p.url }); track('share_success'); }
    catch (e) { if (e.name !== 'AbortError') copyLink(p); }
  }
  function openSheet(p) {
    closeSheet();
    // Load the SDK as soon as the sheet opens so the Kakao tap still counts as a user gesture (PC opens a popup).
    loadKakao().catch(() => {});
    const opener = document.activeElement;
    const wrap = document.createElement('div');
    wrap.id = 'share-sheet';
    wrap.innerHTML = `<div class="sheet-backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><p class="eyebrow" id="sheet-title">${p.valid ? '내 결과 공유하기' : '친구에게 테스트 보내기'}</p>${kakaoShareOK() ? '<button class="primary sheet-kakao" id="sheet-kakao">카카오톡으로 보내기</button>' : ''}${navigator.share ? '<button class="secondary" id="sheet-native">다른 앱으로 보내기 ↗</button>' : ''}<button class="secondary" id="sheet-copy">링크 복사하기</button><button class="small-button" data-close>닫기</button></div>`;
    document.body.appendChild(wrap);
    const close = () => { closeSheet(); opener?.focus?.(); };
    wrap.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
    wrap.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    wrap.querySelector('#sheet-copy').addEventListener('click', () => { close(); copyLink(p); });
    wrap.querySelector('#sheet-native')?.addEventListener('click', () => { close(); nativeShare(p); });
    wrap.querySelector('#sheet-kakao')?.addEventListener('click', async () => {
      try {
        const Kakao = await loadKakao();
        Kakao.Share.sendDefault({ objectType: 'feed', content: { title: p.title, description: p.text, imageUrl: 'https://umsh.kr/play/solo-nara/share-banner-v1.jpg', imageWidth: 1200, imageHeight: 630, link: { mobileWebUrl: p.url, webUrl: p.url } }, buttons: [{ title: p.valid ? '나도 해보기' : '테스트 하러 가기', link: { mobileWebUrl: p.url, webUrl: p.url } }] });
        close();
      } catch { close(); notice('카카오톡을 열지 못했어요. 링크를 복사해 보내주세요.'); copyLink(p); }
    });
    wrap.querySelector('.sheet button').focus();
  }
  function closeSheet() { document.getElementById('share-sheet')?.remove(); }

  // Preview scores are fixed placeholders; real scores only come from the authenticated result API.
  function sampleResult(type = Object.keys(C.characters)[0]) { renderResult({ type, scores: { direct: 72, express: 58, stability: 41, independence: 66 } }, true); }

  if (preview) { sampleResult(); return; }
  try {
    const saved = readSaved();
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
