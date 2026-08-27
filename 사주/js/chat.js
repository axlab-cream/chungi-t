const chatLog = document.getElementById('chat-log')
const chatForm = document.getElementById('chat-form')
const chatMessage = document.getElementById('chat-message')
const btnSend = document.getElementById('btn-send')
const reportState = {
  activeSectionId: '',
  loadingSectionId: '',
  error: '',
  requestToken: 0,
}
const HISTORY_KEY = 'cheongi_report_history_v1'
const ACTIVE_REPORT_KEY = 'cheongi_active_report_id'
let chatSaveTimer = 0
const SECTION_COPY = {
  profile: ['내가 가진 진짜 매력', '남들이 보는 나와 내가 숨기는 결'],
  'target-context': ['이 풀이가 보는 사람', '지금 고민을 어디에 놓고 볼지'],
  'pillars-structure': ['내 사주의 큰 그림', '태어난 순간에 깔린 기본 흐름'],
  'year-pillar': ['어릴 때부터 남은 배경', '나도 모르게 반복된 시작점'],
  'month-pillar': ['사회에서 보이는 내 얼굴', '일과 사람 앞에서 드러나는 분위기'],
  'day-pillar': ['가까운 사람 앞의 내 모습', '사랑과 속마음이 움직이는 자리'],
  'hour-pillar': ['뒤늦게 드러나는 가능성', '시간이 지나며 열리는 힘'],
  'day-master-strength': ['내가 버티는 힘', '무너지지 않게 잡아주는 중심'],
  'hidden-personality': ['겉으로 안 보이는 진짜 성격', '혼자 있을 때 더 선명한 마음'],
  balance: ['내 기운이 어디로 쏠렸나', '좋은 흐름과 과한 흐름을 나눠 봅니다'],
  'dominant-element': ['가장 강하게 올라오는 힘', '먼저 반응하고 먼저 움직이는 기운'],
  'weak-element': ['내가 채워야 할 빈자리', '부족해서 더 신경 써야 하는 부분'],
  'ten-gods-overview': ['사람과 돈을 대하는 방식', '관계, 책임, 욕심이 움직이는 결'],
  'ten-gods-position': ['내 운이 움직이는 자리', '어디에서 복이 오고 어디서 막히는지'],
  'useful-god-eokbu': ['나를 살리는 방향', '힘들 때 회복되는 선택의 기준'],
  'useful-god-johu': ['뜨거움과 차가움의 균형', '마음과 생활 리듬을 맞추는 법'],
  trap: ['내가 자주 빠지는 함정', '좋은 말보다 먼저 봐야 할 위험'],
  'concern-loop': ['요즘 고민이 반복되는 이유', '같은 일이 다시 생기는 숨은 패턴'],
  'relationship-orientation': ['내가 사랑을 보는 기준', '끌림과 안정감 중 무엇이 먼저인지'],
  'relationship-status': ['지금 관계에서 봐야 할 것', '혼자인지, 만나는 중인지에 따라 달라지는 해석'],
  'career-money': ['일과 돈이 엮이는 방식', '일이 돈으로 바뀌는 길'],
  'work-context': ['요즘 일상에서 운이 움직이는 자리', '직장, 쉬는 시간, 생활 리듬의 신호'],
  'career-transition': ['버틸지 옮길지 판단 기준', '지금 멈춰야 할지 움직여야 할지'],
  'wealth-flow': ['돈이 들어오는 길', '내가 돈을 만들 때 강해지는 방식'],
  'money-leak': ['돈이 새는 구멍', '작아 보여도 나중에 커지는 지출 신호'],
  'wealth-timing': ['재물 기회가 붙는 타이밍', '돈 흐름이 살아나는 때'],
  'love-loop': ['반복되는 인연 패턴', '왜 비슷한 사람에게 마음이 가는지'],
  'destiny-partner': ['나와 맞는 사람의 분위기', '끌림보다 오래 남는 사람의 결'],
  'avoid-relationship': ['멀리해야 할 관계 신호', '나를 흐리게 만드는 사람을 거르는 법'],
  'love-timing': ['인연이 드러나는 때', '관계가 움직이기 쉬운 흐름'],
  'future-flow': ['앞으로 크게 바뀔 흐름', '지금부터 방향이 달라지는 지점'],
  'daewoon-detail': ['인생 무대가 바뀌는 구간', '크게 판이 바뀌는 시기'],
  'sewoon-detail': ['올해 특히 봐야 할 신호', '올해 조심할 것과 붙잡을 것'],
  'turning-years': ['삶이 꺾이고 열리는 시기', '선택이 커지는 전환점'],
  'timing-place': ['나에게 맞는 시기와 장소', '언제, 어디에서 기운이 살아나는지'],
  'action-guide': ['지금 바로 붙잡을 신호', '오늘부터 바꿔야 할 작은 기준'],
  'long-report-depth': ['긴 풀이를 읽는 순서', '어디부터 봐야 내 이야기가 풀리는지'],
}
const SECTION_GROUPS = [
  {
    id: 'self',
    title: '나',
    subtitle: '성향, 기질, 내 안쪽 기운',
    ids: [
      'profile',
      'target-context',
      'pillars-structure',
      'year-pillar',
      'month-pillar',
      'day-pillar',
      'hour-pillar',
      'day-master-strength',
      'hidden-personality',
      'balance',
      'dominant-element',
      'weak-element',
      'ten-gods-overview',
      'ten-gods-position',
      'useful-god-eokbu',
      'useful-god-johu',
      'trap',
      'concern-loop',
    ],
  },
  {
    id: 'relationship',
    title: '관계·연애',
    subtitle: '인연, 끌림, 피해야 할 사람',
    ids: [
      'relationship-orientation',
      'relationship-status',
      'love-loop',
      'destiny-partner',
      'avoid-relationship',
      'love-timing',
    ],
  },
  {
    id: 'money',
    title: '일·재물',
    subtitle: '돈 들어오는 길, 새는 구멍, 일의 흐름',
    ids: [
      'career-money',
      'work-context',
      'career-transition',
      'wealth-flow',
      'money-leak',
      'wealth-timing',
    ],
  },
  {
    id: 'future',
    title: '미래 흐름',
    subtitle: '앞으로 바뀔 때, 올해 신호, 전환점',
    ids: [
      'future-flow',
      'daewoon-detail',
      'sewoon-detail',
      'turning-years',
      'timing-place',
    ],
  },
  {
    id: 'action',
    title: '지금 해법',
    subtitle: '오늘부터 붙잡을 기준과 읽는 순서',
    ids: [
      'action-guide',
      'long-report-depth',
    ],
  },
]

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch (err) {
    return fallback
  }
}

