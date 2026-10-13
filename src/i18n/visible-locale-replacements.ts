/** Customer-visible strings the compiler leaves in design attributes. */
const SERVICES: Record<string, {en: string; ja: string}> = {
  '우리 결혼, 이날 해도 될까?': {en: 'Should we marry on this date?', ja: '私たち、この日に結婚していい？'},
  '내 2027년, 풀릴 각이야?': {en: 'Will 2027 open up for me?', ja: '2027年、私には開ける年？'},
  '나한테 운 붙는 색과 물건': {en: 'Colors and objects that suit me', ja: '私に運が寄る色と物'},
  '내 애인 바람필까?': {en: 'Could my partner stray?', ja: '恋人は浮気する？'},
  '올해 연애운': {en: "This year's love", ja: '今年の恋愛運'},
  '고양이 궁합': {en: 'Cat compatibility', ja: '猫との相性'},
  '커플궁합': {en: 'Couple compatibility', ja: 'カップル相性'},
  '결혼궁합': {en: 'Marriage compatibility', ja: '結婚相性'},
  '소비성향': {en: 'Spending style', ja: '消費の傾向'},
  '직장 선택': {en: 'Choosing a job', ja: '仕事選び'},
  '퇴사운': {en: 'Should I quit?', ja: '退職の運'},
  '재회운': {en: 'Getting back together', ja: '復縁の運'},
  '상대방 마음': {en: 'Their feelings', ja: '相手の気持ち'},
  '배우자운': {en: 'Marriage prospect', ja: '配偶者の運'},
  '직업운': {en: 'Work outlook', ja: '仕事運'},
  '사주 상담': {en: 'Four Pillars chat', ja: '四柱推命の相談'},
  '천명사주': {en: 'Four Pillars Reading', ja: '四柱推命'},
  '커뮤니티': {en: 'Community', ja: 'コミュニティ'},
  '운명록': {en: 'Fate log', ja: '運命録'},
  '개인정보처리방침': {en: 'Privacy policy', ja: 'プライバシーポリシー'},
  '환불·취소 정책': {en: 'Refunds and cancellations', ja: '返金・キャンセル'},
  '운세 검색': {en: 'Search readings', ja: '鑑定を探す'},
  '고객센터': {en: 'Support', ja: 'サポート'},
  '이용약관': {en: 'Terms', ja: '利用規約'},
  'Fortune Shop 소개': {en: 'About Fortune Shop', ja: '運命商会について'},
}
export function replaceVisibleLocaleText(html: string, locale: 'en' | 'ja' | 'ko'): string {
  // Korean pages and their purchase amounts are outside the localization contract.
  if (locale === 'ko') return html
  let out = html
  for (const [ko, label] of Object.entries(SERVICES)) out = out.replaceAll(`data-service="${ko}"`, `data-service="${label[locale]}"`)
  const company = locale === 'en' ? 'The Cream Union' : 'ザ・クリームユニオン'
  const person = locale === 'en' ? 'Jeonghun Lee' : 'イ・ジョンフン'
  const registration = locale === 'en' ? '2026-Seoul-Gangnam-03303' : '2026-ソウル江南-03303'
  const address = locale === 'en' ? '18 Dosan-daero 12-gil, Cream Building' : 'クリームビル 道山大路12ギル18'
  const single = locale === 'en' ? "I'm single" : '独身です'
  out = out.replaceAll('더크림유니언', company)
  out = out.replaceAll('이정훈', person)
  out = out.replaceAll('2026-서울강남-03303', registration)
  out = out.replaceAll('도산대로 12길 18 크림빌딩', address)
  out = out.replaceAll('솔로예요', single)
  const pending = locale === 'en' ? 'Coming soon' : '準備中'
  const locked = locale === 'en' ? 'Opens after payment' : '支払い後に開く'
  const imageFail = locale === 'en' ? 'The image did not load. You can still read the interpretation.' : '画像を読み込めませんでした。解釈は引き続き読めます。'
  const flirt = locale === 'en' ? 'A crush / someone I am interested in' : '気になる相手'
  const topic = locale === 'en' ? 'Activity outside the relationship and an agreed boundary' : '関係の外の行動と合意した境界'
  out = out.replaceAll('content:" · 준비중"', `content:" · ${pending}"`)
  out = out.replaceAll('content: "결제 후 열림"', `content: "${locked}"`)
  out = out.replaceAll('content: "이미지를 불러오지 못했어요. 해석은 계속 볼 수 있어요."', `content: "${imageFail}"`)
  out = out.replaceAll('"name":"천명사주"', locale === 'en' ? '"name":"Four Pillars Reading"' : '"name":"四柱推命"')
  out = out.replaceAll('partnerRelationship: "썸/관심 상대"', `partnerRelationship: "${flirt}"`)
  out = out.replaceAll('data-report-topic="관계 밖 활동과 합의한 경계"', `data-report-topic="${topic}"`)
  const writing = locale === 'en' ? 'Writing' : '作成中'
  const nextTopic = locale === 'en' ? 'A new point of contact and interest in the relationship' : '新しい接点と関係への意向'
  const imageShort = locale === 'en' ? 'The image did not load. ' : '画像を読み込めませんでした。'
  const brand = locale === 'en' ? 'Four Pillars Reading' : '四柱推命'
  out = out.replaceAll('content:" · 작성중"', `content:" · ${writing}"`)
  out = out.replaceAll('content: "이미지를 불러오지 못했어요. "', `content: "${imageShort}"`)
  out = out.replaceAll('data-next-topic="새 접점과 관계 의향"', `data-next-topic="${nextTopic}"`)
  out = out.replaceAll('<strong>천명사주</strong>', `<strong>${brand}</strong>`)
  const pairs = locale === 'en' ? [
    ['펼치기 +', 'Show +'],
    ['접기 −', 'Hide −'],
    ['양력·음력만 맞추면, 일간과 대운 방향부터 읽어 드립니다.', 'Set solar or lunar, and the reading starts with the Day Master and luck-pillar direction.'],
    ['양력', 'Solar'],
    ['음력', 'Lunar'],
    ['상대방 사주', "Partner's chart"],
    ['생년월일로 올해 운의 결이 열립니다', "Your birth date opens this year's pattern"],
    ['상대 생년월일', 'Their date of birth'],
    ['생년월일', 'Date of birth'],
    ['이전', 'Back'],
    ['다음으로', 'Next'],
    ['상대 이름 또는 호칭', 'Their name or what you call them'],
    ['상대와의 관계', 'Your relationship'],
    ['남자', 'Male'],
    ['여자', 'Female'],
    ['생시 입력', 'Enter birth time'],
    ['생시 모름', 'Birth time unknown'],
    ['지금 걸리는 한 줄이 목차를 맞춥니다', 'One line about what is on your mind sets the order'],
    ['올해 연애, 돈, 직장처럼 한 가지만 적어도 해석 순서가 맞춰집니다. 비워도 전체 흐름은 열립니다.', 'Even one topic, such as love, money, or work, sets the order. Leave it blank and the full flow still opens.'],
    ['없어요', 'None'],
    ['해석 시작', 'Start the reading'],
    ['오늘의 사주 풀이', "Today's Four Pillars reading"],
    ['오늘의 운을 불러오지 못했습니다', "Today's reading did not load"],
  ] : [
    ['펼치기 +', '開く +'],
    ['접기 −', '閉じる −'],
    ['양력·음력만 맞추면, 일간과 대운 방향부터 읽어 드립니다.', '新暦か旧暦を合わせると、日主と大運の方向から読みます。'],
    ['양력', '新暦'],
    ['음력', '旧暦'],
    ['상대방 사주', '相手の四柱'],
    ['생년월일로 올해 운의 결이 열립니다', '生年月日から今年の運の流れが開きます'],
    ['상대 생년월일', '相手の生年月日'],
    ['생년월일', '生年月日'],
    ['이전', '戻る'],
    ['다음으로', '次へ'],
    ['상대 이름 또는 호칭', '相手の名前か呼び方'],
    ['상대와의 관계', '相手との関係'],
    ['남자', '男性'],
    ['여자', '女性'],
    ['생시 입력', '生まれた時刻を入力'],
    ['생시 모름', '生まれた時刻は不明'],
    ['지금 걸리는 한 줄이 목차를 맞춥니다', '今気になる一文が目次を合わせます'],
    ['올해 연애, 돈, 직장처럼 한 가지만 적어도 해석 순서가 맞춰집니다. 비워도 전체 흐름은 열립니다.', '今年の恋愛、お金、仕事のように一つだけ書いても解釈の順は合います。空でも全体の流れは開きます。'],
    ['없어요', 'ない'],
    ['해석 시작', '解釈を始める'],
    ['오늘의 사주 풀이', '今日の四柱推命'],
    ['오늘의 운을 불러오지 못했습니다', '今日の運を読み込めませんでした'],
  ]
  const more = locale === 'en' ? [
    ['천명사주', 'Four Pillars Reading'],
    ['사주 수정', 'Edit chart'],
    ['다시 불러오기', 'Load again'],
    ['올해 연애 가능성', 'This year\'s chance of love'],
    ['${currentYear}년 흐름과 도화 신호를 같이 봅니다.', 'It reads the ${currentYear} flow together with the attraction signal.'],
    ['무료 요약', 'Free summary'],
    ['올해 인연은', 'This year\'s connection'],
    ['을 놓치지 않는 쪽입니다', 'is the side that does not miss'],
    ['나의 기준', 'My standard'],
    ['${birthLabel} · ${dayLabel} 일지 기준', '${birthLabel} · based on the ${dayLabel} day branch'],
    ['도화 시기', 'Attraction timing'],
    ['${escapeHtml(dohwa.dohwaBranch)} 도화 · ${escapeHtml(dohwa.monthHint)}', '${escapeHtml(dohwa.dohwaBranch)} attraction · ${escapeHtml(dohwa.monthHint)}'],
    ['배우자성', 'Spouse star'],
    ['${spouseStar} 흐름으로 인연 유형 확인', 'The connection type is read through the ${spouseStar} flow'],
    ['입력 기준', 'From what you entered'],
    ['내 사주와 관계 상태를', 'Your chart and relationship status'],
    ['같이 놓고 봅니다', 'are read together'],
    ['바깥 흐름', 'Outside flow'],
    ['관계 환경', 'Relationship setting'],
    ['가까운 관계', 'Close relationship'],
    ['관계 상태', 'Relationship status'],
    ['상대 입력', 'Their details'],
    ['질문', 'Question'],
    ['도화가 강해지는 달에는 소개, 연락, 외부 약속을 열어둡니다.', 'In months when attraction is stronger, introductions, messages, and outside plans stay open.'],
    ['배우자성은 끌림보다 오래 남는 관계의 기준으로 읽습니다.', 'The spouse star is read as the standard for a relationship that lasts, not only attraction.'],
    ['상대가 있으면 감정 온도 차이와 관계 진전 타이밍을 따로 봅니다.', 'If there is someone, the gap in emotional temperature and the timing to move forward are read separately.'],
    ['전체 리포트', 'Full report'],
    ['열리게 될 해석 분류', 'Sections that will open'],
    ['도화가 들어오는 달과', 'The months attraction arrives, and'],
    ['놓치는 타이밍을 끝까지 봅니다', 'the timing you might miss, are read through'],
    ['무료 요약은 입구입니다. 전체 풀이에서는 월별 흐름, 상대 사주 궁합, 감정 온도 차이, 연애 성사 전략까지 한 장씩 펼칩니다.', 'The free summary is the entrance. The full reading opens the monthly flow, compatibility with their chart, the gap in emotional temperature, and how a relationship can actually start.'],
    ['상품', 'Reading'],
    ['분류', 'Section'],
    ['10개 연애운 목차', '10 love-reading sections'],
    ['풀이 ID 조회 실패', 'Could not look up the reading ID'],
    ['저장된 풀이를 찾지 못했습니다', 'The saved reading was not found'],
    ['보관함 보기', 'Open saved readings'],
    ['새 사주 입력', 'Enter a new chart'],
    ['이고 나머지는', 'and the rest'],
    ['타이밍', 'timing'],
    ['Spouse star은 끌림보다 오래 남는 관계의 기준으로 읽습니다.', 'The spouse star is read as the standard for a relationship that lasts, not only attraction.'],
    ['Free summary은 입구입니다. 전체 풀이에서는 월별 흐름, 상대 사주 궁합, 감정 온도 차이, 연애 성사 전략까지 한 장씩 펼칩니다.', 'The free summary is the entrance. The full reading opens the monthly flow, compatibility with their chart, the gap in emotional temperature, and how a relationship can actually start.'],
    ['불러온 프로필', 'Loaded profile'],
    ["확신도 ' + confidenceLabel(signal.confidence) + '", "Confidence ' + confidenceLabel(signal.confidence) + '"],
    ['결제 화면으로', 'Go to payment'],
    ['목록으로', 'Back to the list'],
    ['현실에서 보이는 모습', 'How it shows up in real life'],
    ['관찰 포인트', 'What to watch'],
    ['시기·강약·조건', 'Timing, strength, and conditions'],
    ['점수 아님', 'Not a score'],
    ['보완', 'What to add'],
  ] : [
    ['천명사주', '四柱推命'],
    ['사주 수정', '命式を直す'],
    ['다시 불러오기', '再読み込み'],
    ['올해 연애 가능성', '今年の恋愛の可能性'],
    ['${currentYear}년 흐름과 도화 신호를 같이 봅니다.', '${currentYear}年の流れと桃花の気配を一緒に見ます。'],
    ['무료 요약', '無料の要約'],
    ['올해 인연은', '今年の縁は'],
    ['을 놓치지 않는 쪽입니다', 'を逃さない方です'],
    ['나의 기준', '自分の基準'],
    ['${birthLabel} · ${dayLabel} 일지 기준', '${birthLabel} · ${dayLabel}の日支基準'],
    ['도화 시기', '桃花の時期'],
    ['${escapeHtml(dohwa.dohwaBranch)} 도화 · ${escapeHtml(dohwa.monthHint)}', '${escapeHtml(dohwa.dohwaBranch)}の桃花 · ${escapeHtml(dohwa.monthHint)}'],
    ['배우자성', '配偶者星'],
    ['${spouseStar} 흐름으로 인연 유형 확인', '${spouseStar}の流れで縁の型を見ます'],
    ['입력 기준', '入力基準'],
    ['내 사주와 관계 상태를', '自分の命式と関係の状態を'],
    ['같이 놓고 봅니다', '一緒に見ます'],
    ['바깥 흐름', '外の流れ'],
    ['관계 환경', '関係の環境'],
    ['가까운 관계', '近い関係'],
    ['관계 상태', '関係の状態'],
    ['상대 입력', '相手の入力'],
    ['질문', '質問'],
    ['도화가 강해지는 달에는 소개, 연락, 외부 약속을 열어둡니다.', '桃花が強まる月は、紹介や連絡、外の予定を開いておきます。'],
    ['배우자성은 끌림보다 오래 남는 관계의 기준으로 읽습니다.', '配偶者星は、ときめきより長く残る関係の基準として読みます。'],
    ['상대가 있으면 감정 온도 차이와 관계 진전 타이밍을 따로 봅니다.', '相手がいるときは、感情の温度差と関係が進む時期を別に見ます。'],
    ['전체 리포트', '全体レポート'],
    ['열리게 될 해석 분류', '開く解釈の分類'],
    ['도화가 들어오는 달과', '桃花が入る月と'],
    ['놓치는 타이밍을 끝까지 봅니다', '逃す時期まで見ます'],
    ['무료 요약은 입구입니다. 전체 풀이에서는 월별 흐름, 상대 사주 궁합, 감정 온도 차이, 연애 성사 전략까지 한 장씩 펼칩니다.', '無料の要約は入口です。全体の解釈では月ごとの流れ、相手の命式との相性、感情の温度差、恋が実る進め方まで一枚ずつ開きます。'],
    ['상품', '鑑定'],
    ['분류', '分類'],
    ['10개 연애운 목차', '恋愛運の目次10'],
    ['풀이 ID 조회 실패', '鑑定IDの照会に失敗しました'],
    ['저장된 풀이를 찾지 못했습니다', '保存した鑑定が見つかりませんでした'],
    ['보관함 보기', '保管庫を見る'],
    ['새 사주 입력', '新しい命式を入力'],
    ['이고 나머지는', 'で、残りは'],
    ['타이밍', 'タイミング'],
    ['配偶者星은 끌림보다 오래 남는 관계의 기준으로 읽습니다.', '配偶者星は、ときめきより長く残る関係の基準として読みます。'],
    ['無料の要約은 입구입니다. 전체 풀이에서는 월별 흐름, 상대 사주 궁합, 감정 온도 차이, 연애 성사 전략까지 한 장씩 펼칩니다.', '無料の要約は入口です。全体の解釈では月ごとの流れ、相手の命式との相性、感情の温度差、恋が実る進め方まで一枚ずつ開きます。'],
    ['불러온 프로필', '読み込んだプロフィール'],
    ["확신도 ' + confidenceLabel(signal.confidence) + '", "確信度 ' + confidenceLabel(signal.confidence) + '"],
    ['결제 화면으로', '支払い画面へ'],
    ['목록으로', '一覧へ'],
    ['현실에서 보이는 모습', '現実で見える姿'],
    ['관찰 포인트', '見るポイント'],
    ['시기·강약·조건', '時期・強弱・条件'],
    ['점수 아님', '点数ではない'],
    ['보완', '補う点'],
  ]
  for (const [ko, label] of [...pairs, ...more]) out = out.replaceAll(ko, label)
  out = localizePriceDisplay(out, locale)
  if (locale === 'en') out = out.replaceAll('Fortune Shop', 'Fate Shop')
  return out
}

