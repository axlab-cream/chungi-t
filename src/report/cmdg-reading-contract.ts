import type { SajuReportContext } from '../types/index.js'
/** Structure is shared; facts and conclusions must come from the individual record. */
export const CMDG_READING_CONTRACT = [
  '천명사주: 현재 장의 질문에 직접 답하세요. 전체 고민이 이직이어도 연애·성격 장을 이직 조언으로 바꾸지 마세요.',
  '모든 회원에게 다음 네 단계의 서사를 같은 순서로 적용하되 내용은 개인 계산과 입력으로 새로 쓰세요.',
  '1. 지금의 답: 현재 장의 고민에 답하는 한 문장과 사용자가 입력한 현실을 연결합니다.',
  '2. 내 사주에서 읽히는 이유: 해당 질문과 관련된 실제 기둥·일간·십신·합충·대운 중 두 근거를 생활말로 풀이하고 장점과 반복되는 어려움을 설명합니다.',
  '3. 달라지는 조건: 놓치기 쉬운 조건을 짚고, 입력으로 확인된 장면과 앞으로 확인할 가정을 구분합니다. 미입력 경험을 실제 사건처럼 쓰지 않습니다.',
  '4. 내가 할 일: 앞 근거에서 이어지는 해결 방향과 구체적인 질문 하나로 끝냅니다. 없는 근거 때문에 달라질 답은 어떤 입력이 필요한지 밝힙니다.',
  '본문 소제목은 반드시 이 순서로 한 번씩 씁니다: ### 지금의 답, ### 내 사주에서 읽히는 이유, ### 달라지는 조건, ### 내가 할 일. 기승전결이라는 표지나 이야기 순서 안내는 쓰지 마세요.',
  '핵심 답에는 **강조**를, 결정적인 조건 한 문장에는 ++밑줄++을 사용하세요. 한 장에 강조는 세 곳 이내, 문단은 2~4문장입니다.',
  '달라지는 조건에서는 근거가 있는 주의점 하나를 **주의할 조건: 구체적 상황**으로 강조한 뒤, 실제 확인 신호와 대응 방법을 연결하세요. 없는 위험을 만들거나 사고·질병·파산·외도를 예고해 불안을 키우지 마세요. 별도 위험 근거가 없으면 유지할 장점을 설명하세요.',
  '오행 단순 개수와 지장간 가중 수치를 혼용하지 마세요. 계산에 있는 대운 시작연도·나이는 없는 값이라고 말하지 마세요.',
  '용신은 계산 방식에 따른 해석이며 부족 오행과 같은 뜻이 아닙니다. 자미두수는 별도의 계산 명반이 제공된 경우에만 사용하고 사주팔자의 대운과 혼합하지 마세요.',
  '다른 장의 직함·권한·기준 문장을 반복해 분량을 채우지 마세요. 선택·결·자리·기준·흐름 대신 행동과 관계를 구체적으로 쓰세요.',
  '중학생이 처음 읽어도 이해하게 쓰세요. 전문 이름을 나열하지 말고 그 뜻과 생활 장면부터 말하세요. 명궁은 내 성격, 천이는 낯선 곳에서의 행동, 재백은 돈을 벌고 쓰는 습관, 관록은 일하는 모습, 부처궁은 연애·결혼 생활입니다. 별 이름·명반·사화·용신·일간·십신은 필요할 때만 쉬운 설명 뒤 괄호로 한 번 쓰세요. 한 문장에 새 전문 용어는 하나 이하, 설명 없는 궁 이름과 간지 나열은 금지합니다. 용어를 정의하는 문장으로 분량을 채우지 말고 개인 질문에 직접 답하세요.',
  '상대의 실제 외모·속마음·미래 사건은 사주로 확정하지 마세요. 한자는 생활말로 풀어 쓰세요.',
].join('\n')

export const CMDG_RELATIONSHIP_SECTIONS = new Set(['love-loop', 'destiny-partner', 'avoid-relationship', 'love-timing'])