function readReportHistory() {
  const parsed = parseJson(localStorage.getItem(HISTORY_KEY), [])
  return Array.isArray(parsed) ? parsed.filter((item) => item?.reportId && item?.analysis) : []
}

function writeReportHistory(items) {
  const seen = new Set()
  const next = []
  for (const item of items) {
    if (!item?.reportId || seen.has(item.reportId)) continue
    seen.add(item.reportId)
    next.push(item)
  }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch (err) {
    console.warn('상담 보관함 저장 공간이 부족합니다. 기존 저장 데이터는 유지됩니다.', err)
  }
}

function reportIdFromAnalysis(analysis) {
  return analysis?.report?.reportId || ''
}

function saveActiveReportId(reportId) {
  if (!reportId) return
  sessionStorage.setItem(ACTIVE_REPORT_KEY, reportId)
  localStorage.setItem(ACTIVE_REPORT_KEY, reportId)
}

function findStoredEntry(reportId) {
  if (!reportId) return null
  return readReportHistory().find((item) => item.reportId === reportId) || null
}

function loadSession() {
  const queryReportId = new URLSearchParams(location.search).get('reportId') || ''
  const activeReportId = queryReportId
    || sessionStorage.getItem(ACTIVE_REPORT_KEY)
    || localStorage.getItem(ACTIVE_REPORT_KEY)
    || ''
  const stored = findStoredEntry(activeReportId) || readReportHistory()[0] || null
  const birth = parseJson(sessionStorage.getItem('cheongi_birth'), stored?.birth || null)
  const analysis = parseJson(sessionStorage.getItem('cheongi_analysis'), stored?.analysis || null)

  if (!birth || !analysis) {
    location.href = '/'
    return null
  }
  const reportId = reportIdFromAnalysis(analysis) || stored?.reportId || activeReportId
  const sessionHistory = parseJson(sessionStorage.getItem('cheongi_chat_history'), [])
  const storedHistory = Array.isArray(stored?.chatHistory) ? stored.chatHistory : []
  const history = sessionHistory.length >= storedHistory.length ? sessionHistory : storedHistory
  const initialConcern = sessionStorage.getItem('cheongi_initial_concern')
    || stored?.initialConcern
    || stored?.birthState?.concern
    || stored?.context?.concern
    || ''

  saveActiveReportId(reportId)
  sessionStorage.setItem('cheongi_birth', JSON.stringify(birth))
  sessionStorage.setItem('cheongi_analysis', JSON.stringify(analysis))
  sessionStorage.setItem('cheongi_chat_history', JSON.stringify(history))
  if (initialConcern) sessionStorage.setItem('cheongi_initial_concern', initialConcern)

  return {
    birth,
    analysis,
    history,
    initialConcern,
  }
}

