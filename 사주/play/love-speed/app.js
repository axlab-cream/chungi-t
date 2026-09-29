(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const KEY = 'umsh:love-speed:v1';
  const CTA = 'https://umsh.kr/love/this-year/01-step-1-story/index.html';
  const preview = location.pathname.endsWith('/preview.html');
  const types = {
    spark: { name: '불꽃급랭형', line: '시작은 100°C, 식는 건 순식간.', detail: '강한 끌림에 마음이 빠르게 움직여요. 기대와 다른 모습을 발견하면 설렘도 빨리 줄어드는 편이에요.', tip: '처음의 이미지와 다른 점 하나를 발견해도, 새로운 매력 하나를 더 찾아보세요.', stats: { ignition: 96, cooling: 59, holding: 18 } },
    arrow: { name: '직진몰입형', line: '마음이 켜지면, 오래 달리는 편.', detail: '좋아하는 마음을 행동으로 보여줘요. 설렘이 지나간 뒤에도 관계에 에너지를 쏟는 편이에요.', tip: '내 속도만큼 상대의 속도도 물어보세요. 서로 편한 연락 간격을 찾으면 좋아요.', stats: { ignition: 75, cooling: 25, holding: 78 } },
    frost: { name: '선택냉정형', line: '시작은 신중하게, 판단은 선명하게.', detail: '쉽게 마음을 주지는 않지만, 내 기준과 맞는지는 빠르게 알아차려요.', tip: '낯설어서 망설이는지, 정말 불편한지 구분해보세요.', stats: { ignition: 31, cooling: 81, holding: 44 } },
    deep: { name: '천천히깊게형', line: '천천히 데워져서, 깊고 오래.', detail: '첫눈의 불꽃보다 함께 쌓은 신뢰에 마음이 움직여요.', tip: '편안함이 호감이라면 작은 표현을 먼저 건네보세요.', stats: { ignition: 18, cooling: 19, holding: 94 } },
  };
  const questions = [
    ['내 마음에 쏙 드는 사람을 만났다.\n나는?', ['벌써 사귀는 상상을 한다','먼저 연락해 본다','상대도 나를 좋아하는지 살핀다','시간을 두고 알아간다'], ['💭','📱','👀','🐢']],
    ['서로 호감이 있는 사이.\n상대가 자주 연락하면?', ['하루 종일 연락해도 좋다','좋지만 내 할 일도 챙긴다','속도가 너무 빨라 부담스럽다','오히려 관심이 줄어든다'], ['🔥','😎','😳','🧊']],
    ['좋아하던 사람에게서\n기대와 다른 모습을 봤다면?', ['좋아하는 마음이 확 줄어든다','몇 번 더 만나 보고 판단한다','그 사람의 다른 좋은 점을 찾는다','그 모습만으로 판단하지 않는다'], ['❄️','🤔','🔍','❤️']],
    ['자주 연락하던 상대가\n오늘은 연락이 뜸하다면?', ['연락이 왔는지 계속 확인한다','내가 먼저 연락한다','나도 연락을 줄인다','별로 신경 쓰지 않는다'], ['📱','💬','😏','😌']],
    ['내가 연애에서\n가장 중요하게 생각하는 건?', ['처음부터 확 끌리는 느낌','서로 좋아하는 마음을 확인하는 것','알아갈수록 쌓이는 믿음','편안하게 오래 만나는 것'], ['⚡','💕','🤝','🌱']],
  ];
  let state = { answers: [], mbti: null, at: Date.now() };
  let storageOK = true, busy = false, auth = {}, result = null, generation = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  function save() { try { state.at = Date.now(); sessionStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; } }
  function clear() { try { sessionStorage.removeItem(KEY); } catch {} }
  function show(html) { stage.innerHTML = `<section class="screen">${html}</section>`; stage.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function on(id, handler) { const el = document.getElementById(id); if (el) el.addEventListener('click', handler); }
  function notice(message) { const el = document.getElementById('notice'); el.textContent = message; el.className = 'show'; setTimeout(() => el.className = '', 3000); }
  function artwork(resultMode = false) { return `<div class="${resultMode ? 'result-art' : 'hero-art'}" aria-hidden="true"><svg viewBox="0 0 360 240" fill="none"><defs><linearGradient id="heart" x1="120" y1="75" x2="230" y2="190" gradientUnits="userSpaceOnUse"><stop stop-color="#f4dc9c"/><stop offset="1" stop-color="#b38b3d"/></linearGradient></defs><path d="M51 186A143 143 0 0 1 309 186" stroke="#3c3829" stroke-width="2" stroke-dasharray="2 9"/><path d="M65 168A126 126 0 0 1 295 168" stroke="#e8c879" stroke-opacity=".5" stroke-width="1"/><g class="orbit"><path d="M180 192C164 179 106 139 106 109C106 72 150 62 180 97C210 62 254 72 254 109C254 139 196 179 180 192Z" fill="url(#heart)"/><path d="M127 109C126 91 144 85 158 99" stroke="#fff2c9" stroke-width="5" stroke-linecap="round"/><path d="M186 117L171 142H188L176 165" stroke="#735821" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g><path d="M73 65V81M65 73H81M278 94V110M270 102H286" stroke="#e8c879" stroke-width="2"/><circle cx="96" cy="177" r="3" fill="#ff846c"/><circle cx="273" cy="170" r="3" fill="#93d5e5"/><path d="M155 212H205" stroke="#665332"/></svg>${resultMode ? '' : '<span class="hot-label">FAST TO LOVE ↗</span><span class="cold-label">↘ QUICK TO COOL</span>'}</div>`; }
  function home(shared) {
    generation++; busy = false; result = null;
    show(`${shared ? `<div class="sample-banner">친구가 공유한 유형 · ${esc(types[shared].name)}</div>` : ''}<div class="center"><span class="pill">30초 연애 속도 테스트</span><h1>시작은 <em>풀악셀,</em><br>마음은 급정거?</h1><p class="muted">나, 금사빠야? 아니면 금사식이야?<br>다섯 장면으로 찾는 내 연애의 속도.</p></div>${artwork()}<div class="meta"><span><b>5</b> 문항</span><span><b>4</b> 가지 유형</span><span><b>30</b> 초면 끝</span></div><button class="primary" id="start">내 연애 엔진 켜기 <span>→</span></button><p class="intro-note">정답은 없어요. 평소의 나를 골라주세요.</p><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><p class="fine center invite-caption">너는 금사빠? 금사식? 같이 해보자!</p><button class="small-button copy-link" id="copy-link">링크만 복사하기</button><div id="share-fallback"></div>`);
    on('invite', () => share());
    on('copy-link', () => share(undefined, true));
    on('start', () => { state = { answers: [], mbti: null, at: Date.now() }; save(); mbtiScreen(); });
  }
  function mbtiScreen() {
    show(`<p class="eyebrow">BEFORE WE START</p><h2>MBTI도<br>살짝 알려줄래요?</h2><p class="muted">내 연애를 돌아보는 작은 힌트.<br>몰라도 테스트는 할 수 있어요.</p><div class="mbti-art center" aria-hidden="true">✦</div><label for="mbti">나의 MBTI</label><select id="mbti"><option value="">선택해주세요</option>${['E','I'].flatMap(e => ['N','S'].flatMap(n => ['T','F'].flatMap(t => ['J','P'].map(p => e+n+t+p)))).map(m => `<option${state.mbti === m ? ' selected' : ''}>${m}</option>`).join('')}</select><button class="primary" id="mbti-next">좋아, 시작할게요 →</button><button class="small-button" id="skip" style="width:100%;margin-top:12px">잘 모르겠어요 · 건너뛰기</button><p id="mbti-error" class="error" role="alert"></p>`);
    on('mbti-next', () => { const value = document.getElementById('mbti').value; if (!value) { document.getElementById('mbti-error').textContent = 'MBTI를 선택하거나 건너뛰기를 눌러주세요.'; return; } state.mbti = value; save(); question(0); });
    on('skip', () => { state.mbti = null; save(); question(0); });
  }
  function question(index) {
    busy = false;
    const q = questions[index];
    show(`<div class="progress-label"><button id="back" class="small-button" aria-label="이전 문항">← 이전</button><span>LOVE TEST · ${index+1} / 5</span></div><div class="progress" role="progressbar" aria-label="답변 진행률" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${index+1}">${questions.map((_,i) => `<i class="${i<=index ? 'done' : ''}"></i>`).join('')}</div><div class="question"><div class="q-number">0${index+1}<span style="color:var(--gold);font-size:26px"> /</span></div><h2>${esc(q[0]).replace('\n','<br>')}</h2><div class="answers">${q[1].map((answer,i) => `<button class="answer" data-answer="${i}" aria-pressed="${state.answers[index] === i}"><span class="key">${String.fromCharCode(65+i)}</span><span>${esc(answer)}</span><span class="emoji" aria-hidden="true">${q[2][i]}</span></button>`).join('')}</div></div><p class="intro-note">끌리는 답을 누르면 바로 넘어가요.</p>`);
    on('back', () => { if (busy) return; index ? question(index-1) : mbtiScreen(); });
    stage.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      if (busy) return; busy = true; state.answers[index] = Number(button.dataset.answer); state.answers = state.answers.slice(0,index+1); save();
      stage.querySelectorAll('button').forEach(b => b.disabled = true); button.classList.add('selected');
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(15);
      setTimeout(() => index < 4 ? question(index+1) : analyze(), 240);
    }));
  }
  function analyze() {
    show(`<div class="loading"><p class="eyebrow">LOVE ENGINE</p><div class="beating" aria-hidden="true">♥</div><h2>두근, 두근.<br>내 마음의 속도는?</h2><p class="muted">다섯 답변을 모으고 있어요.</p><div class="loadbar"><i></i></div><p class="fine">조금만 기다려주세요.</p></div>`);
    setTimeout(() => { busy = false; resolveResult(); }, 1600);
  }
  function gate(message = '') {
    show(`<div class="center"><p class="eyebrow">READY TO REVEAL</p><h2>내 연애 유형,<br>드디어 찾았어요.</h2><p class="muted">로그인하고 내 마음의 속도를 만나보세요.</p><div class="lock-card"><div class="lock-symbol" aria-hidden="true">♧</div><p>나의 LOVE TYPE</p><div class="locked-lines" aria-hidden="true"><i></i><i></i><i></i></div><span class="pill">결과 열기</span></div></div><button id="login" class="primary">로그인하고 결과 열기 →</button><button id="retry" class="small-button" style="width:100%;margin-top:12px">이미 로그인했어요 · 다시 확인</button><p class="fine center">등록한 사주가 있으면 함께 참고해요.<br>답변은 이 탭에서 최대 2시간 동안 유지돼요.</p><p id="gate-error" class="error" role="alert">${esc(message)}</p>`);
    on('login', () => { save(); if (!storageOK) { document.getElementById('gate-error').textContent = '브라우저 저장 공간을 사용할 수 없어 답변을 보관하지 못했어요. 저장을 허용한 뒤 다시 눌러주세요.'; return; } location.href = window.UMSHCommonAuth ? window.UMSHCommonAuth.commonLoginUrl('love-speed', '/play/love-speed/') : '/signup?entry=love-speed&returnTo=' + encodeURIComponent('/play/love-speed/') + '#login'; });
    on('retry', resolveResult);
  }
  async function resolveResult() {
    if (busy || preview) return;
    busy = true; const current = generation;
    show('<div class="loading"><p class="eyebrow">LOVE ENGINE</p><div class="beating" aria-hidden="true">♥</div><h2>내 결과를 열고 있어요.</h2><p class="muted">로그인 상태와 등록된 사주를 확인해요.</p></div>');
    const retry = document.getElementById('retry'); if (retry) { retry.disabled = true; retry.textContent = '로그인 확인 중…'; }
    try {
      if (!window.UMSHAuthSession) throw Error('로그인 연결을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.');
      if (!auth.config) {
        const configResponse = await fetch('/api/auth/config', { signal: AbortSignal.timeout(10000) });
        if (!configResponse.ok) throw Error('로그인 연결을 확인하지 못했어요. 다시 시도해주세요.');
        auth.config = await configResponse.json();
      }
      if (!auth.config.enabled) { gate('지금은 로그인 연결을 사용할 수 없어요. 잠시 후 다시 확인해주세요.'); return; }
      // Refresh from the live client on every attempt; never trust an old cached access token.
      auth.session = null;
      const session = await window.UMSHAuthSession.bindServiceSession(auth, 1600);
      if (auth.client && !auth.listening) {
        auth.listening = true;
        auth.client.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_OUT') { generation++; busy = false; result = null; gate('로그아웃되었어요. 다시 로그인하면 결과를 확인할 수 있어요.'); }
        });
      }
      if (current !== generation) return;
      if (!session) { gate('로그인이 필요해요. 로그인하고 결과를 열어주세요.'); return; }
      const response = await fetch('/api/play/love-speed/result', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` }, body: JSON.stringify({ answers: state.answers, mbti: state.mbti }), signal: AbortSignal.timeout(15000) });
      if (current !== generation) return;
      if (response.status === 401) { gate('로그인이 만료되었어요. 다시 로그인해주세요.'); return; }
      if (!response.ok) throw Error('결과를 불러오지 못했어요. 답변은 유지되어 있으니 다시 확인해주세요.');
      const data = await response.json();
      if (!Object.hasOwn(types, data.type) || !data.stats || Object.values(data.stats).some(n => !Number.isFinite(n) || n < 0 || n > 100)) throw Error('결과를 확인하지 못했어요. 다시 시도해주세요.');
      result = data; renderResult(data);
    } catch (error) { if (current === generation) gate(error.name === 'TimeoutError' ? '연결이 늦어지고 있어요. 잠시 후 다시 확인해주세요.' : '결과를 불러오지 못했어요. 답변은 유지되어 있으니 다시 확인해주세요.'); }
    finally { busy = false; }
  }
  function renderResult(data, sample = false) {
    const robot = document.createElement('meta'); robot.name = 'robots'; robot.content = 'noindex'; document.head.appendChild(robot);
    show(`${sample ? '<div class="sample-banner">디자인 미리보기 · 실제 개인 결과가 아닌 샘플입니다</div><div class="sample-types">'+Object.entries(types).map(([id,t]) => `<button data-type="${id}">${t.name}</button>`).join('')+'</div>' : ''}<div class="type-head"><p class="eyebrow">YOUR LOVE TYPE · 0${Object.keys(types).indexOf(data.type)+1}</p><h1>${esc(data.name)}</h1><p class="quote">“${esc(data.line)}”</p></div><div class="ticket"><div class="ticket-top"><span>LOVE TEMPERATURE</span><span>✦ UMSH</span></div>${artwork(true)}<div class="stats">${[['ignition','점화속도','높을수록 빠른 시작'],['cooling','냉각속도','높을수록 빠른 식음'],['holding','관계유지력','높을수록 꾸준함']].map(([key,name,label]) => `<div class="stat"><div class="stat-label"><span>${name} <small>· ${label}</small></span><b>${data.stats[key]}<small> /100</small></b></div><div class="bar" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${data.stats[key]}"><i style="width:${data.stats[key]}%"></i></div></div>`).join('')}</div></div><p class="readout">${esc(data.detail)}</p><div class="tip"><b>나를 위한 작은 힌트</b><p>${esc(data.tip)}</p></div><a class="primary result-cta" href="${CTA}">자세히 보기 · 나, 올해 연애 가능? ↗</a><div class="action-row"><button class="secondary" id="share">내 유형 공유하기 ↗</button><button class="secondary" id="restart">다시 해보기 ↻</button></div><button class="secondary invite-button" id="invite">친구에게 테스트 보내기 ↗</button><button class="small-button copy-link" id="copy-link">링크만 복사하기</button><div id="share-fallback"></div><details class="context"><summary>내 결과는 어떻게 나왔나요?</summary><p>수치는 다섯 답변을 기준으로 한 오락용 지표예요. 연애 성공 확률이나 과학적 성격 진단은 아니에요.</p><p>${esc(data.mbtiNote || '이 화면은 샘플이므로 MBTI를 반영하지 않았어요.')}</p><p>${esc(data.sajuNote || '이 화면은 샘플이므로 실제 사주를 반영하지 않았어요.')}</p></details><p class="fine center">내 유형 공유에는 기본 유형만 담겨요.<br>내 답변과 MBTI, 사주 정보는 담기지 않아요.</p>`);
    on('restart', () => { clear(); if (preview) location.href = './'; else home(); });
    on('share', () => share(data));
    on('invite', () => share());
    on('copy-link', () => share(undefined, true));
    stage.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => sampleResult(button.dataset.type)));
  }
  async function share(data, copyOnly = false) {
    const type = data && Object.hasOwn(types, data.type) ? data.type : null;
    const url = 'https://umsh.kr/play/love-speed/' + (type ? '?type=' + encodeURIComponent(type) : '');
    const payload = { title: '시작은 풀악셀, 마음은 급정거? | 운명상회', text: type ? `나는 ${types[type].name}! 너의 연애 속도는? 5문항으로 확인해봐.` : '너는 금사빠? 금사식? 30초, 5문항으로 같이 알아보자!', url };
    try { if (!copyOnly && navigator.share) { await navigator.share(payload); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); notice(type ? '개인정보 없이 유형 링크를 복사했어요.' : '테스트 링크를 복사했어요. 친구에게 보내보세요!'); }
    catch { document.getElementById('share-fallback').innerHTML = `<p class="fine" style="margin-top:16px">아래 링크를 길게 눌러 복사해주세요.</p><input class="share-url" aria-label="공유 링크" readonly value="${esc(url)}">`; }
  }
  function sampleResult(type = 'spark') { renderResult({ ...types[type], type }, true); }
  if (preview) { sampleResult(); return; }
  try { const saved = JSON.parse(sessionStorage.getItem(KEY)); if (saved && Date.now()-saved.at < 7200000 && Date.now() >= saved.at && Array.isArray(saved.answers) && saved.answers.length <= 5 && saved.answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3) && (saved.mbti === null || /^[EI][NS][TF][JP]$/.test(saved.mbti))) state = saved; else clear(); } catch { clear(); }
  const shared = new URLSearchParams(location.search).get('type');
  // Remove arbitrary tracking/PII parameters before any authentication redirect or share action.
  history.replaceState(null, '', location.pathname + (Object.hasOwn(types, shared) ? '?type='+shared : ''));
  if (Object.hasOwn(types, shared)) home(shared);
  else if (state.answers.length === 5) { resolveResult(); }
  else if (state.answers.length) question(state.answers.length);
  else home();
})();
