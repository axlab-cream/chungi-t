(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const C = window.UMSHSoloNaraContent;
  if (!C) { stage.innerHTML = '<p class="error">테스트를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.</p>'; return; }
  // v3 answers are not compatible with the old name test, so the storage key moved on.
  const KEY = 'umsh:solo-nara:v3';
  const N = C.questions.length;
  const preview = location.pathname.endsWith('/preview.html');
  const track = (action, extra) => { try { if (!preview) window.UMSHSoloNaraTelemetry?.track(action, extra); } catch { /* Measurement must never block the game. */ } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? Math.min(ms, 60) : ms));
  let state = { answers: [], at: Date.now() };
  let storageOK = true, busy = false, auth = {}, generation = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lines = value => esc(value).replace(/\n/g, '<br>');
  const isType = type => typeof type === 'string' && Object.hasOwn(C.types, type);
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
  // A face-down card: the "패" you are holding. Drawn inline so no image request is needed.
  function card(mark = '?') { return `<span class="pae" aria-hidden="true"><i>${esc(mark)}</i></span>`; }

  // 유형별 상징 그림(인라인 SVG). Kling 그림이 나오기 전 임시가 아니라, 카드 문양으로 계속 써도 되는 선화다.
  const ART = {
    dominator: '<circle cx="60" cy="34" r="20" fill="#d2553a" opacity=".14"/><path d="M60 14C66 24 72 28 68 36C66 40 62 40 60 38C58 40 54 40 52 36C48 28 56 22 60 14Z" fill="#d2553a"/><path d="M30 80L36 50L50 66L60 44L70 66L84 50L90 80Z" fill="#6e1212" stroke="#c9a45c" stroke-width="2" stroke-linejoin="round"/><rect x="28" y="80" width="64" height="9" rx="1" fill="#c9a45c"/><circle cx="36" cy="50" r="3" fill="#c9a45c"/><circle cx="60" cy="44" r="3" fill="#c9a45c"/><circle cx="84" cy="50" r="3" fill="#c9a45c"/><path d="M40 96H80" stroke="#c9a45c" stroke-width="1.2" opacity=".6"/>',
    gambler: '<g transform="rotate(-14 47 60)"><rect x="30" y="34" width="34" height="50" rx="4" fill="#140808" stroke="#c9a45c" stroke-width="2"/><path d="M47 49l6 10-6 10-6-10z" fill="#c9a45c"/></g><g transform="rotate(12 73 58)"><rect x="56" y="32" width="34" height="50" rx="4" fill="#6e1212" stroke="#c9a45c" stroke-width="2"/><path d="M73 50c-5-8-15 1 0 13c15-12 5-21 0-13z" fill="#f1e7dc"/></g><path d="M36 98Q60 110 84 96" fill="none" stroke="#d2553a" stroke-width="2"/><path d="M84 96l-8-1M84 96l-3 7" stroke="#d2553a" stroke-width="2" stroke-linecap="round"/>',
    seducer: '<path d="M60 58C57 72 63 84 58 106" stroke="#c9a45c" stroke-width="2.5" fill="none"/><path d="M59 72l-7-3M61 86l7-3M59 97l-6-2" stroke="#c9a45c" stroke-width="2" stroke-linecap="round"/><path d="M60 80C70 74 78 76 81 69C72 67 64 72 60 80Z" fill="#3a1b18" stroke="#c9a45c" stroke-width="1.5"/><circle cx="60" cy="42" r="19" fill="#6e1212" stroke="#c9a45c" stroke-width="2"/><path d="M60 29C69 33 71 44 60 49C51 44 51 35 60 29ZM47 40C51 51 65 55 73 44" fill="none" stroke="#d2553a" stroke-width="2"/><path d="M86 70c6 2 8 8 4 10c-4-2-6-6-4-10z" fill="#d2553a"/><path d="M32 86c5 1 7 6 4 8c-4-1-5-5-4-8z" fill="#d2553a" opacity=".7"/>',
    strategist: '<path d="M96 54L108 100" stroke="#c9a45c" stroke-width="2.5" stroke-linecap="round"/><path d="M22 50C38 40 52 42 60 50C68 42 82 40 98 50C98 68 86 78 74 76C67 75 63 68 60 63C57 68 53 75 46 76C34 78 22 68 22 50Z" fill="#140808" stroke="#c9a45c" stroke-width="2"/><path d="M60 50C68 42 82 40 98 50C98 68 86 78 74 76C67 75 63 68 60 63Z" fill="#6e1212" opacity=".85"/><path d="M34 58C39 53 47 53 52 59C46 62 39 62 34 58Z" fill="#d2553a"/><path d="M68 59C73 53 81 53 86 58C81 62 74 62 68 59Z" fill="#f1e7dc" opacity=".85"/><path d="M28 46C34 32 46 30 52 37M92 46C86 32 74 30 68 37" fill="none" stroke="#c9a45c" stroke-width="1.2"/>',
    designer: '<path d="M32 20H88M60 13V28" stroke="#c9a45c" stroke-width="3" stroke-linecap="round"/><path d="M36 20L46 68M60 28V60M84 20L74 68" stroke="#c9a45c" stroke-width="1" opacity=".85"/><path d="M60 100C39 85 33 75 37 65C41 56 54 56 60 67C66 56 79 56 83 65C87 75 81 85 60 100Z" fill="#6e1212" stroke="#d2553a" stroke-width="2"/><circle cx="46" cy="68" r="2" fill="#c9a45c"/><circle cx="60" cy="60" r="2" fill="#c9a45c"/><circle cx="74" cy="68" r="2" fill="#c9a45c"/>',
    savior: '<path d="M60 66C46 56 42 48 45 41C48 34 56 34 60 42C64 34 72 34 75 41C78 48 74 56 60 66Z" fill="#6e1212" stroke="#d2553a" stroke-width="2"/><path d="M60 42L56 50L62 54L58 62" fill="none" stroke="#f1e7dc" stroke-width="1.5"/><path d="M20 70C28 93 45 102 60 102C75 102 92 93 100 70C90 74 81 80 75 82C69 84 64 82 60 82C56 82 51 84 45 82C39 80 30 74 20 70Z" fill="#140808" stroke="#c9a45c" stroke-width="2"/><path d="M30 77C34 85 40 89 47 91M90 77C86 85 80 89 73 91" fill="none" stroke="#c9a45c" stroke-width="1.2"/><circle cx="60" cy="48" r="26" fill="#d2553a" opacity=".1"/>',
    observer: '<path d="M60 18V28M38 25L43 33M82 25L77 33M60 102V92M38 95L43 87M82 95L77 87" stroke="#c9a45c" stroke-width="1.5" stroke-linecap="round"/><path d="M14 60C33 33 87 33 106 60C87 87 33 87 14 60Z" fill="#140808" stroke="#c9a45c" stroke-width="2"/><circle cx="60" cy="60" r="17" fill="#6e1212" stroke="#d2553a" stroke-width="2"/><circle cx="60" cy="60" r="7" fill="#0b0708"/><circle cx="54" cy="54" r="2.6" fill="#f1e7dc"/>',
    devotee: '<path d="M66 96L112 110L106 114L58 100Z" fill="#000" opacity=".55"/><circle cx="60" cy="42" r="24" fill="#d2553a" opacity=".13"/><path d="M60 28C66 38 68 45 64 50C62 52 58 52 56 50C52 45 54 38 60 28Z" fill="#d2553a"/><path d="M60 38C62 42 62 46 60 49C58 46 58 42 60 38Z" fill="#f6d28a"/><path d="M60 51V56" stroke="#0b0708" stroke-width="1.5"/><rect x="51" y="56" width="18" height="40" rx="1" fill="#c9bbae"/><path d="M53 58c-2 5-2 9 0 12" stroke="#f1e7dc" stroke-width="2" fill="none"/><path d="M38 96H82L77 102H43Z" fill="#c9a45c"/>'
  };
  const TAROT_NUM = {'dominator': 'I', 'gambler': 'II', 'seducer': 'III', 'strategist': 'IV', 'designer': 'V', 'savior': 'VI', 'observer': 'VII', 'devotee': 'VIII'};
  const art = type => `<svg class="pae-art" viewBox="0 0 120 120" aria-hidden="true">${ART[type] || ''}</svg>`;

  function home(shared) {
    generation++; busy = false;
    const friend = shared ? C.types[shared] : null;
    const names = Object.values(C.types).map(t => `<span>${esc(t.name)}</span>`).join('');
    show(`${friend ? `<div class="sample-banner">친구의 숨겨진 본능은 <b>${esc(friend.name)}</b>래요. 나는?</div>` : ''}<div class="hero grain"><img src="./hero.webp?v=4" width="900" height="1599" alt=""><div class="hero-title"><p class="hero-eyebrow">${esc(C.copy.intro.eyebrow)}</p><h1>${lines(C.copy.intro.title)}</h1><p>${lines(C.copy.intro.subtitle)}</p></div><div class="hero-cta"><p class="hero-meta"><span><b>${N}</b> 문항</span><span><b>${Object.keys(C.types).length}</b> 가지 본능</span><span><b>1</b> 분이면 끝</span></p><button id="start" class="start-button">${esc(C.copy.intro.cta)}<span aria-hidden="true">→</span></button></div></div><div class="intro-strip"><div class="tag-rail" aria-hidden="true"><div>${names}${names}</div></div></div><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><button class="small-button copy-link" id="copy-link">테스트 링크만 복사하기</button><div id="share-fallback"></div><p class="fine center disclaimer">${esc(C.copy.disclaimer)}</p>`);
    on('invite', () => share());
    on('copy-link', () => share(undefined, true));
    on('start', () => { track('start'); state = { answers: [], at: Date.now() }; save(); question(0, 'next'); });
  }

  function question(index, direction = 'next') {
    busy = false;
    const q = C.questions[index];
    const prevWidth = Math.round(index / N * 100), width = Math.round((index + 1) / N * 100);
    const pad = n => String(n).padStart(2, '0');
    show(`<div class="progress-label"><button id="back" class="small-button" aria-label="이전 단계">← 이전</button><span>${pad(index + 1)} / ${pad(N)}</span></div><div class="progress" role="progressbar" aria-label="답변 진행률" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${index + 1}"><i style="--from:${prevWidth}%;width:${width}%"></i></div><div class="q-num" aria-hidden="true">${pad(index + 1)}<small> / ${N}</small></div><p class="kicker">${esc(q.scene)}</p>${q.sceneLine ? `<p class="scene-line">${esc(q.sceneLine)}</p>` : ''}<h2 class="q-text">${lines(q.question)}</h2><div class="answers">${q.answers.map((answer, i) => `<button class="answer" style="--i:${i}" data-answer="${i}" aria-pressed="${state.answers[index] === i}"><span class="key">${'ABCD'[i]}</span><span>${esc(answer.text)}</span></button>`).join('')}</div><p class="intro-note">끌리는 답을 누르면 바로 다음 장면으로 넘어가요.</p>`, direction === 'next' ? 'slide-next' : 'slide-prev');
    on('back', () => { if (busy) return; index ? question(index - 1, 'prev') : home(); });
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
    show(`<div class="loading"><p class="eyebrow">연애 본능 테스트</p><div class="analyze-art" data-phase="1" aria-hidden="true"><div class="phase phase-cards"><i></i><i></i><i></i></div><div class="phase phase-bars">${C.axes.map(a => `<div><span>${esc(a.a)}</span><b><i></i></b></div>`).join('')}</div><div class="phase phase-reel"><div class="reel"><div class="reel-track">${Array.from({ length: 21 }, () => `<span class="reel-item">${card()}</span>`).join('')}</div></div></div></div><h2 id="analyze-text">${esc(first)}</h2><div class="loadbar"><i></i></div></div>`, 'fade');
    const art = stage.querySelector('.analyze-art'), text = document.getElementById('analyze-text');
    await wait(700); if (current !== generation) return;
    art.dataset.phase = '2'; text.textContent = second;
    await wait(700); if (current !== generation) return;
    art.dataset.phase = '3'; text.textContent = third;
    // Face-down cards slide past and slow down on one; the real type only exists after login.
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
    show(`<div class="center"><p class="eyebrow">본능 공개 직전</p><h2>${lines(C.copy.loginGate.default)}</h2><div class="name-card sealed-card" aria-hidden="true"><small>${esc(C.copy.result.heading)}</small>${card()}<span class="seal">봉인 중</span></div></div><button id="login" class="primary">로그인하고 내 본능 확인하기 →</button><button id="retry" class="small-button" style="width:100%;margin-top:12px">이미 로그인했어요 · 다시 확인</button><p class="fine center">로그인하고 돌아오면 답변이 그대로 남아 있어요. (최대 2시간)<br>답변은 결과 계산에만 쓰고 공유하지 않아요.</p><p id="gate-error" class="error" role="alert">${esc(message)}</p>`, 'fade');
    on('login', () => { track('login'); save(); if (!storageOK) { document.getElementById('gate-error').textContent = '브라우저 저장 공간을 사용할 수 없어 답변을 보관하지 못했어요. 저장을 허용한 뒤 다시 눌러주세요.'; return; } location.href = window.UMSHCommonAuth ? window.UMSHCommonAuth.commonLoginUrl('solo-nara', '/play/solo-nara/') : '/signup?entry=solo-nara&returnTo=' + encodeURIComponent('/play/solo-nara/') + '#login'; });
    on('retry', resolveResult);
  }

  async function resolveResult() {
    if (busy || preview) return;
    busy = true; const current = generation;
    show(`<div class="loading"><p class="eyebrow">연애 본능 테스트</p><div class="name-card sealed-card small" aria-hidden="true">${card()}</div><h2>네 본능을 꺼내고 있어요.</h2><p class="muted">로그인 상태를 확인하고 있어요.</p></div>`, 'fade');
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
      if (!session) { gate('로그인이 필요해요. 로그인하고 내 본능을 확인해주세요.'); return; }
      const response = await fetch('/api/play/solo-nara/result', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ answers: state.answers }), signal: AbortSignal.timeout(15000) });
      if (current !== generation) return;
      if (response.status === 401) { gate('로그인이 만료되었어요. 다시 로그인해주세요.'); return; }
      if (!response.ok) throw Error('result');
      const data = await response.json();
      if (!isType(data.type) || !data.scores || C.axes.some(a => !Number.isFinite(data.scores[a.id]) || data.scores[a.id] < 0 || data.scores[a.id] > 100)) throw Error('result-shape');
      renderResult(data);
    } catch (error) { if (current === generation) gate(error.name === 'TimeoutError' ? '연결이 늦어지고 있어요. 잠시 후 다시 확인해주세요.' : '결과를 불러오지 못했어요. 답변은 유지되어 있으니 다시 확인해주세요.'); }
    finally { busy = false; }
  }

  function matchCard(kind, match) {
    const other = C.types[match.type];
    return `<div class="match ${kind}"><p class="eyebrow">${kind === 'weak' ? '너에게 빠지는 사람' : '이런 사람을 조심하세요'}</p><p class="match-name"><b>${esc(other.name)}</b></p><p class="match-hook">${esc(other.hook)}</p><p class="match-reason">${esc(match.reason)}</p></div>`;
  }

  // Each axis bar shows both poles; the side you leaned to is lit.
  function axisRow(axis, value) {
    const lean = value >= 50 ? 'a' : 'b', pct = lean === 'a' ? value : 100 - value;
    return `<div class="axis"><div class="axis-labels"><span class="${lean === 'a' ? 'on' : ''}">${esc(axis.a)}</span><b>${esc(lean === 'a' ? axis.a : axis.b)} ${pct}%</b><span class="${lean === 'b' ? 'on' : ''}">${esc(axis.b)}</span></div><div class="axis-bar" role="meter" aria-label="${esc(axis.a)} 쪽 비율" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><i style="left:${lean === 'a' ? 0 : value}%;width:${lean === 'a' ? value : 100 - value}%"></i></div></div>`;
  }

  function renderResult(data, sample = false) {
    const t = C.types[data.type];
    if (!sample) track('result_view', { result_character: data.type });
    const robot = document.createElement('meta'); robot.name = 'robots'; robot.content = 'noindex'; document.head.appendChild(robot);
    const list = items => `<ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    show(`<div class="reveal"><p class="eyebrow">${esc(C.copy.result.heading)}</p><div class="pae-card"><div class="tarot"><div class="t-frame"><i class="t-c tl"></i><i class="t-c tr"></i><i class="t-c bl"></i><i class="t-c br"></i><p class="t-num">${TAROT_NUM[data.type] || ''}</p><div class="t-window">${art(data.type)}</div><p class="t-name">${esc(t.name)}</p><p class="t-sub">연애 본능의 카드</p></div></div></div><p class="result-hook after">${esc(t.hook)}</p></div><div class="after-group">
<section class="r-block"><p class="eyebrow">1 · 상대가 처음 느끼는 너</p><p class="readout">${esc(t.surface)}</p></section>
<section class="r-block weapon"><p class="eyebrow">2 · 숨겨진 유혹 무기</p><h3>${esc(t.weapon.name)}</h3><p class="readout">${esc(t.weapon.text)}</p></section>
<section class="r-block"><p class="eyebrow">3 · 이 무기가 통하는 순간</p><p class="readout">${esc(t.weaponWhen)}</p></section>
<section class="r-block"><p class="eyebrow">4 · 연애할 때 강점과 빈틈</p><div class="pros-cons"><div><b>강점</b>${list(t.strengths)}</div><div><b>빈틈</b>${list(t.weaknesses)}</div></div></section>
<section class="r-block"><p class="eyebrow">5 · 너에게 빠지는 사람, 조심할 사람</p>${matchCard('weak', t.weak)}${matchCard('danger', t.danger)}</section>
<section class="r-block"><p class="eyebrow">6 · 이 판에서 둘 한 수</p><div class="tip"><p>${esc(t.move)}</p></div></section>
<section class="r-block"><p class="eyebrow">7 · 내 본능의 수치</p><div class="axes">${C.axes.map(a => axisRow(a, data.scores[a.id])).join('')}</div></section>
<div class="bridge"><p class="eyebrow">8 · 사주로 더 확인하기</p><p class="bridge-title">${esc(C.copy.result.bridgeTitle)}</p><p class="bridge-text">${lines(C.copy.result.bridgeText)}</p><a class="primary result-cta" id="fortune" href="${esc(C.copy.fortuneCta.url)}">${esc(C.copy.fortuneCta.label)} ↗</a></div>
<div class="action-row"><button class="secondary" id="share">${esc(C.copy.result.share)} ↗</button><button class="secondary" id="restart">${esc(C.copy.result.retry)} ↻</button></div><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><button class="small-button copy-link" id="copy-link">테스트 링크만 복사하기</button><div id="share-fallback"></div><p class="fine center disclaimer">${esc(C.copy.disclaimer)}</p></div>`, 'fade');
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
    return { valid, url, title: C.copy.sharePreview.title, text: valid ? C.types[valid].shareText : C.copy.sharePreview.description };
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
        Kakao.Share.sendDefault({ objectType: 'feed', content: { title: p.title, description: p.text, imageUrl: 'https://umsh.kr/play/solo-nara/share-banner-v4.jpg', imageWidth: 1200, imageHeight: 630, link: { mobileWebUrl: p.url, webUrl: p.url } }, buttons: [{ title: p.valid ? '나도 해보기' : '테스트 하러 가기', link: { mobileWebUrl: p.url, webUrl: p.url } }] });
        close();
      } catch { close(); notice('카카오톡을 열지 못했어요. 링크를 복사해 보내주세요.'); copyLink(p); }
    });
    wrap.querySelector('.sheet button').focus();
  }
  function closeSheet() { document.getElementById('share-sheet')?.remove(); }

  // Preview scores are fixed placeholders; real scores only come from the authenticated result API.
  function sampleResult(type = new URLSearchParams(location.search).get('type')) { renderResult({ type: isType(type) ? type : Object.keys(C.types)[0], scores: Object.fromEntries(C.axes.map((a, i) => [a.id, [71, 29, 67][i]])) }, true); }

  if (preview) { sampleResult(); return; }
  try {
    const saved = readSaved();
    const fresh = saved && Date.now() - saved.at < 7200000 && Date.now() >= saved.at;
    const valid = fresh && Array.isArray(saved.answers) && saved.answers.length <= N && saved.answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3);
    if (valid) state = { answers: saved.answers, at: saved.at }; else clear();
  } catch { clear(); }
  const shared = new URLSearchParams(location.search).get('type');
  // Remove arbitrary tracking/PII parameters before any authentication redirect or share action.
  history.replaceState(null, '', location.pathname + (isType(shared) ? '?type=' + shared : ''));
  if (isType(shared)) home(shared);
  else if (state.answers.length === N) resolveResult();
  else if (state.answers.length) question(state.answers.length);
  else home();
})();
