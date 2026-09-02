import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RagChunk, RagKnowledgeBlock, SajuAnalysis, SajuReportContext } from '../types/index.js'
import { getChunkCorpusFiles, getCorpusDomainBoost } from './corpus-registry.js'
import { retrieveVectorRagChunks } from './embedder.js'
import { chunkSearchText, corpusFileToChunks, knowledgeBlockToRagChunk } from './knowledge-block.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../data')

interface ConsultationTemplate {
  id: string
  intent: string
  keywords: string[]
  promptHint: string
}

interface CorpusFile {
  domain?: string
  chunks?: RagChunk[]
  knowledgeBlocks?: RagKnowledgeBlock[]
  templates?: ConsultationTemplate[]
}

interface SajuElementsFile {
  elementProfiles?: Record<string, {
    keywords?: string[]
    strongTraits?: string
    weakTraits?: string
    advice?: string
  }>
  dayMasterAdvice?: Record<string, string>
}

function loadJson<T>(relativePath: string): T {
  const raw = readFileSync(join(DATA_ROOT, relativePath), 'utf-8')
  return JSON.parse(raw) as T
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokenize(text: string): string[] {
  return normalizeText(text).match(/[\uac00-\ud7a3a-z0-9]+/g) ?? []
}

const SYNONYMS: Record<string, string[]> = {
  본인: ['나', '자기', '내상태', '자기이해', '현재고민'],
  가족: ['부모', '자녀', '형제', '집안', '거리조절'],
  연인: ['연애', '배우자궁', '관계패턴', '인연', '상대'],
  친구: ['비견', '겁재', '비겁', '우정', '경쟁', '거리감'],
  기타: ['타인', '상대', '기본성향', '관찰'],
  솔로: ['연애운', '인연', '일지', '도화', '오래남는사람'],
  짝사랑: ['마음에둔사람', '썸', '끌림', '도화', '합'],
  이별: ['재회', '상실', '관계반복', '마음', '정리'],
  결혼: ['배우자', '부부', '생활', '책임', '정재'],
  학생: ['공부', '진로', '인성', '식상', '시험'],
  구직: ['취업', '일자리', '직업', '관성', '식상'],
  직장: ['회사', '업무', '조직', '관성', '월주', '이직'],
  사업: ['편재', '식상', '시장', '돈구멍', '창업'],
  프리랜서: ['프로젝트', '외주', '식상', '재성', '계약'],
  휴식: ['쉬고', '공백기', '번아웃', '회복', '인성'],
  돈: ['재물', '재물운', '재성', '정재', '편재', '돈구멍'],
  재물: ['돈', '재물운', '재성', '정재', '편재', '수입'],
  직업: ['직장', '커리어', '관성', '식상', '월주', '일운'],
  이직: ['퇴사', '회사이동', '오퍼', '직무', '관성', '식상', '재성', '대운', '세운'],
  퇴사: ['이직', '회사이동', '타이밍', '계약', '버퍼', '대운', '세운'],
  오퍼: ['이직', '새회사', '계약', '연봉', '업무범위', '재성', '관성'],
  연애: ['관계', '인연', '배우자궁', '일지', '도화'],
  관계: ['연애', '일지', '배우자궁', '비겁', '합충'],
  용신: ['희신', '기신', '억부', '조후', '통관', '보완'],
  대운: ['세운', '전환', '시기', '10년', '운세'],
  세운: ['올해', '연도', '대운', '신호', '운세'],
  시기: ['대운', '세운', '전환', '합충', '신호'],
  장소: ['오행', '생활공간', '인연장소', '사건장소'],
  집: ['풍수', '주거', '공간', '현관', '침실', '책상', '창밖'],
  풍수: ['집', '주거', '현관', '침실', '동선', '채광', '통풍'],
  현관: ['입구', '동선', '문앞', '신발장', '들어오는길'],
  침실: ['잠', '수면', '회복', '멘탈', '조명', '소음'],
  책상: ['재택', '공부', '집중', '업무', '등뒤', '문'],
  창밖: ['채광', '소음', '시선', '압박감', '앞열림'],
  살림: ['수납', '주방', '정리', '소비', '돈'],
  이사: ['계약', '비교', '거주', '7일테스트', '현실체크'],
  리포트: ['장문', '상세풀이', '근거', '섹션', '95점'],
  격국: ['월령', '십신', '사회적작동', '용신', '구조'],
  조후: ['온도', '한난조습', '계절', '용신', '균형'],
  통관: ['상생', '상극', '중재', '충돌완화', '용신'],
  자시: ['23시', '야자시', '조자시', '일주변경', '시주'],
  gbr: ['graph', '그래프', '재랭킹', '근거', '연결'],
  dominant: ['강한', '오행', '과다'],
  element: ['오행', '목', '화', '토', '금', '수'],
}

const ELEMENT_TERMS: Record<string, string[]> = {
  wood: ['목', '갑', '을', '木', '성장', '시작'],
  fire: ['화', '병', '정', '火', '표현', '열정'],
  earth: ['토', '무', '기', '土', '현실', '안정'],
  metal: ['금', '경', '신', '金', '기준', '판단'],
  water: ['수', '임', '계', '水', '직관', '흐름'],
}

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens.filter(Boolean))
  for (const token of tokens) {
    for (const synonym of SYNONYMS[token] ?? []) expanded.add(synonym)
  }
  return [...expanded]
}

