import fs from 'node:fs'
const en = [
  ['${now.getMonth() + 1}월 ${now.getDate()}일', '${now.getMonth() + 1}/${now.getDate()}'],
  ['${menu.title} 확인 중', 'Checking ${menu.title}'],
  ['${menu.title}${topicParticle(menu.title)} 로그인하고 열 수 있어', '${menu.title} opens after sign-in'],
  ['먼저 소셜 로그인하고 사주등록을 마쳐줘.', 'Sign in and finish chart registration first.'],
  ['${menu.title}${topicParticle(menu.title)} 사주등록을 마치고 열 수 있어', '${menu.title} opens after the chart is registered'],
  ['로그인은 확인됐어. 이제 기본 사주 프로필을 저장해줘.', 'Sign-in is confirmed. Save the basic chart profile.'],
  ['${menu.title} 상태를 확인하지 못했어', 'Could not check ${menu.title}'],
  ['홈 맨 위로 올라왔어.', 'Back at the top.'],
  ['대표 상품을 모아봤어.', 'Featured readings are in view.'],
  ['가격 사다리로 이동했어.', 'Moved to the price ladder.'],
  ["title: '운명록'", "title: 'Fate log'"],
]
const ja = [
  ['${now.getMonth() + 1}월 ${now.getDate()}일', '${now.getMonth() + 1}月${now.getDate()}日'],
  ['${menu.title} 확인 중', '${menu.title}を確認中'],
  ['${menu.title}${topicParticle(menu.title)} 로그인하고 열 수 있어', '${menu.title}はログインすると開ける'],
  ['먼저 소셜 로그인하고 사주등록을 마쳐줘.', '先にログインして命式登録を終えて。'],
  ['${menu.title}${topicParticle(menu.title)} 사주등록을 마치고 열 수 있어', '${menu.title}は命式登録が終わると開ける'],
  ['로그인은 확인됐어. 이제 기본 사주 프로필을 저장해줘.', 'ログインは確認した。基本の命式プロフィールを保存して。'],
  ['${menu.title} 상태를 확인하지 못했어', '${menu.title}の状態を確認できなかった'],
  ['홈 맨 위로 올라왔어.', 'ホームの先頭に戻った。'],
  ['대표 상품을 모아봤어.', '主な鑑定を集めた。'],
  ['가격 사다리로 이동했어.', '価格の階段へ移動した。'],
  ["title: '운명록'", "title: '運命録'"],
]
const extra = [
["status: '홈'","status: 'Home'","status: 'ホーム'"],
  [
    " · 오늘 확인함",
    " · Viewed today",
    " · 本日は確認済み"
  ],
  [
    "label: '연애'",
    "status: 'Love'",
    "status: '恋愛'"
  ],
  [
    "label: '궁합'",
    "status: 'Match'",
    "status: '相性'"
  ],
  [
    "label: '재물'",
    "status: 'Money'",
    "status: '金運'"
  ],
  [
    "label: '직업'",
    "status: 'Work'",
    "status: '仕事'"
  ],
  [
    "'보관함 안내'",
    "'About saved readings'",
    "'保存した鑑定について'"
  ],
  [
    "'이 서비스'",
    "'This reading'",
    "'この鑑定'"
  ],
  [
    "로그인은 확인됐어. ${menu.title}${objectParticle(menu.title)} 열려면 기본 사주를 저장해줘.",
    "You are signed in. Save your birth profile to open ${menu.title}.",
    "ログインできたよ。${menu.title}を開くには出生プロフィールを保存してね。"
  ],
  [
    "label: '홈'",
    "label: 'Home'",
    "label: 'ホーム'"
  ],
  [
    "${menu.title}${topicParticle(menu.title)} 계정과 사주 프로필이 둘 다 필요해.",
    "${menu.title} needs both an account and a birth profile.",
    "${menu.title}にはアカウントと出生プロフィールが必要だよ。"
  ],
  [
    "로그인됐는지, 사주 프로필이 있는지 확인하고 있어.",
    "Checking your sign-in and birth profile.",
    "ログインと出生プロフィールを確認しているよ。"
  ],
  [
    "로그인이 만료됐거나 연결이 끊겼어. 로그인하면 이어서 볼 수 있어.",
    "Your sign-in expired or the connection was lost. Sign in to continue.",
    "ログインの有効期限が切れたか、接続が途切れたみたい。ログインすると続けられるよ。"
  ],
  [
    "${topicParticle(label)} 다음 단계에서 연결돼.",
    "${label} will be connected in a later update.",
    "${label}は今後の更新で使えるようになるよ。"
  ],
  [
    "item.status || '보기'",
    "item.status || 'View'",
    "item.status || '見る'"
  ],
  [
    "<span>상품 검색</span>",
    "<span>Search readings</span>",
    "<span>鑑定を検索</span>"
  ],
  [
    "placeholder=\"연애, 재물, 오늘운...\"",
    "placeholder=\"Love, money, today...\"",
    "placeholder=\"恋愛、金運、今日の運勢…\""
  ],
  [
    "전체 상품을 펼쳤어.",
    "Showing all readings.",
    "すべての鑑定を表示したよ。"
  ],
  [
    "${cleanText(button.querySelector('strong')?.textContent)} 메뉴를 모았어.",
    "Showing ${cleanText(button.querySelector('strong')?.textContent)} options.",
    "${cleanText(button.querySelector('strong')?.textContent)}のメニューを集めたよ。"
  ],
  [
    "이 메뉴는 다음 단계에서 연결돼.",
    "This option will be connected in a later update.",
    "このメニューは今後の更新で使えるようになるよ。"
  ],
  [
    "전체 운세 상품을 다시 펼쳤어.",
    "Showing all readings again.",
    "すべての鑑定をもう一度表示したよ。"
  ],
  [
    "${cleanText(button.textContent)} 관련 운만 모았어.",
    "Showing readings for ${cleanText(button.textContent)}.",
    "${cleanText(button.textContent)}に関連する鑑定を集めたよ。"
  ],
  [
    "${cleanText(button.querySelector('strong')?.textContent)} 상품을 모았어.",
    "Showing ${cleanText(button.querySelector('strong')?.textContent)} readings.",
    "${cleanText(button.querySelector('strong')?.textContent)}の鑑定を集めたよ。"
  ],
  [
    "배너 ${position + 1}",
    "Banner ${position + 1}",
    "バナー ${position + 1}"
  ],
  [
    "${name} 배너로 이동",
    "Go to ${name} banner",
    "${name}のバナーへ移動"
  ]
]
for (const [locale, pairs] of [['en', en], ['ja', ja]]) {
  const p = `.vercel-localized/${locale}/js/portal.js`
  let t = fs.readFileSync(p, 'utf8')
  for (const [a, b] of [...pairs,...extra.map(([from,en,ja])=>[from,locale==='en'?en:ja])]) t = t.split(a).join(b)
  fs.writeFileSync(p, t)
  console.log(locale, (t.match(/[가-힣]/g) || []).length)
}
