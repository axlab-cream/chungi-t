import type {
  BirthInput,
  SajuAnalysis,
  SajuReportContext,
  SajuReportSection,
} from '../types/index.js'
import { BRANCH_KO, ELEMENT_KO } from '../saju/analyzer-helpers.js'
import { pillarLabel } from '../saju/calculator.js'

export interface StoryImagePrompt {
  ko: string
  en: string
}

export interface StoryChartPoint {
  label: string
  value: number
  note: string
}

/** User-facing storytelling beat. Emotional surface first; grounds stay internal. */
export interface StoryBeat {
  hook: string
  feel: string
  /** One soft plain-language credibility line — never a methodology lesson. */
  softBridge?: string
  tableMd?: string
  tableCaption?: string
  chartPoints?: StoryChartPoint[]
  chartCaption?: string
  scene: string
  actions: string[]
  imagePrompt: StoryImagePrompt
  ragTopics?: string[]
}

export interface StorytellingPayload {
  feel: string
  softBridge?: string
  tableMd?: string
  tableCaption?: string
  chartPoints?: StoryChartPoint[]
  chartCaption?: string
  scene: string
  actions: string[]
  imagePrompt: StoryImagePrompt
}

const BRANCH_MONTH_HINT: Record<string, string> = {
  子: '12월 전후',
  丑: '1월 전후',
  寅: '2월 전후',
  卯: '3월 전후',
  辰: '4월 전후',
  巳: '5월 전후',
  午: '6월 전후',
  未: '7월 전후',
  申: '8월 전후',
  酉: '9월 전후',
  戌: '10월 전후',
  亥: '11월 전후',
}

export function dohwaBranchFromDayBranch(branch: string): string {
  if ('申子辰'.includes(branch)) return '酉'
  if ('寅午戌'.includes(branch)) return '卯'
  if ('亥卯未'.includes(branch)) return '子'
  if ('巳酉丑'.includes(branch)) return '午'
  return '卯'
}

function clean(value: string | undefined, fallback: string): string {
  const next = value?.trim()
  return next && next.length > 0 ? next : fallback
}

function spouseStarFor(birth?: BirthInput): { term: string; plain: string } {
  if (birth?.gender === 'female') {
    return { term: '관성', plain: '나를 안심시키고 기준을 세워주는 사람의 결' }
  }
  return { term: '재성', plain: '나와 온기를 주고받으며 현실을 붙들어 주는 사람의 결' }
}

/** Format a beat into user-facing interpretation: emotion → scene → action. */
export function formatStoryInterpretation(beat: StoryBeat): string {
  const parts: string[] = []

  parts.push(`[주요 포인트] ${beat.feel.trim()}`)

  if (beat.softBridge?.trim()) {
    parts.push(beat.softBridge.trim())
  }

  if (beat.ragTopics && beat.ragTopics.length > 0) {
    const topics = beat.ragTopics.slice(0, 3).join(', ')
    parts.push(`이번 장은 ${topics}의 관계 온도와 시기를 함께 대조해 보겠네.`)
  }

  if (beat.tableMd?.trim()) {
    const caption = beat.tableCaption?.trim() || '마음에 걸리는 신호만 골라 보겠네.'
    parts.push(`${caption}\n\n${beat.tableMd.trim()}`)
  }

  if (beat.chartPoints && beat.chartPoints.length > 0) {
    const caption = beat.chartCaption?.trim() || '달마다 마음이 움직이는 온도가 다르네.'
    const timeline = beat.chartPoints
      .map((point) => `- ${point.label} · ${point.note} (${Math.max(0, Math.min(100, point.value))}%)`)
      .join('\n')
    const chartJson = JSON.stringify({
      type: 'love_monthly_flow',
      points: beat.chartPoints.map((point) => ({
        label: point.label,
        value: point.value,
        note: point.note,
      })),
    })
    parts.push(`${caption}\n\n${timeline}\n\n<!--chart:${chartJson}-->`)
  }

  parts.push(beat.scene.trim())

  if (beat.actions.length > 0) {
    const actionLines = beat.actions.map((action) => `- ${action}`).join('\n')
    parts.push(`[해법] 지금 붙잡아 볼 장면이네.\n${actionLines}`)
  }

  const prompt = beat.imagePrompt
  parts.push(
    `장면 이미지 힌트 · ${prompt.ko}\n(en) ${prompt.en}`,
  )

  return parts.filter(Boolean).join('\n\n')
}