function loadTemplates(): ConsultationTemplate[] {
  return loadJson<CorpusFile>('corpus/consultation-templates.json').templates ?? []
}

function buildElementChunks(): RagChunk[] {
  const elements = loadJson<SajuElementsFile>('corpus/saju-elements.json')
  const profileChunks = Object.entries(elements.elementProfiles ?? {}).map(([element, profile]) => knowledgeBlockToRagChunk({
    id: `el-${element}`,
    topic: `오행 프로필: ${element}`,
    keywords: [element, ...(profile.keywords ?? [])],
    concept: `${element} 기운의 생활 표현`,
    condition: `${element} 기운이 강하거나 약한 조건에서 적용`,
    interpretation: [
      profile.strongTraits ? `강하게 쓰일 때: ${profile.strongTraits}` : '',
      profile.weakTraits ? `부족하거나 흔들릴 때: ${profile.weakTraits}` : '',
    ].filter(Boolean).join(' '),
    real_world_pattern: [
      profile.strongTraits ?? '',
      profile.weakTraits ?? '',
    ].filter(Boolean),
    risk: '오행 많고 적음을 성격 단정이나 미신적 처방으로만 연결하는 것',
    opportunity: profile.advice ?? '생활 루틴, 관계 방식, 일의 환경으로 보완',
    advice: profile.advice ?? '현재 질문 영역에서 실제 행동으로 다시 작성',
    confidence: 'medium',
    forbidden_generalization: '특정 오행 하나만으로 성격, 건강, 직업, 미래를 단정하지 않음',
  }, 'saju_elements'))

  const dayMasterChunks = Object.entries(elements.dayMasterAdvice ?? {}).map(([stem, advice]) => knowledgeBlockToRagChunk({
    id: `dm-${stem}`,
    topic: `일간 조언: ${stem}`,
    keywords: [stem, '일간', '기질', '성격', '조언'],
    concept: `${stem} 일간의 기본 반응`,
    condition: `계산된 Feature JSON의 dayMaster가 ${stem}일 때 우선 적용`,
    interpretation: advice,
    real_world_pattern: ['결정 방식', '피로가 쌓이는 장면', '강점이 드러나는 상황'],
    risk: '일간 하나만으로 사람 전체를 단정하는 것',
    opportunity: '기본 반응을 현재 고민의 행동 기준으로 연결',
    advice: '일간 설명은 한 번만 쓰고 곧바로 생활 언어로 번역',
    confidence: 'medium',
    forbidden_generalization: '일간만 보고 성격, 직업, 관계 결말을 확정하지 않음',
  }, 'saju_elements'))

  return [...profileChunks, ...dayMasterChunks]
}

/** O(n) — 코퍼스 인덱스 로드 */
export function buildCorpusIndex(): RagChunk[] {
  const corpusChunks = getChunkCorpusFiles().flatMap((file) => {
    const data = loadJson<CorpusFile>(file)
    return corpusFileToChunks(data)
  })

  const templateChunks = loadTemplates().map((template) => ({
    id: `tpl-${template.id}`,
    topic: `상담 의도: ${template.intent}`,
    keywords: [template.intent, ...template.keywords],
    content: template.promptHint,
    domain: 'consultation_templates',
  }))

  return [...corpusChunks, ...buildElementChunks(), ...templateChunks]
}

