import { buildCorpusIndex } from '../rag/retriever.js'
import type { CorpusSnapshot, RagChunk } from '../types/index.js'

export const HOME_READING_SECTIONS = [
  'home-fit-overall', 'terrain-support', 'external-flow', 'light-air-noise',
  'building-unit', 'entrance-flow', 'sleep-recovery', 'remote-focus',
  'money-living', 'relationship-cohabitation', 'saju-house-ohaeng', 'reality-action',
] as const

const HOME_SECTION_CONTRACTS: Record<string, string> = {
  'home-fit-overall': '질문: 전체 판정은 무엇인가. 근거: 입력 커버리지, 목적, 핵심 강점/마찰. 시각화: 8축 점수판. 쓰지 말 것: 세부 처방을 길게 반복.',
  'terrain-support': '질문: 터가 나를 받치나 밀어내나. 근거: 지형 API의 터 유사도·터 타입·경사 흐름을 생활 언어로 번역. 쓰지 말 것: 내부 지형 필드명, 결손 안내, 실내 배치.',
  'external-flow': '질문: 물길·도로·바람 중 무엇이 치고 들어오나. 근거: MEASURED 수계·도로·풍향·소음 또는 UNKNOWN. 쓰지 말 것: 개인 사주.',
  'light-air-noise': '질문: 빛은 약인가 알람 폭탄인가. 근거: DERIVED/USER_REPORTED 향·일조·환기·소음. 쓰지 말 것: 현관 수납.',
  'building-unit': '질문: 건물과 세대의 기본 체력은 어떤가. 근거: 건물·층·준공·평면·공용시설 데이터와 사용자 체감. 쓰지 말 것: 결손 데이터 안내와 생활 습관 단정.',
  'entrance-flow': '질문: 들어오고 나갈 때 기운이 새거나 막히는가. 근거: USER_REPORTED 현관 흐름, 동작 마찰. 쓰지 말 것: 수면 원인 단정.',
  'sleep-recovery': '질문: 침실은 쉬는 방인가 야근 2차전인가. 근거: USER_REPORTED 수면 체감, UNKNOWN 빛·온도·야간 각성. 쓰지 말 것: 현관·책상·살림 순회.',
  'remote-focus': '질문: 책상은 시작·중단·마감을 돕는 자리인가. 근거: USER_REPORTED 책상 위치, 업무 시작·종료 장면. 쓰지 말 것: 침실 조언과 원국 소개.',
  'money-living': '질문: 돈이 새는가, 살림 동선이 새는가. 근거: USER_REPORTED 수납·소비 마찰, UNKNOWN 실제 지출. 쓰지 말 것: 재산 손실 예언.',
  'relationship-cohabitation': '질문: 같이 쓰는 공간의 경계와 케미는 어떤가. 근거: USER_REPORTED 공용/사적 공간, UNKNOWN 동거 상태. 쓰지 말 것: 동거인·가족 문제 추정.',
  'saju-house-ohaeng': '질문: 내 사주 상징과 집·목적의 결은 어떻게 만나는가. 근거: DERIVED 명식·오행·연간 흐름, TRADITIONAL 상징. 쓰지 말 것: 물건 구매 보장.',
  'reality-action': '질문: 그래서 무엇을 하면 되는가. 근거: 앞 장 우선순위, 비용·난이도·되돌림·계약·통근·예산. 쓰지 말 것: 새 풍수 분석과 새 사실.',
}

/** Dedicated section knowledge must not be displaced by shared room keywords. */
export function homeReadingCorpus(sectionId: string, corpusSnapshot?: CorpusSnapshot): RagChunk[] {
  const index = HOME_READING_SECTIONS.findIndex(id => id === sectionId)
  if (index < 0) throw new Error('UNKNOWN_HOME_READING_SECTION')
  const id = `hfit-${String(index + 1).padStart(3, '0')}`
  const chunks = buildCorpusIndex(corpusSnapshot).filter(chunk => chunk.id === id && chunk.domain === 'home_fit_service')
  if (chunks.length !== 1) throw new Error('HOME_READING_CORPUS_MISSING')
  return chunks
}

