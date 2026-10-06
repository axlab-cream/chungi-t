export const SOLO_AXES = ['direct', 'express', 'stability', 'independence'] as const
export type SoloAxis = typeof SOLO_AXES[number]
export type SoloGender = 'female' | 'male'
export type AxisVector = Record<SoloAxis, number>

export const SOLO_NAMES: Record<SoloGender, readonly string[]> = {
  female: ['영숙', '정숙', '순자', '영자', '옥순', '현숙', '정희'],
  male: ['영수', '영호', '영식', '영철', '광수', '상철', '경수'],
}
export const SOLO_QUESTION_COUNT = 8
export const SOLO_FORTUNE_URL = 'https://umsh.kr/love/this-year/01-step-1-story/index.html'

export interface SoloCharacter {
  typeId: string
  name: string
  gender: SoloGender
  vector: AxisVector
  primaryAxis: SoloAxis
  oneLiner: string
  keywords: string[]
  title: string
  description: string
  strength: string
  weakness: string
  tip: string
  shareText: string
  best: string
  bestReason: string
  danger: string
  dangerReason: string
}
export interface SoloAnswer { id: string; text: string; emoji: string; scores: AxisVector }
export interface SoloQuestion { questionId: string; scene: string; sceneLine?: string; question: string; primaryAxes: SoloAxis[]; answers: SoloAnswer[] }
export interface SoloSpec {
  version: string
  axes: SoloAxis[]
  axisRange: Record<SoloAxis, { min: number; max: number }>
  tieBreak: { epsilon: number; order: string[] }
  characters: SoloCharacter[]
  questions: SoloQuestion[]
  copy: Record<string, unknown>
}

const isInt = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi
const round1 = (n: number) => Math.round(n * 10) / 10
const distance = (a: AxisVector, b: AxisVector) => Math.sqrt(SOLO_AXES.reduce((sum, axis) => sum + (a[axis] - b[axis]) ** 2, 0))

/** Actual min/max raw totals per axis, derived from the answer table rather than trusted from the spec. */
export function computeAxisRange(questions: SoloQuestion[]) {
  return Object.fromEntries(SOLO_AXES.map(axis => [axis, {
    min: questions.reduce((s, q) => s + Math.min(...q.answers.map(a => a.scores[axis])), 0),
    max: questions.reduce((s, q) => s + Math.max(...q.answers.map(a => a.scores[axis])), 0),
  }])) as Record<SoloAxis, { min: number; max: number }>
}

