(() => {
  const root = document.querySelector('[data-destiny-root]');
  const toast = document.querySelector('#toast');
  const primaryRecordCta = document.querySelector('[data-primary-record-cta]');
  const shareButtons = Array.from(document.querySelectorAll('[data-action="share-record"]'));
  const AUTH_DEVICE_SESSION_KEY = 'cheongi_auth_device_session_started_at_v1';
  const AUTH_DEVICE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
  let authClient = null;
  let authSession = null;
  let authInitPromise = null;
  let toastTimer = 0;
  let currentRecordName = '운명록';

  const STEM_KO = {
    '甲': '갑',
    '乙': '을',
    '丙': '병',
    '丁': '정',
    '戊': '무',
    '己': '기',
    '庚': '경',
    '辛': '신',
    '壬': '임',
    '癸': '계',
  };

  const BRANCH_KO = {
    '子': '자',
    '丑': '축',
    '寅': '인',
    '卯': '묘',
    '辰': '진',
    '巳': '사',
    '午': '오',
    '未': '미',
    '申': '신',
    '酉': '유',
    '戌': '술',
    '亥': '해',
  };

  const ELEMENT_LABELS = {
    wood: '목(木)',
    fire: '화(火)',
    earth: '토(土)',
    metal: '금(金)',
    water: '수(水)',
  };

  const STRENGTH_LABELS = {
    strong: '신강',
    balanced: '중화',
    weak: '신약',
  };

  const SECTION_LABELS = [
    ['pillars', '원국'],
    ['insight', '해석'],
    ['stars', '신살·길성'],
    ['relations', '합충'],
    ['fortune', '대운'],
    ['vault', '보관'],
  ];

  const sampleData = {
    complete: false,
    sample: true,
    profile: {
      userId: 'sample',
      name: '홍길동',
      birth: {
        year: 1992,
        month: 4,
        day: 18,
        hour: 4,
        minute: 30,
        gender: 'male',
        calendar: 'solar',
      },
      birthTimeKnown: true,
      context: {
        target: '본인',
        relationship: '관계 정리 중',
        orientation: '미래 흐름',
        work: '브랜드와 일의 방향',
      },
    },
    analysis: {
      fourPillars: {
        year: { stem: '壬', branch: '申', stemElement: 'water', branchElement: 'metal' },
        month: { stem: '甲', branch: '辰', stemElement: 'wood', branchElement: 'earth' },
        day: { stem: '乙', branch: '亥', stemElement: 'wood', branchElement: 'water' },
        hour: { stem: '戊', branch: '寅', stemElement: 'earth', branchElement: 'wood' },
      },
      dayMaster: '乙',
      dayMasterElement: 'wood',
      elementCount: { wood: 3, fire: 0, earth: 2, metal: 1, water: 2 },
      dominantElement: 'wood',
      weakElement: 'fire',
      usefulGod: 'fire',
      dayMasterStrength: 'balanced',
      tenGods: ['정인', '겁재', '정재'],
      summary: '목 기운이 중심을 잡고 수 기운이 뿌리를 받치는 명식입니다. 시작은 부드럽지만 방향을 정하면 오래 밀고 가는 힘이 있습니다.',
      dayMasterAdvice: '부드럽게 적응하되 자신의 기준을 놓치지 않을 때 운이 가장 선명해집니다.',
      preview: {
        personality: '을목 일간은 환경을 섬세하게 읽고, 사람과 일 사이의 결을 맞추는 힘이 좋습니다.',
        elementBalance: '목과 수가 살아 있어 생각과 감각은 깊고, 화 기운을 보태면 표현과 성과가 더 빨리 드러납니다.',
        loveFortune: '관계는 빠르게 붙잡기보다 신뢰가 쌓이는 흐름에서 오래 갑니다.',
        wealthFortune: '돈은 한 번에 터지는 운보다 전문성과 꾸준한 결과물이 쌓이면서 열립니다.',
      },
      manseryeok: {
        hiddenStems: [
          { branch: '申', stems: [{ stem: '庚', tenGod: '정관' }, { stem: '壬', tenGod: '정인' }, { stem: '戊', tenGod: '정재' }] },
          { branch: '辰', stems: [{ stem: '戊', tenGod: '정재' }, { stem: '乙', tenGod: '비견' }, { stem: '癸', tenGod: '편인' }] },
          { branch: '亥', stems: [{ stem: '壬', tenGod: '정인' }, { stem: '甲', tenGod: '겁재' }] },
          { branch: '寅', stems: [{ stem: '甲', tenGod: '겁재' }, { stem: '丙', tenGod: '상관' }, { stem: '戊', tenGod: '정재' }] },
        ],
        tenGodPlacements: [
          { pillar: 'year', stem: '壬', tenGod: '정인' },
          { pillar: 'month', stem: '甲', tenGod: '겁재' },
          { pillar: 'hour', stem: '戊', tenGod: '정재' },
        ],
        weightedElements: { wood: 3.6, fire: 0.3, earth: 1.9, metal: 0.6, water: 1.7 },
        gyeokguk: {
          name: '정재격 렌즈',
          basis: '월지 辰의 주기운 戊 기준',
          confidence: 72,
          note: '현실 감각과 책임을 통해 운을 잡는 구조입니다. 결과를 숫자와 일정으로 정리할수록 강점이 살아납니다.',
        },
        climate: {
          note: '봄 명식은 자라는 힘이 먼저 올라옵니다. 화로 드러내고 토로 현실화해야 생각만 무성해지는 흐름을 줄일 수 있습니다.',
        },
        interactions: [
          { type: '육합', pillars: ['일주', '시주'], signs: ['亥', '寅'], meaning: '인해육합: 감각과 시작이 만나 성장 욕구가 강해집니다.' },
          { type: '파', pillars: ['년주', '일주'], signs: ['申', '亥'], meaning: '신해파: 판단과 감정의 속도가 엇갈릴 수 있어 말의 순서를 정리해야 합니다.' },
        ],
      },
      fortune: {
        currentYear: 2026,
        yearPillar: '丙午',
        currentDaewoon: '丁未',
        startAgeText: '7세 4개월',
        daewoon: [
          { age: '7-16', pillar: '乙巳', ageStart: 7, ageEnd: 16 },
          { age: '17-26', pillar: '丙午', ageStart: 17, ageEnd: 26 },
          { age: '27-36', pillar: '丁未', ageStart: 27, ageEnd: 36 },
          { age: '37-46', pillar: '戊申', ageStart: 37, ageEnd: 46 },
        ],
      },
    },
    todayFortune: {
      date: { label: '2026년 9월 1일 화요일' },
      reading: {
        title: '표현과 결과물이 드러나는 날',
        summary: '생각만 품고 있던 내용을 밖으로 꺼내면 흐름이 붙습니다. 오늘은 짧은 문장과 빠른 실행이 운을 엽니다.',
        action: '해야 할 말을 먼저 적고, 그중 절반만 정확하게 꺼내세요.',
        score: { total: 78 },
      },
    },
    reports: [
      { reportId: 'sample-a', savedAt: '2026-09-01T03:00:00.000Z', title: '홍길동 · 종합사주', progress: { complete: 38, total: 38 } },
      { reportId: 'sample-b', savedAt: '2026-08-28T03:00:00.000Z', title: '홍길동 · 오늘운', progress: { complete: 1, total: 1 } },
    ],
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function pad2(value) {
    return String(Number(value || 0)).padStart(2, '0');
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  function setPrimaryRecordCta(label, href) {
    if (!primaryRecordCta) return;
    primaryRecordCta.textContent = label;
    primaryRecordCta.setAttribute('href', href);
  }

  function setRecordLocked(isLocked) {
    document.body.classList.toggle('is-record-locked', isLocked);
    shareButtons.forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = isLocked;
        button.setAttribute('aria-disabled', String(isLocked));
      }
    });
  }

  function calendarLabel(profile) {
    return profile?.birth?.calendar === 'lunar' ? '음력' : '양력';
  }

  function birthLabel(profile) {
    const birth = profile?.birth || {};
    if (!birth.year || !birth.month || !birth.day) return '생년월일 미입력';
    const date = `${birth.year} · ${pad2(birth.month)} · ${pad2(birth.day)}`;
    const time = profile.birthTimeKnown === false ? '시간 모름' : `${pad2(birth.hour)}:${pad2(birth.minute || 0)}`;
    return `${calendarLabel(profile)} ${date} · ${time}`;
  }

  function genderLabel(profile) {
    if (profile?.birth?.gender === 'female') return '여성';
    if (profile?.birth?.gender === 'male') return '남성';
    return '성별 미입력';
  }

  function pillarHangul(pillar) {
    if (!pillar?.stem || !pillar?.branch) return '';
    return `${STEM_KO[pillar.stem] || pillar.stem}${BRANCH_KO[pillar.branch] || pillar.branch}`;
  }

  function dayPillarLabel(analysis) {
    const day = analysis?.fourPillars?.day;
    if (!day) return '일주 미확인';
    return `${pillarHangul(day)}일주`;
  }

  function tenGodFor(analysis, key) {
    if (key === 'day') return '일원';
    const found = analysis?.manseryeok?.tenGodPlacements?.find((entry) => entry.pillar === key);
    return found?.tenGod || '-';
  }

  function hiddenStemSummary(analysis, branch) {
    const found = analysis?.manseryeok?.hiddenStems?.find((entry) => entry.branch === branch);
    if (!found?.stems?.length) return '지장간 정보 준비 중';
    return found.stems.map((entry) => `${entry.stem}${entry.tenGod ? ` · ${entry.tenGod}` : ''}`).join(' / ');
  }

  function elementName(element) {
    return ELEMENT_LABELS[element] || element || '-';
  }

  function sectionTabsMarkup() {
    return SECTION_LABELS.map(([id, label], index) => (
      `<button class="${index === 0 ? 'is-active' : ''}" type="button" data-section-target="${id}">${escapeHtml(label)}</button>`
    )).join('');
  }

  function identityTags(profile, analysis, options) {
    const tags = [
      options.sample ? '샘플' : '내 운명록',
      dayPillarLabel(analysis),
      `${elementName(analysis?.dayMasterElement).replace(/\(.+\)/, '')} 일간`,
      STRENGTH_LABELS[analysis?.dayMasterStrength] || '균형 분석',
    ].filter(Boolean);

    return tags.map((tag, index) => `<span class="${index === 1 ? 'is-primary' : ''}">${escapeHtml(tag)}</span>`).join('');
  }

  function heroMarkup(data, options) {
    const profile = data.profile || {};
    const analysis = data.analysis || {};
    currentRecordName = profile.name || '운명록';

    return `
      <section class="destiny-hero">
        <div class="hero-media" aria-hidden="true">
          <img src="/assets/chungi-manseryeok-bg.webp" alt="" />
        </div>
        <div class="identity-block">
          <span class="record-kicker">${options.sample ? 'SAMPLE RECORD' : 'PERSONAL RECORD'}</span>
          <h1>${escapeHtml(profile.name || '내 운명록')}</h1>
          <p>${escapeHtml(birthLabel(profile))}<br />${escapeHtml(genderLabel(profile))} · ${escapeHtml(profile.context?.target || '본인')}</p>
          <div class="identity-tags">${identityTags(profile, analysis, options)}</div>
        </div>
      </section>
    `;
  }

  function pillarCardsMarkup(profile, analysis) {
    const birth = profile?.birth || {};
    const items = [
      ['year', '년주', birth.year || '년'],
      ['month', '월주', birth.month ? pad2(birth.month) : '월'],
      ['day', '일주', birth.day ? pad2(birth.day) : '일'],
      ['hour', '시주', profile?.birthTimeKnown === false ? '시간 모름' : `${pad2(birth.hour)}:${pad2(birth.minute || 0)}`],
    ];

    return items.map(([key, label, timeLabel]) => {
      const pillar = analysis?.fourPillars?.[key] || {};
      const text = pillar.stem && pillar.branch ? `${pillar.stem}${pillar.branch}` : '-';
      return `
        <article class="pillar-card">
          <div class="pillar-label"><b>${escapeHtml(String(timeLabel))}</b>${escapeHtml(label)}</div>
          <div class="pillar-stems">
            <strong>${escapeHtml(text)}</strong>
            <span>${escapeHtml(pillarHangul(pillar))} · ${escapeHtml(hiddenStemSummary(analysis, pillar.branch))}</span>
          </div>
          <span class="ten-god">${escapeHtml(tenGodFor(analysis, key))}</span>
        </article>
      `;
    }).join('');
  }

  function infoGridMarkup(profile, analysis) {
    const fortune = analysis?.fortune || {};
    const climate = analysis?.manseryeok?.climate;
    const gyeokguk = analysis?.manseryeok?.gyeokguk;
    const items = [
      ['일간', `${analysis?.dayMaster || '-'} · ${elementName(analysis?.dayMasterElement)}`],
      ['일주', dayPillarLabel(analysis)],
      ['용신 후보', elementName(analysis?.usefulGod)],
      ['격국 렌즈', gyeokguk?.name || '분석 중'],
      ['절기 기준', analysis?.manseryeok?.monthTerm || climate?.season || '절기 확인'],
      ['대운 시작', fortune.startAgeText || '계산 중'],
      ['출생 기준', birthLabel(profile)],
      ['최근 대운', fortune.currentDaewoon || '확인 전'],
    ];

    return items.map(([label, value]) => `
      <div class="info-tile">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join('');
  }

  function elementBalanceMarkup(analysis) {
    const source = analysis?.manseryeok?.weightedElements || analysis?.elementCount || {};
    const entries = ['wood', 'fire', 'earth', 'metal', 'water'].map((key) => [key, Number(source[key] || 0)]);
    const max = Math.max(1, ...entries.map(([, value]) => value));
    return entries.map(([key, value]) => {
      const width = Math.max(5, Math.round((value / max) * 100));
      return `
        <div class="element-row">
          <span>${escapeHtml(elementName(key))}</span>
          <div class="element-track"><span style="--bar: ${width}%"></span></div>
          <b>${escapeHtml(value.toFixed(value % 1 ? 1 : 0))}</b>
        </div>
      `;
    }).join('');
  }

  function starsMarkup(analysis) {
    const starTags = [
      analysis?.manseryeok?.gyeokguk?.name,
      analysis?.manseryeok?.gyeokguk?.tenGod,
      ...(analysis?.tenGods || []),
      ...(analysis?.manseryeok?.climate?.usefulElements || []).map((item) => `${elementName(item)} 보완`),
      ...(analysis?.manseryeok?.climate?.cautionElements || []).map((item) => `${elementName(item)} 과다 주의`),
      ...(analysis?.manseryeok?.interactions || []).map((item) => item.type),
    ].filter(Boolean);
    const unique = Array.from(new Set(starTags)).slice(0, 14);
    if (!unique.length) return '<div class="empty-card">신살과 길성 데이터가 준비되면 이곳에 표시됩니다.</div>';
    return `<div class="tag-cloud">${unique.map((tag) => `<span class="info-chip">${escapeHtml(tag)}</span>`).join('')}</div>`;
  }

  function interactionMarkup(analysis) {
    const items = analysis?.manseryeok?.interactions || [];
    if (!items.length) {
      return '<div class="empty-card">큰 충돌 신호보다 기본 원국의 균형을 먼저 보는 명식입니다.</div>';
    }
    return items.slice(0, 6).map((item) => `
      <article class="interaction-item">
        <strong>${escapeHtml(item.type)} · ${escapeHtml((item.signs || []).join(''))}</strong>
        <span>${escapeHtml((item.pillars || []).join(' · '))}</span>
        <p>${escapeHtml(item.meaning || '관계 작용을 해석 중입니다.')}</p>
      </article>
    `).join('');
  }

  function fortuneMarkup(analysis) {
    const fortune = analysis?.fortune || {};
    const current = fortune.currentDaewoon || '';
    const rows = Array.isArray(fortune.daewoon) ? fortune.daewoon.slice(0, 6) : [];
    if (!rows.length) return '<div class="empty-card">대운 흐름은 사주 프로필 생성 후 표시됩니다.</div>';
    return rows.map((row) => {
      const isCurrent = row.pillar === current;
      const age = row.age || [row.ageStart, row.ageEnd].filter((value) => value !== undefined).join('-') || '나이';
      return `
        <article class="timeline-card ${isCurrent ? 'is-current' : ''}">
          <span>${escapeHtml(age)}세</span>
          <strong>${escapeHtml(row.pillar || '-')}</strong>
          <em>${isCurrent ? '현재' : '대운'}</em>
        </article>
      `;
    }).join('');
  }

  function reportHref(reportId) {
    const id = String(reportId || '').trim();
    if (!id || id.startsWith('sample-')) return '/cmdg/#vault';
    return `/cmdg/?reportId=${encodeURIComponent(id)}#result`;
  }

  function savedAtLabel(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '저장일 미확인';
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function reportListMarkup(reports = []) {
    if (!reports.length) {
      return '<div class="empty-card">아직 보관된 풀이가 없습니다. 새 풀이를 만들면 운명록과 함께 이어서 볼 수 있습니다.</div>';
    }

    return reports.slice(0, 4).map((report) => {
      const progress = report.progress?.total
        ? `${report.progress.complete || 0}/${report.progress.total}`
        : '저장됨';
      return `
        <a class="report-item" href="${reportHref(report.reportId)}">
          <span>
            <small>${escapeHtml(savedAtLabel(report.savedAt))}</small>
            <strong>${escapeHtml(report.title || '저장된 풀이')}</strong>
            <p>${escapeHtml(progress)} · ${escapeHtml(report.birthState?.concern || report.initialConcern || '운명상회 풀이')}</p>
          </span>
          <em>열기</em>
        </a>
      `;
    }).join('');
  }

  function todayMarkup(data) {
    const reading = data.todayFortune?.reading;
    if (!reading) return '';
    return `
      <article class="story-card">
        <span>${escapeHtml(data.todayFortune?.date?.label || 'TODAY')}</span>
        <strong>${escapeHtml(reading.title || '오늘운')}</strong>
        <p>${escapeHtml(reading.summary || reading.action || '오늘의 흐름을 확인합니다.')}</p>
      </article>
    `;
  }

  function renderDestiny(data, options = {}) {
    if (!root) return;
    setRecordLocked(false);
    const profile = data.profile || sampleData.profile;
    const analysis = data.analysis || sampleData.analysis;
    const reports = data.reports || [];
    setPrimaryRecordCta(options.profileRequired ? '사주 등록하기' : '새 운명록 추가', options.profileRequired ? '/signup?entry=destiny' : '/cmdg/#name');

    root.innerHTML = `
      ${heroMarkup({ ...data, profile, analysis }, options)}
      <nav class="record-tabs" aria-label="운명록 상세 메뉴">${sectionTabsMarkup()}</nav>

      <section class="record-section" id="pillars">
        <div class="section-head">
          <div>
            <span class="section-kicker">FOUR PILLARS</span>
            <h2>사주 원국</h2>
            <p>년·월·일·시 기둥과 십신, 지장간을 한 줄씩 읽습니다.</p>
          </div>
        </div>
        <div class="pillar-grid">${pillarCardsMarkup(profile, analysis)}</div>
      </section>

      <section class="record-section" id="insight">
        <div class="section-head">
          <div>
            <span class="section-kicker">CORE READING</span>
            <h2>핵심 해석</h2>
            <p>일간, 격국, 용신 후보, 오행 균형을 먼저 확인합니다.</p>
          </div>
        </div>
        <div class="panel-card">
          <div class="info-grid">${infoGridMarkup(profile, analysis)}</div>
        </div>
        <div class="story-grid insight-stories">
          <article class="story-card is-image">
            <img src="/assets/chungi-destiny-card-bg.webp" alt="" />
            <span>UMSH INTERPRETATION</span>
            <strong>${escapeHtml(analysis.dayMasterAdvice || analysis.preview?.personality || '나를 움직이는 기준')}</strong>
            <p>${escapeHtml(analysis.preview?.elementBalance || analysis.summary || '내 명식의 중심 기운과 부족한 자리를 확인합니다.')}</p>
          </article>
          ${todayMarkup(data)}
          <article class="story-card">
            <span>ELEMENT BALANCE</span>
            <strong>오행 균형</strong>
            <div class="element-list balance-list">${elementBalanceMarkup(analysis)}</div>
          </article>
        </div>
      </section>

      <section class="record-section" id="stars">
        <div class="section-head">
          <div>
            <span class="section-kicker">STARS</span>
            <h2>신살·길성</h2>
            <p>명식에서 반복해서 쓰일 해석 태그를 모았습니다.</p>
          </div>
        </div>
        <div class="panel-card">${starsMarkup(analysis)}</div>
      </section>

      <section class="record-section" id="relations">
        <div class="section-head">
          <div>
            <span class="section-kicker">RELATIONS</span>
            <h2>합충 관계</h2>
            <p>원국 안에서 서로 붙고 밀어내는 작용을 표시합니다.</p>
          </div>
        </div>
        <div class="interaction-list">${interactionMarkup(analysis)}</div>
      </section>

      <section class="record-section" id="fortune">
        <div class="section-head">
          <div>
            <span class="section-kicker">FLOW</span>
            <h2>대운 흐름</h2>
            <p>지금 지나가는 큰 운과 다음 변곡점을 빠르게 봅니다.</p>
          </div>
        </div>
        <div class="timeline">${fortuneMarkup(analysis)}</div>
      </section>

      <section class="record-section" id="vault">
        <div class="section-head">
          <div>
            <span class="section-kicker">VAULT</span>
            <h2>보관된 풀이</h2>
            <p>운명록과 이어지는 종합사주, 오늘운, 상담 기록입니다.</p>
          </div>
        </div>
        <div class="report-list">${reportListMarkup(reports)}</div>
      </section>
    `;
  }

  function renderDestinyGate(reason = 'login') {
    if (!root) return;
    setRecordLocked(true);
    currentRecordName = '운명록';

    const copy = {
      login: {
        eyebrow: 'LOCKED RECORD',
        title: '운명록은 로그인 후 열립니다',
        desc: '개인 사주의 원국, 신살·길성, 합충, 대운 흐름은 계정에 연결된 사주 프로필 기준으로만 보여드립니다.',
        primary: '로그인하고 사주 등록하기',
      },
      profile: {
        eyebrow: 'PROFILE REQUIRED',
        title: '사주등록이 필요합니다',
        desc: '로그인은 확인됐습니다. 생년월일시와 성별을 저장하면 내 운명록이 실제 원국으로 채워집니다.',
        primary: '사주 등록하기',
      },
      error: {
        eyebrow: 'CHECK FAILED',
        title: '운명록 상태를 확인하지 못했습니다',
        desc: '로그인 세션 또는 사주 프로필을 확인하지 못했습니다. 다시 로그인하면 등록 흐름으로 이어집니다.',
        primary: '다시 확인하기',
      },
    }[reason] || {};

    setPrimaryRecordCta(copy.primary, '/signup?entry=destiny');
    root.innerHTML = `
      <section class="destiny-gate" aria-label="운명록 접근 안내">
        <div class="gate-mark" aria-hidden="true">命</div>
        <span class="record-kicker">${escapeHtml(copy.eyebrow)}</span>
        <h1>${escapeHtml(copy.title)}</h1>
        <p>${escapeHtml(copy.desc)}</p>
        <div class="gate-steps" aria-label="운명록 열람 조건">
          <span>1 로그인</span>
          <span>2 사주등록</span>
          <span>3 운명록 열기</span>
        </div>
        <div class="gate-actions">
          <a class="gate-primary" href="/signup?entry=destiny">${escapeHtml(copy.primary)}</a>
          <a class="gate-secondary" href="/">홈으로</a>
        </div>
      </section>
    `;
  }

  function clearDeviceAuthSession() {
    try {
      localStorage.removeItem(AUTH_DEVICE_SESSION_KEY);
    } catch (err) {
      // Browser storage can be unavailable in restricted modes.
    }
  }

  function deviceSessionStartedAt() {
    try {
      const value = Number(localStorage.getItem(AUTH_DEVICE_SESSION_KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (err) {
      return 0;
    }
  }

  function rememberDeviceAuthSession(session) {
    if (!session?.access_token) {
      clearDeviceAuthSession();
      return 0;
    }
    const existing = deviceSessionStartedAt();
    if (existing) return existing;
    const lastSignIn = Date.parse(session?.user?.last_sign_in_at || '');
    const startedAt = Number.isFinite(lastSignIn) ? lastSignIn : Date.now();
    try {
      localStorage.setItem(AUTH_DEVICE_SESSION_KEY, String(startedAt));
    } catch (err) {
      // Supabase still keeps its own session where browser storage allows it.
    }
    return startedAt;
  }

  async function enforceDeviceAuthSession(session) {
    if (!session?.access_token) {
      clearDeviceAuthSession();
      return null;
    }
    const startedAt = deviceSessionStartedAt() || rememberDeviceAuthSession(session);
    if (Date.now() - startedAt <= AUTH_DEVICE_SESSION_MS) return session;
    clearDeviceAuthSession();
    if (authClient) {
      await authClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    return null;
  }

  async function initAuth() {
    if (authInitPromise) return authInitPromise;
    authInitPromise = (async () => {
      const configRes = await fetch('/api/auth/config');
      const config = await configRes.json();
      if (!config.enabled || !window.supabase?.createClient) return null;
      authClient = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      });
      const { data, error } = await authClient.auth.getSession();
      if (error) throw error;
      authSession = await enforceDeviceAuthSession(data.session || null);
      authClient.auth.onAuthStateChange((_event, session) => {
        enforceDeviceAuthSession(session || null)
          .then((nextSession) => {
            authSession = nextSession;
          })
          .catch(() => {
            authSession = session || null;
          });
      });
      return authSession;
    })();
    return authInitPromise;
  }

  async function currentAuthSession() {
    await initAuth();
    if (!authClient) return null;
    const { data, error } = await authClient.auth.getSession();
    if (error) throw error;
    authSession = await enforceDeviceAuthSession(data.session || null);
    return authSession;
  }

  async function authHeaders(base = {}) {
    const headers = { ...base };
    const session = authSession || await currentAuthSession().catch(() => null);
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }

  async function loadDestiny() {
    try {
      const session = await currentAuthSession();
      if (!session?.access_token) {
        renderDestinyGate('login');
        return;
      }

      const res = await fetch('/api/user/destiny?limit=4', {
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (res.status === 401) {
        renderDestinyGate('login');
        return;
      }
      if (!res.ok) throw new Error(json.error || '운명록을 불러오지 못했습니다.');

      if (!json.profile || !json.complete) {
        renderDestinyGate('profile');
        return;
      }

      renderDestiny(json, {
        sample: false,
        message: '저장된 사주 프로필 기준으로 운명록을 불러왔습니다.',
      });
    } catch (err) {
      console.warn('운명록 로드 실패', err);
      renderDestinyGate('error');
    }
  }

  function scrollToSection(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    document.querySelectorAll('[data-section-target]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.sectionTarget === targetId);
    });
  }

  async function shareRecord() {
    if (document.body.classList.contains('is-record-locked')) {
      showToast('로그인과 사주등록 후 공유할 수 있습니다.');
      return;
    }
    const shareData = {
      title: `UMSH 운명록 · ${currentRecordName}`,
      text: `${currentRecordName}님의 운명록을 확인해보세요.`,
      url: location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('운명록 공유를 열었습니다.');
        return;
      }
      await navigator.clipboard.writeText(location.href);
      showToast('운명록 링크를 복사했습니다.');
    } catch (err) {
      showToast('공유를 완료하지 못했습니다.');
    }
  }

  document.addEventListener('click', (event) => {
    const sectionButton = event.target.closest?.('[data-section-target]');
    if (sectionButton) {
      scrollToSection(sectionButton.dataset.sectionTarget);
      return;
    }

    const actionButton = event.target.closest?.('[data-action]');
    if (!actionButton) return;
    if (actionButton.dataset.action === 'share-record') {
      shareRecord();
    }
  });

  setRecordLocked(true);
  loadDestiny();
})();
