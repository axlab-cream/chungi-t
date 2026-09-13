/**
 * 내 2027년, 풀릴 각이야? — 신년운세 흐름.
 *
 * 신년운세는 "좋다/나쁘다"로 끊기 쉬운 상품이라, 이 서비스는 한 해를 네 층으로 나눠서만
 * 말한다. 언제부터가 새해인지(입춘 전환), 그 해의 세운이 내 일간에 어떤 십신으로 붙는지,
 * 열두 달의 월운이 어디서 갈리는지, 그리고 그 해에 대운이 넘어가는지.
 *
 * 네 층 모두 결정적으로 계산된다. 입춘과 열두 절기는 `getSolarTermUtcMs`, 세운·월주는
 * 육십갑자와 五虎遁, 대운 교차는 명식에서 이미 뽑아 둔 대운 목록에서 읽는다. 문장은
 * 계산된 사실을 옮기는 일만 하고, 없는 날짜나 사건을 만들지 않는다.
 */
import { createHash } from 'node:crypto'
import type {
  BirthInput,
  EarthlyBranch,
  Element,
  HeavenlyStem,
  SajuAnalysis,
  SajuReport,
  SajuReportContext,
  SajuReportSection,
  RagChunk,
  TenGod,
} from '../types/index.js'
import { retrieveCategoryOwnChunks, retrieveCategoryRagChunks } from '../report/specialized-rag.js'
import { chunkMeaning, compactChunkText } from '../rag/knowledge-block.js'
import { getTenGod } from '../saju/analyzer.js'
import { buildPillar, getMonthStemIndex, getSolarTermKstDate } from '../saju/calculator.js'
import { BRANCH_ELEMENT, BRANCH_KO, ELEMENT_KO, STEM_ELEMENT, STEM_KO } from '../saju/analyzer-helpers.js'

export const NEWYEAR_SERVICE_KEY = 'newyear_flow'

/** 이 서비스만의 코퍼스 도메인. 검색은 이 팩을 먼저 쓴다. */
const OWN_CORPUS_DOMAIN = 'newyear_service'

/** 상품이 답하는 해. 디자인과 목차가 이 값에 맞춰져 있다. */
export const NEWYEAR_TARGET_YEAR = 2027

export const NEWYEAR_ASSET_BASE = '/flow/newyear'

export interface NewYearRequest {
  displayName?: string
}

/**
 * 10 대분류 / 36 중분류. id 는 05 목차와 06 상세가 라우팅하는 값이라 디자인의 `g-i`
 * 모양을 그대로 따른다.
 */