/** Structural errors make the spec unusable; the engine refuses to run on them. */
export function structureErrors(spec: SoloSpec): string[] {
  const errors: string[] = []
  const chars = Array.isArray(spec?.characters) ? spec.characters : []
  const questions = Array.isArray(spec?.questions) ? spec.questions : []
  if (chars.length !== 14) errors.push(`characters must be 14 (got ${chars.length})`)
  if (questions.length !== SOLO_QUESTION_COUNT) errors.push(`questions must be ${SOLO_QUESTION_COUNT} (got ${questions.length})`)
  const ids = new Set<string>()
  for (const c of chars) {
    if (!c.typeId || ids.has(c.typeId)) errors.push(`duplicate or empty typeId: ${c.typeId}`)
    ids.add(c.typeId)
    if (c.gender !== 'female' && c.gender !== 'male') errors.push(`${c.typeId}: invalid gender`)
    if (!SOLO_AXES.every(axis => isInt(c.vector?.[axis], 0, 100))) errors.push(`${c.typeId}: vector must be integers 0~100`)
    if (!SOLO_AXES.includes(c.primaryAxis)) errors.push(`${c.typeId}: invalid primaryAxis`)
  }
  for (const gender of ['female', 'male'] as const) {
    const names = chars.filter(c => c.gender === gender).map(c => c.name).sort()
    if (names.join() !== [...SOLO_NAMES[gender]].sort().join()) errors.push(`${gender} names must be ${SOLO_NAMES[gender].join(',')} (got ${names.join(',')})`)
  }
  for (const c of chars) for (const key of ['best', 'danger'] as const) if (!ids.has(c[key])) errors.push(`${c.typeId}.${key} points to unknown ${c[key]}`)
  const qids = new Set<string>()
  const questionErrorsBefore = errors.length
  for (const q of questions) {
    if (!q.questionId || qids.has(q.questionId)) errors.push(`duplicate or empty questionId: ${q.questionId}`)
    qids.add(q.questionId)
    if (!Array.isArray(q.answers) || q.answers.length !== 4) { errors.push(`${q.questionId}: needs 4 answers`); continue }
    for (const a of q.answers) if (!SOLO_AXES.every(axis => isInt(a.scores?.[axis], 0, 3))) errors.push(`${q.questionId}.${a.id}: scores must be integers 0~3`)
  }
  // Range comparison needs a well-formed answer table, but not well-formed characters.
  if (questions.length === SOLO_QUESTION_COUNT && errors.length === questionErrorsBefore) {
    const range = computeAxisRange(questions)
    for (const axis of SOLO_AXES) {
      if (range[axis].max === range[axis].min) errors.push(`${axis}: no spread across answers`)
      if (spec.axisRange?.[axis]?.min !== range[axis].min || spec.axisRange?.[axis]?.max !== range[axis].max) errors.push(`axisRange.${axis} says ${JSON.stringify(spec.axisRange?.[axis])} but table gives ${JSON.stringify(range[axis])}`)
    }
  }
  if (typeof spec?.tieBreak?.epsilon !== 'number' || spec.tieBreak.epsilon < 0) errors.push('tieBreak.epsilon must be a non-negative number')
  const order = spec?.tieBreak?.order ?? []
  if (order.length !== 14 || new Set(order).size !== 14 || order.some(id => !ids.has(id))) errors.push('tieBreak.order must list all 14 typeIds once')
  return errors
}

/** Design rules from the planning prompt. Violations are reported, not fatal. */
export function designIssues(spec: SoloSpec): string[] {
  const issues: string[] = []
  const byId = new Map(spec.characters.map(c => [c.typeId, c]))
  for (const c of spec.characters) {
    if (!SOLO_AXES.every(axis => c.vector[axis] >= 20 && c.vector[axis] <= 80)) issues.push(`${c.name}: vector outside 20~80`)
    for (const key of ['best', 'danger'] as const) {
      const other = byId.get(c[key])!
      if (other.gender === c.gender) issues.push(`${c.name}.${key} is same gender`)
      if (other[key] !== c.typeId) issues.push(`${c.name}.${key}=${other.name} is not symmetric`)
    }
    if (c.best === c.danger) issues.push(`${c.name}: best and danger are the same`)
  }
  for (const gender of ['female', 'male'] as const) {
    const group = spec.characters.filter(c => c.gender === gender)
    for (const key of ['best', 'danger'] as const) if (new Set(group.map(c => c[key])).size !== group.length) issues.push(`${gender} ${key} pairs are not one-to-one`)
    for (const axis of SOLO_AXES) {
      if (group.filter(c => c.vector[axis] <= 35).length < 2) issues.push(`${gender} ${axis}: fewer than 2 characters at <=35`)
      if (group.filter(c => c.vector[axis] >= 65).length < 2) issues.push(`${gender} ${axis}: fewer than 2 characters at >=65`)
    }
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const d = distance(group[i].vector, group[j].vector)
      if (d < 25) issues.push(`${group[i].name}-${group[j].name} distance ${round1(d)} < 25`)
    }
  }
  const range = computeAxisRange(spec.questions)
  const spans = SOLO_AXES.map(axis => range[axis].max - range[axis].min)
  if (Math.max(...spans) - Math.min(...spans) > 4) issues.push(`axis spans differ by more than 4: ${SOLO_AXES.map((a, i) => `${a}=${spans[i]}`).join(', ')}`)
  for (const axis of SOLO_AXES) if (spec.questions.filter(q => q.primaryAxes.includes(axis)).length < 3) issues.push(`${axis} is primary in fewer than 3 questions`)
  for (const q of spec.questions) {
    if (q.primaryAxes.length < 1 || q.primaryAxes.length > 2) issues.push(`${q.questionId}: primaryAxes must have 1~2 axes`)
    for (const axis of SOLO_AXES) {
      const values = q.answers.map(a => a.scores[axis])
      if (q.primaryAxes.includes(axis) && !(values.includes(0) && values.includes(3))) issues.push(`${q.questionId}: primary ${axis} needs both 0 and 3`)
      if (!q.primaryAxes.includes(axis) && values.some(v => v > 1)) issues.push(`${q.questionId}: non-primary ${axis} exceeds 1`)
    }
  }
  return issues
}