function keywordScore(keyword: string, queryRaw: string, queryTokens: string[]): number {
  const normalized = normalizeText(keyword)
  if (!normalized) return 0

  const keywordTokens = tokenize(normalized)
  if (normalized.length <= 1) return queryTokens.includes(normalized) ? 3 : 0
  if (queryRaw.includes(normalized)) return 18
  if (keywordTokens.length > 1 && keywordTokens.every((token) => queryTokens.includes(token))) return 14
  if (queryTokens.includes(normalized)) return 12
  if (queryTokens.some((token) => token.length >= 2 && (normalized.includes(token) || token.includes(normalized)))) return 5
  return 0
}

export function detectIntent(message: string): string {
  const templates = loadTemplates()
  const queryRaw = normalizeText(message)
  const queryTokens = expandTokens(tokenize(message))
  let best = { intent: 'general', score: 0 }

  for (const template of templates) {
    if (template.intent === 'general') continue
    const score = template.keywords.reduce((total, keyword) => total + keywordScore(keyword, queryRaw, queryTokens), 0)
    if (score > best.score) best = { intent: template.intent, score }
  }

  return best.score > 0 ? best.intent : 'general'
}

function contextTokens(context?: SajuReportContext): string[] {
  if (!context) return []
  const values = [
    context.serviceKey,
    context.target,
    context.relationship,
    context.orientation,
    context.work,
    context.concern,
    context.partner?.mode,
    context.partner?.name,
    context.partner?.relationship,
    context.partner?.dayMaster,
    context.partner?.dayMasterElement,
    context.partner?.dominantElement,
    context.partner?.weakElement,
    ...(context.partner?.tenGods ?? []),
    context.home?.addressOrBuilding,
    context.home?.roadAddress,
    context.home?.jibunAddress,
    context.home?.zonecode,
    context.home?.sido,
    context.home?.sigungu,
    context.home?.bname,
    context.home?.buildingName,
    context.home?.buildingType,
    context.home?.livingPeriod,
    context.home?.mainPurpose,
    context.home?.stayDecision,
    ...(context.home?.painPoints ?? []),
    context.home?.entranceFlow,
    context.home?.bedroomFeel,
    context.home?.deskPosition,
    context.home?.outsideFlow,
    context.home?.extraNote,
    context.workMove?.decisionMode,
    context.workMove?.currentCompanySignal,
    context.workMove?.targetCompanyName,
    context.workMove?.targetRole,
    context.workMove?.workType,
    context.workMove?.commuteLocation,
    context.workMove?.salaryFeeling,
    context.workMove?.decisionDate,
    context.workMove?.discomfortPoint,
    context.workMove?.priority,
    ...(context.workMove?.realityChecks ?? []),
  ].filter((value): value is string => Boolean(value && value.trim()))

  const rawTokens = values.flatMap(tokenize)
  const joined = values.join(' ')
  const direct: string[] = []

  if (joined.includes('본인')) direct.push('본인', '내상태', '현재고민')
  if (joined.includes('가족')) direct.push('가족', '부모', '자녀', '거리조절')
  if (joined.includes('연인')) direct.push('연인', '연애', '배우자궁', '관계패턴')
  if (joined.includes('친구')) direct.push('친구', '비겁', '비견', '겁재')
  if (joined.includes('기타')) direct.push('기타', '타인', '상대')
  if (joined.includes('이성 관계')) direct.push('이성', '배우자성', '재성', '관성')
  if (joined.includes('동성 관계')) direct.push('동성', '비겁', '친구', '동료')
  if (joined.includes('솔로')) direct.push('솔로', '인연', '도화')
  if (joined.includes('마음에 둔')) direct.push('짝사랑', '썸', '끌림')
  if (joined.includes('연애 중')) direct.push('연애', '관계반복')
  if (joined.includes('이별')) direct.push('이별', '재회', '정리')
  if (joined.includes('결혼')) direct.push('결혼', '배우자', '생활')
  if (context.serviceKey === 'love_this_year') direct.push('연애운', '도화', '배우자성', '세운', '궁합', '상대')
  if (context.partner?.mode === 'known') direct.push('상대방', '궁합', '감정온도', '일간', '오행')
  if (context.serviceKey === 'home_fit') direct.push('집', '풍수', '주거', '현관', '침실', '책상', '창밖', '동선', '오행')
  if (context.serviceKey === 'work_move') direct.push('이직운', '이직', '퇴사', '회사', '직무', '오퍼', '연봉', '계약', '관성', '식상', '재성', '대운', '세운')
  if (joined.includes('rest') || joined.includes('sleep') || joined.includes('잠')) direct.push('침실', '잠', '수면', '회복', '조명')
  if (joined.includes('work') || joined.includes('focus') || joined.includes('재택') || joined.includes('공부')) direct.push('책상', '집중', '재택', '업무', '등뒤')
  if (joined.includes('money') || joined.includes('살림') || joined.includes('소비')) direct.push('돈', '살림', '수납', '주방', '소비')
  if (joined.includes('relationship') || joined.includes('동거') || joined.includes('가족')) direct.push('관계', '가족', '동거', '사생활', '거리감')
  if (joined.includes('move') || joined.includes('compare') || joined.includes('이사')) direct.push('이사', '계약', '비교', '7일테스트')
  if (joined.includes('entrance') || joined.includes('direct') || joined.includes('blocked')) direct.push('현관', '문앞', '동선', '신발장')
  if (joined.includes('bedroom') || joined.includes('window_road') || joined.includes('door_line')) direct.push('침실', '소음', '시선', '문', '복도')
  if (joined.includes('desk') || joined.includes('back_window') || joined.includes('face_door')) direct.push('책상', '등뒤', '문', '창')
  if (joined.includes('outside') || joined.includes('pressed') || joined.includes('road_noise')) direct.push('창밖', '소음', '압박감', '앞열림')
  if (joined.includes('학생')) direct.push('학생', '공부', '진로')
  if (joined.includes('일을 찾')) direct.push('구직', '취업', '일자리')
  if (joined.includes('직장')) direct.push('직장', '회사', '업무')
  if (joined.includes('사업')) direct.push('사업', '편재', '시장')
  if (joined.includes('프리랜서')) direct.push('프리랜서', '프로젝트', '계약')
  if (joined.includes('쉬고')) direct.push('휴식', '공백기', '회복')
  if (/move_considering|offer_review|resignation_timing|internal_transfer|job_search_start|이직|퇴사|오퍼/.test(joined)) direct.push('이직', '퇴사', '오퍼', '타이밍', '전환')
  if (/role_blur|authority_blur|boss_pressure|peer_competition|recognition_gap|burnout|역할|상사|번아웃/.test(joined)) direct.push('현회사', '역할', '상사', '번아웃', '관성')
  if (/salary|clear_up|slight_up|unclear|연봉|계약/.test(joined)) direct.push('연봉', '계약', '업무범위', '재성')

  return expandTokens([...rawTokens, ...direct])
}