export const NEWYEAR_TOC = [
  {
    id: 'year-tone',
    number: 1,
    image: '01-scene-01-hook',
    title: '2027년, 한마디로 어떤 해야?',
    subtitle: '밀 해인지 다질 해인지부터 가릅니다.',
    items: [
      { id: '1-1', title: '올해 한 해 결', note: '2027년 세운이 내 일간에 어떤 결로 붙는지 봅니다.', why: '한 해의 성격을 먼저 잡아야 계획의 크기가 정해집니다.' },
      { id: '1-2', title: '작년이랑 뭐가 달라져?', note: '작년 세운과 올해 세운의 차이를 나란히 놓습니다.', why: '변화는 절대값보다 작년 대비로 체감됩니다.' },
      { id: '1-3', title: '밀 해야 다질 해야', note: '벌일 해인지 정비할 해인지 한쪽으로 정리합니다.', why: '둘을 같이 하려다 둘 다 놓치는 경우가 가장 많습니다.' },
      { id: '1-4', title: '올해 나를 관통하는 한 단어', note: '한 해를 한 단어로 줄이되 과장하지 않습니다.', why: '기억에 남는 기준은 문단이 아니라 한 단어입니다.' },
    ],
  },
  {
    id: 'ipchun',
    number: 2,
    image: '01-bridge-01-hook',
    title: '언제부터 진짜 새해야?',
    subtitle: '달력의 1월 1일과 체감되는 시작은 다릅니다.',
    items: [
      { id: '2-1', title: '입춘이 뭔데?', note: '사주에서 해가 바뀌는 기준점을 쉬운 말로 풉니다.', why: '기준을 모르면 1월의 답답함을 잘못 해석합니다.' },
      { id: '2-2', title: '1월 1일이랑 왜 달라?', note: '두 시작 사이의 구간을 날짜로 짚습니다.', why: '이 구간에 세운 계획이 자주 흐트러집니다.' },
      { id: '2-3', title: '넘어가는 구간', note: '작년 기운과 올해 기운이 겹치는 시기를 봅니다.', why: '겹치는 동안은 판단을 미루는 편이 낫습니다.' },
      { id: '2-4', title: '시동 거는 시기', note: '실제로 밀어붙이기 좋은 출발선을 잡습니다.', why: '출발이 늦어도 방향이 맞으면 한 해가 짧지 않습니다.' },
    ],
  },
  {
    id: 'work',
    number: 3,
    image: '01-scene-02-empathy',
    title: '올해 일, 풀려?',
    subtitle: '기회가 들어오는 구간과 발목 잡히는 지점을 나눕니다.',
    items: [
      { id: '3-1', title: '일이 흘러가는 결', note: '올해 세운이 일에 어떤 방식으로 작용하는지 봅니다.', why: '같은 노력도 결을 타면 힘이 덜 듭니다.' },
      { id: '3-2', title: '기회 들어오는 구간', note: '월운에서 일이 열리는 달을 좁힙니다.', why: '기회는 준비보다 타이밍에서 갈리는 경우가 많습니다.' },
      { id: '3-3', title: '밟을 때 vs 정비할 때', note: '가속할 구간과 점검할 구간을 갈라 둡니다.', why: '계속 밟으면 연말에 남는 것이 없습니다.' },
      { id: '3-4', title: '발목 잡히는 지점', note: '반복해서 걸릴 수 있는 조건을 미리 봅니다.', why: '같은 자리에서 두 번 걸리는 것이 가장 아깝습니다.' },
    ],
  },
  {
    id: 'money',
    number: 4,
    image: '01-bridge-02-empathy',
    title: '올해 돈, 들어와?',
    subtitle: '들어오는 결과 새는 구멍을 같이 봅니다.',
    items: [
      { id: '4-1', title: '들어오는 결 나가는 결', note: '수입과 지출의 리듬을 따로 봅니다.', why: '많이 벌어도 나가는 결이 세면 남지 않습니다.' },
      { id: '4-2', title: '목돈 굴려도 되는 때', note: '큰 결정을 얹기 좋은 구간만 표시합니다.', why: '수익을 보장하지 않고 시기의 조건만 봅니다.' },
      { id: '4-3', title: '새는 구멍', note: '반복 지출이 자극되는 지점을 찾습니다.', why: '돈길보다 돈구멍이 먼저 보이는 법입니다.' },
      { id: '4-4', title: '올해 내 돈 버릇', note: '올해 특히 강해지는 소비 습관을 봅니다.', why: '버릇은 의지보다 구조를 바꿔야 잡힙니다.' },
    ],
  },
  {
    id: 'people',
    number: 5,
    image: '01-scene-03-basis',
    title: '올해 사람은 어때?',
    subtitle: '들어오는 인연과 정리되는 관계를 나눕니다.',
    items: [
      { id: '5-1', title: '새로 들어오는 인연', note: '관계가 열리는 구간과 성격을 봅니다.', why: '사람은 노력보다 시기에서 먼저 갈립니다.' },
      { id: '5-2', title: '정리되는 관계', note: '자연스럽게 멀어지는 흐름을 미리 봅니다.', why: '끝을 예상하면 감정 소모가 줄어듭니다.' },
      { id: '5-3', title: '부딪히는 시기', note: '충이 겹치는 달을 짚습니다.', why: '같은 말도 시기에 따라 다르게 박힙니다.' },
      { id: '5-4', title: '밀어주는 사람', note: '올해 도움이 되는 관계의 결을 봅니다.', why: '혼자 버티는 해와 업히는 해가 다릅니다.' },
    ],
  },
  {
    id: 'months',
    number: 6,
    image: '01-bridge-03-basis',
    title: '달마다 뭐가 달라?',
    subtitle: '열두 달을 같은 말투로 뭉개지 않습니다.',
    items: [
      { id: '6-1', title: '열두 달 컨디션', note: '월운 열두 개를 절기 기준으로 늘어놓습니다.', why: '한 해는 평균이 아니라 열두 개의 다른 구간입니다.' },
      { id: '6-2', title: '잘 풀리는 달', note: '일이 가장 덜 막히는 달을 고릅니다.', why: '중요한 일은 이 구간에 얹는 편이 낫습니다.' },
      { id: '6-3', title: '조심할 달', note: '무리하면 티가 나는 달을 표시합니다.', why: '피하라는 뜻이 아니라 속도를 줄이라는 뜻입니다.' },
      { id: '6-4', title: '일 벌이기 좋은 달', note: '새로 시작하기에 맞는 달을 봅니다.', why: '시작은 의욕보다 결이 맞을 때 오래 갑니다.' },
      { id: '6-5', title: '쉬어갈 달', note: '회복에 쓰는 편이 이득인 달을 봅니다.', why: '쉬는 달을 정해 두면 나머지 달이 살아납니다.' },
    ],
  },
  {
    id: 'daewoon',
    number: 7,
    image: '01-scene-04-preview',
    title: '올해 판 바뀌어?',
    subtitle: '대운이 넘어가는 해인지부터 확인합니다.',
    items: [
      { id: '7-1', title: '대운 넘어가는 해인지', note: '2027년에 대운 경계가 걸리는지 계산으로 확인합니다.', why: '한 해 운보다 십 년 판이 먼저 움직일 수 있습니다.' },
      { id: '7-2', title: '넘어가면 뭐가 달라져?', note: '이전 대운과 다음 대운의 결 차이를 봅니다.', why: '판이 바뀌면 같은 방식이 안 통할 수 있습니다.' },
      { id: '7-3', title: '언제부터 체감돼?', note: '전환이 몸으로 느껴지는 시차를 봅니다.', why: '경계는 날짜로 딱 끊기지 않고 서서히 옵니다.' },
    ],
  },
  {
    id: 'risk',
    number: 8,
    image: '01-bridge-04-preview',
    title: '올해 지뢰 어디야?',
    subtitle: '겁주지 않고, 반복될 수 있는 자리만 짚습니다.',
    items: [
      { id: '8-1', title: '반복될 수 있는 패턴', note: '원국의 충·형이 올해 세운과 만나는 지점을 봅니다.', why: '반복은 우연이 아니라 조건이 같아서 생깁니다.' },
      { id: '8-2', title: '몸이 먼저 신호 보내는 때', note: '무리가 몸으로 먼저 나오는 구간을 봅니다.', why: '건강을 단정하지 않고 속도 조절 기준만 둡니다.' },
      { id: '8-3', title: '감정 흔들리는 구간', note: '판단이 감정에 끌리기 쉬운 달을 봅니다.', why: '큰 결정을 이 구간 밖으로 옮기면 됩니다.' },
    ],
  },
  {
    id: 'setup',
    number: 9,
    image: '01-scene-05-teaser',
    title: '새해 세팅 어떻게 해?',
    subtitle: '기원 대신 첫 3개월의 순서를 잡습니다.',
    items: [
      { id: '9-1', title: '올해 목표 잡는 법', note: '올해 결에 맞는 목표의 크기를 정합니다.', why: '목표는 의욕이 아니라 한 해의 결에 맞춰야 남습니다.' },
      { id: '9-2', title: '나한테 맞는 시작 방식', note: '한번에 크게 가는 쪽인지 나눠 가는 쪽인지 봅니다.', why: '시작 방식이 안 맞으면 2월에 이미 끊깁니다.' },
      { id: '9-3', title: '첫 3개월 루틴', note: '시동 구간에 얹을 반복 하나를 고릅니다.', why: '한 해는 첫 3개월의 반복이 그대로 이어집니다.' },
    ],
  },
  {
    id: 'closing',
    number: 10,
    image: '01-scene-06-cta',
    title: '작년 접고 가기',
    subtitle: '지난해를 정리하지 않으면 올해가 겹쳐 옵니다.',
    items: [
      { id: '10-1', title: '지난해 정리하는 법', note: '접어야 할 것과 이어갈 것을 갈라 둡니다.', why: '정리되지 않은 일은 올해의 힘을 먼저 씁니다.' },
      { id: '10-2', title: '새해에 두면 좋은 마음가짐', note: '한 해를 버티는 기준을 한 줄로 남깁니다.', why: '불안이 아니라 판단이 남아야 한 해를 씁니다.' },
    ],
  },
] as const