export function toStorytellingPayload(beat: StoryBeat): StorytellingPayload {
  return {
    feel: beat.feel,
    softBridge: beat.softBridge,
    tableMd: beat.tableMd,
    tableCaption: beat.tableCaption,
    chartPoints: beat.chartPoints,
    chartCaption: beat.chartCaption,
    scene: beat.scene,
    actions: beat.actions,
    imagePrompt: beat.imagePrompt,
  }
}

function loveMonthlyChart(
  currentYear: number,
  dohwaMonth: string,
  yearPillar: string,
): StoryChartPoint[] {
  return [
    { label: `${currentYear}.봄`, value: 62, note: '소개와 새 동선이 스며드는 때' },
    { label: `${currentYear}.초여름`, value: dohwaMonth.includes('5') || dohwaMonth.includes('6') || dohwaMonth.includes('3') || dohwaMonth.includes('4') ? 88 : 74, note: '마음이 먼저 밝아지는 창' },
    { label: `도화 · ${dohwaMonth}`, value: 92, note: '시선이 붙고 연락이 길어지는 장면' },
    { label: `${currentYear}.가을`, value: 70, note: '관계의 온도를 고르는 때' },
    { label: `${currentYear}.겨울`, value: 58, note: '확인과 여운이 남는 달' },
    { label: `${yearPillar} 세운`, value: 66, note: '올해 물결 위에서 인연이 출렁이는 결' },
  ]
}

interface LoveStoryContext {
  analysis: SajuAnalysis
  context: SajuReportContext
  birth?: BirthInput
  ragTopics: string[]
}

function baseFacts(ctx: LoveStoryContext) {
  const { analysis, context, birth } = ctx
  const name = clean(context.name, '자네')
  const concern = clean(context.concern, '올해 연애가 올지, 타이밍을 놓칠지')
  const relation = clean(context.relationship, '지금 관계의 결')
  const orientation = clean(context.orientation, '마음에 남는 관계')
  const p = analysis.fourPillars
  const dayBranch = p.day.branch
  const dohwaBranch = dohwaBranchFromDayBranch(dayBranch)
  const dohwaMonth = BRANCH_MONTH_HINT[dohwaBranch] ?? '봄과 초여름 사이'
  const dayPillar = pillarLabel(p.day)
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : weak
  const currentYear = analysis.fortune?.currentYear ?? new Date().getFullYear()
  const yearPillar = analysis.fortune?.yearPillar ?? '올해 세운'
  const spouse = spouseStarFor(birth)
  const hasPartner = context.partner?.mode === 'known'
  const partnerName = clean(context.partner?.name, '그 사람')
  const partnerRelation = clean(context.partner?.relationship, '마음에 둔 상대')
  const tenGod = analysis.tenGods[0] ?? ''
  const daewoon = analysis.fortune?.currentDaewoon ?? '대운'
  return {
    name,
    concern,
    relation,
    orientation,
    dayBranch,
    dayBranchKo: BRANCH_KO[dayBranch] ?? dayBranch,
    dohwaBranch,
    dohwaMonth,
    dayPillar,
    dayMaster: analysis.dayMaster,
    dominant,
    weak,
    useful,
    currentYear,
    yearPillar,
    tenGod,
    daewoon,
    spouse,
    hasPartner,
    partnerName,
    partnerRelation,
  }
}