function saveHistory(history) {
  sessionStorage.setItem('cheongi_chat_history', JSON.stringify(history))
  persistConsultation({ syncServer: true })
}

function saveAnalysis(analysis) {
  sessionStorage.setItem('cheongi_analysis', JSON.stringify(analysis))
  persistConsultation()
}

function buildStoredConsultationEntry(existing) {
  const report = session?.analysis?.report
  const reportId = report?.reportId || existing?.reportId
  if (!reportId) return null
  const birth = session.birth || existing?.birth || {}
  const context = {
    name: birth.name,
    target: birth.target,
    concern: birth.concern,
    relationship: birth.relationship,
    orientation: birth.orientation,
    work: birth.work,
  }
  const titleName = birth.name || birth.target || '당신'
  return {
    ...existing,
    reportId,
    savedAt: new Date().toISOString(),
    title: `${titleName} · ${birth.calendar === 'lunar' ? '음력' : '양력'} ${formatBirthLabel(birth)}`,
    birth,
    birthState: {
      target: birth.target,
      calendar: birth.calendar === 'lunar' ? '음력' : '양력',
      birth: formatBirthLabel(birth),
      gender: birth.gender === 'female' ? '여자' : '남자',
      time: Number.isFinite(Number(birth.hour)) ? `${pad2(birth.hour)}:${pad2(birth.minute || 0)}` : '모름',
      name: birth.name,
      orientation: birth.orientation,
      relationship: birth.relationship,
      work: birth.work,
      concern: birth.concern,
    },
    context,
    analysis: session.analysis,
    progress: report?.progress,
    storage: report?.storage,
    corpusFingerprint: report?.corpus?.fingerprint,
    chatHistory: session.history || [],
    initialConcern: session.initialConcern || birth.concern || existing?.initialConcern || '',
  }
}

function persistConsultation(options = {}) {
  if (!session) return
  const reportId = reportIdFromAnalysis(session.analysis)
  if (!reportId) return
  saveActiveReportId(reportId)
  const items = readReportHistory()
  const existing = items.find((item) => item.reportId === reportId)
  const entry = buildStoredConsultationEntry(existing)
  if (!entry) return
  writeReportHistory([entry, ...items.filter((item) => item.reportId !== reportId)])
  if (options.syncServer) queueServerChatSave()
}

