import type { Element, EarthlyBranch, HeavenlyStem, Pillar } from '../types/index.js'

export const STEM_ELEMENT: Record<HeavenlyStem, Element> = {
  '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth',
  '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water',
}

export const BRANCH_ELEMENT: Record<EarthlyBranch, Element> = {
  '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood', '辰': 'earth',
  '巳': 'fire', '午': 'fire', '未': 'earth', '申': 'metal', '酉': 'metal',
  '戌': 'earth', '亥': 'water',
}

export const ELEMENT_KO: Record<Element, string> = {
  wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)',
}

export function createPillarFromStemBranch(stem: HeavenlyStem, branch: EarthlyBranch): Pillar {
  return {
    stem,
    branch,
    stemElement: STEM_ELEMENT[stem],
    branchElement: BRANCH_ELEMENT[branch],
  }
}

export const DAY_MASTER_ADVICE: Record<HeavenlyStem, string> = {
  '甲': '곧은 나무처럼 방향을 정하고 한 걸음씩 나아가세요.',
  '乙': '부드럽게 적응하되, 자신의 뿌리를 잃지 마세요.',
  '丙': '태양처럼 밝게 빛내세요. 쉬는 시간도 잊지 마세요.',
  '丁': '촛불처럼 따뜻한 빛을 나누세요.',
  '戊': '큰 산처럼 든든히 서되, 변화를 받아들이세요.',
  '己': '비옥한 땅처럼 실용적이고 세심하게 돌보세요.',
  '庚': '단단한 원칙을 지키되, 부드러운 면도 기르세요.',
  '辛': '보석처럼 세련된 품격을 유지하세요.',
  '壬': '흐르는 지혜를 믿으세요. 깊어지는 시간도 필요합니다.',
  '癸': '섬세한 직관을 따르세요. 작은 신호가 큰 답이 될 수 있습니다.',
}

export const STEM_KO: Record<HeavenlyStem, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
}

export const BRANCH_KO: Record<EarthlyBranch, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
}

export const HIDDEN_STEMS: Record<EarthlyBranch, Array<{ stem: HeavenlyStem; weight: number }>> = {
  '子': [{ stem: '癸', weight: 1 }],
  '丑': [{ stem: '己', weight: 0.6 }, { stem: '癸', weight: 0.3 }, { stem: '辛', weight: 0.1 }],
  '寅': [{ stem: '甲', weight: 0.6 }, { stem: '丙', weight: 0.3 }, { stem: '戊', weight: 0.1 }],
  '卯': [{ stem: '乙', weight: 1 }],
  '辰': [{ stem: '戊', weight: 0.6 }, { stem: '乙', weight: 0.3 }, { stem: '癸', weight: 0.1 }],
  '巳': [{ stem: '丙', weight: 0.6 }, { stem: '戊', weight: 0.3 }, { stem: '庚', weight: 0.1 }],
  '午': [{ stem: '丁', weight: 0.7 }, { stem: '己', weight: 0.3 }],
  '未': [{ stem: '己', weight: 0.6 }, { stem: '丁', weight: 0.3 }, { stem: '乙', weight: 0.1 }],
  '申': [{ stem: '庚', weight: 0.6 }, { stem: '壬', weight: 0.3 }, { stem: '戊', weight: 0.1 }],
  '酉': [{ stem: '辛', weight: 1 }],
  '戌': [{ stem: '戊', weight: 0.6 }, { stem: '辛', weight: 0.3 }, { stem: '丁', weight: 0.1 }],
  '亥': [{ stem: '壬', weight: 0.7 }, { stem: '甲', weight: 0.3 }],
}

export const STEM_COMBINATION_PAIRS: Array<[HeavenlyStem, HeavenlyStem, string]> = [
  ['甲', '己', '甲己合土: 원칙과 현실이 묶입니다.'],
  ['乙', '庚', '乙庚合金: 부드러움과 기준이 만나 판단이 선명해집니다.'],
  ['丙', '辛', '丙辛合水: 드러남과 섬세함이 만나 마음의 흐름이 깊어집니다.'],
  ['丁', '壬', '丁壬合木: 작은 불과 큰 물이 만나 새 방향을 만듭니다.'],
  ['戊', '癸', '戊癸合火: 현실과 직관이 만나 표현 욕구가 살아납니다.'],
]

export const BRANCH_COMBINATION_PAIRS: Array<[EarthlyBranch, EarthlyBranch, string]> = [
  ['子', '丑', '子丑合土: 감정과 현실이 묶이며 생활 기반 이슈가 드러납니다.'],
  ['寅', '亥', '寅亥合木: 시작과 흐름이 만나 성장 욕구가 강해집니다.'],
  ['卯', '戌', '卯戌合火: 관계와 책임이 만나 감정 표현이 커집니다.'],
  ['辰', '酉', '辰酉合金: 정리와 기준, 계약의 기운이 살아납니다.'],
  ['巳', '申', '巳申合水: 압박 속에서 이동과 생각이 많아집니다.'],
  ['午', '未', '午未合土: 열정이 생활과 책임으로 굳어집니다.'],
]

export const BRANCH_CLASH_PAIRS: Array<[EarthlyBranch, EarthlyBranch, string]> = [
  ['子', '午', '子午沖: 감정과 표현이 부딪혀 관계·생활 리듬이 흔들립니다.'],
  ['丑', '未', '丑未沖: 익숙한 기반과 새 책임이 부딪힙니다.'],
  ['寅', '申', '寅申沖: 시작과 정리가 충돌해 이동·전환 압력이 커집니다.'],
  ['卯', '酉', '卯酉沖: 관계와 기준이 부딪혀 말과 거리감 문제가 드러납니다.'],
  ['辰', '戌', '辰戌沖: 묵은 책임과 새 기준이 충돌합니다.'],
  ['巳', '亥', '巳亥沖: 숨은 감정과 드러난 압박이 부딪혀 큰 방향 전환이 옵니다.'],
]

export const BRANCH_BREAK_PAIRS: Array<[EarthlyBranch, EarthlyBranch, string]> = [
  ['子', '酉', '子酉破: 말하지 않은 감정이 기준을 흔듭니다.'],
  ['丑', '辰', '丑辰破: 생활 기반에서 작은 균열이 생깁니다.'],
  ['寅', '亥', '寅亥破: 시작과 흐름이 엇갈려 계획이 자주 바뀝니다.'],
  ['卯', '午', '卯午破: 관계 온도와 표현 방식이 어긋납니다.'],
  ['巳', '申', '巳申破: 압박과 계산이 부딪혀 피로가 쌓입니다.'],
  ['未', '戌', '未戌破: 책임과 고집이 엉켜 풀어야 할 일이 생깁니다.'],
]

export const BRANCH_HARM_PAIRS: Array<[EarthlyBranch, EarthlyBranch, string]> = [
  ['子', '未', '子未害: 감정과 책임이 서로를 갉아먹기 쉽습니다.'],
  ['丑', '午', '丑午害: 생활 안정과 감정 표현이 어긋납니다.'],
  ['寅', '巳', '寅巳害: 빠른 시작이 압박으로 바뀔 수 있습니다.'],
  ['卯', '辰', '卯辰害: 관계의 기대와 현실 기준이 어긋납니다.'],
  ['申', '亥', '申亥害: 판단과 흐름이 서로 의심을 만듭니다.'],
  ['酉', '戌', '酉戌害: 기준과 책임이 과해져 말이 차가워질 수 있습니다.'],
]