/** Home uses a narrative contract, not the generic input/astrology recap template. */
export function homeReadingInstruction(sectionId: string): string {
  if (!HOME_READING_SECTIONS.some(id => id === sectionId)) throw new Error('UNKNOWN_HOME_READING_SECTION')
  return [
    '현재 제목에 대한 결론이나 우선순위부터 답하세요. 항목에 맞는 의미 단락으로 나누고 근거가 적으면 반복으로 분량을 늘리지 마세요.',
    '모든 단락에 25자 안팎의 구체적인 [소제목]을 붙이세요. hook은 본문 요약 한 문장으로 쓰고 제목 표식을 넣지 마세요.',
    '현재 주제의 생활 장면과 판단 이유, 유지할 강점 또는 우선 행동을 설명하세요. 위기·문제·해법을 모든 항목에 강제하지 마세요.',
    '판단과 관찰 근거, 관련 공간의 생활 장면, 다음 선택 기준을 담되 모든 항목에 같은 문장 순서를 반복하지 마세요.',
    '근거 라벨은 고객용 한국어로 쓰세요: 터 유사도, 측정값, 사용자 체감, 계산값, 전통 상징. 원문 라벨과 내부 지형 필드명, 결손 안내 표현은 노출하지 마세요.',
    '행동에는 확인할 대상을 붙이세요. 비용·기간·난이도 점수는 실제 입력이나 검증된 근거 없이 만들지 마세요.',
    `section_contract: ${HOME_SECTION_CONTRACTS[sectionId]}`,
    '입력→명리 소개의 공통 구조보다 이 집 풍수 전용 규칙을 우선합니다. 근거는 이유 속에 짧게 쓰고, 등록값을 다시 읽어주지 마세요.',
    sectionId === 'home-fit-overall' ? '전체 입력과 배치 요약은 이 항목에서만 한 문단 이내로 합니다.' : '주소·집 종류·거주 기간·고민을 도입에서 요약하지 마세요. 확인된 입력/입력하셨죠/현재 항목이라는 제작 문구를 쓰지 마세요.',
    sectionId === 'saju-house-ohaeng' ? '일간·명식·연간 흐름을 설명하는 전용 항목입니다. 한자는 쓰지 말고 한글 용어와 쉬운 뜻으로만 설명하세요. 지형 데이터 상태나 결손은 언급하지 말고, 확인된 사주 계산과 집의 생활 목적만 연결하세요. 전체 용신이 미확인일 때 개인 보완 오행을 정하지 마세요.' : '일간의 정의나 정화는 작은 불 같은 원국 소개를 다시 하지 마세요. 전통적 근거는 현재 판단에 필요한 경우만 이유 한 문장으로 연결하세요.',
    '모든 공간 비교는 1번 전용. 2번은 터, 3번은 물길·도로·바람, 4번은 빛·공기·소음, 5번은 건물/세대, 6번은 현관, 7번은 침실, 8번은 책상, 9번은 살림/돈, 10번은 관계, 11번은 사주 오행, 12번은 실행 순서를 다룹니다.',
    '다른 항목과 같은 장면·비유·결론을 되풀이하지 마세요. 사례는 예를 들어 …라면 형태로 실제 고객 경험과 구분하세요.',
    sectionId === 'terrain-support' ? '터 항목은 “터 유사도”를 기준으로 말하세요. API 유사도 점수나 터 타입이 있으면 그대로 쓰고, 없으면 숫자나 비슷한 터의 생활 패턴으로 채우지 말고 사용자가 직접 확인할 이동 장면과 관찰 기준만 안내하세요.' : '없는 점수·방위·사건·지역 사례를 만들지 마세요. 확인된 사실에는 분명히 답하고, 모르는 조건은 필요한 확인과 그에 따른 선택으로 연결하세요.',
    '몇 분 안에 몸이 풀리면 집이 맞다, 며칠 좋아지면 궁합이 좋다처럼 임의 시간·횟수를 적합성 판정 기준으로 만들지 마세요. 관찰은 원인 후보를 좁히는 용도로만 쓰세요.',
  ].join('\n')
}

