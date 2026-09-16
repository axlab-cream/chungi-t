export type PassAngleLensKey =
  | 'verdict'
  | 'study-style'
  | 'exam-fit'
  | 'timing'
  | 'obstacle'
  | 'stamina'
  | 'environment'
  | 'support'
  | 'exam-day'
  | 'action'

export type PassAngleFocus = 'target' | 'balance' | 'careerMoney' | 'future' | 'trap' | 'timingPlace' | 'action'

export interface PassAngleOutlineItem {
  id: string
  category: string
  categoryEn: string
  classification: string
  focus: PassAngleFocus
  query: string
  lensKey: PassAngleLensKey
  sourcePart: `part0${1 | 2 | 3 | 4 | 5}.md`
}

interface PassAngleOutlineGroup {
  category: string
  categoryEn: string
  focus: PassAngleFocus
  lensKey: PassAngleLensKey
  sourcePart: PassAngleOutlineItem['sourcePart']
  query: string
  items: ReadonlyArray<readonly [id: string, title: string]>
}

/**
 * The titles and order come only from the explicit "52항목" outline blocks in
 * tone-v2/source/산출물-실전/pass_angle/part01.md..part05.md. Example prose in
 * those files is deliberately not copied into this runtime contract.
 */
const GROUPS: readonly PassAngleOutlineGroup[] = [
  {
    category: '나, 붙을 각이야?', categoryEn: 'Pass Verdict', focus: 'target', lensKey: 'verdict', sourcePart: 'part01.md',
    query: '시험 합격 준비 수준 평가 기준 인성 관성 세운 대운 문서운 현재 판단',
    items: [
      ['pass-angle-verdict', '전체 흐름 판정'],
      ['pass-angle-current-window', '지금이 붙는 구간인지'],
      ['pass-angle-support-vs-drag', '밀어주는 기운 vs 잡는 기운'],
      ['pass-angle-year-go-hold', '올해 GO/HOLD 시그널'],
      ['pass-angle-one-shot-vs-long', '한 번에 갈 각 vs 길게 볼 각'],
    ],
  },
  {
    category: '내 머리 쓰는 법', categoryEn: 'Study Style', focus: 'balance', lensKey: 'study-style', sourcePart: 'part01.md',
    query: '공부 방식 암기 이해 집중 복습 오답 회독 학습 리듬 인성 식상',
    items: [
      ['study-style', '암기형 vs 이해형'],
      ['study-style-sprint-vs-steady', '몰아치기 vs 꾸준형'],
      ['study-style-solo-vs-group', '혼자 vs 같이'],
      ['study-style-focus-break', '집중 끊기는 지점'],
      ['study-style-slump-pattern', '슬럼프 오는 패턴'],
    ],
  },
  {
    category: '나랑 맞는 시험', categoryEn: 'Exam Type Fit', focus: 'careerMoney', lensKey: 'exam-fit', sourcePart: 'part02.md',
    query: '시험 유형 객관식 서술형 전문직 어학 실기 면접 구술 공개 평가 기준 관성 식상',
    items: [
      ['exam-type-fit', '객관식형 vs 서술형'],
      ['exam-fit-organization-discipline', '조직·규율형 시험'],
      ['exam-fit-professional-license', '자격·전문직형'],
      ['exam-fit-language-certification', '어학·인증형'],
      ['exam-fit-practical-technical', '실기·기술형'],
      ['exam-fit-interview-oral', '말로 하는 시험(면접·구술)'],
    ],
  },
  {
    category: '붙는 타이밍', categoryEn: 'Pass Timing', focus: 'future', lensKey: 'timing', sourcePart: 'part02.md',
    query: '시험 일정 남은 기간 접수 재도전 대운 세운 월운 준비 계획 현실 기준',
    items: [
      ['pass-timing', '올해 흐름'],
      ['pass-timing-daewoon-window', '대운이 밀어주는 구간'],
      ['pass-timing-favorable-months', '유리한 달·불리한 달'],
      ['pass-timing-application', '원서·접수 시기'],
      ['pass-timing-retry-decision', '재도전 판단 시점'],
    ],
  },
  {
    category: '공부 방해 요인', categoryEn: 'Study Obstacles', focus: 'trap', lensKey: 'obstacle', sourcePart: 'part03.md',
    query: '집중 방해 비교 SNS 생활비 불안 자기 의심 공부 환경 실제 관찰',
    items: [
      ['study-obstacle-focus-break', '집중 깨지는 지점'],
      ['study-obstacle-people-drag', '사람에 끌려다니는 패턴'],
      ['study-obstacle-comparison-social', '비교·SNS 리스크'],
      ['study-obstacle-money-life', '돈·생활 걱정'],
      ['study-obstacle-self-doubt', '자기 의심이 올라오는 때'],
    ],
  },
  {
    category: '버티는 몸과 멘탈', categoryEn: 'Mental Stamina', focus: 'trap', lensKey: 'stamina', sourcePart: 'part03.md',
    query: '번아웃 수면 회복 아침 식사 컨디션 불안 집중 생활 리듬',
    items: [
      ['mental-stamina', '번아웃 신호'],
      ['mental-stamina-sleep-recovery', '수면·회복 리듬'],
      ['mental-stamina-morning-setup', '아침 세팅'],
      ['mental-stamina-meal-condition', '밥·컨디션 관리'],
      ['mental-stamina-anchor-sentence', '흔들릴 때 붙잡을 한 문장'],
    ],
  },
  {
    category: '공부 환경 세팅', categoryEn: 'Study Environment', focus: 'timingPlace', lensKey: 'environment', sourcePart: 'part04.md',
    query: '공부 공간 책상 방향 색 소음 조명 동선 집중 방해 현실 환경',
    items: [
      ['study-environment-direction', '잘 되는 방향'],
      ['study-environment-desk-position', '책상 놓을 자리'],
      ['study-environment-color', '도움 되는 색'],
      ['study-environment-noise-space', '소음·공간 조건'],
      ['study-environment-avoid-layout', '피해야 할 배치'],
    ],
  },
  {
    category: '나를 밀어주는 사람', categoryEn: 'Study Support', focus: 'careerMoney', lensKey: 'support', sourcePart: 'part04.md',
    query: '스터디 학원 가족 멘토 조언 피드백 공부 지원 비교 현실 관계',
    items: [
      ['study-support-helper-type', '귀인 유형'],
      ['study-support-study-academy', '스터디·학원 궁합'],
      ['study-support-family-expectation', '가족 기대 다루는 법'],
      ['study-support-mentor-timing', '멘토 만나는 시기'],
      ['study-support-avoid-advice', '피해야 할 조언'],
    ],
  },
  {
    category: '시험 날 택일과 컨디션', categoryEn: 'Exam Day', focus: 'timingPlace', lensKey: 'exam-day', sourcePart: 'part05.md',
    query: '시험일 일정 공식 안내 이동 준비물 컨디션 전날 당일 종료 후 현실 확인',
    items: [
      ['exam-day-selection-method', '시험 택일 보는 법'],
      ['exam-day-good-conditions', '좋은 조건'],
      ['exam-day-avoid-conditions', '피할 조건'],
      ['exam-day-personal-criteria', '내 기준으로 고르는 날'],
      ['exam-day-routine', '전날·당일 루틴'],
      ['exam-day-after-action', '끝나고 할 일'],
    ],
  },
  {
    category: '현실 액션 플랜', categoryEn: 'Action Plan', focus: 'action', lensKey: 'action', sourcePart: 'part05.md',
    query: '시험 계획 목표 기출 오답 회독 남은 기간 포기 재도전 합격 후 적응 체크리스트',
    items: [
      ['action-plan', '목표 쪼개기 프레임'],
      ['action-plan-countdown', 'D-100·D-30·D-7'],
      ['action-plan-stop-list', '포기할 것 정하기'],
      ['action-plan-retry-criteria', '재도전 판단 기준'],
      ['action-plan-first-90-days', '붙고 나서 첫 90일'],
    ],
  },
]

export const PASS_ANGLE_OUTLINE: readonly PassAngleOutlineItem[] = Object.freeze(GROUPS.flatMap((group) =>
  group.items.map(([id, classification]) => Object.freeze({
    id,
    category: group.category,
    categoryEn: group.categoryEn,
    classification,
    focus: group.focus,
    query: `${classification} ${group.query}`,
    lensKey: group.lensKey,
    sourcePart: group.sourcePart,
  })),
))

export function passAngleOutlineItem(sectionId: string): PassAngleOutlineItem | undefined {
  return PASS_ANGLE_OUTLINE.find((item) => item.id === sectionId)
}