export function parseSoloInput(input: unknown): { gender: SoloGender; answers: number[] } {
  const body = input as { gender?: unknown; answers?: unknown } | null
  if (!body || (body.gender !== 'female' && body.gender !== 'male')) throw new Error('이름을 받을 성별을 선택해주세요.')
  if (!Array.isArray(body.answers) || body.answers.length !== SOLO_QUESTION_COUNT || body.answers.some(a => !isInt(a, 0, 3))) throw new Error('여덟 문항의 답변을 모두 선택해주세요.')
  return { gender: body.gender, answers: [...body.answers] }
}

export function normalizedScores(spec: SoloSpec, answers: number[]): AxisVector {
  return Object.fromEntries(SOLO_AXES.map(axis => {
    const raw = answers.reduce((s, a, i) => s + spec.questions[i].answers[a].scores[axis], 0)
    const { min, max } = spec.axisRange[axis]
    return [axis, round1((raw - min) / (max - min) * 100)]
  })) as AxisVector
}

/** Nearest character by Euclidean distance; near-ties fall back to the primary axis, then the fixed order. */
export function rankCandidates(spec: SoloSpec, gender: SoloGender, scores: AxisVector) {
  const order = spec.tieBreak.order
  const ranked = spec.characters.filter(c => c.gender === gender)
    .map(c => ({ character: c, distance: distance(scores, c.vector), axisGap: Math.abs(scores[c.primaryAxis] - c.vector[c.primaryAxis]) }))
    .sort((a, b) => a.distance - b.distance)
  const [first, second] = ranked
  const tied = second.distance - first.distance <= spec.tieBreak.epsilon
  if (tied && (second.axisGap < first.axisGap || (second.axisGap === first.axisGap && order.indexOf(second.character.typeId) < order.indexOf(first.character.typeId)))) {
    ranked[0] = second
    ranked[1] = first
  }
  return { ranked, tied }
}

export function calculateSoloResult(spec: SoloSpec, input: unknown) {
  const { gender, answers } = parseSoloInput(input)
  const scores = normalizedScores(spec, answers)
  const c = rankCandidates(spec, gender, scores).ranked[0].character
  const byId = new Map(spec.characters.map(x => [x.typeId, x]))
  return {
    version: spec.version, type: c.typeId, name: c.name, scores,
    oneLiner: c.oneLiner, keywords: c.keywords, title: c.title, description: c.description,
    strength: c.strength, weakness: c.weakness, tip: c.tip, shareText: c.shareText,
    best: { type: c.best, name: byId.get(c.best)!.name, reason: c.bestReason },
    danger: { type: c.danger, name: byId.get(c.danger)!.name, reason: c.dangerReason },
  }
}

