const chatLog = document.getElementById('chat-log')
const chatForm = document.getElementById('chat-form')
const chatMessage = document.getElementById('chat-message')
const btnSend = document.getElementById('btn-send')
const reportState = {
  activeSectionId: '',
  activeGroupId: '',
  viewMode: 'gate',
  loadingSectionId: '',
  error: '',
  requestToken: 0,
}
const pdfState = {
  preparing: false,
  total: 0,
  done: 0,
}
const HISTORY_KEY = 'cheongi_report_history_v1'
const ACTIVE_REPORT_KEY = 'cheongi_active_report_id'
let authClient = null
let authSession = null
let authInitPromise = null
const PDF_KEYWORDS = [
  '천명대공',
  '사주',
  '팔자',
  '기운',
  '운명',
  '인연',
  '관계',
  '재물',
  '돈',
  '고민',
  '위험',
  '해법',
  '신호',
  '시기',
  '흐름',
  '변화',
  '비밀',
  '진실',
  '욕망',
  '균형',
  '선택',
]
let chatSaveTimer = 0

async function initAuth() {
  if (authInitPromise) return authInitPromise
  authInitPromise = (async () => {
    try {
      const res = await fetch('/api/auth/config')
      const config = await res.json()
      if (!config.enabled || !window.supabase?.createClient) return null
      authClient = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
      const { data, error } = await authClient.auth.getSession()
      if (error) return null
      authSession = data.session || null
      authClient.auth.onAuthStateChange((_event, sessionValue) => {
        authSession = sessionValue || null
      })
      return authSession
    } catch (err) {
      return null
    }
  })()
  return authInitPromise
}