function queueServerChatSave() {
  if (!reportIdFromAnalysis(session?.analysis)) return
  clearTimeout(chatSaveTimer)
  chatSaveTimer = setTimeout(() => {
    saveServerChatHistory().catch(() => {
      // Local paid consultation history remains preserved even if server sync fails.
    })
  }, 600)
}

async function saveServerChatHistory() {
  const reportId = reportIdFromAnalysis(session?.analysis)
  if (!reportId || !session?.history?.length) return
  await fetch('/api/report/chat-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId, history: session.history }),
  })
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}

function pad2(value) {
  return String(Number(value || 0)).padStart(2, '0')
}

function formatBirthLabel(birth) {
  if (!birth?.year) return '생년월일 미입력'
  return `${birth.year}.${pad2(birth.month || 1)}.${pad2(birth.day || 1)}`
}

function sentenceChunks(block) {
  return String(block || '')
    .replace(/\s+/g, ' ')
    .match(/[^.!?。！？]+[.!?。！？]?/g) || [block]
}

function extractPointLabel(paragraph) {
  const match = String(paragraph || '').match(/^\s*\[([^\]]{2,14})\]\s*(.+)$/)
  if (!match) return null
  return {
    label: match[1].trim(),
    text: match[2].trim(),
  }
}

function classifyPoint(paragraph) {
  const explicit = extractPointLabel(paragraph)
  const text = explicit?.text || paragraph
  const normalized = String(paragraph || '').replace(/\s+/g, '')
  const label = explicit?.label || ''
  const rules = [
    {
      type: 'danger',
      label: '위험 신호',
      test: /(위험|위기|방치하면|돈구멍|손실|무너|깨질|과속|사고|크게돌아|흔들릴)/,
    },
    {
      type: 'caution',
      label: '주의할 점',
      test: /(주의|조심|경계|피해야|막아야|경고|서두르지|덮지말|무리하면)/,
    },
    {
      type: 'focus',
      label: '주목할 점',
      test: /(주요포인트|핵심|주목|중요|먼저봐야|기준이보입니다|기억해야)/,
    },
    {
      type: 'action',
      label: '해법',
      test: /(해법|풀방법|행동기준|바로해볼|이렇게하면|정리하세요|확인하세요)/,
    },
  ]
  const direct = rules.find((rule) => label.includes(rule.label.replace(/\s/g, '')) || rule.test.test(label.replace(/\s+/g, '')))
  const inferred = direct || rules.find((rule) => rule.test.test(normalized))
  if (!inferred) return { type: '', label: '', text }
  return {
    type: inferred.type,
    label: explicit?.label || inferred.label,
    text,
  }
}

function renderReadingParagraph(paragraph) {
  const point = classifyPoint(paragraph)
  if (!point.type) return `<p>${escapeHtml(point.text)}</p>`
  return `
    <div class="report-point report-point-${point.type}">
      <span>${escapeHtml(point.label)}</span>
      <p>${escapeHtml(point.text)}</p>
    </div>
  `
}

function formatReadableHtml(text) {
  const blocks = String(text || '').trim().split(/\n{2,}/).filter(Boolean)
  const paragraphs = []

  for (const block of blocks) {
    let current = ''
    for (const sentence of sentenceChunks(block)) {
      const next = `${current}${current ? ' ' : ''}${sentence.trim()}`.trim()
      if (current && next.length > 180) {
        paragraphs.push(current)
        current = sentence.trim()
      } else {
        current = next
      }
    }
    if (current) paragraphs.push(current)
  }

  return paragraphs
    .map(renderReadingParagraph)
    .join('')
}

function getReport() {
  return session?.analysis?.report || null
}

function getReportSections() {
  return getReport()?.sections || []
}