/** Exhaustive 4^8 enumeration per gender, treating every answer combination equally. */
export function simulate(spec: SoloSpec, gender: SoloGender) {
  const total = 4 ** SOLO_QUESTION_COUNT
  const counts: Record<string, number> = Object.fromEntries(spec.characters.filter(c => c.gender === gender).map(c => [c.typeId, 0]))
  const byAnswer = spec.questions.map(() => [0, 1, 2, 3].map(() => ({ ...counts })))
  let ties = 0
  const answers = new Array<number>(SOLO_QUESTION_COUNT).fill(0)
  for (let n = 0; n < total; n++) {
    for (let i = 0, x = n; i < SOLO_QUESTION_COUNT; i++, x >>= 2) answers[i] = x & 3
    const { ranked, tied } = rankCandidates(spec, gender, normalizedScores(spec, answers))
    const id = ranked[0].character.typeId
    counts[id]++
    if (tied) ties++
    answers.forEach((a, q) => byAnswer[q][a][id]++)
  }
  const perAnswer = total / 4
  const dominance = byAnswer.flatMap((answerCounts, q) => answerCounts.map((c, a) => {
    const [typeId, count] = Object.entries(c).sort((x, y) => y[1] - x[1])[0]
    return { questionId: spec.questions[q].questionId, answer: spec.questions[q].answers[a].id, typeId, share: count / perAnswer }
  })).sort((a, b) => b.share - a.share)
  return { total, counts, shares: Object.fromEntries(Object.entries(counts).map(([id, c]) => [id, c / total])), tieRate: ties / total, dominance }
}

export const SOLO_CRITERIA = { minShare: 0.07, maxShare: 0.25, maxTieRate: 0.05, maxDominance: 0.5 }

export function distributionIssues(spec: SoloSpec, gender: SoloGender, result = simulate(spec, gender)): string[] {
  const name = (id: string) => spec.characters.find(c => c.typeId === id)!.name
  const pct = (n: number) => `${round1(n * 100)}%`
  const issues: string[] = []
  for (const [id, share] of Object.entries(result.shares)) {
    if (share < SOLO_CRITERIA.minShare) issues.push(`${gender} ${name(id)} ${pct(share)} < ${pct(SOLO_CRITERIA.minShare)}`)
    if (share > SOLO_CRITERIA.maxShare) issues.push(`${gender} ${name(id)} ${pct(share)} > ${pct(SOLO_CRITERIA.maxShare)}`)
  }
  if (result.tieRate > SOLO_CRITERIA.maxTieRate) issues.push(`${gender} tie rate ${pct(result.tieRate)} > ${pct(SOLO_CRITERIA.maxTieRate)}`)
  const top = result.dominance[0]
  if (top.share > SOLO_CRITERIA.maxDominance) issues.push(`${gender} ${top.questionId}=${top.answer} gives ${name(top.typeId)} ${pct(top.share)} > ${pct(SOLO_CRITERIA.maxDominance)}`)
  return issues
}

/** Browser copy only: no character vectors or answer scores, so the page cannot be steered by reading the rubric. */
export function publicContent(spec: SoloSpec) {
  return {
    version: spec.version,
    questions: spec.questions.map(q => ({ id: q.questionId, scene: q.scene, sceneLine: q.sceneLine ?? '', question: q.question, answers: q.answers.map(a => ({ text: a.text, emoji: a.emoji })) })),
    characters: Object.fromEntries(spec.characters.map(c => [c.typeId, {
      name: c.name, gender: c.gender, oneLiner: c.oneLiner, keywords: c.keywords, title: c.title, description: c.description,
      strength: c.strength, weakness: c.weakness, tip: c.tip, shareText: c.shareText,
      best: c.best, bestReason: c.bestReason, danger: c.danger, dangerReason: c.dangerReason,
    }])),
    copy: spec.copy,
  }
}

export function publicContentScript(spec: SoloSpec) {
  // Escape "<" so copy can never close the script element it is embedded in.
  return `// Generated by scripts/build-solo-nara-content.ts from data/solo-nara-spec.json. Do not edit.\nwindow.UMSHSoloNaraContent = ${JSON.stringify(publicContent(spec)).replace(/</g, '\u003c')};\n`
}