function sajuTokens(saju: SajuAnalysis): string[] {
  const terms = [
    saju.dayMaster,
    saju.dominantElement,
    saju.weakElement,
    saju.usefulGod ?? '',
    saju.dayMasterStrength,
    ...saju.tenGods,
    ...(ELEMENT_TERMS[saju.dayMasterElement] ?? []),
    ...(ELEMENT_TERMS[saju.dominantElement] ?? []),
    ...(ELEMENT_TERMS[saju.weakElement] ?? []),
    ...(saju.usefulGod ? ELEMENT_TERMS[saju.usefulGod] ?? [] : []),
    saju.manseryeok?.gyeokguk.name ?? '',
    saju.manseryeok?.gyeokguk.tenGod ?? '',
    saju.manseryeok?.climate.season ?? '',
    saju.manseryeok?.climate.temperature ?? '',
    saju.manseryeok?.climate.moisture ?? '',
    ...(saju.manseryeok?.flowBridges.map((bridge) => bridge.bridge) ?? []),
    ...(saju.manseryeok?.interactions.flatMap((item) => [item.type, ...item.signs]) ?? []),
  ].filter(Boolean)
  return expandTokens(terms.map(String).flatMap(tokenize))
}

function graphBoostTokens(
  queryTokens: string[],
  saju: SajuAnalysis,
  context?: SajuReportContext,
): string[] {
  const query = queryTokens.join(' ')
  const contextValue = contextText(context)
  const graph = new Set<string>()

  for (const token of sajuTokens(saju)) graph.add(token)
  if (saju.manseryeok?.gyeokguk) {
    graph.add('격국')
    graph.add('월령')
    graph.add(saju.manseryeok.gyeokguk.name)
    graph.add(saju.manseryeok.gyeokguk.tenGod)
  }
  if (saju.manseryeok?.climate) {
    graph.add('조후')
    graph.add('한난조습')
    graph.add('계절')
    for (const element of saju.manseryeok.climate.usefulElements) graph.add(element)
  }
  if ((saju.manseryeok?.flowBridges.length ?? 0) > 0) {
    graph.add('통관')
    graph.add('상생')
    graph.add('상극')
  }
  if (saju.fortune) {
    graph.add('대운')
    graph.add('세운')
    graph.add(saju.fortune.currentDaewoon)
    graph.add(saju.fortune.yearPillar)
  }

  if (/연애|관계|인연|이별|재회|배우자|동성|이성/.test(`${query} ${contextValue}`)) {
    for (const token of ['일지', '배우자궁', '비겁', '재성', '관성', '식상', '합충', '거리감']) graph.add(token)
  }
  if (/돈|재물|수입|지출|직업|직장|사업|프리랜서|계약/.test(`${query} ${contextValue}`)) {
    for (const token of ['재성', '식상', '관성', '계약', '돈구멍', '편재', '정재']) graph.add(token)
  }
  if (/이직|퇴사|오퍼|새 회사|직무|연봉|번아웃|면접|포트폴리오/.test(`${query} ${contextValue}`)) {
    for (const token of ['이직', '퇴사', '오퍼', '관성', '식상', '재성', '대운', '세운', '계약', '업무범위', '버퍼']) graph.add(token)
  }
  if (/집|풍수|주거|현관|침실|책상|창밖|수면|재택|살림|동선|이사/.test(`${query} ${contextValue}`)) {
    for (const token of ['집', '풍수', '현관', '침실', '책상', '창밖', '동선', '앞열림', '뒤받침', '오행']) graph.add(token)
  }
  if (/용신|희신|기신|격국|조후|통관|강약/.test(query)) {
    for (const token of ['격국', '월령', '조후', '통관', '억부', '한난조습']) graph.add(token)
  }
  if (/23|자시|야자시|조자시/.test(query)) {
    for (const token of ['자시', '23시', '일주변경', '시주']) graph.add(token)
  }

  return expandTokens([...graph].map(String).flatMap(tokenize))
}

