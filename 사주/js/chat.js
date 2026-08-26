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
  const pillars = [p.year?.hanja, p.month?.hanja, p.day?.hanja, p.hour?.hanja].filter(Boolean).join(' · ') || '명식 확인 중'
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
  const loadingLines = [
    '천기 선생님이 명식의 결, 지금의 기운, 마음에 걸린 질문을 맞춰 보고 있습니다.',
    '흩어진 기운을 한 줄로 모아 이 장의 풀이를 여는 중입니다.',
    '천년의 흐름 위에 당신의 사주 기둥을 올려 보고 있습니다.',
  ]
  const line = loadingLines[Math.floor(Math.random() * loadingLines.length)]
  return `
    <div class="report-section-loading" role="status" aria-live="polite">
      <strong>${escapeHtml(section?.category || '풀이')}을 여는 중입니다</strong>
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
        <span>기본 스펙 다음부터는 천기 선생님이 한 장씩 깊게 풀어드립니다.</span>
      </div>
    `
  }

  const section = sections.find((item) => item.id === reportState.activeSectionId)
  if (!section) return '<div class="report-empty">선택한 풀이를 찾지 못했습니다.</div>'

  if (reportState.loadingSectionId === section.id) return renderReportLoading(section)

  const warning = section.generatedBy === 'template'
    ? '<p class="report-note">기본 풀이가 먼저 열렸습니다. 천기 선생님이 깊은 해석을 마치면 이 장은 더 세밀한 상담문으로 바뀝니다.</p>'
    : ''
  const imageHook = section.hook || section.description || '사주의 결이 보입니다'
  const sectionIndex = sections.findIndex((item) => item.id === section.id)
  const displayOrder = String(sectionIndex >= 0 ? sectionIndex + 2 : section.order || 0).padStart(2, '0')

  return `
    <article class="report-section-card">
      <div class="report-section-image">
        <img src="${escapeHtml(section.imageSrc || '/assets/hero-mystic.png')}" alt="${escapeHtml(section.imageAlt || section.category)}" />
        <div>${escapeHtml(imageHook)}</div>
      </div>
      <div class="report-section-head">
        <span>${displayOrder} · ${escapeHtml(section.categoryEn || 'Report')}</span>
        <h3>${escapeHtml(section.category)}</h3>
        <p>${escapeHtml(section.classification || '선택한 분류의 해석입니다.')}</p>
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
        <span>전체 사주풀이 분류 목차</span>
        <h2>${escapeHtml(report?.title || '천기 선생님 상세 풀이')}</h2>
        <p>아래 목차를 누르면 해당 분류의 해석이 이 자리에서 열립니다.</p>
      </div>
      <div class="report-toc-grid" role="list">
        ${sections.map((section, index) => `
          <button
            class="report-toc-item ${reportState.activeSectionId === section.id ? 'is-active' : ''}"
            type="button"
            data-report-section="${escapeHtml(section.id)}"
            role="listitem"
          >
            <span>${String(index + 2).padStart(2, '0')}</span>
            <strong>${escapeHtml(section.category)}</strong>
            <em>${escapeHtml(section.classification || section.categoryEn || '')}</em>
          </button>
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
      '잘 오셨습니다. 방금 펼친 사주의 결을 이어서 보겠습니다. 묻고 싶은 걸 한 문장으로 던져보세요. 천기 선생님이 하나씩 풀어드리겠습니다.',
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