async function authHeaders(base = {}) {
  const headers = { ...base }
  const sessionValue = authSession || await initAuth()
  if (sessionValue?.access_token) headers.Authorization = `Bearer ${sessionValue.access_token}`
  return headers
}

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
const CATEGORY_DESIGNS = {
  self: {
    gate: '第一門',
    title: '나의 본질',
    headline: '겉으로 보이는 말투보다 먼저 반응하는 마음을 봅니다.',
    hook: '성향, 기질, 숨은 피로와 반복되는 선택을 한 줄기로 묶어 읽습니다.',
    asset: '/assets/chungi-grand-oracle.webp',
    metrics: ['성향', '기질', '반복점'],
  },
  relationship: {
    gate: '第二門',
    title: '관계·연애',
    headline: '끌리는 사람과 오래 남는 사람은 같은 결이 아닙니다.',
    hook: '인연의 실타래, 관계의 거리, 피해야 할 신호를 따로 가릅니다.',
    asset: '/assets/chungi-grand-relationship.webp',
    metrics: ['인연', '끌림', '거리'],
  },
  money: {
    gate: '第三門',
    title: '일·재물',
    headline: '돈은 욕심보다 흐름을 먼저 타고 들어옵니다.',
    hook: '일이 돈으로 바뀌는 길, 새는 구멍, 움직여야 할 때를 정리합니다.',
    asset: '/assets/chungi-grand-report.webp',
    metrics: ['일', '재물', '타이밍'],
  },
  future: {
    gate: '第四門',
    title: '미래 흐름',
    headline: '큰 변화는 갑자기 오지 않고 작은 신호부터 흔듭니다.',
    hook: '올해의 징조, 대운의 전환, 장소와 시기의 힘을 이어 봅니다.',
    asset: '/assets/chungi-grand-thread.webp',
    metrics: ['신호', '전환', '방향'],
  },
  action: {
    gate: '第五門',
    title: '지금 해법',
    headline: '긴 풀이를 오늘의 선택으로 내려놓아야 의미가 생깁니다.',
    hook: '지금 붙잡을 기준과 먼저 읽어야 할 순서를 짧고 날카롭게 잡습니다.',
    asset: '/assets/chungi-mask-hand.webp',
    metrics: ['해법', '순서', '선택'],
  },
  etc: {
    gate: '外傳',
    title: '그 밖의 흐름',
    headline: '큰 문에 들어가지 않은 잔여 기운도 버리지 않고 읽습니다.',
    hook: '놓치면 해석이 비는 세부 흐름을 별도 목차로 정리합니다.',
    asset: '/assets/chungi-last-saju-book.webp',
    metrics: ['보강', '잔여', '확인'],
  },
}
const GROUP_ASSETS = {
  self: [
    '/assets/chungi-grand-oracle.webp',
    '/assets/chungi-source-hero.webp',
    '/assets/chungi-palza-bg.webp',
    '/assets/chungi-asset-one.webp',
    '/assets/chungi-character-a.webp',
    '/assets/chungi-grand-report.webp',
  ],
  relationship: [
    '/assets/chungi-grand-relationship.webp',
    '/assets/chungi-romance-closeup.webp',
    '/assets/chungi-hand-bells.webp',
    '/assets/chungi-date-preview-three.webp',
    '/assets/chungi-character-d.webp',
  ],
  money: [
    '/assets/chungi-wealth-bg.webp',
    '/assets/chungi-wealth-transition.webp',
    '/assets/chungi-hand-reach.webp',
    '/assets/chungi-grand-report.webp',
    '/assets/chungi-comparison-bg.webp',
  ],
  future: [
    '/assets/chungi-grand-thread.webp',
    '/assets/chungi-manseryeok-bg.webp',
    '/assets/chungi-asset-two.webp',
    '/assets/chungi-last-saju-book.webp',
    '/assets/chungi-preview-two.webp',
  ],
  action: [
    '/assets/honggildong-saju-report-list.webp',
    '/assets/chungi-mask-hand.webp',
    '/assets/chungi-character-outro.webp',
  ],
  etc: ['/assets/hero-mystic.webp'],
}
const HOOK_CHAPTERS = {
  self: [
    { no: '01', title: '너라는 사람부터 먼저 봅니다', subtitle: '스스로 아는 얼굴과 실제 반응의 차이', ids: ['profile', 'target-context'] },
    { no: '02', title: '밖에서 보이는 얼굴은 따로 있습니다', subtitle: '사회 속 모습과 혼자 남았을 때의 결', ids: ['month-pillar', 'hidden-personality'] },
    { no: '03', title: '어릴 때 남은 흔적이 지금도 움직입니다', subtitle: '반복되는 시작점과 감정의 습관', ids: ['pillars-structure', 'year-pillar'] },
    { no: '04', title: '가까워질수록 드러나는 진짜 성격', subtitle: '가장 가까운 곳에서 먼저 드러나는 마음', ids: ['day-pillar'] },
    { no: '05', title: '버티는 힘과 무너지는 지점을 같이 봅니다', subtitle: '강점이 과해질 때 생기는 위험 신호', ids: ['hour-pillar', 'day-master-strength', 'dominant-element'] },
    { no: '06', title: '비어 있는 자리가 운을 흔듭니다', subtitle: '채워야 할 균형과 회복의 방향', ids: ['balance', 'weak-element'] },
    { no: '07', title: '살리는 선택과 망치는 선택은 다릅니다', subtitle: '풀릴 때와 꼬일 때의 결정적 차이', ids: ['useful-god-eokbu', 'useful-god-johu'] },
    { no: '08', title: '돈·사람·책임 앞에서 본성이 드러납니다', subtitle: '숨겨진 반응과 반복되는 판단 방식', ids: ['ten-gods-overview', 'ten-gods-position'] },
    { no: '09', title: '같은 곳에서 무너지는 이유가 있습니다', subtitle: '좋은 말보다 먼저 봐야 할 함정', ids: ['trap'] },
    { no: '10', title: '고민은 바뀌어도 패턴은 남습니다', subtitle: '요즘 일이 반복되는 숨은 구조', ids: ['concern-loop'] },
  ],
  money: [
    { no: '11', title: '능력이 돈이 되는 조건을 봅니다', subtitle: '열심히 하는 것과 돈으로 바뀌는 것은 다릅니다', ids: ['career-money', 'wealth-flow'] },
    { no: '12', title: '일상이 꼬일 때 먼저 오는 신호', subtitle: '직장, 쉬는 시간, 생활 리듬의 변화', ids: ['work-context'] },
    { no: '13', title: '버틸지 옮길지 갈리는 기준', subtitle: '직장·사업·이직의 판단선을 나눕니다', ids: ['career-transition'] },
    { no: '14', title: '돈이 남지 않는 숨은 구멍', subtitle: '작아 보이는 지출이 커지는 흐름', ids: ['money-leak'] },
    { no: '15', title: '잡아야 할 돈과 피해야 할 돈', subtitle: '재물 기회가 붙는 방식과 때', ids: ['wealth-timing'] },
  ],
  relationship: [
    { no: '16', title: '운명처럼 보이는 끌림을 가릅니다', subtitle: '사랑의 기준, 지금 관계, 반복되는 인연 패턴', ids: ['relationship-orientation', 'relationship-status', 'love-loop'] },
    { no: '17', title: '오래 남는 사람의 결은 따로 있습니다', subtitle: '끌림보다 오래 가는 상대의 분위기', ids: ['destiny-partner'] },
    { no: '18', title: '멀어져야 할 관계 신호를 봅니다', subtitle: '가까이 둘 사람과 흐리게 만드는 사람', ids: ['avoid-relationship', 'love-timing'] },
  ],
  future: [
    { no: '19', title: '올해 먼저 움직이는 신호', subtitle: '큰 변화 전에 드러나는 징조', ids: ['future-flow', 'sewoon-detail'] },
    { no: '20', title: '인생 판이 바뀌기 전 흔들리는 곳', subtitle: '대운, 전환점, 살아나는 시기와 장소', ids: ['daewoon-detail', 'turning-years', 'timing-place'] },
  ],
  action: [
    { no: '21', title: '오늘부터 붙잡을 기준', subtitle: '지금 바로 바꿔야 할 작은 선택', ids: ['action-guide'] },
    { no: '22', title: '긴 풀이를 읽는 순서', subtitle: '어디부터 보면 내 이야기가 풀리는지', ids: ['long-report-depth'] },
  ],
}
const UI_KEYWORDS = [...PDF_KEYWORDS, '성향', '기질', '실타래', '연애', '목차', '문', '대운', '전환점', '직장', '사업']

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
  const titleName = birth.name || birth.target || '자네'
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
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
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