export function parseNewYearRequest(body: Record<string, unknown>): NewYearRequest {
  const raw = body.displayName ?? body.display_name ?? body.name
  const displayName = typeof raw === 'string' ? raw.trim().slice(0, 20) : ''
  return displayName ? { displayName } : {}
}

// ------------------------------------------------------------------ 조사

function hasFinalConsonant(word: string): boolean {
  for (let i = word.length - 1; i >= 0; i -= 1) {
    const code = word.charCodeAt(i) - 0xac00
    if (code < 0 || code > 11171) continue
    return code % 28 !== 0
  }
  return false
}

const subject = (w: string): string => `${w}${hasFinalConsonant(w) ? '이' : '가'}`
const object = (w: string): string => `${w}${hasFinalConsonant(w) ? '을' : '를'}`

// -------------------------------------------------------- 결정적 계산

const MONTH_TERMS = [
  '입춘', '경칩', '청명', '입하', '망종', '소서',
  '입추', '백로', '한로', '입동', '대설', '소한',
] as const

/** 십신을 한 해의 성격으로 옮긴 표. 이름을 쓰기 전에 뜻을 먼저 말한다. */
const TEN_GOD_YEAR: Record<TenGod, { word: string; tone: string; work: string; money: string; people: string; risk: string }> = {
  비견: { word: '버티는 해', tone: '내 힘으로 밀고 가는 결이라 속도는 내 페이스대로 붙습니다', work: '남의 판보다 내 판을 세우는 쪽이 맞습니다', money: '벌이는 안정적이지만 나가는 데 감각이 둔해질 수 있습니다', people: '동갑·동료와 엮이는 일이 늘고, 주도권 다툼도 같이 옵니다', risk: '고집이 세져서 조언을 늦게 듣습니다' },
  겁재: { word: '나눠 쓰는 해', tone: '기회도 사람도 같이 몰려서 혼자 다 가져가기 어려운 결입니다', work: '경쟁 구도가 생기니 내 몫을 미리 정해 두는 편이 낫습니다', money: '함께 쓰는 돈에서 새기 쉬워 계산을 미루면 안 됩니다', people: '가까운 사이에서 오해가 생기기 쉽습니다', risk: '급하게 편을 정하면 나중에 되돌리기 어렵습니다' },
  식신: { word: '꾸준히 쌓는 해', tone: '무리하지 않고 계속 만들어내는 결이라 다지기에 좋습니다', work: '실무와 결과물이 쌓여 평판이 조용히 올라갑니다', money: '큰 한 방보다 반복 수입이 붙습니다', people: '먹고 마시는 자리에서 관계가 편하게 열립니다', risk: '편안함에 익숙해져 새 시도를 미룹니다' },
  상관: { word: '드러내는 해', tone: '표현과 재주가 앞서서 눈에 띄는 결입니다', work: '새 방식으로 판을 흔들 수 있지만 반발도 같이 옵니다', money: '수입이 들쭉날쭉해서 평균으로 계획해야 합니다', people: '말이 앞서 오해가 생기니 문장을 줄이는 편이 낫습니다', risk: '윗사람과의 마찰이 가장 흔한 지뢰입니다' },
  편재: { word: '벌리는 해', tone: '움직임이 많고 손에 잡히는 기회가 여러 갈래로 옵니다', work: '여러 판을 동시에 굴리기 쉬워 우선순위가 관건입니다', money: '들어오는 결은 세지만 나가는 결도 같이 셉니다', people: '넓게 만나고 얕게 이어지는 쪽으로 기울어집니다', risk: '벌여 놓은 것을 정리할 시간을 못 냅니다' },
  정재: { word: '모으는 해', tone: '정해진 만큼 꾸준히 들어오는 결이라 계획이 잘 맞습니다', work: '맡은 자리에서 신뢰가 쌓입니다', money: '저축과 고정 수입에 유리한 결입니다', people: '오래 갈 사람과의 거리가 좁혀집니다', risk: '안정에 묶여 기회를 늦게 잡습니다' },
  편관: { word: '밀리는 해', tone: '외부에서 밀어붙이는 힘이 세서 긴장이 높은 결입니다', work: '책임이 먼저 오고 권한은 뒤에 옵니다', money: '갑작스러운 지출이 계획을 흔들 수 있습니다', people: '위에서 오는 압박과 부딪히기 쉽습니다', risk: '무리해서 버티다 몸이 먼저 신호를 보냅니다' },
  정관: { word: '자리 잡는 해', tone: '규칙과 기준이 분명해져서 흐름이 정돈되는 결입니다', work: '직책·계약·자격처럼 형태가 잡히는 일에 유리합니다', money: '고정된 틀 안에서 계획이 잘 맞습니다', people: '공적인 관계가 정리되고 사적인 관계는 뒤로 밀립니다', risk: '틀에 맞추려다 자기 속도를 놓칩니다' },
  편인: { word: '들여다보는 해', tone: '밖보다 안으로 향하는 결이라 배우고 정리하기에 맞습니다', work: '남들과 다른 각도로 풀 수 있지만 속도는 느립니다', money: '큰 움직임보다 아끼고 지키는 쪽이 맞습니다', people: '혼자 있는 시간이 늘고 관계가 좁아집니다', risk: '생각이 길어져 결정을 계속 미룹니다' },
  정인: { word: '배우는 해', tone: '받쳐주는 힘이 들어와 기초를 다지기 좋은 결입니다', work: '공부·자격·준비에 얹은 시간이 그대로 남습니다', money: '도움을 받는 쪽으로 흐르고 큰 위험은 적습니다', people: '윗사람과 스승 자리에서 도움이 옵니다', risk: '받는 데 익숙해져 스스로 벌이는 힘이 줄어듭니다' },
}