function scoreChunk(
  chunk: RagChunk,
  queryRaw: string,
  queryTokens: string[],
  personalTokens: string[],
  graphTokens: string[],
  vectorBoost: number,
  pinnedContextIds: Set<string>,
): number {
  const topic = normalizeText(chunk.topic)
  const content = normalizeText(chunkSearchText(chunk))
  const keywords = chunk.keywords.map(normalizeText)
  let score = vectorBoost
  let keywordHit = false
  let topicHit = false
  let contentHit = false
  let personalHit = false
  let graphHit = false

  for (const keyword of keywords) {
    const next = keywordScore(keyword, queryRaw, queryTokens)
    if (next > 0) keywordHit = true
    score += next
  }

  for (const token of queryTokens) {
    if (!token || token.length <= 1) continue
    if (topic.includes(token)) {
      topicHit = true
      score += 6
    }
    if (content.includes(token)) {
      contentHit = true
      score += 2
    }
  }

  for (const token of personalTokens) {
    if (!token || token.length <= 1) continue
    if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      personalHit = true
      score += 2
    }
    if (content.includes(token)) {
      personalHit = true
      score += 1
    }
  }

  for (const token of graphTokens) {
    if (!token || token.length <= 1) continue
    if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      graphHit = true
      score += 3
    }
    if (topic.includes(token)) {
      graphHit = true
      score += 4
    }
    if (content.includes(token)) {
      graphHit = true
      score += 1.5
    }
  }

  score += getCorpusDomainBoost(chunk.domain)
  if (pinnedContextIds.has(chunk.id)) score += 40

  const binarySignals = [
    pinnedContextIds.has(chunk.id),
    keywordHit,
    topicHit,
    contentHit,
    personalHit,
    graphHit,
    vectorBoost > 0,
  ]
  const hitCount = binarySignals.filter(Boolean).length
  const smoothedCoverage = (hitCount + 1) / (binarySignals.length + 2)
  score += smoothedCoverage * 10

  return score
}

