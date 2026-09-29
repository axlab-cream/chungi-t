import type { SajuAnalysis } from '../types/index.js'

export const LOVE_TYPES = {
  spark: { name: '불꽃급랭형', line: '시작은 100°C, 식는 건 순식간.', detail: '강한 끌림에 마음이 빠르게 움직여요. 기대와 다른 모습을 발견하면 설렘도 빨리 줄어드는 편이에요.', tip: '처음의 이미지와 다른 점 하나를 발견해도, 새로운 매력 하나를 더 찾아보세요.' },
  arrow: { name: '직진몰입형', line: '마음이 켜지면, 오래 달리는 편.', detail: '좋아하는 마음을 행동으로 보여줘요. 설렘이 지나간 뒤에도 관계에 에너지를 쏟는 편이에요.', tip: '내 속도만큼 상대의 속도도 물어보세요. 서로 편한 연락 간격을 찾으면 좋아요.' },
  frost: { name: '선택냉정형', line: '시작은 신중하게, 판단은 선명하게.', detail: '쉽게 마음을 주지는 않지만, 내 기준과 맞는지는 빠르게 알아차려요. 부담스러운 속도에는 거리를 둘 수 있어요.', tip: '마음이 멀어졌다면 이유를 하나만 구체적으로 적어보세요. 낯섦과 불편함을 구분하는 데 도움이 돼요.' },
  deep: { name: '천천히깊게형', line: '천천히 데워져서, 깊고 오래.', detail: '첫눈의 불꽃보다 함께 쌓은 신뢰에 마음이 움직여요. 편안한 관계를 천천히 만들어가는 편이에요.', tip: '편안함이 호감이라면 작은 표현을 먼저 건네보세요. 상대는 아직 내 마음을 모를 수 있어요.' },
} as const

export function parseLoveInput(input: unknown): { answers: number[]; mbti: string | null } {
  const body = input as { answers?: unknown; mbti?: unknown } | null
  if (!body || !Array.isArray(body.answers) || body.answers.length !== 5 || body.answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) throw new Error('다섯 문항의 답변을 모두 선택해주세요.')
  if (body.mbti != null && (typeof body.mbti !== 'string' || !/^[EI][NS][TF][JP]$/.test(body.mbti))) throw new Error('MBTI를 다시 선택해주세요.')
  return { answers: [...body.answers], mbti: body.mbti ?? null }
}

/** Versioned entertainment rubric. MBTI and symbolic saju context never masquerade as measured probabilities. */
export function calculateLoveResult(input: unknown, saju: Pick<SajuAnalysis, 'dayMasterElement'> | null = null, birthTimeKnown = true) {
  const { answers: a, mbti } = parseLoveInput(input)
  const ignition = Math.round(([100, 75, 35, 10][a[0]] * 2 + [95, 65, 30, 15][a[1]] + [95, 70, 35, 10][a[4]]) / 4)
  const cooling = Math.round(([100, 60, 25, 5][a[2]] * 2 + [10, 25, 65, 95][a[1]] + [25, 15, 85, 45][a[3]]) / 4)
  const holding = Math.round(([15, 50, 80, 100][a[2]] + [20, 55, 90, 100][a[4]] * 2 + [35, 80, 25, 75][a[3]]) / 4)
  const type = ignition >= 55 ? (cooling >= 55 ? 'spark' : 'arrow') : (cooling >= 55 ? 'frost' : 'deep')
  const elementCopy = {
    wood: '나무는 자라는 힘의 상징이에요. 함께 새롭게 해보고 싶은 일을 대화의 시작으로 삼아보세요.',
    fire: '불은 드러내고 표현하는 힘의 상징이에요. 지금 느끼는 호감을 부담 없는 말로 전해보세요.',
    earth: '흙은 품고 지탱하는 힘의 상징이에요. 서로에게 편한 일상을 함께 찾아보세요.',
    metal: '쇠는 다듬고 구분하는 힘의 상징이에요. 중요한 것과 양보할 수 있는 것을 나눠보세요.',
    water: '물은 흐르고 살피는 힘의 상징이에요. 마음의 변화에 이름을 붙여 이야기해보세요.',
  }
  return {
    version: 'love-speed-v1', type, ...LOVE_TYPES[type], stats: { ignition, cooling, holding },
    mbtiNote: mbti ? `${mbti}로 선택했어요. ${mbti[0] === 'E' ? '마음을 말하며 정리하는 편인지' : '혼자 생각할 시간이 필요한 편인지'} 돌아보세요. MBTI는 점수에 영향을 주지 않아요.` : 'MBTI를 몰라도 괜찮아요. 다섯 답변으로 내 연애 속도를 살펴봤어요.',
    sajuNote: saju ? `내 사주 일간의 기운을 참고했어요. ${elementCopy[saju.dayMasterElement]}${birthTimeKnown ? '' : ' 출생 시간은 미상이며 일간만 참고했어요.'}` : '등록된 사주가 없어 이번에는 답변과 선택한 MBTI만 참고했어요.',
    sajuApplied: Boolean(saju),
  }
}