function sectionCopy(section) {
  const copy = SECTION_COPY[section?.id]
  return {
    title: copy?.[0] || section?.category || '이 장의 풀이',
    subtitle: copy?.[1] || section?.classification || '지금 봐야 할 흐름을 풀어드립니다.',
  }
}

function groupedSections(sections) {
  const byId = new Map(sections.map((section) => [section.id, section]))
  const used = new Set()
  const groups = SECTION_GROUPS.map((group) => {
    const items = group.ids
      .map((id) => byId.get(id))
      .filter(Boolean)
    items.forEach((item) => used.add(item.id))
    return { ...group, items }
  }).filter((group) => group.items.length)
  const rest = sections.filter((section) => !used.has(section.id))
  if (rest.length) {
    groups.push({
      id: 'etc',
      title: '그 밖의 흐름',
      subtitle: '놓치면 아쉬운 세부 풀이',
      items: rest,
    })
  }
  return groups
}

function getBirthPayload() {
  const birth = session.birth || {}
  return {
    year: Number(birth.year),
    month: Number(birth.month),
    day: Number(birth.day),
    hour: Number(birth.hour ?? 12),
    minute: Number(birth.minute ?? 0),
    gender: birth.gender === 'female' ? 'female' : 'male',
    calendar: birth.calendar === 'lunar' ? 'lunar' : 'solar',
    isLeapMonth: Boolean(birth.isLeapMonth),
  }
}

function getContextPayload() {
  const birth = session.birth || {}
  return {
    name: birth.name,
    target: birth.target,
    concern: birth.concern,
    relationship: birth.relationship,
    orientation: birth.orientation,
    work: birth.work,
  }
}

function renderBasicSpec() {
  const analysis = session.analysis || {}
  const birth = session.birth || {}
  const p = analysis.pillars || {}
  const pillars = [p.year?.hanja, p.month?.hanja, p.day?.hanja, p.hour?.hanja].filter(Boolean).join(' · ') || '기운 확인 중'
  const name = birth.name || birth.target || '당신'
  const useful = analysis.usefulGod || analysis.weakElement || '균형'
  const dominant = analysis.dominantElement || analysis.dayMaster?.element || '기운'
  const concern = birth.concern || '지금 고민'

  return `
    <section class="report-basic-card">
      <span class="report-kicker">01 기본 스펙</span>
      <h2>${escapeHtml(name)}님의 사주 기본값</h2>
      <div class="spec-grid">
        <div><span>생년월일</span><strong>${escapeHtml(formatBirthLabel(birth))}</strong></div>
        <div><span>사주 기둥</span><strong>${escapeHtml(pillars)}</strong></div>
        <div><span>먼저 보이는 기운</span><strong>${escapeHtml(dominant)}</strong></div>
        <div><span>보완할 흐름</span><strong>${escapeHtml(useful)}</strong></div>
        <div><span>지금 물은 것</span><strong>${escapeHtml(concern)}</strong></div>
      </div>
    </section>
  `
}

function renderReportLoading(section) {
  const display = sectionCopy(section)
  const loadingLines = [
    '천명대공(天命大公)이 지금 당신에게 먼저 보이는 흐름을 짚고 있습니다.',
    '흩어진 마음의 신호를 한 줄로 모아 이 장을 여는 중입니다.',
    '오래된 기운 위에 지금의 질문을 올려 보고 있습니다.',
    '조금만 기다리세요. 이 장에서 먼저 볼 대목이 드러나고 있습니다.',
  ]
  const line = loadingLines[Math.floor(Math.random() * loadingLines.length)]
  return `
    <div class="report-section-loading" role="status" aria-live="polite">
      <strong>${escapeHtml(display.title)}을 여는 중입니다</strong>
      <div class="report-progress" aria-hidden="true"></div>
      <span>${escapeHtml(line)}</span>
    </div>
  `
}

