export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export type Polarity = 'yang' | 'yin'
export type Gender = 'male' | 'female'
export type CalendarType = 'solar' | 'lunar'
export type DayBoundaryRule = 'midnight' | 'zi_hour_next_day'

export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'
export type SolarTermName = '소한' | '입춘' | '경칩' | '청명' | '입하' | '망종' | '소서' | '입추' | '백로' | '한로' | '입동' | '대설'

export type TenGod =
  | '비견' | '겁재' | '식신' | '상관' | '편재' | '정재'
  | '편관' | '정관' | '편인' | '정인'

export interface BirthInput {
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  gender: Gender
  calendar: CalendarType
  isLeapMonth?: boolean
  dayBoundaryRule?: DayBoundaryRule
}

export interface Pillar {
  stem: HeavenlyStem
  branch: EarthlyBranch
  stemElement: Element
  branchElement: Element
}

export interface ResolvedBirthDate {
  originalCalendar: CalendarType
  solarYear: number
  solarMonth: number
  solarDay: number
  hour: number
  minute: number
  isLeapMonth: boolean
  lunarYear?: number
  lunarMonth?: number
  lunarDay?: number
}

export interface FourPillars {
  year: Pillar
  month: Pillar
  day: Pillar
  hour: Pillar
}

export interface ElementCount {
  wood: number
  fire: number
  earth: number
  metal: number
  water: number
}

export interface HiddenStemInfo {
  branch: EarthlyBranch
  stems: Array<{
    stem: HeavenlyStem
    element: Element
    weight: number
    tenGod?: TenGod
  }>
}

export interface TenGodPlacement {
  pillar: 'year' | 'month' | 'day' | 'hour'
  stem: HeavenlyStem
  tenGod: TenGod
}

export interface SajuInteraction {
  type: '천간합' | '육합' | '충' | '형' | '파' | '해'
  pillars: string[]
  signs: string[]
  meaning: string
}

export interface GyeokgukInfo {
  name: string
  basis: string
  tenGod: TenGod
  confidence: number
  note: string
}

export interface ClimateBalanceInfo {
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  temperature: 'cold' | 'cool' | 'balanced' | 'warm' | 'hot'
  moisture: 'dry' | 'balanced' | 'damp'
  usefulElements: Element[]
  cautionElements: Element[]
  note: string
}

export interface FlowBridgeInfo {
  conflict: [Element, Element]
  bridge: Element
  strength: number
  note: string
}

export interface ManseryeokMeta {
  resolvedBirth: ResolvedBirthDate
  pillarYear: number
  monthTerm: SolarTermName
  dayBoundaryRule: DayBoundaryRule
  dayCalculationDate: { solarYear: number; solarMonth: number; solarDay: number }
  hiddenStems: HiddenStemInfo[]
  tenGodPlacements: TenGodPlacement[]
  interactions: SajuInteraction[]
  weightedElements: ElementCount
  gyeokguk: GyeokgukInfo
  climate: ClimateBalanceInfo
  flowBridges: FlowBridgeInfo[]
  calculationNotes: string[]
}

export interface SajuAnalysis {
  fourPillars: FourPillars
  dayMaster: HeavenlyStem
  dayMasterElement: Element
  elementCount: ElementCount
  dominantElement: Element
  weakElement: Element
  tenGods: TenGod[]
  usefulGod: Element | null
  dayMasterStrength: 'strong' | 'balanced' | 'weak'
  summary: string
  dayMasterAdvice: string
  manseryeok?: ManseryeokMeta
  fortune?: FortuneCycle
  preview?: SajuPreview
  report?: SajuReport
}

export interface FortuneCycle {
  currentYear: number
  yearPillar: string
  daewoon: Array<{ age: string; pillar: string; ageStart?: number; ageEnd?: number; startYear?: number }>
  currentDaewoon: string
  direction?: 'forward' | 'backward'
  startAge?: number
  startAgeText?: string
}

export interface SajuPreview {
  loveFortune: string
  wealthFortune: string
  personality: string
  elementBalance: string
}

export interface SajuReportContext {
  serviceKey?: string
  name?: string
  target?: string
  concern?: string
  relationship?: string
  orientation?: string
  work?: string
  birthTimeKnown?: boolean
  partner?: {
    mode?: 'none' | 'known'
    name?: string
    relationship?: string
    birth?: BirthInput
    birthTimeKnown?: boolean
    pillars?: {
      year: string
      month: string
      day: string
      hour: string
    }
    dayMaster?: string
    dayMasterElement?: string
    dominantElement?: string
    weakElement?: string
    tenGods?: TenGod[]
  }
}

export interface SajuReportSection {
  id: string
  order: number
  imageKey: string
  imageSrc: string
  imageAlt: string
  category: string
  categoryEn: string
  classification: string
  hook: string
  patternKeys: string[]
  ragTopics: string[]
  interpretation: string
  generatedBy?: 'template' | 'openai'
  model?: string
  status?: 'pending' | 'generating' | 'complete' | 'failed'
  error?: string
}

export interface SajuReportQualityCategory {
  id: string
  label: string
  ragUsagePercent: number
  corpusRelevancePercent: number
  toneGroundingPercent: number
  llmGroundingPercent: number
  completenessPercent: number
  sectionIds: string[]
  evidence: string[]
}

export interface SajuReportQuality {
  overallPercent: number
  ragUsagePercent: number
  corpusRelevancePercent: number
  toneGroundingPercent: number
  llmGroundingPercent: number
  categories: SajuReportQualityCategory[]
}

export interface CorpusPackSnapshot {
  id: string
  path: string
  kind: 'chunks' | 'structured' | 'templates'
  domain: string
  status: 'active' | 'paused' | 'deprecated'
  role: string
  version: string
  retrievalBoost?: number
  contentHash: string
}

export interface CorpusSnapshot {
  registryVersion: string
  fingerprint: string
  policy: string
  activePacks: CorpusPackSnapshot[]
}

export interface SajuReport {
  reportId?: string
  title: string
  subtitle: string
  model: string
  generatedBy: 'template' | 'openai'
  status?: 'pending' | 'generating' | 'complete' | 'failed'
  progress?: { complete: number; total: number }
  storage?: 'postgres' | 'supabase' | 'memory'
  corpus?: CorpusSnapshot
  quality?: SajuReportQuality
  sections: SajuReportSection[]
}

export interface ChatResponse {
  reply: string
  intent: string
  sajuSummary: string
}

export interface RagChunk {
  id: string
  topic: string
  keywords: string[]
  content: string
  domain?: string
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationInput {
  birth: BirthInput
  message: string
  history?: ConversationTurn[]
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ConversationResult {
  messages: LlmMessage[]
  sajuAnalysis: SajuAnalysis
  retrievedChunks: RagChunk[]
  intent: string
}
