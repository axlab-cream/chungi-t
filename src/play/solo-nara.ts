// 솔로나라 v3: "사람들 사이에서, 나는 어떤 패를 쥐고 있을까?"
// 3개 축(주도/관망, 드러냄/감춤, 감정/계산)의 다수결로 8개 유형 중 하나를 고른다.
// 엔터테인먼트용 캐릭터 분류이며 심리 진단이 아니다.
export const SOLO_QUESTION_COUNT = 10
export const SOLO_TYPE_COUNT = 8
export const SOLO_FORTUNE_URL = 'https://umsh.kr/love/this-year/01-step-1-story/index.html'

export type SoloPole = 'a' | 'b'
export interface SoloAxisDef { id: string; a: string; b: string }
export interface SoloAnswer { id: string; text: string; pick: Record<string, SoloPole> }
export interface SoloQuestion { questionId: string; scene: string; sceneLine?: string; question: string; axes: string[]; answers: SoloAnswer[] }
export interface SoloMatch { type: string; reason: string }
export interface SoloType {
  typeId: string
  /** 축 순서대로 a/b. 예: 'aab' = 주도·드러냄·계산 */
  code: string
  name: string
  hook: string
  surface: string
  weapon: { name: string; text: string }
  weaponWhen: string
  strengths: string[]
  weaknesses: string[]
  weak: SoloMatch
  danger: SoloMatch
  move: string
  shareText: string
}
export interface SoloSpec {
  version: string
  axes: SoloAxisDef[]
  /** 축 문항 수가 짝수라 동점이 날 수 있을 때 이 문항에서 고른 쪽을 따른다. */
  tieBreak: Record<string, string>
  types: SoloType[]
  questions: SoloQuestion[]
  copy: Record<string, unknown>
}
export type SoloScores = Record<string, number>

const isPole = (v: unknown): v is SoloPole => v === 'a' || v === 'b'

/** Structural errors make the spec unusable; the engine refuses to run on them. */
export function structureErrors(spec: SoloSpec): string[] {
  const errors: string[] = []
  const axes = Array.isArray(spec?.axes) ? spec.axes : []
  const types = Array.isArray(spec?.types) ? spec.types : []
  const questions = Array.isArray(spec?.questions) ? spec.questions : []
  const axisIds = axes.map(a => a.id)
  if (axes.length !== 3 || new Set(axisIds).size !== 3) errors.push('axes must be 3 unique axes')
  if (types.length !== SOLO_TYPE_COUNT) errors.push(`types must be ${SOLO_TYPE_COUNT} (got ${types.length})`)
  if (questions.length !== SOLO_QUESTION_COUNT) errors.push(`questions must be ${SOLO_QUESTION_COUNT} (got ${questions.length})`)
  const ids = new Set<string>(), codes = new Set<string>()
  for (const t of types) {
    if (!/^[a-z]{2,20}$/.test(t.typeId || '') || ids.has(t.typeId)) errors.push(`duplicate or invalid typeId: ${t.typeId}`)
    ids.add(t.typeId)
    if (!/^[ab]{3}$/.test(t.code || '') || codes.has(t.code)) errors.push(`${t.typeId}: code must be a unique 3-letter a/b combination`)
    codes.add(t.code)
    if (!Array.isArray(t.strengths) || !t.strengths.length || !Array.isArray(t.weaknesses) || !t.weaknesses.length) errors.push(`${t.typeId}: needs strengths and weaknesses`)
  }
  for (const t of types) for (const key of ['weak', 'danger'] as const) {
    if (!ids.has(t[key]?.type)) errors.push(`${t.typeId}.${key} points to unknown ${t[key]?.type}`)
    if (t[key]?.type === t.typeId) errors.push(`${t.typeId}.${key} points to itself`)
  }
  const qids = new Set<string>()
  for (const q of questions) {
    if (!q.questionId || qids.has(q.questionId)) errors.push(`duplicate or empty questionId: ${q.questionId}`)
    qids.add(q.questionId)
    if (!Array.isArray(q.axes) || q.axes.length !== 2 || q.axes.some(a => !axisIds.includes(a)) || q.axes[0] === q.axes[1]) { errors.push(`${q.questionId}: axes must be 2 known axes`); continue }
    if (!Array.isArray(q.answers) || q.answers.length !== 4) { errors.push(`${q.questionId}: needs 4 answers`); continue }
    const combos = new Set<string>()
    for (const a of q.answers) {
      const keys = Object.keys(a.pick || {})
      if (keys.length !== 2 || !q.axes.every(x => isPole(a.pick[x]))) errors.push(`${q.questionId}.${a.id}: pick must set exactly the question axes`)
      combos.add(q.axes.map(x => a.pick?.[x]).join(''))
    }
    if (combos.size !== 4) errors.push(`${q.questionId}: the 4 answers must cover the 4 pole combinations`)
  }
  for (const axis of axisIds) {
    const touching = questions.filter(q => q.axes?.includes(axis))
    if (touching.length < 3) errors.push(`${axis}: asked in fewer than 3 questions`)
    if (touching.length % 2 === 0) {
      const tb = spec.tieBreak?.[axis]
      if (!tb || !touching.some(q => q.questionId === tb)) errors.push(`${axis}: even question count needs tieBreak pointing to one of its questions`)
    }
  }
  return errors
}