const LOVE_HOOKS: Record<string, (f: ReturnType<typeof baseFacts>) => string> = {
  'love-year-possibility': (_f) =>
    `올해, 자네 마음속에 남는 사람은 이미 가까이 와 있을지도 모르네`,
  'love-attraction-pattern': (_f) =>
    `설레는 순간, 자네는 늘 같은 장면으로 빠져드는군`,
  'love-dohwa-months': (f) =>
    `${f.dohwaMonth}… 그때 공기가 달라지네`,
  'love-spouse-star': (_f) =>
    `오래 남는 사람은, 뜨겁기보다 자네를 선명하게 하는 쪽일세`,
  'love-monthly-flow': (f) =>
    `${f.currentYear}년, 달이 바뀔 때마다 인연의 온도가 달라지네`,
  'love-progress-timing': (_f) =>
    `고백보다 먼저, 다음 약속이 자연스러워지는 순간을 보게`,
  'love-missed-signals': (_f) =>
    `놓친 인연은 큰 사건이 아니라, 작은 침묵에서 시작되네`,
  'love-partner-compatibility': (f) =>
    f.hasPartner
      ? `${f.partnerName}와 자네 사이, 마음이 어긋나는 속도가 보이는군`
      : `아직 이름 없는 인연이라도, 맞는 온기는 느낌이 다르네`,
  'love-emotion-temperature': (_f) =>
    `같은 마음이어도, 자네와 상대의 온도는 다를 수 있네`,
  'love-action-strategy': (_f) =>
    `기다리는 해보다, 알아볼 준비가 된 해가 더 무섭고 아름다운 법일세`,
}

export function loveThisYearHook(sectionId: string, analysis: SajuAnalysis, context: SajuReportContext, birth?: BirthInput): string {
  const facts = baseFacts({ analysis, context, birth, ragTopics: [] })
  const builder = LOVE_HOOKS[sectionId]
  return builder ? builder(facts) : '올해 연애의 장면부터 천천히 펼쳐 보겠네'
}

