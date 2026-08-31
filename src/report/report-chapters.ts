import type { SajuReportChapter, SajuReportPoint, SajuReportSection } from '../types/index.js'

type ChapterDefinition = Omit<SajuReportChapter, 'points'> & {
  points: SajuReportPoint[]
}

const GROUP = {
  self: '나의 본질',
  pattern: '무너지는 패턴',
  money: '일과 돈',
  relationship: '관계와 인연',
  future: '미래 흐름',
} as const

export const REPORT_CHAPTERS: ChapterDefinition[] = [
  {
    id: 'chapter-01',
    order: 1,
    groupId: 'self',
    groupTitle: GROUP.self,
    title: '너라는 사람부터 까보자',
    subtitle: '네가 생각하는 너와 실제 너는 얼마나 같을까?',
    sectionIds: ['profile', 'target-context'],
    points: [
      {
        type: 'comparison',
        title: '자기 인식 차이표',
        detail: '내가 생각하는 나, 남이 보는 나, 명식에서 먼저 튀어나오는 반응을 한 표로 비교합니다.',
        metric: '자가인식 차이 = 외부 반응 키워드 - 본인 서술 키워드',
      },
      {
        type: 'highlight',
        title: '첫 장면 고정',
        detail: '첫인상과 혼자 있을 때의 피로 장면을 초반에 박아 “내 얘기인데?” 감각을 만듭니다.',
      },
    ],
  },
  {
    id: 'chapter-02',
    order: 2,
    groupId: 'self',
    groupTitle: GROUP.self,
    title: '남들이 아는 너는 진짜 네가 아니다',
    subtitle: '사람들 앞의 얼굴과 혼자 남았을 때의 너',
    sectionIds: ['month-pillar', 'hidden-personality'],
    points: [
      {
        type: 'graph',
        title: '외부 얼굴 vs 내면 피로',
        detail: '사회적 역할이 올라갈수록 혼자 있을 때 피로가 어떻게 쌓이는지 그래프로 보여줍니다.',
        metric: '사회 얼굴 강도 = 월주/월령 가중치 + 관성/식상 노출도',
      },
      {
        type: 'image',
        title: '두 얼굴 이미지',
        detail: '사회에서의 얼굴과 집에 돌아온 뒤의 표정을 대비하는 장면 이미지를 배치합니다.',
      },
    ],
  },
  {
    id: 'chapter-03',
    order: 3,
    groupId: 'self',
    groupTitle: GROUP.self,
    title: '너는 어릴 때부터 여기서 무너졌다',
    subtitle: '아직도 반복되고 있는 감정 패턴',
    sectionIds: ['pillars-structure', 'year-pillar'],
    points: [
      {
        type: 'comparison',
        title: '초년 패턴 재현',
        detail: '어릴 때 익숙했던 반응이 지금 인간관계와 일에서 어떻게 반복되는지 전후 비교로 보여줍니다.',
        metric: '반복도 = 년주 배경 신호 + 현재 고민 키워드 일치도',
      },
      {
        type: 'highlight',
        title: '오래된 감정 버튼',
        detail: '상처를 단정하지 않고, 반복적으로 눌리는 감정 버튼을 생활 장면으로 특정합니다.',
      },
    ],
  },
  {
    id: 'chapter-04',
    order: 4,
    groupId: 'self',
    groupTitle: GROUP.self,
    title: '가까워져야만 들키는 네 진짜 성격',
    subtitle: '아무에게나 보여주지 않는 관계 속 본모습',
    sectionIds: ['day-pillar', 'relationship-orientation'],
    points: [
      {
        type: 'table',
        title: '가까운 관계 반응표',
        detail: '카톡, 약속, 서운함, 거리감 앞에서 나오는 반응을 관계 기준별로 정리합니다.',
      },
      {
        type: 'highlight',
        title: '관계 속 본모습',
        detail: '편한 사람 앞에서만 나오는 말투와 방어 반응을 주요 대목으로 강조합니다.',
      },
    ],
  },
  {
    id: 'chapter-05',
    order: 5,
    groupId: 'pattern',
    groupTitle: GROUP.pattern,
    title: '네가 그렇게까지 버티는 데는 이유가 있다',
    subtitle: '가장 강한 장점이 가장 큰 약점이 되는 순간',
    sectionIds: ['hour-pillar', 'day-master-strength', 'dominant-element'],
    points: [
      {
        type: 'graph',
        title: '강점 과사용 곡선',
        detail: '잘 버티는 힘이 어느 지점부터 고집, 과로, 끊어내기로 바뀌는지 시각화합니다.',
        metric: '과사용 위험 = 일간 강도 + 강한 오행 편중 - 보완 기운',
      },
      {
        type: 'highlight',
        title: '무너지기 직전 신호',
        detail: '버티는 사람에게 먼저 나타나는 말투, 표정, 생활 리듬의 변화를 잡아줍니다.',
      },
    ],
  },
  {
    id: 'chapter-06',
    order: 6,
    groupId: 'pattern',
    groupTitle: GROUP.pattern,
    title: '이상하게 이것만은 늘 부족하다',
    subtitle: '네 명식에서 유독 비어 있는 자리',
    sectionIds: ['balance', 'weak-element'],
    points: [
      {
        type: 'table',
        title: '부족한 자리 보완표',
        detail: '부족한 오행, 생활 증상, 보완 행동, 피해야 할 선택을 한 표로 묶습니다.',
        metric: '부족도 = 전체 오행 평균 - 해당 오행 가중치',
      },
      {
        type: 'formula',
        title: '균형 회복 공식',
        detail: '타고난 약점이 아니라 회복 루틴으로 바꿔 설명합니다.',
        metric: '회복력 = 부족 기운 보완 행동 x 반복성',
      },
    ],
  },
  {
    id: 'chapter-07',
    order: 7,
    groupId: 'pattern',
    groupTitle: GROUP.pattern,
    title: '너를 살리는 선택과 망치는 선택은 따로 있다',
    subtitle: '일이 풀릴 때와 꼬일 때의 결정적 차이',
    sectionIds: ['useful-god-eokbu', 'useful-god-johu'],
    points: [
      {
        type: 'formula',
        title: '선택 판별식',
        detail: '용신·조후를 제목에 쓰지 않고, 실제 선택이 살리는지 망치는지 계산식으로 보여줍니다.',
        metric: '선택 점수 = 보완 기운 적합도 - 과다 기운 자극도',
      },
      {
        type: 'comparison',
        title: '풀릴 때 vs 꼬일 때',
        detail: '같은 선택도 어떤 환경에서 풀리고 꼬이는지 전후 비교로 정리합니다.',
      },
    ],
  },
  {
    id: 'chapter-08',
    order: 8,
    groupId: 'pattern',
    groupTitle: GROUP.pattern,
    title: '돈·사람·책임 앞에서 네 본성이 드러난다',
    subtitle: '평소에는 숨겨져 있던 진짜 반응',
    sectionIds: ['ten-gods-overview', 'ten-gods-position'],
    points: [
      {
        type: 'table',
        title: '본성 반응표',
        detail: '돈, 사람 부탁, 책임, 경쟁 앞에서 나오는 반응을 십신 위치별로 번역합니다.',
      },
      {
        type: 'highlight',
        title: '결정적 대목',
        detail: '좋은 성격 설명보다 실제로 흔들리는 순간의 문장을 강하게 보여줍니다.',
      },
    ],
  },
  {
    id: 'chapter-09',
    order: 9,
    groupId: 'pattern',
    groupTitle: GROUP.pattern,
    title: '너는 왜 매번 같은 곳에서 무너질까?',
    subtitle: '반복해서 빠지는 인생의 함정',
    sectionIds: ['trap'],
    points: [
      {
        type: 'highlight',
        title: '위험 신호',
        detail: '반복적으로 망가지는 말, 돈, 관계 장면을 한 문장으로 찍어줍니다.',
      },
      {
        type: 'graph',
        title: '함정 반복 루프',
        detail: '참음, 폭발, 후회, 다시 참음으로 이어지는 흐름을 루프 그래프로 보여줍니다.',
      },
    ],
  },
  {
    id: 'chapter-10',
    order: 10,
    groupId: 'pattern',
    groupTitle: GROUP.pattern,
    title: '고민은 바뀌는데 문제는 왜 계속 같을까?',
    subtitle: '네 인생에서 계속 돌아오는 패턴의 정체',
    sectionIds: ['concern-loop'],
    points: [
      {
        type: 'comparison',
        title: '고민 이름만 바뀌는 구조',
        detail: '연애, 직장, 돈으로 이름은 바뀌지만 같은 선택 구조가 반복되는 지점을 비교합니다.',
      },
      {
        type: 'formula',
        title: '반복 고민 공식',
        detail: '현재 고민과 명식의 약한 자리, 대운 자극이 겹치는 정도를 계산 포인트로 둡니다.',
        metric: '반복 고민 점수 = 현재 고민 키워드 + 약한 오행 + 합충형파해 자극',
      },
    ],
  },
  {
    id: 'chapter-11',
    order: 11,
    groupId: 'money',
    groupTitle: GROUP.money,
    title: '네 능력이 돈이 되는 데는 조건이 있다',
    subtitle: '열심히 하는 것과 돈을 버는 것은 다르다',
    sectionIds: ['career-money', 'wealth-flow'],
    points: [
      {
        type: 'formula',
        title: '돈 전환력',
        detail: '재능이 실제 수익이 되려면 결과물, 보상 구조, 반복성이 같이 맞아야 합니다.',
        metric: '돈 전환력 = 결과물 x 보상 구조 x 반복성',
      },
      {
        type: 'table',
        title: '수입 경로표',
        detail: '월급형, 성과형, 거래형, 콘텐츠형 중 어디에서 돈길이 열리는지 나눕니다.',
      },
    ],
  },
  {
    id: 'chapter-12',
    order: 12,
    groupId: 'money',
    groupTitle: GROUP.money,
    title: '요즘 자꾸 꼬인다면 이미 신호가 온 거다',
    subtitle: '일상에서 먼저 나타나는 운의 변화',
    sectionIds: ['work-context'],
    points: [
      {
        type: 'comparison',
        title: '최근 전후 비교',
        detail: '최근 3개월 전과 지금의 일상, 업무 압박, 사람 피로 변화를 비교합니다.',
        metric: '꼬임 신호 = 업무 압박 + 피로 누적 + 관계 마찰',
      },
      {
        type: 'highlight',
        title: '먼저 움직이는 증상',
        detail: '일이 터지기 전에 나타나는 메신저, 일정, 몸의 리듬 변화를 짚습니다.',
      },
    ],
  },
  {
    id: 'chapter-13',
    order: 13,
    groupId: 'money',
    groupTitle: GROUP.money,
    title: '지금 버틸까, 나갈까? 답은 여기서 갈린다',
    subtitle: '직장·사업·이직에서 봐야 할 결정 기준',
    sectionIds: ['career-transition'],
    points: [
      {
        type: 'table',
        title: '버틸 조건 vs 나갈 조건',
        detail: '역할, 보상, 평가, 사람 비용, 계약 안정성을 기준으로 움직일지 판단합니다.',
      },
      {
        type: 'formula',
        title: '전환 판단식',
        detail: '감정이 아니라 조건으로 판단하게 만들어 구매 후 실행감을 높입니다.',
        metric: '전환 점수 = 성장 가능성 + 보상 명확도 - 반복 소진 - 사람 비용',
      },
    ],
  },
  {
    id: 'chapter-14',
    order: 14,
    groupId: 'money',
    groupTitle: GROUP.money,
    title: '돈이 없는 게 아니다. 어딘가에서 새고 있다',
    subtitle: '네 돈이 이상하게 남지 않는 이유',
    sectionIds: ['money-leak'],
    points: [
      {
        type: 'formula',
        title: '돈구멍 계산',
        detail: '새는 돈을 고정지출, 관계비, 충동소비, 계약 리스크로 나눠 봅니다.',
        metric: '돈구멍 = 고정지출 + 관계비 + 충동소비 + 계약 리스크',
      },
      {
        type: 'graph',
        title: '지출 누수 그래프',
        detail: '작은 지출이 한 달 뒤 얼마나 커지는지 누적 흐름으로 보여줍니다.',
      },
    ],
  },
  {
    id: 'chapter-15',
    order: 15,
    groupId: 'money',
    groupTitle: GROUP.money,
    title: '잡아야 할 돈과 절대 쫓으면 안 되는 돈',
    subtitle: '재물운이 붙는 방식과 타이밍',
    sectionIds: ['wealth-timing'],
    points: [
      {
        type: 'graph',
        title: '재물 기회 타이밍',
        detail: '기회가 붙는 시기와 먼저 조심해야 할 지출 신호를 같이 표시합니다.',
        metric: '재물 타이밍 = 재성 자극 + 식상 흐름 + 보완 기운 연도',
      },
      {
        type: 'comparison',
        title: '잡을 돈 vs 피할 돈',
        detail: '반복 수입이 되는 돈과 사람 때문에 쫓다 새는 돈을 분리합니다.',
      },
    ],
  },
  {
    id: 'chapter-16',
    order: 16,
    groupId: 'relationship',
    groupTitle: GROUP.relationship,
    title: '그 사람, 운명일까? 또 네 패턴일까?',
    subtitle: '이상하게 비슷한 사람에게 끌리는 이유',
    sectionIds: ['relationship-status', 'love-loop'],
    points: [
      {
        type: 'comparison',
        title: '운명처럼 보이는 끌림 vs 반복 패턴',
        detail: '현재 관계 상태별로 진짜 인연 신호와 익숙해서 끌리는 신호를 분리합니다.',
      },
      {
        type: 'highlight',
        title: '같은 사람에게 끌리는 이유',
        detail: '답장 템포, 서운함, 거리감이 반복되는 대목을 주요 문장으로 강조합니다.',
      },
    ],
  },
  {
    id: 'chapter-17',
    order: 17,
    groupId: 'relationship',
    groupTitle: GROUP.relationship,
    title: '네가 설레는 사람과 결국 남는 사람은 다르다',
    subtitle: '끌림과 인연은 같은 것이 아니다',
    sectionIds: ['destiny-partner'],
    points: [
      {
        type: 'feature',
        title: '운명의 상대 확인하기',
        detail: '명식의 보완 기운과 관계 패턴을 바탕으로 다가올 이성의 분위기를 스케치 풍 이미지로 생성합니다.',
      },
      {
        type: 'image',
        title: '상대 분위기 스케치',
        detail: '실존 인물 예측이 아니라 눈빛, 옷차림, 분위기, 만남 장면을 상징 이미지로 보여줍니다.',
      },
    ],
    cta: {
      type: 'destiny-partner-sketch',
      label: '운명의 상대 확인하기',
      description: '다가올 이성의 분위기를 GPT 이미지 생성으로 연필 스케치처럼 보여줍니다.',
      sectionId: 'destiny-partner',
      options: ['연필 스케치', '잉크 라인', '수채 스케치', '무드보드'],
    },
  },
  {
    id: 'chapter-18',
    order: 18,
    groupId: 'relationship',
    groupTitle: GROUP.relationship,
    title: '이런 사람은 곁에 둘수록 너를 흐리게 만든다',
    subtitle: '가까이해야 할 인연과 멀어져야 할 인연',
    sectionIds: ['avoid-relationship', 'love-timing'],
    points: [
      {
        type: 'table',
        title: '가까이할 인연 vs 멀어질 인연',
        detail: '연락 방식, 돈 태도, 생활 리듬, 약속 책임감으로 관계를 분류합니다.',
      },
      {
        type: 'highlight',
        title: '초기 경고 신호',
        detail: '초반에는 매력처럼 보이지만 가까워질수록 흐려지는 사람의 신호를 찍어줍니다.',
      },
    ],
  },
  {
    id: 'chapter-19',
    order: 19,
    groupId: 'future',
    groupTitle: GROUP.future,
    title: '올해 네 인생에서 가장 먼저 움직이는 신호',
    subtitle: '큰 변화가 오기 전에 먼저 나타나는 징조',
    sectionIds: ['future-flow', 'sewoon-detail'],
    points: [
      {
        type: 'graph',
        title: '올해 신호 그래프',
        detail: '사람, 돈, 일, 이동 중 올해 먼저 흔들리는 영역을 시각화합니다.',
        metric: '올해 신호 = 세운 자극 + 현재 고민 + 약한 자리 반응',
      },
      {
        type: 'comparison',
        title: '작년과 올해 비교',
        detail: '이미 지나간 흐름과 올해 새로 움직인 신호를 나눠 설득력을 높입니다.',
      },
    ],
  },
  {
    id: 'chapter-20',
    order: 20,
    groupId: 'future',
    groupTitle: GROUP.future,
    title: '인생 판이 바뀌기 직전, 먼저 흔들리는 곳이 있다',
    subtitle: '다음 대운으로 넘어가기 전에 나타나는 변화',
    sectionIds: ['daewoon-detail', 'turning-years', 'timing-place', 'action-guide', 'long-report-depth'],
    points: [
      {
        type: 'comparison',
        title: '현재 대운 vs 다음 대운',
        detail: '지금 무대와 다음 무대에서 달라지는 사람, 일, 돈, 장소를 비교합니다.',
      },
      {
        type: 'formula',
        title: '전환 준비 점수',
        detail: '큰 운이 바뀌기 전에 먼저 정리해야 할 영역을 계산 포인트로 둡니다.',
        metric: '전환 준비도 = 보완 행동 + 관계 정리 + 돈구멍 차단 - 반복 선택',
      },
    ],
  },
]