export function parseSoloInput(input: unknown): { answers: number[] } {
  const answers = (input as { answers?: unknown })?.answers
  if (!Array.isArray(answers) || answers.length !== SOLO_QUESTION_COUNT || !answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3)) throw new Error('invalid answers')
  return { answers: answers as number[] }
}

/** 축마다 'a' 쪽을 고른 비율(0~100)과 최종 극. */
export function axisResult(spec: SoloSpec, answers: number[]) {
  const scores: SoloScores = {}, poles: Record<string, SoloPole> = {}
  for (const axis of spec.axes) {
    let a = 0, n = 0
    spec.questions.forEach((q, i) => { if (q.axes.includes(axis.id)) { n++; if (q.answers[answers[i]].pick[axis.id] === 'a') a++ } })
    scores[axis.id] = Math.round(a / n * 100)
    if (a * 2 !== n) poles[axis.id] = a * 2 > n ? 'a' : 'b'
    else {
      const i = spec.questions.findIndex(q => q.questionId === spec.tieBreak[axis.id])
      poles[axis.id] = spec.questions[i].answers[answers[i]].pick[axis.id]
    }
  }
  return { scores, poles }
}

export function calculateSoloResult(spec: SoloSpec, input: unknown) {
  const { answers } = parseSoloInput(input)
  const { scores, poles } = axisResult(spec, answers)
  const code = spec.axes.map(a => poles[a.id]).join('')
  const t = spec.types.find(x => x.code === code)!
  return { version: spec.version, type: t.typeId, code, scores }
}

/** 4^10 답 조합 전부를 돌려 유형별 비율을 센다(답을 무작위로 고른다고 가정). */
export function simulate(spec: SoloSpec) {
  const counts: Record<string, number> = Object.fromEntries(spec.types.map(t => [t.typeId, 0]))
  const answers = new Array(SOLO_QUESTION_COUNT).fill(0)
  const total = 4 ** SOLO_QUESTION_COUNT
  for (let k = 0; k < total; k++) {
    let x = k
    for (let i = 0; i < SOLO_QUESTION_COUNT; i++) { answers[i] = x & 3; x >>= 2 }
    counts[calculateSoloResult(spec, { answers }).type]++
  }
  return { total, counts, shares: Object.fromEntries(Object.entries(counts).map(([id, n]) => [id, n / total])) }
}

/** Browser copy only: no answer picks or type codes, so the page cannot be steered by reading the rubric. */
export function publicContent(spec: SoloSpec) {
  return {
    version: spec.version,
    axes: spec.axes,
    questions: spec.questions.map(q => ({ id: q.questionId, scene: q.scene, sceneLine: q.sceneLine ?? '', question: q.question, answers: q.answers.map(a => ({ text: a.text })) })),
    types: Object.fromEntries(spec.types.map(t => [t.typeId, {
      name: t.name, hook: t.hook, surface: t.surface, weapon: t.weapon, weaponWhen: t.weaponWhen,
      strengths: t.strengths, weaknesses: t.weaknesses, weak: t.weak, danger: t.danger, move: t.move, shareText: t.shareText,
    }])),
    copy: spec.copy,
  }
}

export function publicContentScript(spec: SoloSpec) {
  // Escape "<" so copy can never close the script element it is embedded in.
  return `// Generated by scripts/build-solo-nara-content.ts from data/solo-nara-spec.json. Do not edit.\nwindow.UMSHSoloNaraContent = ${JSON.stringify(publicContent(spec)).replace(/</g, '\\u003c')};\n`
}