function highlightPdfKeywords(value) {
  const escaped = escapeHtml(value)
  const pattern = new RegExp(`(${PDF_KEYWORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  return escaped.replace(pattern, '<span class="pdf-key">$1</span>')
}

function normalizePdfText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function markdownLikeHtml(text) {
  const blocks = normalizePdfText(text).split(/\n{2,}/).filter(Boolean)
  if (!blocks.length) return '<p>아직 이 장의 해석이 열리지 않았습니다.</p>'

  return blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    if (!lines.length) return ''

    const heading = lines[0].match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      const level = Math.min(heading[1].length + 1, 4)
      const rest = lines.slice(1).map((line) => `<p>${highlightPdfKeywords(line)}</p>`).join('')
      return `<h${level}>${highlightPdfKeywords(heading[2])}</h${level}>${rest}`
    }

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return `<ul>${lines.map((line) => `<li>${highlightPdfKeywords(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`
    }

    return `<p>${lines.map(highlightPdfKeywords).join('<br>')}</p>`
  }).join('')
}

function pdfSpecRows() {
  const analysis = session?.analysis || {}
  const birth = session?.birth || {}
  const p = analysis.pillars || {}
  const pillars = [p.year?.hanja, p.month?.hanja, p.day?.hanja, p.hour?.hanja].filter(Boolean).join(' · ') || '기운 확인 중'
  return [
    ['이름', birth.name || birth.target || '자네'],
    ['생년월일', `${birth.calendar === 'lunar' ? '음력' : '양력'} ${formatBirthLabel(birth)}`],
    ['사주 기둥', pillars],
    ['먼저 보이는 기운', analysis.dominantElement || analysis.dayMaster?.element || '기운'],
    ['보완할 흐름', analysis.usefulGod || analysis.weakElement || '균형'],
    ['지금 물은 것', birth.concern || '지금 고민'],
  ]
}

function isGeneratedReportSection(section) {
  return section?.status === 'complete' && section?.generatedBy === 'openai'
}

function setPdfState(preparing, total = 0, done = 0) {
  pdfState.preparing = preparing
  pdfState.total = total
  pdfState.done = done
  updatePdfButtons()
}

function updatePdfButtons() {
  document.querySelectorAll('#btn-pdf, [data-report-pdf]').forEach((button) => {
    button.disabled = pdfState.preparing
    button.setAttribute('aria-busy', pdfState.preparing ? 'true' : 'false')
    if (button.id === 'btn-pdf') {
      button.textContent = pdfState.preparing ? 'PDF...' : 'PDF'
      return
    }
    button.textContent = pdfState.preparing && pdfState.total
      ? `PDF 준비 중 ${pdfState.done}/${pdfState.total}`
      : 'PDF 다운받기'
  })
}

function pdfVisualHtml(section) {
  const groupId = sectionGroupId(section?.id)
  const display = sectionCopy(section)
  return `
    <figure class="pdf-visual">
      <img src="${escapeHtml(sectionVisualSrc(section, groupId))}" alt="${escapeHtml(section?.imageAlt || display.title)}" />
    </figure>
  `
}