/** Pinned reference only, NOT a live rate, a foreign-currency offer or an Inicis charge. */
export const PRICE_REFERENCE = Object.freeze({ krwPerUsd: 1340, jpyPerKrw: 0.118 })

export function formatReferencePrice(amountWon: number, locale: 'en' | 'ja'): string {
  if (!Number.isFinite(amountWon)) throw new RangeError('A finite KRW amount is required')
  const amount = locale === 'en' ? amountWon / PRICE_REFERENCE.krwPerUsd : amountWon * PRICE_REFERENCE.jpyPerKrw
  const absolute = Math.abs(amount)
  const sign = amount < 0 ? '−' : ''
  // No invented minimum, marketing-price rounding or separate table for coupon amounts.
  const value = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ja-JP', {
    minimumFractionDigits: locale === 'en' ? 2 : 0,
    maximumFractionDigits: locale === 'en' ? 2 : 0,
  }).format(absolute)
  return locale === 'en' ? `${sign}$${value} USD` : `${sign}¥${value} JPY`
}

/** Only display text/attributes change. Scripts, JSON-LD, CSS and machine values stay in KRW. */
function localizePriceDisplay(html: string, locale: 'en' | 'ja'): string {
  const display = (text: string) => {
    const convert = (raw: string) => formatReferencePrice(Number(raw.replace(/,/g, '').replace('−', '-')), locale)
    // A range with a shared suffix needs both endpoints converted, not only the second.
    let out = text.replace(/(?<![\d.,])([−-]?\d[\d,]*(?:\.\d+)?)\s*([–~～-])\s*([−-]?\d[\d,]*(?:\.\d+)?)\s*(?:원|KRW)(?![A-Za-z])/g,
      (_all, from: string, separator: string, to: string) => `${convert(from)} ${separator} ${convert(to)}`)
    out = out.replace(/(?<![\d.,])([−-]?\d[\d,]*(?:\.\d+)?)\s*(?:원|KRW)(?![A-Za-z])/g, (_all, raw: string) => convert(raw))
    out = out.replace(/(?:₩|KRW\s+)([−-]?\d[\d,]*(?:\.\d+)?)/g, (_all, raw: string) => convert(raw))
    return out
  }
  // A tokenizer rather than a global currency replacement avoids changing JS payloads,
  // numeric data-price values used by filters, URLs, coupon IDs and SEO Offer prices.
  // Consume complete attribute values before looking for the real id attribute.
  // data-id and id text inside quoted values are not our generated notice.
  const legacyAside = /<aside\b(?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*?\s+id\s*=\s*(?:"umsh-currency-disclosure"|'umsh-currency-disclosure')(?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*>[^]*?<\/aside\s*>/i
  const legacyAsideWhole = new RegExp(`^(?:${legacyAside.source})$`, 'i')
  const ordinaryTokens = /<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1\s*>|<(?:(?:"[^"]*"|'[^']*')|[^'">])*?>|[^<]+|</
  const tokens = new RegExp(`${legacyAside.source}|${ordinaryTokens.source}`, 'gi')
  const out = html.replace(tokens, (token: string) => {
    if (/^<!--|^<(?:script|style)\b/i.test(token)) return token
    // Internal reference guidance must not become customer-facing service copy.
    // Remove only our previously generated aside; scripts and payment data stay intact.
    if (legacyAsideWhole.test(token)) return ''
    if (!token.startsWith('<')) return display(token)
    // content/itemprop/amount/currency are machine data and must not be inferred from locale.
    return token.replace(/(\s(?:aria-label|aria-description|title|alt)\s*=\s*)(["'])([^]*?)\2/gi,
      (_all, name: string, quote: string, value: string) => `${name}${quote}${display(value)}${quote}`)
  })
  return out
}