function renderSelectedSection() {
  const sections = getReportSections()
  if (!sections.length) {
    return '<div class="report-empty">아직 열 수 있는 상세 풀이가 없습니다.</div>'
  }

  if (!reportState.activeSectionId) {
    return `
      <div class="report-empty">
        <strong>목차를 누르면 해당 장이 열립니다.</strong>
        <span>기본 스펙 다음부터는 천명대공(天命大公)이 한 장씩 깊게 풀어드립니다.</span>
      </div>
    `
  }

  const section = sections.find((item) => item.id === reportState.activeSectionId)
  if (!section) return '<div class="report-empty">선택한 풀이를 찾지 못했습니다.</div>'

  if (reportState.loadingSectionId === section.id) return renderReportLoading(section)

  const warning = section.generatedBy === 'template'
    ? '<p class="report-note">기본 풀이가 먼저 열렸습니다. 천명대공(天命大公)이 깊은 해석을 마치면 이 장은 더 세밀한 상담문으로 바뀝니다.</p>'
    : ''
  const imageHook = section.hook || section.description || '사주의 결이 보입니다'
  const sectionIndex = sections.findIndex((item) => item.id === section.id)
  const displayOrder = String(sectionIndex >= 0 ? sectionIndex + 2 : section.order || 0).padStart(2, '0')
  const display = sectionCopy(section)

  return `
    <article class="report-section-card">
      <div class="report-section-image">
        <img src="${escapeHtml(section.imageSrc || '/assets/hero-mystic.png')}" alt="${escapeHtml(section.imageAlt || section.category)}" />
        <div>${escapeHtml(imageHook)}</div>
      </div>
      <div class="report-section-head">
        <span>${displayOrder} · 천명대공(天命大公) 풀이</span>
        <h3>${escapeHtml(display.title)}</h3>
        <p>${escapeHtml(display.subtitle)}</p>
      </div>
      ${warning}
      <div class="report-reading">
        ${formatReadableHtml(section.interpretation)}
      </div>
    </article>
  `
}

function renderReportHub() {
  const existing = document.getElementById('report-hub')
  if (existing) existing.remove()

  const sections = getReportSections()
  const report = getReport()
  const hub = document.createElement('section')
  hub.id = 'report-hub'
  hub.className = 'report-hub'
  hub.innerHTML = `
    ${renderBasicSpec()}
    <section class="report-toc-panel">
      <div class="report-panel-head">
        <span>보고 싶은 운을 먼저 고르세요</span>
        <h2>${escapeHtml(report?.title || '천명대공(天命大公) 상세 풀이')}</h2>
        <p>재물운은 일·재물, 연애운은 관계·연애처럼 큰 문으로 먼저 나눴습니다.</p>
      </div>
      <div class="report-toc-grid" role="list">
        ${groupedSections(sections).map((group) => `
          <section class="report-toc-group" data-report-group="${escapeHtml(group.id)}">
            <div class="report-group-head">
              <strong>${escapeHtml(group.title)}</strong>
              <span>${escapeHtml(group.subtitle)}</span>
            </div>
            <div class="report-group-list">
              ${group.items.map((section) => {
                const display = sectionCopy(section)
                const index = sections.findIndex((item) => item.id === section.id)
                return `
                  <button
                    class="report-toc-item ${reportState.activeSectionId === section.id ? 'is-active' : ''}"
                    type="button"
                    data-report-section="${escapeHtml(section.id)}"
                    role="listitem"
                  >
                    <span>${String(index + 2).padStart(2, '0')}</span>
                    <strong>${escapeHtml(display.title)}</strong>
                    <em>${escapeHtml(display.subtitle)}</em>
                  </button>
                `
              }).join('')}
            </div>
          </section>
        `).join('')}
      </div>
      <div class="report-selected" data-report-selected>
        ${renderSelectedSection()}
      </div>
    </section>
  `

  chatLog.prepend(hub)
}