function pdfSignalTableHtml(section) {
  const groupId = sectionGroupId(section?.id)
  const display = sectionCopy(section)
  const design = categoryDesign(groupId)
  const rows = [
    ['먼저 볼 것', display.title],
    ['숨은 기준', display.subtitle],
    ['읽는 방향', `${design.title}의 흐름 안에서 ${design.metrics.join(' · ')}을 함께 봅니다.`],
  ]
  return `
    <table class="signal-table">
      <tbody>
        ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${highlightPdfKeywords(value)}</td></tr>`).join('')}
      </tbody>
    </table>
  `
}

function pdfMiniGraphHtml(section) {
  const groupId = sectionGroupId(section?.id)
  const seed = String(section?.id || groupId)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const labels = groupId === 'money'
    ? ['준비', '누수', '기회', '회수']
    : groupId === 'relationship'
      ? ['끌림', '거리', '반복', '정리']
      : groupId === 'future'
        ? ['지금', '흔들림', '전환', '방향']
        : ['겉', '속', '반응', '회복']
  return `
    <div class="pdf-graph" aria-label="흐름 그래프">
      ${labels.map((label, index) => {
        const height = 32 + ((seed + index * 17) % 54)
        return `
          <div>
            <i style="height:${height}px"></i>
            <span>${escapeHtml(label)}</span>
          </div>
        `
      }).join('')}
    </div>
  `
}

function buildPrintableReportHtml() {
  const report = getReport()
  const sections = getReportSections()
  const title = report?.title || `${session?.birth?.name || '자네'}님의 사주 리포트`
  const subtitle = report?.subtitle || '천명대공(天命大公)이 사주의 큰 흐름과 지금의 고민을 함께 정리했습니다.'
  const generatedAt = new Date().toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })
  const groups = groupedSections(sections)
  const specRows = pdfSpecRows()

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base href="${escapeHtml(location.origin)}/" />
  <title>${escapeHtml(title)} PDF</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0a0504;
      color: #211715;
      font-family: Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif;
      line-height: 1.74;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { max-width: 820px; margin: 0 auto; background: #fff9ef; }
    .cover {
      min-height: 100vh;
      display: grid;
      align-content: space-between;
      gap: 32px;
      padding: 36px;
      color: #fff8ef;
      background:
        radial-gradient(circle at 50% 16%, rgba(242, 191, 107, 0.36), transparent 30%),
        linear-gradient(180deg, rgba(0, 0, 0, 0.1), #080302 68%),
        #080302;
      page-break-after: always;
    }
    .cover-logo { width: 100%; display: block; border-radius: 18px; }
    .cover h1 { margin: 34px 0 0; font-size: 34px; line-height: 1.22; letter-spacing: 0; }
    .cover p { max-width: 560px; margin: 16px 0 0; color: #e9d6bd; font-size: 16px; }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 28px;
    }
    .cover-meta div {
      padding: 13px 15px;
      border: 1px solid rgba(242, 191, 107, 0.3);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
    }
    .cover-meta span { display: block; color: #f2bf6b; font-size: 12px; font-weight: 900; }
    .cover-meta strong { display: block; margin-top: 4px; color: #fff8ef; font-size: 15px; }
    .print-body { padding: 30px 36px 42px; }
    .section { break-inside: avoid; padding: 24px 0; border-bottom: 1px solid #ead7bd; }
    .section:last-child { border-bottom: 0; }
    .kicker {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 999px;
      background: #f4e6cf;
      color: #a52c22;
      font-size: 12px;
      font-weight: 900;
    }
    h2 { margin: 12px 0 10px; color: #1a100e; font-size: 25px; line-height: 1.3; letter-spacing: 0; }
    h3 { margin: 20px 0 8px; color: #2b1714; font-size: 19px; line-height: 1.38; letter-spacing: 0; }
    h4 { margin: 16px 0 6px; color: #2b1714; font-size: 16px; line-height: 1.45; letter-spacing: 0; }
    p { margin: 10px 0 0; word-break: keep-all; overflow-wrap: anywhere; }
    ul { margin: 10px 0 0; padding-left: 20px; }
    li { margin: 4px 0; }
    .spec-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .spec-table th, .spec-table td {
      padding: 10px 0;
      border-bottom: 1px solid #ead7bd;
      text-align: left;
      vertical-align: top;
    }
    .spec-table th { width: 120px; color: #a52c22; font-size: 13px; }
    .toc { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .toc-group {
      padding: 14px;
      border: 1px solid #ead7bd;
      border-radius: 12px;
      background: #fff4e2;
      break-inside: avoid;
    }
    .toc-group strong { display: block; color: #1a100e; font-size: 16px; }
    .toc-group span { display: block; margin-top: 2px; color: #78554a; font-size: 12px; }
    .toc-group ol { margin: 10px 0 0; padding-left: 22px; }
    .toc-group li { padding-left: 2px; font-size: 12px; line-height: 1.5; }
    .chapter { page-break-before: auto; }
    .chapter-head {
      padding: 18px;
      border-radius: 16px;
      background: linear-gradient(135deg, #24110e, #5b1712);
      color: #fff8ef;
    }
    .chapter-head .kicker { background: rgba(242, 191, 107, 0.16); color: #f2bf6b; }
    .chapter-head h2 { color: #fff8ef; }
    .chapter-head p { color: #ead6bf; }
    .pdf-visual {
      position: relative;
      margin: 16px 0 0;
      overflow: hidden;
      border-radius: 16px;
      background: #090403;
      border: 1px solid #e5c17d;
      break-inside: avoid;
    }
    .pdf-visual::before,
    .pdf-visual::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      height: 28%;
      pointer-events: none;
      z-index: 1;
    }
    .pdf-visual::before { top: 0; background: linear-gradient(180deg, #090403, rgba(9, 4, 3, 0)); }
    .pdf-visual::after { bottom: 0; background: linear-gradient(0deg, #090403, rgba(9, 4, 3, 0)); }
    .pdf-visual img {
      display: block;
      width: 100%;
      max-height: 235px;
      object-fit: cover;
    }
    .signal-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      border: 1px solid #ead7bd;
      border-radius: 12px;
      overflow: hidden;
      background: #fff4e2;
    }
    .signal-table th,
    .signal-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #ead7bd;
      text-align: left;
      vertical-align: top;
      font-size: 12px;
    }
    .signal-table tr:last-child th,
    .signal-table tr:last-child td { border-bottom: 0; }
    .signal-table th { width: 96px; color: #a52c22; }
    .pdf-graph {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      align-items: end;
      gap: 10px;
      margin-top: 14px;
      padding: 14px;
      border-radius: 14px;
      background: linear-gradient(135deg, #21110f, #4a1510);
      color: #fff8ef;
      break-inside: avoid;
    }
    .pdf-graph div { display: grid; justify-items: center; gap: 6px; }
    .pdf-graph i {
      width: 100%;
      max-width: 42px;
      display: block;
      border-radius: 999px 999px 4px 4px;
      background: linear-gradient(180deg, #f2bf6b, #c83327);
    }
    .pdf-graph span { color: #f5dfbd; font-size: 11px; font-weight: 900; }
    .reading { padding-top: 12px; color: #2a1d1a; font-size: 14px; }
    .pdf-key { color: #d2342a; font-weight: 900; }
    .footer {
      padding: 18px 36px 28px;
      color: #7a5a4c;
      font-size: 11px;
      text-align: center;
      background: #fff9ef;
    }
    @media print {
      body { background: #fff9ef; }
      .sheet { max-width: none; }
      .cover { min-height: 260mm; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="cover">
      <div>
        <img class="cover-logo" src="/assets/chungi-nav-logo.webp" alt="천명대공" />
        <h1>${highlightPdfKeywords(title)}</h1>
        <p>${highlightPdfKeywords(subtitle)}</p>
      </div>
      <div>
        <div class="cover-meta">
          ${specRows.slice(0, 4).map(([label, value]) => `
            <div><span>${escapeHtml(label)}</span><strong>${highlightPdfKeywords(value)}</strong></div>
          `).join('')}
        </div>
        <p>생성일: ${escapeHtml(generatedAt)}</p>
      </div>
    </section>
    <div class="print-body">
      <section class="section">
        <span class="kicker">기본값</span>
        <h2>${highlightPdfKeywords('사주 기본 정보')}</h2>
        <table class="spec-table">
          <tbody>
            ${specRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${highlightPdfKeywords(value)}</td></tr>`).join('')}
          </tbody>
        </table>
      </section>
      <section class="section">
        <span class="kicker">목차</span>
        <h2>${highlightPdfKeywords('해석 순서')}</h2>
        <div class="toc">
          ${groups.map((group) => `
            <section class="toc-group">
              <strong>${highlightPdfKeywords(group.title)}</strong>
              <span>${highlightPdfKeywords(group.subtitle)}</span>
              <ol>
                ${group.items.map((section) => `<li>${highlightPdfKeywords(sectionCopy(section).title)}</li>`).join('')}
              </ol>
            </section>
          `).join('')}
        </div>
      </section>
      ${sections.map((section, index) => {
        const display = sectionCopy(section)
        const order = String(index + 2).padStart(2, '0')
        return `
          <section class="section chapter">
            <div class="chapter-head">
              <span class="kicker">${order} · 천명대공 풀이</span>
              <h2>${highlightPdfKeywords(display.title)}</h2>
              <p>${highlightPdfKeywords(display.subtitle)}</p>
            </div>
            ${pdfVisualHtml(section)}
            ${pdfSignalTableHtml(section)}
            ${pdfMiniGraphHtml(section)}
            <div class="reading">
              ${markdownLikeHtml(section.interpretation)}
            </div>
          </section>
        `
      }).join('')}
    </div>
    <footer class="footer">천명대공(天命大公) 사주 리포트 · 화면의 해석 내용을 PDF 저장용으로 정리했습니다.</footer>
  </main>
