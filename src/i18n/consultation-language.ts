import { appendLocaleGenerationGuide } from './generation-language-contract.js'
import type { Locale } from './locale.js'
export type ConsultationLocale = Locale

/** Explicit body/header selections only; no language/browser inference or coercion. */
export function consultationLocale(value: unknown): ConsultationLocale {
  if (value === undefined) return 'ko'
  if (value === 'ko' || value === 'en' || value === 'ja') return value
  throw new RangeError('INVALID_CONSULTATION_LOCALE')
}
export function consultationLanguageSystem(original: string, locale: ConsultationLocale): string {
  if (locale === 'ko') return original
  return appendLocaleGenerationGuide(original, locale) + '\n' + (locale === 'en'
    ? 'CONSULTATION: Speak as a friendly, direct adult in natural conversational English. Start with the supplied situation and one manageable action. Avoid a lecture, therapy jargon, invented work/childhood/debt facts, partner mind-reading and diagnoses. Do not guarantee financial or relationship outcomes; never say completely achievable, easily, or will definitely. Any arithmetic must be explicitly supported and qualified. A natal chart cannot establish saving ability, affordability or an actual spending habit. Do not introduce luck-cycle timing in this localized counseling pass; keep natal evidence separate from temporal forecasts. Do not promise that a short pause will break a habit. Check subscription usage, contract terms and essential expenses before proposing cancellation or a transfer amount. Suggest a small experiment, not assured effectiveness. Do not expose Korean setting names or policy labels in prose. Keep the existing actor identity, evidence, ownership and payment rules.'
    : '相談は自然な常体で、近い距離の大人として話す。示された状況と小さな行動から入り、説教や教科書のような長い説明にしない。借金、仕事、幼少期、相手の本心など示されていない事実を作らない。病気を診断せず、貯蓄・投資・恋愛の成功を保証しない。絶対、必ず成功、簡単に達成と決めつけない。計算は与えられた情報に基づく場合だけ。命式だけで貯める力や収入・生活費、実際の浪費癖を決めつけない。この現地語相談では生まれ持った命式と現在の運の時期を混同せず、星が巡っているという時期の説明を加えない。短い待ち時間で習慣が変わると断定しない。サブスクの利用状況・契約条件・必要な生活費を確認してから解約や積立額を提案する。小さな試行として話し、効果を保証しない。韓国語の設定名や内部ポリシーを本文に出さない。元の人物、根拠、所有権、決済の境界は維持する。')
}
/** Fail-closed heuristic, not proof of full semantic/safety compliance. Called before save/charge. */
export function validConsultationLanguage(text: string, locale: ConsultationLocale): boolean {
  if (locale === 'ko') return true
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text)) return false
  if (locale === 'en' && (!/[A-Za-z]/.test(text) || /[ぁ-んァ-ン]/.test(text))) return false
  if (locale === 'ja' && !/[ぁ-んァ-ン一-龯]/.test(text)) return false
  if (/\b(?:completely achievable|easily|will definitely|guaranteed? (?:profits?|returns?|success|income|savings|reunion)|(?:certainly|definitely) (?:earn|save|win|succeed))\b/i.test(text)) return false
  if (/\b(?:breaks?|will break|prevents?|stops?)\b.{0,60}\b(?:automatic habit|impulsive spending|overspending)\b/i.test(text)) return false
  if (/\b(?:luck cycles?|luck pillars?).{0,40}\b(?:now|currently|this year|next year)\b/i.test(text)) return false
  if (/(?:食神|傷官|正財|偏財|正官|偏官|正印|偏印|印綬|比肩|劫財)の(?:巡り|運気|時期)|(?:貯める|稼ぐ|増やす).{0,12}(?:力|才能|能力).{0,8}(?:は|が|を)(?:ある|持つ|備)/.test(text)) return false
  if (/\b(?:you (?:have|suffer from) (?:depression|an anxiety disorder|bipolar disorder|schizophrenia)|you are (?:clinically depressed|bipolar)|your partner (?:is cheating|will cheat|will come back|definitely loves you)|you will (?:become rich|get married|reunite|double your money|make a profit))\b/i.test(text)) return false
  if (/(?:絶対に|必ず|間違いなく).{0,24}(?:儲か|稼げ|成功|貯め|結婚|復縁)|(?:確実に|簡単に).{0,12}(?:達成|貯め|成功|儲か)|(?:あなたは|あなたが).{0,8}(?:うつ病|統合失調症|双極性障害)|相手は.{0,6}(?:浮気している|浮気する|必ず戻る)/.test(text)) return false
  return true
}

