/**
 * 결제 주문 없이 받은 후기(지인에게 받은 글), 2026-10-16 사용자 요청.
 * - 결제 확인이 안 되므로 "구매 확인" 배지를 붙이지 않는다(verified: false).
 * - 이름은 받은 그대로 이미 가려져 있다(박**). 원본: 운명상회_후기10개_일주보완_1.xlsx
 * - 앱에서 들어오는 실제 후기와 날짜순으로 섞여 보인다.
 */
export interface CuratedReview {
  id: string
  productKey: string
  displayName: string
  ilju: string | null
  /** 한국 날짜 자정 기준 ISO 시각 */
  createdAt: string
  body: string
}

const cmdg = (n: number, displayName: string, ilju: string, date: string, body: string): CuratedReview => ({
  id: `curated-cmdg-${String(n).padStart(2, '0')}`,
  productKey: 'cmdg',
  displayName,
  ilju,
  createdAt: new Date(`${date}T00:00:00+09:00`).toISOString(),
  body,
})

export const CURATED_REVIEWS: readonly CuratedReview[] = [
  cmdg(1, '박**', '을해', '2026-10-14', '아니 저 아세요?ㅋㅋ 성격 부분 읽다가 폰 내려놓음'),
  cmdg(2, '김**', '경술', '2026-10-13', '가볍게 보러 왔다가 뼈 맞고 갑니다… 이렇게까지 말해달라는 건 아니었는데요'),
  cmdg(3, '이**', '무신', '2026-10-12', '지난 연애에서 제가 왜 그렇게 힘들었는지 읽으면서 자꾸 떠올랐어요. 상대에게 맞추느라 제 마음은 뒤로 미뤘다는 말에서 한참 멈췄네요. 저랑 비슷한 고민 있는 분은 읽어보셔도 좋겠어요.'),
  cmdg(4, '최**', '갑자', '2026-10-11', '잘 맞네요. 근데 제 단점을 너무 자세히 알고 계심ㅋㅋㅋ'),
  cmdg(5, '장**', '무신', '2026-10-11', '사주 보면서까지 소비 습관 지적받을 줄은 몰랐어요ㅋㅋ 큰돈 아끼고 작은 돈 계속 쓴다는 데서 할 말 없어짐'),
  cmdg(6, '김**', '정묘', '2026-09-28', '와 성격 얘기는 좀 소름인데요. 밖에서는 아무렇지 않은 척하고 집 와서 혼자 곱씹는 거 어떻게 아심… 이 부분만 세 번 읽었어요.'),
  cmdg(7, '손**', '신유', '2026-09-28', '연애 부분 보고 전남친 생각나서 기분 이상해짐… 혼자 의미 부여하다가 혼자 지치는 거 진짜 고치고 싶은데 여기도 써있네'),
  cmdg(8, '김**', '병오', '2026-09-28', '처음에는 성격만 보고 넘기려고 했는데 연애랑 일 얘기까지 다 읽었어요. 평소 고민하던 내용이 여기저기 있어서 생각보다 오래 봤네요. 내용이 궁금하다는 친구한테도 추천했어요.'),
  cmdg(9, '전**', '임술', '2026-09-25', '이직운 보러 왔는데 일단 제 성격부터 들킴. 부탁 거절 못 해서 일 쌓아놓고 혼자 퇴사 생각하는 사람 저 맞아요…'),
  cmdg(10, '김**', '계미', '2026-09-25', '좋은 말로 달래줄 줄 알았는데 그냥 제 문제를 말해주네요. 좀 킹받는데 틀린 말이 아니라 반박도 못 하겠음'),
]

export function curatedReviewsFor(productKey: string): CuratedReview[] {
  return CURATED_REVIEWS.filter((review) => review.productKey === productKey)
}