</body>
</html>`
}

function buildPdfStatusHtml(message) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PDF 준비 중</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #050201;
      color: #fff8ef;
      font-family: Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif;
    }
    main {
      width: min(520px, calc(100vw - 32px));
      padding: 28px;
      border: 1px solid rgba(242, 191, 107, 0.34);
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(78, 16, 12, 0.72), rgba(5, 2, 1, 0.92));
      text-align: center;
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
    }
    img { width: 100%; max-width: 360px; display: block; margin: 0 auto 18px; border-radius: 14px; }
    h1 { margin: 0; font-size: 23px; line-height: 1.35; letter-spacing: 0; }
    p { margin: 12px 0 0; color: #ead6bf; font-size: 14px; line-height: 1.7; }
  </style>
</head>
<body>
  <main>
    <img src="/assets/chungi-nav-logo.webp" alt="천명대공" />
    <h1>${escapeHtml(message)}</h1>
    <p>모든 장의 풀이를 먼저 저장한 뒤 PDF 저장 화면을 열겠습니다. 이 창은 닫지 말아주세요.</p>
  </main>
</body>
</html>`
}

async function ensureAllReportSectionsForPdf() {
  if (!session) return
  const pending = getReportSections().filter((section) => !isGeneratedReportSection(section))
  if (!pending.length) return

  setPdfState(true, pending.length, 0)
  appendBubble('system', 'PDF용 전체 풀이를 준비하는 중입니다. 모든 장을 저장한 뒤 PDF 창을 열겠습니다.')

  for (const section of pending) {
    const res = await fetch('/api/report/section', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        birth: getBirthPayload(),
        reportId: getReport()?.reportId,
        sectionId: section.id,
        context: getContextPayload(),
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'PDF용 풀이 생성에 실패했습니다.')

    if (json.report && session.analysis) {
      session.analysis.report = json.report
    }
    if (json.section && session.analysis?.report?.sections) {
      session.analysis.report.sections = session.analysis.report.sections.map((item) => (
        item.id === json.section.id
          ? { ...json.section, generatedBy: json.generatedBy, model: json.model, status: json.section.status || 'complete' }
          : item
      ))
    }
    saveAnalysis(session.analysis)
    pdfState.done += 1
    updatePdfButtons()
  }
  persistConsultation({ syncServer: true })
}

function printPreparedPdf(pdfWindow) {
  let printed = false
  const printReport = () => {
    if (printed) return
    printed = true
    pdfWindow.focus()
    pdfWindow.print()
  }

  pdfWindow.addEventListener('load', () => {
    setTimeout(printReport, 400)
  }, { once: true })
  setTimeout(printReport, 1400)
}