export function buildReportChapters(sections: SajuReportSection[]): SajuReportChapter[] {
  const sectionIdSet = new Set(sections.map((section) => section.id))
  return REPORT_CHAPTERS
    .map((chapter) => ({
      ...chapter,
      sectionIds: chapter.sectionIds.filter((sectionId) => sectionIdSet.has(sectionId)),
      points: chapter.points.map((point) => ({ ...point })),
      cta: chapter.cta ? { ...chapter.cta, options: chapter.cta.options ? [...chapter.cta.options] : undefined } : undefined,
    }))
    .filter((chapter) => chapter.sectionIds.length > 0)
}

export function chapterForSectionId(sectionId: string): SajuReportChapter | undefined {
  return REPORT_CHAPTERS.find((chapter) => chapter.sectionIds.includes(sectionId))
}

export function chapterSearchTextForSection(sectionId: string): string {
  const chapter = chapterForSectionId(sectionId)
  if (!chapter) return ''
  return [
    chapter.title,
    chapter.subtitle,
    chapter.groupTitle,
    ...chapter.points.flatMap((point) => [point.type, point.title, point.detail, point.metric ?? '']),
    chapter.cta?.label ?? '',
    chapter.cta?.description ?? '',
    ...(chapter.cta?.options ?? []),
  ].filter(Boolean).join(' ')
}