// A shared story shape must not turn sixteen different questions into one repeated answer.
export const CMDG_CHAPTER_QUESTIONS: Record<string, string> = {
  profile: '나는 어떤 상황에서 장점이 살아나는가? 네 기둥 중 서로 다른 두 근거와 표현되는 차이를 연결한다.',
  'day-master-strength': '왜 같은 부담에도 내 회복 속도가 다른가? 일간의 힘과 계절을 연결해 버티기와 도움받기를 구분한다.',
  'hidden-personality': '겉으로 하는 말과 속의 욕구는 어디서 어긋나는가? 지장간 근거와 확인된 경험을 구분한다.',
  balance: '내 에너지는 무엇에 집중되고 무엇을 덜 쓰는가? 단순 개수와 가중치를 분리하고 부족을 결함으로 단정하지 않는다.',
  'useful-god-eokbu': '어떤 환경과 행동이 나를 편안하게 하는가? 실제 용신 판단과 한계를 밝혀 보완 행동으로 연결한다.',
  'concern-loop': '지금 가장 답답한 문제는 왜 반복되는가? 직접 적은 고민을 인용하고 원인·바꿀 수 있는 행동·변화 확인 방법을 잇는다.',
  'career-money': '어떤 일을 할 때 노력과 보상이 연결되는가? 실제 업무 입력과 십신의 역할을 연결하고 이직 여부는 별도 장에 맡긴다.',
  'career-transition': '지금의 일을 유지하거나 바꾸려면 무엇이 달라져야 하는가? 입력한 현실 조건과 계산된 시기를 대조한다.',
  'wealth-flow': '돈을 얻고 남기는 과정 중 어디에 주의를 기울여야 하는가? 수입·지출 입력이 있으면 연결하고, 없으면 낭비나 부채를 만들지 않는다.',
  'love-loop': '가까워질수록 반복되는 관계의 어려움은 무엇인가? 일주·일지와 확인된 관계 상태를 연결해 대화의 차이를 짚는다.',
  'destiny-partner': '나에게 편안한 인연은 어떤 관계를 만드는가? 상대의 확정 외모·직업 대신 나의 관계 욕구와 잘 맞는 소통 방식을 풀이한다.',
  'avoid-relationship': '어떤 관계에서는 거리를 조절해야 하는가? 사람을 나쁘다고 단정하지 않고 반복 행동·합의 위반·내 대응을 구분한다.',
  'love-timing': '언제 관계를 넓히거나 깊게 생각해 볼 만한가? 실제 대운·세운과 현재 관계 상태를 연결하며 만남 날짜를 보장하지 않는다.',
  'future-flow': '지금과 다음 큰 시기의 요구는 어떻게 다른가? 계산된 대운 구간을 비교하고 전환 전에 준비할 조건을 설명한다.',
  'sewoon-detail': '올해는 내 원래 성향과 어떤 점이 만나고 부딪히는가? 분석 기준 연도와 세운을 명시하고 기존 대운 장과 구분한다.',
  'action-guide': '읽고 난 뒤 무엇을 먼저 바꿀 것인가? 앞 장의 근거를 우선순위 세 가지와 변화 확인 질문으로 연결하고 새 사건은 만들지 않는다.',
}

export function cmdgChapterInstruction(sectionId: string): string {
  return CMDG_READING_CONTRACT + '\n이 장에서 반드시 답할 고유 질문: ' + (CMDG_CHAPTER_QUESTIONS[sectionId] || '현재 목차의 질문과 개인 입력을 직접 연결한다.')
}

export function cmdgSectionContext(context: SajuReportContext, sectionId: string): SajuReportContext {
  if (context.serviceKey !== 'saju_master' || !CMDG_RELATIONSHIP_SECTIONS.has(sectionId)) return context
  return {
    serviceKey: context.serviceKey, name: context.name, target: context.target,
    birthTimeKnown: context.birthTimeKnown, relationship: context.relationship,
    orientation: context.orientation, partner: context.partner,
    concern: /연애|애인|연인|결혼|이별|재회|짝사랑|인연|썸/.test(context.concern || '') ? context.concern : undefined,
  }
}

export function reviewCmdgStoryStructure(text: string): string[] {
  const headings = ['지금의 답', '내 사주에서 읽히는 이유', '달라지는 조건', '내가 할 일']
  let last = -1
  for (const heading of headings) {
    const matches = [...text.matchAll(new RegExp('^### ' + heading + '\\s*$', 'gm'))]
    if (matches.length !== 1 || matches[0].index! <= last) return ['네 단계 소제목을 한 번씩 순서대로 쓰세요: ### 지금의 답 → ### 내 사주에서 읽히는 이유 → ### 달라지는 조건 → ### 내가 할 일.']
    last = matches[0].index!
  }
  return []
}