async function openReportPdf() {
  if (pdfState.preparing) return
  const report = getReport()
  if (!report) {
    appendBubble('system', 'PDF로 정리할 사주 리포트를 찾지 못했습니다.')
    return
  }

  const pdfWindow = window.open('', '_blank')
  if (!pdfWindow) {
    appendBubble('system', '팝업이 차단되어 PDF 창을 열지 못했습니다. 브라우저 팝업 허용 후 다시 눌러주세요.')
    return
  }

  pdfWindow.document.open()
  pdfWindow.document.write(buildPdfStatusHtml('PDF 해석을 준비하고 있습니다.'))
  pdfWindow.document.close()

  setPdfState(true)
  try {
    await ensureAllReportSectionsForPdf()
    pdfWindow.document.open()
    pdfWindow.document.write(buildPrintableReportHtml())
    pdfWindow.document.close()
    printPreparedPdf(pdfWindow)
  } catch (err) {
    const message = err.message || 'PDF 준비 중 오류가 났습니다.'
    pdfWindow.document.open()
    pdfWindow.document.write(buildPdfStatusHtml(message))
    pdfWindow.document.close()
    appendBubble('system', message)
  } finally {
    setPdfState(false)
  }
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
    subtitle: copy?.[1] || section?.classification || '지금 봐야 할 흐름을 풀어줄 걸세.',
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

function categoryDesign(groupId) {
  return CATEGORY_DESIGNS[groupId] || CATEGORY_DESIGNS.etc
}

function highlightUiKeywords(value) {
  const escaped = escapeHtml(value)
  const pattern = new RegExp(`(${UI_KEYWORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  return escaped.replace(pattern, '<span class="ui-key">$1</span>')
}

function sectionNumber(section) {
  const sections = getReportSections()
  const index = sections.findIndex((item) => item.id === section?.id)
  return String(index >= 0 ? index + 2 : section?.order || 0).padStart(2, '0')
}

function sectionGroupId(sectionId) {
  return groupedSections(getReportSections()).find((group) => group.items.some((item) => item.id === sectionId))?.id || 'etc'
}

function groupSections(groupId) {
  return groupedSections(getReportSections()).find((group) => group.id === groupId)?.items || []
}

function sectionVisualSrc(section, groupId) {
  const items = groupSections(groupId)
  const index = Math.max(0, items.findIndex((item) => item.id === section?.id))
  const assets = GROUP_ASSETS[groupId] || GROUP_ASSETS.etc
  if (section?.imageSrc && !section.imageSrc.includes('hero-mystic')) return section.imageSrc
  return assets[index % assets.length]
}

function chaptersForGroup(group) {
  const byId = new Map(group.items.map((section) => [section.id, section]))
  const configured = HOOK_CHAPTERS[group.id] || []
  const chapters = configured
    .map((chapter) => ({
      ...chapter,
      items: chapter.ids.map((id) => byId.get(id)).filter(Boolean),
    }))
    .filter((chapter) => chapter.items.length)

  const used = new Set(chapters.flatMap((chapter) => chapter.items.map((section) => section.id)))
  const rest = group.items.filter((section) => !used.has(section.id))
  rest.forEach((section) => {
    const display = sectionCopy(section)
    chapters.push({
      no: sectionNumber(section),
      title: display.title,
      subtitle: display.subtitle,
      ids: [section.id],
      items: [section],
    })
  })
  return chapters
}

function chapterForSection(groupId, sectionId) {
  const group = groupedSections(getReportSections()).find((item) => item.id === groupId)
  if (!group) return null
  return chaptersForGroup(group).find((chapter) => chapter.items.some((section) => section.id === sectionId)) || null
}

function renderMiniGraph(section, groupId) {
  const seed = String(section?.id || groupId)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const labels = groupId === 'money'
    ? ['준비', '누수', '기회', '회수']
    : groupId === 'relationship'
      ? ['끌림', '거리', '반복', '정리']
      : groupId === 'future'
        ? ['지금', '흔들림', '전환', '방향']
        : ['겉', '속', '반응', '회복']
  return `
    <div class="fate-graph" aria-label="흐름 그래프">
      ${labels.map((label, index) => {
        const height = 34 + ((seed + index * 17) % 46)
        return `
          <div>
            <i style="height:${height}px"></i>
            <span>${escapeHtml(label)}</span>
          </div>
        `
      }).join('')}
    </div>
  `
}

function renderSignalTable(section, groupId) {
  const display = sectionCopy(section)
  const design = categoryDesign(groupId)
  const rows = [
    ['먼저 볼 것', display.title],
    ['숨은 기준', display.subtitle],
    ['읽는 방향', `${design.title}의 흐름 안에서 ${design.metrics.join(' · ')}을 함께 봅니다.`],
  ]
  return `
    <div class="oracle-table" role="table" aria-label="해석 기준표">
      ${rows.map(([label, value]) => `
        <div role="row">
          <span role="cell">${escapeHtml(label)}</span>
          <strong role="cell">${highlightUiKeywords(value)}</strong>
        </div>
      `).join('')}
    </div>
  `
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
  const name = birth.name || birth.target || '자네'
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
    '천명대공(天命大公)이 지금 자네에게 먼저 보이는 흐름을 짚는 중일세.',
    '흩어진 마음의 신호를 한 줄로 모아 이 장을 여는 중일세.',
    '오래된 기운 위에 지금의 질문을 올려 보고 있네.',
    '잠시 있어 보게. 이 장에서 먼저 볼 대목이 드러나고 있네.',
  ]
  const line = loadingLines[Math.floor(Math.random() * loadingLines.length)]
  return `
    <div class="report-section-loading" role="status" aria-live="polite">
      <strong>${escapeHtml(display.title)}을 여는 중일세</strong>
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
        <span>기본 스펙 다음부터는 천명대공(天命大公)이 한 장씩 깊게 풀어줄 걸세.</span>
      </div>
    `
  }

  const section = sections.find((item) => item.id === reportState.activeSectionId)
  if (!section) return '<div class="report-empty">선택한 풀이를 찾지 못했습니다.</div>'

  if (reportState.loadingSectionId === section.id) return renderReportLoading(section)

  const warning = section.generatedBy === 'template'
    ? '<p class="report-note">기본 풀이가 먼저 열렸습니다. 천명대공(天命大公)이 깊은 해석을 마치면 이 장은 더 세밀한 상담문으로 바뀝니다.</p>'
    : ''
  const imageHook = section.hook || section.description || '사주의 결이 보이는군'
  const sectionIndex = sections.findIndex((item) => item.id === section.id)
  const displayOrder = String(sectionIndex >= 0 ? sectionIndex + 2 : section.order || 0).padStart(2, '0')
  const display = sectionCopy(section)

  return `
    <article class="report-section-card">
      <div class="report-section-image">
        <img src="${escapeHtml(section.imageSrc || '/assets/hero-mystic.webp')}" alt="${escapeHtml(section.imageAlt || section.category)}" />
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

function renderReportGate(groups, report) {
  return `
    <section class="report-gate-panel">
      <div class="report-gate-heading">
        <span>천명대공 목차</span>
        <h2>대분류 목차</h2>
      </div>
      <div class="report-gate-toc">
        ${groups.map((group) => {
          const design = categoryDesign(group.id)
          const chapters = chaptersForGroup(group)
          return `
            <button class="report-gate-toc-item" type="button" data-report-group-open="${escapeHtml(group.id)}">
              <span>${escapeHtml(design.gate)}</span>
              <strong>${escapeHtml(group.title)}</strong>
              <em>${escapeHtml(group.subtitle)}</em>
              <small>${escapeHtml(String(chapters.length))}개 목차</small>
            </button>
          `
        }).join('')}
      </div>
      <div class="report-panel-actions">
        <button class="pdf-button" type="button" data-report-pdf>PDF 다운받기</button>
      </div>
    </section>
  `
}

function renderCategoryDoors(groups) {
  return `
    <section class="report-category-panel">
      <div class="report-panel-head">
        <span>중간 목차</span>
        <h2>${highlightUiKeywords('보고 싶은 운명의 문을 먼저 고르세요')}</h2>
        <p>각 문은 단순한 목록이 아니라, 해당 대분류의 핵심 훅과 해석 순서를 묶은 진입 화면입니다.</p>
      </div>
      <div class="category-door-grid">
        ${groups.map((group) => {
          const design = categoryDesign(group.id)
          const chapters = chaptersForGroup(group)
          return `
            <button class="category-door" type="button" data-report-group-open="${escapeHtml(group.id)}">
              <img src="${escapeHtml(design.asset)}" alt="" />
              <span>${escapeHtml(design.gate)}</span>
              <strong>${escapeHtml(group.title)}</strong>
              <em>${highlightUiKeywords(design.headline)}</em>
              <small>${escapeHtml(chapters.length)}개의 후킹 목차</small>
            </button>
          `
        }).join('')}
      </div>
      <button class="report-backline" type="button" data-report-view="gate">처음 화면으로</button>
    </section>
  `
}

function renderCategoryToc(groups) {
  const group = groups.find((item) => item.id === reportState.activeGroupId) || groups[0]
  if (!group) return renderCategoryDoors(groups)
  const design = categoryDesign(group.id)
  const chapters = chaptersForGroup(group)
  return `
    <section class="category-toc-panel" data-active-category="${escapeHtml(group.id)}">
      <div class="category-toc-cover">
        <img src="${escapeHtml(design.asset)}" alt="" />
        <div>
          <span>${escapeHtml(design.gate)}</span>
          <h2>${escapeHtml(design.title)}</h2>
          <p>${highlightUiKeywords(design.hook)}</p>
        </div>
      </div>
      <div class="category-tabs" role="list">
        ${groups.map((item) => `
          <button
            type="button"
            class="${item.id === group.id ? 'is-active' : ''}"
            data-report-group-open="${escapeHtml(item.id)}"
            role="listitem"
          >${escapeHtml(item.title)}</button>
        `).join('')}
      </div>
      <div class="hook-chapter-list">
        ${chapters.map((chapter) => `
          <button class="hook-chapter" type="button" data-report-section="${escapeHtml(chapter.items[0].id)}" data-report-mode="reader">
            <span class="hook-chapter-no">${escapeHtml(chapter.no)}</span>
            <span class="hook-chapter-body">
              <strong>${highlightUiKeywords(chapter.title)}</strong>
              <em>${highlightUiKeywords(chapter.subtitle)}</em>
              <small>${chapter.items.map((section) => sectionNumber(section)).join(' · ')}장 연결</small>
            </span>
          </button>
        `).join('')}
      </div>
      <button class="report-backline" type="button" data-report-view="categories">대분류로 돌아가기</button>
    </section>
  `
}

function renderReportReader(groups) {
  const groupId = reportState.activeGroupId || sectionGroupId(reportState.activeSectionId)
  const group = groups.find((item) => item.id === groupId) || groups[0]
  if (!group) return renderCategoryDoors(groups)

  const items = group.items
  const activeIndex = Math.max(0, items.findIndex((section) => section.id === reportState.activeSectionId))
  const section = items[activeIndex] || items[0]
  const display = sectionCopy(section)
  const design = categoryDesign(group.id)
  const chapter = chapterForSection(group.id, section.id)
  const warning = section.generatedBy === 'template'
    ? '<p class="report-note">기본 풀이가 먼저 열렸습니다. 깊은 해석이 열리면 이 장은 더 세밀한 상담문으로 바뀝니다.</p>'
    : ''

  return `
    <section class="reader-panel" data-reader-group="${escapeHtml(group.id)}">
      <div class="reader-top">
        <button type="button" data-report-group-open="${escapeHtml(group.id)}">목차</button>
        <div>
          <span>${escapeHtml(design.gate)} · ${escapeHtml(group.title)}</span>
          <strong>${escapeHtml(chapter?.title || display.title)}</strong>
        </div>
        <span>${activeIndex + 1}/${items.length}</span>
      </div>
      <article class="reader-card">
        <div class="reader-visual">
          <img src="${escapeHtml(sectionVisualSrc(section, group.id))}" alt="${escapeHtml(section.imageAlt || display.title)}" />
        </div>
        <div class="reader-copy">
          <span>${sectionNumber(section)} · 천명대공 풀이</span>
          <h3>${highlightUiKeywords(display.title)}</h3>
          <p>${highlightUiKeywords(display.subtitle)}</p>
        </div>
        ${warning}
        ${renderSignalTable(section, group.id)}
        ${renderMiniGraph(section, group.id)}
        <div class="report-reading">
          ${formatReadableHtml(section.interpretation)}
        </div>
      </article>
      <div class="reader-controls">
        <button type="button" data-report-reader-prev ${activeIndex === 0 ? 'disabled' : ''}>이전</button>
        <button type="button" data-report-reader-next ${activeIndex === items.length - 1 ? 'disabled' : ''}>다음</button>
      </div>
    </section>
  `
}

function renderReportHub() {
  const existing = document.getElementById('report-hub')
  if (existing) existing.remove()

  const sections = getReportSections()
  const report = getReport()
  const groups = groupedSections(sections)
  const hub = document.createElement('section')
  hub.id = 'report-hub'
  hub.className = 'report-hub'
  let body = renderReportGate(groups, report)
  if (reportState.viewMode === 'categories') body = renderCategoryDoors(groups)
  if (reportState.viewMode === 'category') body = renderCategoryToc(groups)
  if (reportState.viewMode === 'reader') body = renderReportReader(groups)
  hub.innerHTML = `${reportState.viewMode === 'gate' ? renderBasicSpec() : ''}${body}`

  chatLog.prepend(hub)
}

function scrollActiveReportIntoView() {
  requestAnimationFrame(() => {
    const target = document.querySelector('.reader-card, .report-section-card, .report-section-loading, .category-toc-panel')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function loadReportSection(sectionId) {
  if (!session) return
  const sections = getReportSections()
  const cached = sections.find((item) => item.id === sectionId)
  if (!cached) return

  reportState.activeSectionId = sectionId
  reportState.activeGroupId = sectionGroupId(sectionId)
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
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
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
      '잘 왔네. 방금 펼친 사주의 결을 이어서 보겠네. 묻고 싶은 걸 한 문장으로 던져보게. 천명대공(天命大公)이 하나씩 풀어주겠네.',
      false)
    if (session.initialConcern) {
      appendBubble('assistant', `"${session.initialConcern}" 때문에 여기까지 온 것이군. 그 고민도 자네 사주의 흐름 안에서 같이 보겠네.`, false)
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

document.getElementById('btn-pdf').addEventListener('click', openReportPdf)

chatLog.addEventListener('click', (event) => {
  const pdfButton = event.target.closest('[data-report-pdf]')
  if (pdfButton) {
    openReportPdf()
    return
  }

  const viewButton = event.target.closest('[data-report-view]')
  if (viewButton) {
    reportState.viewMode = viewButton.dataset.reportView
    renderReportHub()
    scrollActiveReportIntoView()
    return
  }

  const groupButton = event.target.closest('[data-report-group-open]')
  if (groupButton) {
    reportState.activeGroupId = groupButton.dataset.reportGroupOpen
    reportState.viewMode = 'category'
    renderReportHub()
    scrollActiveReportIntoView()
    return
  }

  const prevButton = event.target.closest('[data-report-reader-prev]')
  const nextButton = event.target.closest('[data-report-reader-next]')
  if (prevButton || nextButton) {
    const groupId = reportState.activeGroupId || sectionGroupId(reportState.activeSectionId)
    const items = groupSections(groupId)
    const currentIndex = items.findIndex((item) => item.id === reportState.activeSectionId)
    const nextIndex = currentIndex + (nextButton ? 1 : -1)
    const nextSection = items[nextIndex]
    if (nextSection) {
      reportState.viewMode = 'reader'
      loadReportSection(nextSection.id)
    }
    return
  }

  const button = event.target.closest('[data-report-section]')
  if (!button) return
  reportState.viewMode = button.dataset.reportMode || 'reader'
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
