export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export type Polarity = 'yang' | 'yin'
export type Gender = 'male' | 'female'
export type CalendarType = 'solar' | 'lunar'

export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'

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
}

export interface Pillar {
  stem: HeavenlyStem
  branch: EarthlyBranch
  stemElement: Element
  branchElement: Element
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
  fortune?: FortuneCycle
  preview?: SajuPreview
  report?: SajuReport
}

export interface FortuneCycle {
  currentYear: number
  yearPillar: string
  daewoon: Array<{ age: string; pillar: string }>
  currentDaewoon: string
}

export interface SajuPreview {
  loveFortune: string
  wealthFortune: string
  personality: string
  elementBalance: string
}

export interface SajuReportContext {
  name?: string
  target?: string
  concern?: string
  relationship?: string
  orientation?: string
  work?: string
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

export interface SajuReport {
  reportId?: string
  title: string
  subtitle: string
  model: string
  generatedBy: 'template' | 'openai'
  status?: 'pending' | 'generating' | 'complete' | 'failed'
  progress?: { complete: number; total: number }
  storage?: 'postgres' | 'memory'
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