const QUESTIONS = {
 en: {
  person: 'Who are we talking about? Tell me a name or nickname and your relationship so I keep people separate.',
  date: 'What is their exact date of birth?', calendar: 'Is their birthday on the solar or lunar calendar?',
  leap: 'Was their lunar birthday in a leap month or a regular month?',
  gender: 'Which sex should I use for their chart calculation?',
  time: 'What hour and minute were they born? It is fine to say you do not know.',
 },
 ja: {
  person: '誰についての相談？ 区別できる名前や呼び名と、あなたとの関係を教えて。',
  date: '相手の正確な生年月日を教えて。', calendar: '相手の誕生日は新暦？ 旧暦？',
  leap: '相手の旧暦の誕生日は閏月？ 通常の月？', gender: '命式の計算に使う相手の性別を教えて。',
  time: '相手の生まれた時刻を時と分で教えて。わからなければ、わからないで大丈夫。',
 },
} as const
export function consultationQuestion(key: keyof typeof QUESTIONS.en, locale: Exclude<ConsultationLocale,'ko'>): string { return QUESTIONS[locale][key] }
export function consultationSocial(text: string, locale: Exclude<ConsultationLocale,'ko'>): string | undefined {
 const normalized = text.normalize('NFC').replace(/[\s.!?~…。！？]/g,'').toLowerCase()
 if (/^(안녕|안녕하세요|안녕하십니까|반가워요|반갑습니다|hello|hi|こんにちは|こんばんは)$/.test(normalized)) return locale==='en'?'Hi. What would you like to talk through?':'こんにちは。今日は何が気になってる？'
 if (/^(감사합니다|감사해요|고맙습니다|고마워요|고마워|감사|thankyou|thanks|ありがとう|ありがとうございます)$/.test(normalized)) return locale==='en'?'Thanks for sharing. If there is anything else on your mind, we can keep going.':'話してくれてありがとう。他にも気になることがあれば、続けてね。'
 if (/^(네|예|응|알겠습니다|알겠어요|좋아요|확인했습니다|확인했어요|yes|ok|okay|了解|わかった|はい)$/.test(normalized)) return locale==='en'?'Okay. What else would you like to ask?':'うん。他に気になっていることはある？'
}