export interface NewYearFrame {
  year: number
  /** 이 해의 입춘. 사주에서 해가 바뀌는 기준점. */
  ipchun: Date
  ipchunText: string
  yearPillar: string
  yearStem: HeavenlyStem
  yearBranch: EarthlyBranch
  yearElement: Element
  /** 세운 천간이 일간에 붙는 십신. 한 해의 성격을 이 값에서 읽는다. */
  yearTenGod: TenGod
  prevTenGod: TenGod
  months: Array<{ index: number; termName: string; from: Date; fromText: string; pillar: string; tenGod: TenGod }>
  daewoonShift: { happens: boolean; pillar: string; startYear: number | null }
}

function stemBranchOfYear(year: number): { stemIdx: number; branchIdx: number } {
  const mod = (n: number, m: number) => ((n % m) + m) % m
  return { stemIdx: mod(year - 4, 10), branchIdx: mod(year - 4, 12) }
}

function dateText(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`
}

function kstDate(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * 한 해의 뼈대를 계산한다. 여기서 나온 값만 문장에 쓴다.
 *
 * 열두 달은 달력 월이 아니라 절기 경계로 끊는다. 그래서 "3월"이 아니라 "경칩부터"가
 * 기준이 되고, 월주의 천간은 세운 천간에서 五虎遁으로 나온다.
 */
export function buildNewYearFrame(analysis: SajuAnalysis, year = NEWYEAR_TARGET_YEAR): NewYearFrame {
  const ipchun = getSolarTermKstDate(year, '입춘')
  const cur = stemBranchOfYear(year)
  const yearPillar = buildPillar(cur.stemIdx, cur.branchIdx)
  const prev = stemBranchOfYear(year - 1)
  const prevPillar = buildPillar(prev.stemIdx, prev.branchIdx)

  const months = MONTH_TERMS.map((termName, i) => {
    // 소한은 다음 해로 넘어간 뒤의 절기다.
    const termYear = termName === '소한' ? year + 1 : year
    const from = getSolarTermKstDate(termYear, termName)
    const branchIdx = (i + 2) % 12
    const stemIdx = getMonthStemIndex(cur.stemIdx, branchIdx)
    const pillar = buildPillar(stemIdx, branchIdx)
    return {
      index: i + 1,
      termName,
      from,
      fromText: dateText(from),
      pillar: `${pillar.stem}${pillar.branch}`,
      tenGod: getTenGod(analysis.dayMaster, pillar.stem),
    }
  })

  const cycles = analysis.fortune?.daewoon ?? []
  const crossing = cycles.find((d) => d.startYear === year)
  const targetCycle = cycles.filter((d) => typeof d.startYear === 'number' && d.startYear <= year)
    .sort((a, b) => b.startYear! - a.startYear!)[0]
  return {
    year,
    ipchun,
    ipchunText: dateText(ipchun),
    yearPillar: `${yearPillar.stem}${yearPillar.branch}`,
    yearStem: yearPillar.stem,
    yearBranch: yearPillar.branch,
    yearElement: STEM_ELEMENT[yearPillar.stem],
    yearTenGod: getTenGod(analysis.dayMaster, yearPillar.stem),
    prevTenGod: getTenGod(analysis.dayMaster, prevPillar.stem),
    months,
    daewoonShift: {
      happens: Boolean(crossing),
      pillar: crossing?.pillar ?? targetCycle?.pillar ?? '',
      startYear: crossing?.startYear ?? null,
    },
  }
}

/** 월운을 결 좋은 달 / 조심할 달로 가른다. 판정은 십신 하나로만 한다. */
const EASY_TEN_GODS: TenGod[] = ['정재', '정관', '정인', '식신']
const HARD_TEN_GODS: TenGod[] = ['편관', '상관', '겁재']

function pickMonths(frame: NewYearFrame, pool: TenGod[]): NewYearFrame['months'] {
  const hit = frame.months.filter((m) => pool.includes(m.tenGod))
  return hit.length > 0 ? hit.slice(0, 3) : []
}

function monthText(list: NewYearFrame['months']): string {
  if (list.length === 0) return ''
  return list.map((m) => `${m.termName}부터(${m.fromText}) ${m.pillar} ${m.tenGod}`).join(', ')
}

// ------------------------------------------------------------------ RAG

// 근거 청크를 문장으로 옮기는 일은 결혼 택일도 같은 방식으로 한다.
// 표현이 갈리면 한쪽에서만 필드 이름이 새므로 `rag/knowledge-block` 하나만 쓴다.

// ------------------------------------------------------------- 리포트

export function createNewYearReportId(analysis: SajuAnalysis, birth: BirthInput, ownerId = '', context: SajuReportContext = {}): string {
  // The internal dedup ID is not the public UUID. Include ownership and every
  // calculation input so another user or changed profile cannot reuse this record.
  const fingerprint = {
    version: 'newyear-reading-v2', targetYear: NEWYEAR_TARGET_YEAR, ownerId,
    birth: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour,
      minute: birth.minute ?? 0, gender: birth.gender, calendar: birth.calendar,
      isLeapMonth: birth.isLeapMonth ?? false, dayBoundaryRule: birth.dayBoundaryRule },
    name: context.name ?? '', birthTimeKnown: context.birthTimeKnown !== false,
    pillars: analysis.fourPillars,
  }
  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex').slice(0, 28)
}

function readerName(context: SajuReportContext): string {
  const raw = typeof context.name === 'string' ? context.name.trim() : ''
  return raw || '고객'
}

/**
 * 대분류 10개의 본문. 각 문단은 계산된 사실 하나 위에서만 말하고, 근거 블록은 문장으로
 * 옮겨 쓰지 않고 뜻만 가져온다.
 */
function sectionBody(
  groupId: string,
  frame: NewYearFrame,
  analysis: SajuAnalysis,
  name: string,
  chunk: RagChunk | undefined,
): string[] {
  const y = frame.year
  const tg = TEN_GOD_YEAR[frame.yearTenGod]
  const prev = TEN_GOD_YEAR[frame.prevTenGod]
  const dayMaster = `${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})`
  const yearElement = ELEMENT_KO[frame.yearElement]
  const easy = pickMonths(frame, EASY_TEN_GODS)
  const hard = pickMonths(frame, HARD_TEN_GODS)
  const basis = chunk ? compactChunkText(chunkMeaning(chunk)) : ''
  const basisLine = basis ? `참고로 두는 기준은 이렇습니다. ${basis}` : ''

  const blocks: Record<string, string[]> = {
    'year-tone': [
      `[해석] ${y}년 세운은 ${frame.yearPillar}, ${name}님 일간 ${dayMaster} 기준으로는 ${frame.yearTenGod}으로 붙습니다. 이름은 어려운데 뜻은 간단합니다. "${tg.word}"라는 말이고, ${tg.tone}.`,
      `[작년과 비교] 작년은 ${frame.prevTenGod}, 즉 ${prev.word}였습니다. ${prev.tone}. 그래서 올해 달라지는 지점은 속도가 아니라 힘을 쓰는 방향입니다.`,
      `[밀 해냐 다질 해냐] ${EASY_TEN_GODS.includes(frame.yearTenGod) ? '올해는 다지는 쪽이 이득입니다. 새로 벌이는 것보다 이미 있는 것을 굳히는 데 힘이 덜 듭니다.' : '올해는 미는 쪽으로 기울어 있습니다. 다만 미는 해일수록 정리할 구간을 미리 정해 둬야 연말에 남습니다.'}`,
      `[한 단어] 올해를 한 단어로 줄이면 "${tg.word}"입니다. 좋고 나쁨이 아니라 힘이 어디로 흐르는지를 가리키는 말입니다. ${basisLine}`,
    ],
    ipchun: [
      `[해석] 사주에서 해가 바뀌는 기준은 1월 1일이 아니라 입춘입니다. ${y}년 입춘은 ${frame.ipchunText}입니다. 그날을 지나면서 세운이 ${frame.yearPillar}으로 넘어갑니다.`,
      `[1월이 애매한 이유] 1월 1일부터 ${frame.ipchunText}까지는 아직 작년 기운(${frame.prevTenGod}) 안입니다. 새해 계획이 1월에 잘 안 붙는다면 의지 문제가 아니라 이 구간 때문일 수 있습니다.`,
      `[넘어가는 구간] 경계는 날짜로 딱 끊기지 않습니다. ${frame.ipchunText} 앞뒤 2~3주는 두 기운이 겹치니, 큰 계약이나 이직처럼 되돌리기 어려운 결정은 이 구간 밖으로 옮기는 편이 낫습니다.`,
      `[시동] 실제로 밀어붙이기 좋은 출발선은 입춘 이후입니다. 1월은 정리와 준비, 2월 중순부터가 시작이라고 잡으면 한 해 계획이 어긋나지 않습니다. ${basisLine}`,
    ],
    work: [
      `[해석] 올해 일은 ${frame.yearTenGod}의 결로 움직입니다. ${tg.work}.`,
      `[기회 구간] ${easy.length > 0 ? `월운에서 일이 덜 막히는 구간은 ${monthText(easy)}입니다. 중요한 제안이나 발표는 이쪽에 얹는 편이 낫습니다.` : '올해는 특정 달에 기회가 몰리기보다 고르게 퍼져 있습니다. 그래서 타이밍보다 준비 상태가 결과를 가릅니다.'}`,
      `[밟을 때 vs 정비할 때] ${hard.length > 0 ? `${monthText(hard)} 구간은 밀기보다 점검에 쓰는 편이 이득입니다.` : '뚜렷하게 무리가 걸리는 달은 보이지 않습니다. 대신 분기마다 한 주는 점검에 남겨 두세요.'}`,
      `[발목] ${tg.risk}. 올해 같은 자리에서 두 번 걸린다면 이 지점일 가능성이 큽니다. ${basisLine}`,
    ],
    money: [
      `[해석] 올해 돈은 ${frame.yearTenGod} 결입니다. ${tg.money}.`,
      `[들어오는 결 / 나가는 결] 수입과 지출을 같은 문장으로 보지 마세요. ${yearElement} 기운이 세운으로 들어오는 해라, 벌이보다 쓰임의 리듬이 먼저 바뀝니다.`,
      `[목돈] ${easy.length > 0 ? `큰 결정을 얹으려면 ${monthText(easy)} 구간이 상대적으로 안정적입니다. 수익을 보장하는 말이 아니라, 판단이 덜 흔들리는 시기라는 뜻입니다.` : '올해는 특정 달에 유리함이 몰려 있지 않습니다. 큰 결정은 시기보다 조건을 다 채운 뒤로 미루세요.'}`,
      `[새는 구멍] 반복 지출이 자극되는 자리를 먼저 보세요. 자동결제 목록, 사람 비용, 미루다 커지는 수리비 세 가지가 가장 흔합니다. ${basisLine}`,
    ],
    people: [
      `[해석] 올해 사람은 ${frame.yearTenGod} 결로 옵니다. ${tg.people}.`,
      `[들어오고 나감] 새로 들어오는 인연과 정리되는 관계는 같은 해에 같이 옵니다. 하나가 끝나서 하나가 오는 게 아니라, 결이 바뀌면서 맞는 사람이 달라지는 것입니다.`,
      `[부딪히는 시기] ${hard.length > 0 ? `${monthText(hard)} 구간에는 같은 말도 더 세게 박힙니다. 이 시기에 오래 끌던 이야기를 꺼내지 않는 편이 낫습니다.` : '특별히 관계가 몰리는 달은 보이지 않습니다. 대신 일이 바쁜 달에 관계가 밀리는 쪽을 조심하세요.'}`,
      `[밀어주는 사람] ${tg.people.includes('윗사람') ? '올해는 위에서 오는 도움이 큽니다.' : '올해는 옆에서 같이 가는 쪽에서 도움이 옵니다.'} 도움을 청하는 타이밍을 미루지 마세요. ${basisLine}`,
    ],
    months: [
      `[해석] 열두 달은 달력이 아니라 절기로 끊습니다. ${y}년 ${name}님의 월운은 입춘(${frame.months[0]?.fromText})부터 시작해서 열두 구간으로 갈립니다.`,
      `[열두 달 컨디션] ${frame.months.map((m) => `${m.termName} ${m.pillar}(${m.tenGod})`).join(' · ')}`,
      `[잘 풀리는 달] ${easy.length > 0 ? monthText(easy) : '한쪽으로 쏠린 달 없이 고르게 퍼져 있습니다.'}`,
      `[조심할 달] ${hard.length > 0 ? `${monthText(hard)}. 피하라는 뜻이 아니라 속도를 줄이라는 뜻입니다.` : '무리가 크게 걸리는 달은 보이지 않습니다.'}`,
      `[벌일 달 / 쉬어갈 달] 새로 시작할 일은 결이 열리는 달에, 회복은 무리가 걸리는 달에 붙이세요. 쉬는 달을 미리 정해 두면 나머지 달이 살아납니다. ${basisLine}`,
    ],
    daewoon: [
      frame.daewoonShift.happens
        ? `[해석] ${y}년은 대운이 넘어가는 해입니다. ${frame.daewoonShift.pillar} 대운으로 판이 바뀝니다. 한 해 운보다 십 년 판이 먼저 움직이는 해라, 올해 결정의 무게가 다른 해와 다릅니다.`
        : `[해석] ${y}년에는 대운 경계가 걸리지 않습니다. 지금 ${frame.daewoonShift.pillar || '현재'} 대운 안에서 세운만 ${frame.yearPillar}으로 바뀝니다. 판은 그대로고 그 안의 흐름만 달라진다는 뜻입니다.`,
      frame.daewoonShift.happens
        ? '[뭐가 달라지나] 대운이 바뀌면 잘 통했던 방식이 안 통할 수 있습니다. 사람, 일하는 방식, 돈을 대하는 태도 중 최소 하나는 다시 잡아야 합니다.'
        : '[뭐가 달라지나] 판이 그대로라 지난 몇 해의 방식을 계속 써도 됩니다. 크게 뒤집기보다 올해 세운에 맞춰 속도만 조절하세요.',
      frame.daewoonShift.happens
        ? '[언제부터 체감되나] 경계는 날짜로 끊기지 않습니다. 보통 1~2년에 걸쳐 서서히 옵니다. 올해 안에 다 바뀌지 않는다고 계산이 틀린 것은 아닙니다.'
        : `[언제부터 체감되나] 올해는 입춘(${frame.ipchunText})을 지나며 세운만 바뀝니다. 체감은 그 앞뒤 몇 주에 걸쳐 옵니다. ${basisLine}`,
    ],
    risk: [
      `[해석] 지뢰라고 부르지만 사건을 예고하는 자리가 아닙니다. 같은 조건이 반복될 때 같은 결과가 나오는 지점을 미리 보는 것입니다. 올해 ${name}님에게 가장 반복되기 쉬운 것은 ${tg.risk} 쪽입니다.`,
      `[반복 패턴] 원국의 ${object(analysis.tenGods.join(' · ') || '십신')} 올해 세운 ${frame.yearPillar}과 겹쳐 보면, 같은 자리에서 두 번 걸릴 가능성이 보이는 쪽은 위 문장의 방향입니다. 조건을 하나만 바꿔도 결과가 달라집니다.`,
      `[몸이 먼저 보내는 신호] ${hard.length > 0 ? `${monthText(hard)} 구간에는 무리가 몸으로 먼저 나옵니다.` : '무리가 몰리는 달은 뚜렷하지 않습니다.'} 건강을 단정하는 말이 아니라 속도를 줄일 기준으로만 두세요.`,
      `[감정 흔들리는 구간] 큰 결정을 감정이 올라간 주에 내리지 않는 것만으로 대부분 피해집니다. 결정 전에 하루만 자고 보는 습관이 올해 가장 값진 장치입니다. ${basisLine}`,
    ],
    setup: [
      `[해석] 새해 세팅은 기원이 아니라 순서입니다. 올해가 ${tg.word}이므로, 목표의 크기도 그 결에 맞춰야 남습니다.`,
      `[목표 크기] ${EASY_TEN_GODS.includes(frame.yearTenGod) ? '올해는 큰 목표 하나보다 확실히 끝낼 수 있는 세 개가 맞습니다. 다지는 해에는 완결 경험이 힘이 됩니다.' : '올해는 목표를 크게 잡아도 됩니다. 대신 중간 점검 지점을 분기마다 하나씩 미리 박아 두세요.'}`,
      `[시작 방식] ${analysis.dayMasterStrength === 'strong' ? '스스로 밀고 가는 힘이 있는 명식이라 한번에 크게 시작해도 버팁니다. 대신 혼자 다 하려는 쪽을 경계하세요.' : analysis.dayMasterStrength === 'weak' ? '한번에 크게 가는 쪽보다 잘게 나눠 반복하는 쪽이 오래 갑니다. 시작을 작게 잡는 것이 게으름이 아닙니다.' : '크게도 잘게도 갈 수 있는 명식입니다. 첫 달에 어느 쪽이 덜 힘든지 재보고 정하세요.'}`,
      `[첫 3개월] 입춘(${frame.ipchunText}) 이후 3개월에 얹은 반복이 한 해로 이어집니다. 새 습관은 하나만 고르세요. 세 개를 시작하면 셋 다 남지 않습니다. ${basisLine}`,
    ],
    closing: [
      `[해석] 지난해를 접지 않으면 올해의 힘을 먼저 씁니다. 미뤄둔 연락, 끝내지 않은 일, 정산하지 않은 돈 세 가지가 가장 흔하게 넘어옵니다.`,
      `[정리하는 법] 접을 것과 이어갈 것을 종이 한 장에 두 칸으로 나눠 적어 보세요. 판단이 어려운 항목은 접는 칸에 두는 편이 낫습니다. 올해 다시 필요해지면 그때 다시 꺼내면 됩니다.`,
      `[남기는 한 줄] ${y}년은 ${tg.word}입니다. 불안을 남기는 풀이가 아니라 판단을 남기는 풀이로 읽어 주세요. 이 풀이는 특정 사건, 건강 상태, 투자 결과를 단정하지 않습니다. ${basisLine}`,
    ],
  }

  return (blocks[groupId] ?? [
    `${name}님의 ${y}년 흐름을 세운 ${frame.yearPillar}과 열두 달 월운으로 나눠 봅니다.`,
    basisLine || '이 풀이는 계산된 절기와 명식 위에서만 씁니다.',
  ]).filter(Boolean)
}

function sectionHook(groupId: string, frame: NewYearFrame): string {
  const tg = TEN_GOD_YEAR[frame.yearTenGod]
  const easy = pickMonths(frame, EASY_TEN_GODS)
  const hard = pickMonths(frame, HARD_TEN_GODS)
  const hooks: Record<string, string> = {
    'year-tone': `${frame.year}년은 ${frame.yearTenGod}, 한마디로 ${tg.word}예요`,
    ipchun: `새해는 1월 1일이 아니라 ${frame.ipchunText}부터예요`,
    work: `${tg.work.replace(/\.$/, '')}`,
    money: `벌이보다 나가는 결이 먼저 바뀌는 해예요`,
    people: `들어오는 인연과 정리되는 관계가 같이 옵니다`,
    months: easy.length > 0 ? `열두 달 중 결이 열리는 건 ${easy[0].termName} 이후예요` : '열두 달이 고르게 퍼진 해예요',
    daewoon: frame.daewoonShift.happens ? `올해는 십 년 판이 넘어가는 해예요` : `판은 그대로, 그 안의 흐름만 바뀌어요`,
    risk: hard.length > 0 ? `무리가 티 나는 건 ${hard[0].termName} 구간이에요` : '겁줄 자리보다 반복될 자리를 봅니다',
    setup: `계획은 세우는 것보다 언제 세우느냐가 커요`,
    closing: `작년을 접어야 올해 힘을 온전히 씁니다`,
  }
  return hooks[groupId] ?? `${frame.year}년 흐름을 한 칸씩 봅니다`
}

/**
 * 템플릿 리포트. 10개 섹션 모두 `status: 'complete'` 로 채워 나가고, 문장은 모두
 * `buildNewYearFrame` 이 계산한 값 위에서만 만든다.
 */
/**
 * 템플릿 리포트. 05 목차와 06 상세가 중분류 id 로 라우팅하므로 섹션도 중분류 단위로
 * 만든다. 대분류마다 계산해 둔 문단을 그 대분류의 중분류에 하나씩 배정하고, 남는
 * 문단은 마지막 항목에 붙여 어느 문단도 버리지 않는다.
 */
export function buildNewYearReport(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  input: NewYearRequest = {},
  reportId?: string,
): SajuReport {
  const frame = buildNewYearFrame(analysis)
  const name = readerName(context)
  const query = newYearRagQuery(analysis) + (input.displayName ? ` ${input.displayName}` : '')
  // 자기 팩을 대분류별로 먼저 뽑는다. 일반 검색 상위는 다른 서비스 팩이 차지해서,
  // 그대로 쓰면 열 개 대분류 중 넷만 근거가 붙었다.
  const ragCache = new Map<string, RagChunk[]>()
  const assigned = NEWYEAR_TOC.map((group) => {
    const category = { id: group.id, title: group.title, items: group.items.map((it) => it.title) }
    const own = retrieveCategoryOwnChunks(ragCache, query, category, analysis, context, OWN_CORPUS_DOMAIN, 2)
    if (own.length > 0) return own[0]
    return retrieveCategoryRagChunks(ragCache, query, category, analysis, context, 2)[0]
  })

  const sections: SajuReportSection[] = []
  let order = 1

  NEWYEAR_TOC.forEach((group, groupIndex) => {
    const paragraphs = sectionBody(group.id, frame, analysis, name, assigned[groupIndex])
    const groupHook = sectionHook(group.id, frame)

    group.items.forEach((item, itemIndex) => {
      const mine = paragraphs[itemIndex]
      const isLast = itemIndex === group.items.length - 1
      const leftover = isLast ? paragraphs.slice(group.items.length) : []
      sections.push({
        id: item.id,
        order,
        imageKey: group.id,
        imageSrc: `${NEWYEAR_ASSET_BASE}/01-step-1-story/assets/generated/newyear/newyear-${group.image}.webp`,
        imageAlt: `${group.title} 풀이`,
        category: group.title,
        categoryEn: `PART ${group.number}`,
        classification: item.title,
        hook: itemIndex === 0 ? groupHook : item.title,
        patternKeys: [`service:${NEWYEAR_SERVICE_KEY}`, `year:${frame.year}`, `tengod:${frame.yearTenGod}`, group.id],
        ragTopics: assigned[groupIndex]?.topic ? [String(assigned[groupIndex]?.topic)] : [],
        interpretation: [
          `${item.note} ${item.why}`,
          ...(mine ? [mine] : []),
          ...leftover,
        ].filter(Boolean).join('\n\n'),
        status: 'complete',
      })
      order += 1
    })
  })

  return {
    reportId: reportId || createNewYearReportId(analysis, birth),
    title: `${name}님의 ${frame.year}년 흐름 리포트`,
    subtitle: `세운 ${frame.yearPillar} · 입춘 ${frame.ipchunText} 기준 · 열두 달 월운`,
    model: 'template',
    generatedBy: 'template',
    status: 'complete',
    progress: { complete: sections.length, total: sections.length },
    sections,
  }
}

/** 라우트가 쓰는 리포트 문맥. 서비스 키가 프롬프트 팩과 코퍼스 선택을 가른다. */
export function buildNewYearContext(name: string | undefined, input: NewYearRequest, analysis?: SajuAnalysis, birthTimeKnown = true): SajuReportContext {
  const context: SajuReportContext = {
    serviceKey: NEWYEAR_SERVICE_KEY,
    name: input.displayName || name,
    target: `내 ${NEWYEAR_TARGET_YEAR}년, 풀릴 각이야?`,
    concern: `${NEWYEAR_TARGET_YEAR}년 입춘 전환과 세운, 열두 달 월운, 대운 교차로 보는 한 해 흐름`,
    birthTimeKnown,
  }
  if (analysis) {
    const teaser = buildNewYearTeaser(analysis, context)
    const frame = teaser.frame
    context.newyear = {
      targetYear: frame.year, calendar: 'solar-term', timezone: 'Asia/Seoul',
      ipchunDate: kstDate(frame.ipchun), yearPillar: frame.yearPillar,
      yearTenGod: frame.yearTenGod, previousYearTenGod: frame.prevTenGod,
      months: frame.months.map((month) => ({ index: month.index, termName: month.termName, startDate: kstDate(month.from), pillar: month.pillar, tenGod: month.tenGod })),
      ...(birthTimeKnown ? { daewoonShift: frame.daewoonShift } : {
        uncertainty: '출생 시각 미상: 시주·전체 강약·용신·정밀 대운 시작 및 교차는 확정하지 않습니다. 확인된 일간과 2027년 세운·월운 관계만 사용합니다.',
      }),
      teaser: { headline: teaser.headline, lines: teaser.lines },
    }
  }
  return context
}

/** 04 무료 티저. 유료로 열리는 범위를 감추지 않고 목차로 보여준다. */
export function buildNewYearTeaser(analysis: SajuAnalysis, context: SajuReportContext = {}): {
  frame: NewYearFrame
  headline: string
  lines: string[]
  scope: Array<{ title: string; items: string[] }>
} {
  const frame = buildNewYearFrame(analysis)
  const name = readerName(context)
  const tg = TEN_GOD_YEAR[frame.yearTenGod]
  const easy = pickMonths(frame, EASY_TEN_GODS)
  return {
    frame,
    headline: `${frame.year}년은 ${frame.yearTenGod}, ${name}님에게는 ${tg.word}입니다`,
    lines: [
      `${frame.year}년 세운(한 해의 흐름)은 ${STEM_KO[frame.yearStem]}${BRANCH_KO[frame.yearBranch]}(${frame.yearPillar})입니다. 태어난 날의 중심 기운인 일간 ${STEM_KO[analysis.dayMaster]}(${analysis.dayMaster})과는 ${frame.yearTenGod}의 관계로 읽으며, ${tg.word}라는 뜻입니다. ${tg.tone}.`,
      `사주에서 해가 바뀌는 기준은 ${frame.ipchunText} 입춘(봄의 시작을 알리는 절기)입니다. 1월은 아직 이전 해의 ${frame.prevTenGod}, 즉 ${TEN_GOD_YEAR[frame.prevTenGod].word}에 해당하는 구간으로 읽습니다.`,
      easy.length > 0
        ? `일정이나 약속을 새로 잡는 장면에서는 ${easy[0].termName} 이후(${easy[0].fromText})가 먼저 열리는 구간입니다.`
        : '일정이나 약속을 새로 잡을 때에도 열두 달이 한쪽으로 쏠리지 않고 고르게 퍼진 해입니다.',
      context.birthTimeKnown === false
        ? '대운은 약 10년 단위의 긴 흐름입니다. 출생 시각을 몰라 정확한 전환은 보류하고, 확인된 일간과 세운·월운의 관계부터 읽습니다.'
        : frame.daewoonShift.happens
        ? `${frame.year}년은 계산상 대운(약 10년 단위의 긴 흐름)이 바뀌는 해입니다. 한 번에 모든 생활이 달라진다는 뜻은 아닙니다.`
        : frame.daewoonShift.pillar
          ? '올해 계산상 대운(약 10년 단위의 긴 흐름)의 전환 경계는 없습니다. 세운과 월운의 변화는 별도로 살핍니다.'
          : '대운은 약 10년 단위의 긴 흐름입니다. 해당 연도의 대운 자료가 충분하지 않아 전환 판단은 보류합니다.',
    ],
    scope: NEWYEAR_TOC.map((g) => ({ title: g.title, items: g.items.map((it) => it.title) })),
  }
}

/** 검색 질의. 자기 코퍼스를 먼저 타도록 서비스 도메인을 앞에 둔다. */
export function newYearRagQuery(analysis: SajuAnalysis): string {
  const frame = buildNewYearFrame(analysis)
  return [
    '신년운세 새해 한 해 흐름',
    `${frame.year}년 세운 ${frame.yearPillar} ${frame.yearTenGod}`,
    '입춘 전환 열두 달 월운 대운 교차',
    `일간 ${analysis.dayMaster} ${ELEMENT_KO[analysis.dayMasterElement]}`,
    ELEMENT_KO[BRANCH_ELEMENT[frame.yearBranch]],
  ].join(' ')
}

export { TEN_GOD_YEAR, OWN_CORPUS_DOMAIN as NEWYEAR_CORPUS_DOMAIN, subject as newYearSubject }