function contextText(context?: SajuReportContext): string {
  if (!context) return ''
  return [
    context.serviceKey,
    context.target,
    context.relationship,
    context.orientation,
    context.work,
    context.concern,
    context.partner?.mode === 'known' ? '상대방 사주 궁합 감정 온도' : '',
    context.partner?.relationship,
    context.partner?.dayMaster,
    context.partner?.dayMasterElement,
    context.partner?.dominantElement,
    context.partner?.weakElement,
    ...(context.partner?.tenGods ?? []),
    context.home?.addressOrBuilding,
    context.home?.roadAddress,
    context.home?.jibunAddress,
    context.home?.zonecode,
    context.home?.sido,
    context.home?.sigungu,
    context.home?.bname,
    context.home?.buildingName,
    context.home?.buildingType,
    context.home?.livingPeriod,
    context.home?.mainPurpose,
    context.home?.stayDecision,
    ...(context.home?.painPoints ?? []),
    context.home?.entranceFlow,
    context.home?.bedroomFeel,
    context.home?.deskPosition,
    context.home?.outsideFlow,
    context.home?.extraNote,
    context.workMove?.decisionMode,
    context.workMove?.currentCompanySignal,
    context.workMove?.targetCompanyName,
    context.workMove?.targetRole,
    context.workMove?.workType,
    context.workMove?.commuteLocation,
    context.workMove?.salaryFeeling,
    context.workMove?.decisionDate,
    context.workMove?.discomfortPoint,
    context.workMove?.priority,
    ...(context.workMove?.realityChecks ?? []),
  ].filter(Boolean).join(' ')
}

function pinnedContextChunkIds(context?: SajuReportContext): Set<string> {
  const ids = new Set<string>()
  if (!context) return ids

  const target = context?.target ?? ''
  const orientation = context?.orientation ?? ''
  const relationship = context?.relationship ?? ''
  const work = context?.work ?? ''
  const home = context?.home
  const workMove = context?.workMove

  if (target.includes('본인')) ids.add('ic-001')
  if (target.includes('가족')) ids.add('ic-002')
  if (target.includes('연인')) ids.add('ic-003')
  if (target.includes('친구')) ids.add('ic-004')
  if (target.includes('기타')) ids.add('ic-005')
  if (orientation.includes('이성 관계')) ids.add('ic-006')
  if (orientation.includes('동성 관계')) ids.add('ic-007')
  if (relationship.includes('솔로')) ids.add('ic-008')
  if (relationship.includes('마음에 둔')) ids.add('ic-009')
  if (relationship.includes('연애 중')) ids.add('ic-010')
  if (relationship.includes('이별')) ids.add('ic-011')
  if (relationship.includes('결혼')) ids.add('ic-012')
  if (work.includes('학생')) ids.add('ic-013')
  if (work.includes('일을 찾')) ids.add('ic-014')
  if (work.includes('직장')) ids.add('ic-015')
  if (work.includes('사업')) ids.add('ic-016')
  if (work.includes('프리랜서')) ids.add('ic-017')
  if (work.includes('쉬고')) ids.add('ic-018')
  if (context?.concern?.trim()) ids.add('ic-019')
  else ids.add('ic-020')

  if (context?.serviceKey === 'home_fit') {
    ids.add('hfit-001')
    ids.add('hfit-002')
    ids.add('hfit-003')
    const joinedHome = [
      home?.mainPurpose,
      home?.stayDecision,
      ...(home?.painPoints ?? []),
      home?.entranceFlow,
      home?.bedroomFeel,
      home?.deskPosition,
      home?.outsideFlow,
      home?.extraNote,
    ].filter(Boolean).join(' ')

    if (/sleep|rest|bedroom|window_road|door_line|too_bright|잠|수면|회복|소음/.test(joinedHome)) ids.add('hfit-004')
    if (/entrance|direct|bent|blocked|현관|동선/.test(joinedHome)) ids.add('hfit-005')
    if (/work|focus|desk|back_window|face_door|mixed_rest|재택|공부|집중/.test(joinedHome)) ids.add('hfit-006')
    if (/money|살림|소비|수납|주방/.test(joinedHome)) ids.add('hfit-007')
    if (/relationship|가족|동거|관계/.test(joinedHome)) ids.add('hfit-008')
    if (/fix|손질|처방|커튼|조명/.test(joinedHome)) ids.add('hfit-009')
    if (/stay|move|compare|unknown|이사|계약|비교/.test(joinedHome)) ids.add('hfit-010')
  }

  if (context?.serviceKey === 'work_move') {
    ids.add('wmov-001')
    ids.add('wmov-002')
    ids.add('wmov-003')
    const joinedWorkMove = [
      workMove?.decisionMode,
      workMove?.currentCompanySignal,
      workMove?.targetRole,
      workMove?.workType,
      workMove?.commuteLocation,
      workMove?.salaryFeeling,
      workMove?.decisionDate,
      workMove?.discomfortPoint,
      workMove?.priority,
      ...(workMove?.realityChecks ?? []),
    ].filter(Boolean).join(' ')

    if (/role_blur|authority_blur|boss_pressure|peer_competition|recognition_gap|burnout|역할|상사|번아웃/.test(joinedWorkMove)) ids.add('wmov-002')
    if (/office|hybrid|remote|shift|field|직무|근무|출퇴근/.test(joinedWorkMove)) ids.add('wmov-004')
    if (/clear_up|slight_up|similar|down_for_growth|unclear|offer_terms_checked|연봉|계약/.test(joinedWorkMove)) ids.add('wmov-005')
    if (/decision|date|timing|resignation|입사|퇴사|타이밍/.test(joinedWorkMove)) ids.add('wmov-006')
    if (/burnout|unclear|역할|계약|찝찝|위험/.test(joinedWorkMove)) ids.add('wmov-007')
    if (/resume_ready|buffer_ready|exit_script_ready|포트폴리오|버퍼|대화/.test(joinedWorkMove)) ids.add('wmov-008')
    if (/growth|mental|money|people|stability|성장|멘탈|돈|사람|안정/.test(joinedWorkMove)) ids.add('wmov-009')
    ids.add('wmov-010')
  }

  return ids
}