/** Narrow, testable editorial gates. Not a guarantee of semantic quality. */
export function reviewHomeNarrative(text: string, sectionId: string): string[] {
  const issues: string[] = []
  if (sectionId !== 'home-fit-overall' && /확인된 입력|입력하셨|현재 입력|현재 항목|이 항목에서는/.test(text)) issues.push('입력 재소개나 항목 안내를 삭제하고 현재 주제의 생활 장면과 결론으로 바로 답하세요.')
  if (sectionId !== 'saju-house-ohaeng' && /일간\s*[（(은이가:]|태어난 날의 천간/.test(text)) issues.push('일간 정의는 11번 전용입니다. 명식 소개 대신 현재 주제의 판단 이유를 설명하세요.')
  const blocks = text.trim().split(/\n\s*\n/)
  if (blocks.some(block => !/^\[[^\]\n]+\]/.test(block.trim()))) issues.push('각 문단에 그 내용이 드러나는 [소제목]을 붙이세요.')
  if (/\[(?:주요 포인트|확인된 (?:입력|조건|정보)|이 항목의 짧은 답|다음 행동)\]/.test(text)) issues.push('제작용 제목 대신 실제 문단의 핵심을 짧게 제목으로 쓰세요.')
  if (/\b(?:MEASURED|USER_REPORTED|DERIVED|TRADITIONAL|UNKNOWN)\b/.test(text)) issues.push('내부 근거 라벨 대신 터 유사도·측정값·사용자 체감·계산값·전통 상징처럼 고객용 라벨을 쓰세요.')
  if (/측정\s*전|자료\s*(?:없|미확인|부족)|DEM|고도|사면|능선|골짜기/.test(text)) issues.push('고객 본문에는 데이터 결손이나 DEM·사면 같은 내부 지형 항목을 직접 노출하지 마세요. 터 유사도와 생활 패턴으로 번역하세요.')
  if (!/(터 유사도|측정값|사용자 체감|계산값|전통 상징)/.test(text)) issues.push('근거의 성격을 고객용 라벨로 최소 1회 밝혀 주세요.')
  // Headings and bare imperatives are not evidence of an observable action.
  const prose = text.replace(/^\s*\[[^\]\n]+\]/gm, '')
  const hasTarget = /관찰\s*(?:지표|대상)(?:은|는|:)[^.!?\n]{4,}/.test(prose)
    || /(?:[가-힣]{2,}[을를]|[가-힣]+는지|[가-힣]+인지)\s*(?:직접\s*|먼저\s*|다시\s*)?(?:확인|관찰|비교|기록|살펴)/.test(prose)
  if (!hasTarget) issues.push('행동에서 실제 확인하거나 관찰할 대상을 밝혀 주세요.')
  const rooms = ['현관','침실','책상','창밖'].filter(word => text.includes(word))
  if (sectionId !== 'home-fit-overall' && rooms.length >= 3) issues.push('전체 공간 순회는 1번 전용입니다. 현재 제목과 관련 없는 공간 설명을 빼세요.')
  if (/(?:풀리면|풀린다면|좋아지면|나아지면|가벼워지면)[^.\n]{0,40}(?:집[^.\n]{0,12}(?:맞|적합)|궁합|기본 결은 맞)/.test(text)) issues.push('짧은 체감 변화로 집 적합성이나 궁합을 판정하지 마세요. 관찰은 원인 후보를 좁히는 용도로만 쓰세요.')
  if (/\d+\s*(?:분|시간)\s*안에[^.\n]{0,50}(?:집[^.\n]{0,12}(?:맞|적합)|궁합|기본 결은 맞|판단)/.test(text)) issues.push('임의 시간 기준을 집 적합성 판정처럼 쓰지 마세요.')
  return issues
}