export function buildLoveThisYearStoryBeat(
  sectionId: string,
  analysis: SajuAnalysis,
  context: SajuReportContext,
  ragTopics: string[],
  birth?: BirthInput,
): StoryBeat {
  const f = baseFacts({ analysis, context, birth, ragTopics })
  const hook = loveThisYearHook(sectionId, analysis, context, birth)
  const chart = loveMonthlyChart(f.currentYear, f.dohwaMonth, f.yearPillar)
  const softYear = `그래서 ${f.currentYear}년 ${f.yearPillar} 세운 아래, 연애 가능성이 마음으로 먼저 움직이는 해일세.`
  const softDohwa = `그래서 ${f.dohwaMonth} 도화의 공기가 유난히 다가오네. 타이밍 신호일세.`
  const softUseful = `천천히 확인해 주는 온기가, 자네에게는 더 오래 남네.`
  const softGrain = `일주 ${f.dayPillar}(일간 ${f.dayMaster}) · 일지 ${f.dayBranchKo}의 결에서 ${f.dominant} 기운이 먼저 반응하고, ${f.weak} 자리가 비면 마음이 흔들리기 쉽네. ${f.tenGod ? f.tenGod + ' 흐름과 ' : ''}${f.daewoon} 대운이 올해 세운과 맞물릴 때 그 장면이 더 또렷해지네.`

  const beats: Record<string, StoryBeat> = {
    'love-year-possibility': {
      hook,
      feel: `흠… ${f.name}님. "${f.concern}" 그 질문이 올해 연애 가능성을 여는 첫 장면이군. ${f.relation} 상태에서도 마음은 이미 한 발 앞서 두리 있네. 생길까 말까보다, 알아채고도 지나친 밤이 아쉽지 않은가가 더 절실하지.`,
      softBridge: softYear,
      tableMd: [
        '| 마음 신호 | 올해의 장면 |',
        '| --- | --- |',
        `| 설렘 | 연락·소개·우연한 재회가 반복될 때 |`,
        `| 망설임 | 좋아하면서도 속도를 못 고를 때 |`,
        `| 기회 | 약속이 말로 끝나지 않고 날짜가 생길 때 |`,
      ].join('\n'),
      tableCaption: '올해 마음이 흔들릴 때, 이런 신호가 먼저 오네.',
      scene: `${f.orientation}으로 보면, 올해는 큰 사건보다 작은 반복이 인연을 만드네. 카페에서 조금 더 머문 대화, 습관처럼 이어진 답장, 소개를 거절하지 않은 저녁. 그런 장면이 쌓일 때 연애는 갑자기가 아니라 당연처럼 열려.`,
      actions: [
        '이번 주에 사람을 만날 자리를 하나만 열어 두게',
        '마음이 움직인 상대에게는 바로 결론 대신 다음 약속을 묻게',
        '혼자 확대해석한 밤은 짧게 접고, 실제 만남을 한 번 더 보게',
      ],
      imagePrompt: {
        ko: '밤의 골목 등불 아래, 홀로 서 있던 사람이 멀리서 다가오는 실루엣을 바라보는 장면. 설렘과 망설임이 공존하는 따뜻한 적갈색 톤.',
        en: 'A lone figure under alley lantern light watching a distant silhouette approach; warm crimson-amber mood of longing and hesitation.',
      },
    },
    'love-attraction-pattern': {
      hook,
      feel: `자네가 끌리는 방식은 생각보다 고집스럽네. 연애 성향이 드러나는 순간, 가볍게 스친 사람보다 마음이 한 번 열린 뒤엔 쉽게 되돌리지 못하는 결이 있어. 일지 ${f.dayBranchKo} 기운이 가까운 관계 앞에서 더 선명해지는 법이지.`,
      softBridge: `끌림이 빠를수록 반응을 한 박자 늦게 고르는 편이 낫네.`,
      tableMd: [
        '| 끌림의 결 | 반복되는 장면 |',
        '| --- | --- |',
        `| 빠른 확신 | 조금만 따뜻해도 벌써 내 사람으로 그릴 때 |`,
        `| 숨긴 기대 | 괜찮은 척하면서 답장을 기다리는 밤 |`,
        `| 오래 남는 끌림 | 자극보다 말이 차분한 사람에게 마음이 갈 때 |`,
      ].join('\n'),
      tableCaption: '자네의 끌림은 이런 장면으로 반복되네.',
      scene: f.hasPartner
        ? `${f.partnerName}(${f.partnerRelation}) 앞에서도 같은 패턴이 올라올 수 있네. 좋아할수록 말이 줄거나, 반대로 확신을 너무 빨리 구하는 순간. 그 장면이 오면 관계가 흔들리는 게 아니라, 자네의 오래된 끌림 습관이 깨어난 걸세.`
        : `아직 특정 상대가 없어도 패턴은 먼저 와. 자극이 센 사람에겐 금세 불이 붙고, 조용히 안정적인 사람 앞에서는 오히려 심장이 헷갈리네. 올해는 설렘의 크기보다, 그 설렘이 자네를 흐리게 하는지 선명하게 하는지를 보게.`,
      actions: [
        '설렌 직후 24시간은 결론을 내리지 말게',
        '"이 사람이 나를 편하게 하는가"를 한 줄로 적어 보게',
        '자극이 강한 대화보다 일상이 겹치는 대화를 한 번 더 시도하게',
      ],
      imagePrompt: {
        ko: '거울 앞에 선 인물이 자신의 실루엣과 겹쳐진 다른 사람의 그림자를 바라보는 장면. 붉은 여운과 고요한 긴장.',
        en: 'A person before a mirror seeing another shadow overlapping their silhouette; quiet tension in deep red haze.',
      },
    },
    'love-dohwa-months': {
      hook,
      feel: `${f.dohwaMonth}. 그 시기엔 유난히 시선이 머물고, 평소보다 말이 길어지네. 도화는 인기가 폭발한다는 뜻이 아니라, 마음이 사람을 향해 문을 여는 공기일세.`,
      softBridge: softDohwa,
      tableMd: [
        '| 시기 | 마음에 오는 장면 |',
        '| --- | --- |',
        `| ${f.dohwaMonth} | 소개·연락·오랜만의 재회가 붙는 때 |`,
        `| 직전 2~3주 | 외출과 노출이 늘며 공기가 바뀌는 때 |`,
        `| 직후 | 설렘을 고르지 못하면 오해가 빨리 생기는 때 |`,
      ].join('\n'),
      tableCaption: '도화가 스며들 때, 달력보다 장면이 먼저 바뀌네.',
      chartPoints: chart,
      chartCaption: '올해 연애 온도가 출렁이는 달들일세.',
      scene: f.hasPartner
        ? `${f.partnerName}와의 연락이 갑자기 잦아지거나, 만나자는 말이 가벼워지는 때가 바로 그 공기일세. 예쁘게 보이는 신호에 취해 확인을 미루면, 좋은 달이 지나간 뒤에야 아쉬움이 남네.`
        : `상대가 없어도 걱정 말게. 평소 안 가던 모임, 미뤄 둔 소개, 갑자기 길어지는 대화창. 그런 입구가 ${f.dohwaMonth} 전후에 더 자주 열리네.`,
      actions: [
        `${f.dohwaMonth} 전후 외부 약속을 최소 두 번 열어 두게`,
        '호감이 보이면 칭찬 한 줄보다 다음 만남 제안을 먼저 하게',
        '도화의 달에는 고백 속도보다 오해 속도를 더 경계하게',
      ],
      imagePrompt: {
        ko: '봄밤 벚꽃 아래 두 사람의 어깨가 스치듯 가까워지는 장면. 분홍빛 조명과 설레는 숨결.',
        en: 'Two shoulders nearly brushing under spring blossoms at night; soft pink light and breathless anticipation.',
      },
    },
    'love-spouse-star': {
      hook,
      feel: `운명의 상대를 외형으로 단정할 수는 없네. 다만 ${f.name}님에게 오래 남는 인연 유형은 배우자성(${f.spouse.term}) — ${f.spouse.plain}에 가깝네. 뜨겁게 태우는 사람보다, 자네를 덜 흔들고 더 선명하게 하는 쪽이지.`,
      softBridge: `끌림이 커도, 약속을 흐리는 사람은 오래 가기 어렵네.`,
      tableMd: [
        '| 인연 유형 | 자네에게 남는 느낌 |',
        '| --- | --- |',
        `| 자극형 | 심장은 뛰지만 일상이 불안해짐 |`,
        `| 안정형 | 말이 짧아도 다음이 보임 |`,
        `| ${f.spouse.term} 결 | 책임·온기·기준이 자연스럽게 오감 |`,
      ].join('\n'),
      tableCaption: '배우자성의 결을, 어려운 말 대신 느낌으로 보면 이렇네.',
      scene: f.hasPartner
        ? `${f.partnerName}를 볼 때도 묻게. 나를 계속 확인하게 만드는가, 아니면 있어도 숨이 트이는가. 그 차이가 올해 인연의 성격을 가른다네.`
        : `새 인연 앞에서도 같네. 대화가 화려해도 일정이 비고, 말은 담백해도 약속이 쌓이는 사람. 후자가 자네 사주에서 더 깊게 남는 결일세.`,
      actions: [
        '상대를 고를 때 "설렘"과 "안심"을 나란히 적어 보게',
        '한 번이라도 약속을 흐린 패턴이 보이면 속도를 낮추게',
        '자네를 설명하게 만들기보다, 함께 있게 만드는 사람을 남기게',
      ],
      imagePrompt: {
        ko: '창가에서 마주 앉은 두 사람. 화려한 제스처 없이 잔을 나누며 서로를 고요히 바라보는 장면.',
        en: 'Two people at a window sharing a quiet drink, gazes steady without theatrics; intimate calm.',
      },
    },
    'love-monthly-flow': {
      hook,
      feel: `${f.currentYear}년의 월별 연애 흐름은 한 방에 오지 않네. 봄엔 만남의 문이 열리고, 여름엔 말이 많아지며, 가을엔 관계를 고르고, 겨울엔 남는 사람을 확인하는 리듬이 있네.`,
      softBridge: softYear,
      chartPoints: chart,
      chartCaption: '월별 연애 온도 — 숫자보다 장면으로 읽어 보게.',
      tableMd: [
        '| 계절 | 마음의 일 |',
        '| --- | --- |',
        '| 봄 | 새 동선, 소개, 첫 대화 |',
        '| 여름 | 표현, 고백, 연락의 밀도 |',
        '| 가을 | 관계 정리와 선택 |',
        '| 겨울 | 여운과 확인 |',
      ].join('\n'),
      tableCaption: '달력이 아니라, 마음이 하는 일로 보면 선명해지네.',
      scene: `${f.relation}이라면 같은 달에도 봐야 할 장면이 다르네. 솔로는 입구, 썸은 약속, 연애 중은 리듬, 이별 뒤에는 재회보다 반복되는 미련. ${f.dohwaMonth}가 겹치면 그 장면이 더 또렷해질 걸세.`,
      actions: [
        '이번 달의 연애 목표를 "만나기 / 확인하기 / 정리하기" 중 하나로만 정하게',
        '피곤한 달에는 새 인연보다 수면을 지키게',
        '도화 달에는 만남 횟수를 의식적으로 늘리게',
      ],
      imagePrompt: {
        ko: '달력이 겹쳐진 밤하늘 아래, 계절마다 색이 바뀌는 연인의 실루엣 타임라인.',
        en: 'Overlapping calendar pages against a night sky with seasonal silhouettes of two people shifting in color.',
      },
    },
    'love-progress-timing': {
      hook,
      feel: `관계가 진전되는 타이밍은 극적인 고백 한 방이 아닐세. 대화가 끝나고도 "언제 볼까" 약속이 자연스럽게 남는 밤. 그때 관계가 한 칸 앞으로 가네.`,
      softBridge: softUseful,
      tableMd: [
        '| 타이밍 | 좋은 신호 |',
        '| --- | --- |',
        '| 아직 이름만 있을 때 | 짧은 확인 문장이 부담 없이 오갈 때 |',
        '| 썸의 한가운데 | 다음 약속이 서로 먼저 나올 때 |',
        '| 관계 직전 | 공개·소개·일정이 겹치기 시작할 때 |',
      ].join('\n'),
      tableCaption: '관계가 앞으로 가는 순간은 이런 얼굴이네.',
      scene: f.hasPartner
        ? `${f.partnerName}에게 "우리 뭐야"보다 "다음엔 뭐 할까"가 더 잘 닿을 수 있네. 감정을 증명하라 몰아붙이면 온도가 떨어지고, 현실을 하나 정해 주면 마음이 따라오는 타입이 있거든.`
        : `상대가 없다면, 소개받은 자리에서 호감을 숨기지 말게. 다만 전부를 쏟지 말고, 두 번째 만남을 만드는 데 힘을 쓰게.`,
      actions: [
        '진전시키고 싶을 때 감정 문장 1 + 약속 문장 1로 말하게',
        '답이 느려도 추궁 대신 여백을 하루 두게',
        '도화가 강한 달에는 고백보다 만남 밀도를 올리게',
      ],
      imagePrompt: {
        ko: '카페 테이블 위에서 두 사람의 손이 달력 위 같은 날짜를 가리키는 장면. 고백보다 약속의 설렘.',
        en: 'Two hands pointing to the same date on a cafe table calendar; thrill of a shared plan more than a confession.',
      },
    },
    'love-missed-signals': {
      hook,
      feel: `놓치는 신호와 실수 패턴은 대개 폭풍처럼 지나가지 않네. 답장이 반 박자 늦어진 밤, 약속이 "나중에"로 바뀐 오후, 괜찮은 척한 채 삼킨 서운함. 그 작은 금이 나중에 큰 금이 되지.`,
      softBridge: `마음이 급할수록, 작은 침묵을 더 크게 읽게 되는 법일세. 위험은 큰 사건보다 반복된 실수에 있네.`,
      tableMd: [
        '| 위험 신호 | 그때의 마음 |',
        '| --- | --- |',
        '| 성급한 확정 | 설레자마자 관계를 못 박으려 함 |',
        '| 미룬 확인 | 애매함을 알면서도 묻지 못함 |',
        '| 쌓인 폭발 | 참고 참다 한 번에 쏟아냄 |',
      ].join('\n'),
      tableCaption: '올해 특히 조심할, 마음을 놓치는 습관이네.',
      scene: `도화가 강한 달일수록 이 실수는 더 예뻐 보이네. 불이 붙으니 확인이 사소해 보이고, 놓치면 안 될 것 같아 서두르게 되지. 허허… 그때일수록 한 호흡만 늦추게.`,
      actions: [
        '서운함이 올라오면 그날 안에 한 문장으로만 전하게',
        '"기다리면 알아주겠지"를 이번 달 금지 문장으로 두게',
        '애매하면 추측 대신 "나는 이렇게 느꼈어"로 말하게',
      ],
      imagePrompt: {
        ko: '읽지 않은 메시지 알림이 빛나는 어두운 방. 창밖 빗소리와 미련이 남은 분위기.',
        en: 'An unread message glow in a dark room; rain outside and the ache of something almost said.',
      },
    },
    'love-partner-compatibility': {
      hook,
      feel: f.hasPartner
        ? `${f.partnerName}와의 상대방 사주 궁합은 점수가 아닐세. 일간과 오행의 결이 달라도, 서로 다른 속도로 가까워질 때 상처가 나는가를 보는 일이지.`
        : `아직 상대방 사주가 없어도 괜찮네. 새 인연이 오면 "맞는 온기"를 고르는 눈만 있으면 돼.`,
      softBridge: f.hasPartner
        ? `속도가 다를수록, 기다림과 압박 사이에서 관계가 흔들리네.`
        : `나를 급하게 만드는 사람보다, 선명하게 만드는 사람이 오래가네.`,
      tableMd: f.hasPartner
        ? [
            '| 비교 축 | 볼 장면 |',
            '| --- | --- |',
            `| 표현 속도 | ${f.partnerName}와 자네 중 누가 먼저 말하고 지치는가 |`,
            '| 약속 | 날짜가 생기는가, 말만 남는가 |',
            '| 공개 | 관계를 자연스럽게 드러내는가 |',
          ].join('\n')
        : [
            '| 새 인연 기준 | 좋은 온기 |',
            '| --- | --- |',
            '| 말투 | 나를 추궁하지 않고도 궁금해 함 |',
            '| 리듬 | 만남과 여백이 숨 막히지 않음 |',
            '| 현실 | 다음이 구체적으로 남음 |',
          ].join('\n'),
      tableCaption: '궁합은 표로 재는 게 아니라, 장면으로 확인하는 걸세.',
      scene: f.hasPartner
        ? `${f.partnerName}(${f.partnerRelation})와의 온도 차는 답장 횟수보다, 확인했을 때 피하지 않는가에서 드러나네. 피하면 마음이 없는 게 아니라, 속도가 다른 것일 수도 있네. 그 차이를 존중하되, 자네가 사라지지는 말게.`
        : `새 사람을 볼 때는 첫 설렘의 크기보다 세 번째 만남 이후의 편안함을 믿게. 첫인상은 도화가 만들고, 오래감은 일상의 결이 만드네.`,
      actions: [
        f.hasPartner ? `${f.partnerName}와 최근 약속을 한 줄로 정리해 보게` : '새 인연에게 세 번째 만남까지 기준을 미뤄 두게',
        '속도 차이가 느껴지면 비난 대신 리듬을 맞춰 보게',
        '나를 설명하느라 지치면 그 자리는 잠시 멈추게',
      ],
      imagePrompt: {
        ko: '서로 다른 색 온도의 조명이 비추는 두 사람. 가까우면서도 한 발 어긋난 거리감.',
        en: 'Two people lit by mismatched color temperatures, close yet half a step out of sync.',
      },
    },
    'love-emotion-temperature': {
      hook,
      feel: `사랑의 크기가 같아도 감정 온도는 다를 수 있네. 자네는 마음이 정해지면 답을 보고 싶어하고, 상대는 같은 마음이라도 표현 속도를 늦추며 거리감을 고를 수 있지.`,
      softBridge: `빠르다고 진심이 더 큰 것도, 느리다고 마음이 없는 것도 아닐세.`,
      tableMd: [
        '| 온도 차이 | 흔한 오해 |',
        '| --- | --- |',
        '| 자네가 더 뜨거울 때 | 상대를 무심하다고 단정 |',
        '| 상대가 더 빠를 때 | 설렘을 안정으로 착각 |',
        '| 맞춰질 때 | 말보다 약속이 반복됨 |',
      ].join('\n'),
      tableCaption: '온도 차이에서 생기는 착각만 먼저 걷어 보겠네.',
      scene: f.hasPartner
        ? `${f.partnerName}와의 사이에서는 연락 빈도보다 반복성을 보게. 서운할 때마다 사라지고 돌아오는 패턴인지, 천천히라도 쌓이는 패턴인지. 후자라면 온도가 달라도 관계는 자랄 수 있네.`
        : `특정 상대가 없을 때는 처음부터 많은 확신을 요구하지 말게. 확신을 너무 일찍 구하면, 상대의 온도가 미처 올라오기도 전에 문이 닫히네.`,
      actions: [
        '불안할 때 연락 횟수 대신 "반복되는 배려"를 세어 보게',
        '상대 속도를 존중하되, 자네의 필요를 한 문장으로 남기게',
        '뜨거움이 과하면 만남 사이에 하루의 여백을 두게',
      ],
      imagePrompt: {
        ko: '같은 난롯가에 앉았지만 한쪽은 담요를 두르고 한쪽은 창을 여는 두 사람. 온기와 바람의 대비.',
        en: 'Two people by one hearth — one wrapped in a blanket, one opening a window; warmth and cool air in contrast.',
      },
    },
    'love-action-strategy': {
      hook,
      feel: `마지막으로 연애 성사 전략이네. 운을 기다리는 해로만 쓰지 말게. 소개를 열어 두고, 약속을 만들고, 마음이 흔들릴 때 행동의 속도를 고르는 해로 쓰게.`,
      softBridge: softUseful,
      tableMd: [
        '| 시기 | 할 일 |',
        '| --- | --- |',
        `| ${f.dohwaMonth} 전후 | 소개·외출·노출을 열어 두기 |`,
        '| 봄 | 새 동선 만들기 |',
        '| 여름 | 표현하되 압박하지 않기 |',
        '| 가을·겨울 | 고르고 확인하기 |',
      ].join('\n'),
      tableCaption: '성사 전략은 거창한 작전보다, 달에 맞는 작은 용기일세.',
      chartPoints: chart,
      chartCaption: '행동 타이밍을 겹쳐 보면, 기회가 보이는 달이 드러나네.',
      scene: f.hasPartner
        ? `${f.partnerName}가 있다면 감정을 증명하라 몰아붙이기보다, 같이 할 일 하나를 정하게. 그 약속이 두 번 반복되면, 말은 따라오게 되어 있네.`
        : `상대가 없다면 나를 보여줄 장면을 늘리게. 소개, 취미, 반복되는 일상 모임. 운은 그런 자리에 자주 앉은 사람에게 먼저 말을 거네.`,
      actions: [
        `이번 달 행동 하나: ${f.dohwaMonth.includes('월') ? f.dohwaMonth + '에 맞춰' : ''} 만남 기회 만들기`,
        '답을 재촉하는 말 대신 다음 약속을 만드는 말을 쓰게',
        '매주 일요일, 이번 주 놓친 신호를 한 줄로만 돌아보게',
      ],
      imagePrompt: {
        ko: '붉은 문 앞에 선 인물이 문을 반쯤 열며 웃는 장면. 기다림에서 선택으로 넘어가는 밤.',
        en: 'A figure half-opening a crimson door with a quiet smile; the night shifting from waiting to choosing.',
      },
    },
  }

  const selected = beats[sectionId] ?? {
    hook,
    feel: `${f.name}님의 올해 연애 이야기부터 천천히 펼쳐 보겠네. 마음이 먼저 묻는 장면이 곧 입구일세.`,
    softBridge: softYear,
    scene: `일상의 작은 반복 속에 인연의 신호가 숨어 있네. 서두르지 말고, 놓치지만 말게.`,
    actions: ['이번 주 사람 만나는 자리를 하나만 열게', '마음이 동하면 다음 약속을 묻게'],
    imagePrompt: {
      ko: '밤거리 등불 아래 걸음을 잠시 멈춘 인물. 앞으로의 인연을 기다리는 여운.',
      en: 'A figure pausing under street lanterns, the soft aftertaste of a love story about to begin.',
    },
  }

  return {
    ...selected,
    softBridge: [selected.softBridge, softGrain].filter(Boolean).join(' '),
    ragTopics,
  }
}

export function applyStorytellingToSection(section: SajuReportSection, beat: StoryBeat): SajuReportSection {
  return {
    ...section,
    hook: beat.hook,
    interpretation: formatStoryInterpretation(beat),
    storytelling: toStorytellingPayload(beat),
    imageAlt: section.imageAlt || `${section.category} 장면`,
  }
}