export function retrieveRagChunks(
  message: string,
  saju: SajuAnalysis,
  topK = 5,
  context?: SajuReportContext,
): RagChunk[] {
  const corpus = buildCorpusIndex()
  const contextQuery = contextText(context)
  const queryText = [message, contextQuery].filter(Boolean).join(' ')
  const intent = detectIntent(queryText)
  const intentKeywords = loadTemplates().find((template) => template.intent === intent)?.keywords ?? []
  const queryTokens = expandTokens([
    ...tokenize(queryText),
    ...intentKeywords.flatMap(tokenize),
    ...contextTokens(context),
  ])
  const personalTokens = sajuTokens(saju)
  const gbrTokens = graphBoostTokens(queryTokens, saju, context)
  const queryRaw = normalizeText([...queryTokens, queryText].join(' '))
  const pinnedIds = pinnedContextChunkIds(context)

  const vectorResults = retrieveVectorRagChunks(
    [...queryTokens, ...personalTokens].join(' '),
    saju,
    Math.max(topK * 3, topK),
  )
  const vectorRank = new Map(vectorResults.map((chunk, index) => [chunk.id, Math.max(0, 8 - index)]))

  const scored = corpus
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryRaw, queryTokens, personalTokens, gbrTokens, vectorRank.get(chunk.id) ?? 0, pinnedIds),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))

  const pinnedChunks = [...pinnedIds]
    .map((id) => corpus.find((chunk) => chunk.id === id))
    .filter((chunk): chunk is RagChunk => Boolean(chunk))

  const rankedChunks = [
    ...pinnedChunks,
    ...scored
      .map((item) => item.chunk)
      .filter((chunk) => !pinnedIds.has(chunk.id)),
  ]

  if (rankedChunks.length === 0) return corpus.slice(0, topK)
  return rankedChunks.slice(0, topK)
}

export function formatRagForPrompt(chunks: RagChunk[]): string {
  if (chunks.length === 0) return '<rag_knowledge mode="internal_knowledge_blocks">\n(관련 지식 없음)\n</rag_knowledge>'

  const body = chunks
    .map((c, i) => `[${i + 1}] ${c.topic}\nid: ${c.id}\n${c.content}`)
    .join('\n\n')

  return [
    '<rag_knowledge mode="internal_knowledge_blocks">',
    'copy_policy: 아래 블록은 최종 답변 문장이 아니다. concept/condition/interpretation/risk/opportunity/advice의 의미만 추출해 현재 Feature JSON과 질문에 맞는 새 사용자 문장으로 작성한다.',
    'priority: 명식 계산값 > 대운/세운 계산값 > 해석 규칙 > RAG 지식 블록 > 말투 참고 corpus',
    '',
    body,
    '</rag_knowledge>',
  ].join('\n')
}

export function getIntentPromptHint(intent: string): string {
  return loadTemplates().find((t) => t.intent === intent)?.promptHint ?? '일간과 오행 균형을 참고해 따뜻하게 답하세요.'
}
