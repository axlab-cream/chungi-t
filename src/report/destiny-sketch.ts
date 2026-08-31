import type { BirthInput, SajuAnalysis, SajuReportContext } from '../types/index.js'
import { ELEMENT_KO } from '../saju/analyzer-helpers.js'

const STYLE_PROMPTS: Record<string, string> = {
  '연필 스케치': 'soft graphite pencil sketch, warm paper texture, delicate line weight, subtle shading',
  '잉크 라인': 'clean black ink line drawing, editorial sketch, confident contour lines, minimal shading',
  '수채 스케치': 'pencil and light watercolor sketch, soft muted color wash, handmade paper texture',
  '무드보드': 'romantic character moodboard sketch, four small vignette panels, pencil notes replaced by visual symbols only',
}

function partnerGenderPhrase(birth: BirthInput, context: SajuReportContext): string {
  const orientation = context.orientation ?? ''
  if (orientation.includes('동성')) return birth.gender === 'female' ? 'an adult woman' : 'an adult man'
  if (orientation.includes('이성')) return birth.gender === 'female' ? 'an adult man' : 'an adult woman'
  return 'an adult romantic partner'
}

function relationScene(context: SajuReportContext): string {
  if (context.work?.includes('직장')) return 'a quiet after-work meeting space near an office district'
  if (context.work?.includes('사업') || context.work?.includes('프리랜서')) return 'a calm project meeting or small studio setting'
  if (context.work?.includes('학생')) return 'a study lounge or campus-adjacent cafe'
  return 'a calm cafe or introduction gathering where conversation feels easy'
}

export function normalizeDestinySketchStyle(style: unknown): string {
  const value = typeof style === 'string' ? style.trim() : ''
  return STYLE_PROMPTS[value] ? value : '연필 스케치'
}

export function buildDestinyPartnerSketchPrompt(
  analysis: SajuAnalysis,
  birth: BirthInput,
  context: SajuReportContext,
  style: string,
): string {
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : ELEMENT_KO[analysis.weakElement]
  const dominant = ELEMENT_KO[analysis.dominantElement]
  const weak = ELEMENT_KO[analysis.weakElement]
  const tenGods = analysis.tenGods.slice(0, 3).join(', ') || 'balanced relational signs'
  const person = partnerGenderPhrase(birth, context)
  const scene = relationScene(context)
  const stylePrompt = STYLE_PROMPTS[normalizeDestinySketchStyle(style)]
  const relationship = context.relationship ?? 'current relationship status not specified'

  return [
    `Create a non-photorealistic symbolic portrait of ${person} as the likely romantic partner atmosphere for a Korean fortune report.`,
    `Style: ${stylePrompt}.`,
    `The image must feel like a sketch concept, not a real-person prediction. No celebrity resemblance, no identifiable real person, no text, no logos, no watermark.`,
    `Visual cues: steady eyes, calm confidence, clean but natural outfit, a person who feels stable rather than flashy, warm distance, mature adult presence.`,
    `Scene: ${scene}.`,
    `Fortune context to translate into mood only: useful/supporting energy is ${useful}, dominant user energy is ${dominant}, weak area needing support is ${weak}, relationship state is ${relationship}, key ten-god signals are ${tenGods}.`,
    'Show the person in a quiet three-quarter view with soft atmospheric background symbols for timing, conversation, and responsibility. Keep the face generalized and illustrative.',
  ].join('\n')
}

export function buildDestinyPartnerSketchDescription(
  analysis: SajuAnalysis,
  context: SajuReportContext,
): string {
  const useful = analysis.usefulGod ? ELEMENT_KO[analysis.usefulGod] : ELEMENT_KO[analysis.weakElement]
  const relationship = context.relationship ?? '관계 상태'
  return `${relationship} 기준에서 오래 남는 상대의 분위기를 ${useful} 기운 중심으로 스케치합니다. 실제 인물 예측이 아니라, 관계에서 안정감을 주는 결을 이미지로 보여주는 옵션입니다.`
}