function scrollActiveReportIntoView() {
  requestAnimationFrame(() => {
    const target = document.querySelector('.report-section-card, .report-section-loading')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function loadReportSection(sectionId) {
  if (!session) return
  const sections = getReportSections()
  const cached = sections.find((item) => item.id === sectionId)
  if (!cached) return

  reportState.activeSectionId = sectionId
  reportState.error = ''

  if (cached.status === 'complete' && cached.generatedBy === 'openai') {
    renderReportHub()
    scrollActiveReportIntoView()
    return
  }

  const token = reportState.requestToken + 1
  reportState.requestToken = token
  reportState.loadingSectionId = sectionId
  renderReportHub()
  scrollActiveReportIntoView()

  try {
    const res = await fetch('/api/report/section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birth: getBirthPayload(),
        reportId: getReport()?.reportId,
        sectionId,
        context: getContextPayload(),
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || '풀이 생성 실패')
    if (token !== reportState.requestToken) return

    if (json.report && session.analysis) {
      session.analysis.report = json.report
    }
    if (json.section && session.analysis?.report?.sections) {
      session.analysis.report.sections = session.analysis.report.sections.map((section) => (
        section.id === json.section.id
          ? { ...json.section, generatedBy: json.generatedBy, model: json.model, status: json.section.status || 'complete' }
          : section
      ))
    }
    saveAnalysis(session.analysis)
  } catch (err) {
    appendBubble('system', err.message || '풀이를 여는 중 오류가 났습니다.')
  } finally {
    if (token === reportState.requestToken) {
      reportState.loadingSectionId = ''
      renderReportHub()
      scrollActiveReportIntoView()
    }
  }
}

function appendBubble(role, text, scroll = true) {
  const div = document.createElement('div')
  div.className = `bubble ${role}`
  div.textContent = text
  chatLog.appendChild(div)
  if (scroll) chatLog.scrollTop = chatLog.scrollHeight
}

const session = loadSession()
if (session) {
  const p = session.analysis.pillars
  if (p) {
    document.getElementById('chat-saju-label').textContent =
      `사주 ${p.year?.hanja || ''} ${p.month?.hanja || ''} ${p.day?.hanja || ''} ${p.hour?.hanja || ''}`
  }

  renderReportHub()

  if (session.history.length === 0) {
    appendBubble('assistant',
      '잘 오셨습니다. 방금 펼친 사주의 결을 이어서 보겠습니다. 묻고 싶은 걸 한 문장으로 던져보세요. 천명대공(天命大公)이 하나씩 풀어드리겠습니다.',
      false)
    if (session.initialConcern) {
      appendBubble('assistant', `"${session.initialConcern}" 때문에 여기까지 왔군요. 그 고민도 사주의 흐름 안에서 같이 보겠습니다.`, false)
    }
  } else {
    for (const turn of session.history) appendBubble(turn.role, turn.content, false)
  }
  persistConsultation()
  chatLog.scrollTop = 0
}

document.getElementById('btn-back').addEventListener('click', () => {
  history.back()
})

chatLog.addEventListener('click', (event) => {
  const button = event.target.closest('[data-report-section]')
  if (!button) return
  loadReportSection(button.dataset.reportSection)
})

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!session) return

  const message = chatMessage.value.trim()
  if (!message) return

  appendBubble('user', message)
  chatMessage.value = ''
  btnSend.disabled = true
  btnSend.textContent = '...'

  session.history.push({ role: 'user', content: message })
  saveHistory(session.history)

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birth: session.birth,
        message,
        history: session.history.slice(0, -1),
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || '상담 실패')

    appendBubble('assistant', json.reply)
    session.history.push({ role: 'assistant', content: json.reply })
    saveHistory(session.history)
  } catch (err) {
    appendBubble('system', err.message || '상담 중 오류가 발생했습니다.')
  } finally {
    btnSend.disabled = false
    btnSend.textContent = '전송'
    chatMessage.focus()
  }
})
