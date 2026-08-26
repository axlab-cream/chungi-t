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