const ERRORS:Record<string,{en:string;ja:string}> = {
 AUTH_REQUIRED:{en:'Sign in to continue.',ja:'ログインして続けてください。'},
 CONSULTATION_LOCALE_UNSUPPORTED:{en:'Live audio is not ready in this language. Use text chat or a recorded audio question.',ja:'この言語のリアルタイム音声はまだ利用できません。テキスト相談か録音した質問をご利用ください。'},
 CONSULTATION_CHECKOUT_BUSY:{en:'A checkout is already being prepared. Try again shortly.',ja:'決済を準備中です。少し待ってからお試しください。'},
 CONSULTATION_CREDITS_REMAINING:{en:'Use your remaining questions before buying another pack.',ja:'残りの質問回数を使ってから次の質問券を購入してください。'},
 CONSULTATION_STORAGE_CAPACITY:{en:'There is not enough chat storage for another question pack.',ja:'次の質問券を保存できる相談容量がありません。'},
 STORAGE_INVALID:{en:'The saved chat could not be verified. Try again later.',ja:'保存済みの相談を確認できませんでした。時間をおいてお試しください。'},
 CONSULTATION_UNAVAILABLE:{en:'The chat request could not be completed. Try again later.',ja:'相談を完了できませんでした。時間をおいてお試しください。'},
 INPUT_INVALID:{en:'Check the request and keep your question within 4,000 characters.',ja:'入力内容を確認し、相談は4,000文字以内にしてください。'},
 PROFILE_REQUIRED:{en:'Save your birth profile before starting a chat.',ja:'生年月日のプロフィールを保存してから相談を始めてください。'},
 AUDIO_INVALID:{en:'Check the audio format and file size.',ja:'音声の形式と容量を確認してください。'},
 AUDIO_UNCLEAR:{en:'I could not hear that clearly. Record it again or type your question.',ja:'音声を聞き取れませんでした。録音し直すか、文字で入力してください。'},
 REQUEST_CONFLICT:{en:'That request ID has different content or language. Send a new request.',ja:'同じリクエスト番号の内容か言語が変わっています。新しいリクエストで送ってください。'},
 CONVERSATION_LOCALE_MISMATCH:{en:'This conversation uses another language. Open a new conversation to change languages.',ja:'この相談は別の言語です。言語を変えるには新しい相談を開いてください。'},
 GENERATION_BUSY:{en:'The previous reply is still being prepared. Try again shortly.',ja:'前の返答を作成中です。少し待ってからお試しください。'},
 GENERATION_EXPIRED:{en:'The reply took too long. Try the same question again.',ja:'返答の処理時間を超えました。同じ質問で再度お試しください。'},
 DAILY_LIMIT:{en:'Today’s chat limit has been reached. Come back tomorrow.',ja:'今日の相談上限に達しました。明日またご利用ください。'},
 STORAGE_LIMIT:{en:'The conversation storage limit has been reached. Saved chats are still available.',ja:'相談の保存上限に達しました。保存済みの相談は引き続き読めます。'},
 CONVERSATION_LIMIT:{en:'This conversation has reached its limit. Start a new chat.',ja:'この会話の相談上限に達しました。新しい相談を始めてください。'},
 CONVERSATION_NOT_FOUND:{en:'This conversation was not found. Select it from your saved chats.',ja:'相談が見つかりませんでした。自分の保管庫から選び直してください。'},
 CONSULTATION_PAYMENT_REQUIRED:{en:'The free chat allowance is used up. Add a five-question pack. Checkout is charged in KRW.',ja:'無料相談枠を使い切りました。5回分の質問券を追加してください。決済は韓国ウォンです。'},
 CONSULTATION_CREDITS_UNAVAILABLE:{en:'The remaining chat allowance could not be checked. Try again later.',ja:'相談の残り回数を確認できませんでした。時間をおいてお試しください。'},
 LOCALIZED_QUALITY_NOT_APPROVED:{en:'English consultations are still under quality review. No question credit was used.',ja:'日本語の相談は品質確認中です。相談回数は消費されません。'},
 CONSULTATION_DISABLED:{en:'Chat is not available right now. Try again later.',ja:'現在、相談を準備中です。時間をおいてご利用ください。'},
 CONSULTATION_SETTINGS_UNAVAILABLE:{en:'Chat settings could not be loaded. Try again later.',ja:'相談の設定を読み込めませんでした。時間をおいてお試しください。'},
 CONSULTATION_SETTINGS_INVALID:{en:'Chat settings are being checked. Try again later.',ja:'相談の設定を確認中です。時間をおいてご利用ください。'},
 STORAGE_UNAVAILABLE:{en:'The request stopped because the chat could not be saved safely. Try again later.',ja:'相談を安全に保存できないため中断しました。時間をおいてお試しください。'},
 PROVIDER_UNAVAILABLE:{en:'The chat service could not be reached. Try again later.',ja:'相談サービスに接続できませんでした。時間をおいてお試しください。'},
 PROVIDER_LIMIT:{en:'The chat service usage limit has been reached. Try again later.',ja:'相談サービスの利用上限に達しました。時間をおいてご利用ください。'},
 PROVIDER_RESPONSE_INVALID:{en:'The reply did not pass the check and no question credit was used. Try again.',ja:'返答を確認できなかったため、質問回数は使用していません。再度お試しください。'},
 AUDIO_SYNTHESIS_FAILED:{en:'Audio could not be created. Read the saved text instead.',ja:'音声を作成できませんでした。保存したテキストで読んでください。'},
}
export function consultationErrorMessage(code:string,locale:ConsultationLocale,koreanFallback:string):string {
 if(locale==='ko')return koreanFallback
 return ERRORS[code]?.[locale] || (locale==='en'?'The chat request could not be completed. Try again later.':'相談を完了できませんでした。時間をおいてお試しください。')
}
