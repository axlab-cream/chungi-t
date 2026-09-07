import { normalizeServiceKey } from '../prompt/service-system.js'
import type { SajuReportContext } from '../types/index.js'

const CLASSIC_SERVICE_KEY = 'saju_master'

/** True for 천명사주 / missing key (normalize defaults to saju_master). */
export function isClassicDosaseService(serviceKey?: string | null): boolean {
  return normalizeServiceKey(serviceKey) === CLASSIC_SERVICE_KEY
}

export type ReportTone = 'classic' | 'neutral'

/** classic = 하게체 may remain; neutral = 합니다/해요 product tone. */
export function toneClose(serviceKey?: string | null): ReportTone {
  return isClassicDosaseService(serviceKey) ? 'classic' : 'neutral'
}

/**
 * Display name for templates/hooks.
 * Named person when present; "자네" only for saju_master; else "당신".
 */
export function addressName(
  context: Pick<SajuReportContext, 'name' | 'target' | 'serviceKey'>,
  serviceKey?: string | null,
): string {
  const key = serviceKey ?? context.serviceKey
  const named = context.name?.trim() || context.target?.trim()
  if (named) return named
  return isClassicDosaseService(key) ? '자네' : '당신'
}

/** Name with 님 when it is a real name; pronouns stay bare. */
export function addressLabel(
  context: Pick<SajuReportContext, 'name' | 'target' | 'serviceKey'>,
  serviceKey?: string | null,
): string {
  const name = addressName(context, serviceKey)
  if (name === '자네' || name === '당신' || name === '본인') return name
  return `${name}님`
}

/**
 * Soft rewrite of residual 도사 endings for specialized template soft-fail paths.
 * Prefer hand-written neutral strings; this is a safety net, not a full translator.
 */
export function neutralizeDosase(text: string): string {
  if (!text) return text
  let next = text
  next = next.replace(/자네라는 사람은/g, '당신은')
  next = next.replace(/자네에게/g, '당신에게')
  next = next.replace(/자네의/g, '당신의')
  next = next.replace(/자네를/g, '당신을')
  next = next.replace(/자네와/g, '당신과')
  next = next.replace(/자네는/g, '당신은')
  next = next.replace(/자네가/g, '당신이')
  next = next.replace(/자네/g, '당신')
  next = next.replace(/보일 걸세/g, '보일 거예요')
  next = next.replace(/하는 걸세/g, '하는 거예요')
  next = next.replace(/정하는 걸세/g, '정하는 거예요')
  next = next.replace(/깨어난 걸세/g, '깨어난 거예요')
  next = next.replace(/확인하는 걸세/g, '확인하는 거예요')
  next = next.replace(/읽어 보게/g, '읽어 보세요')
  next = next.replace(/세워보게/g, '세워보세요')
  next = next.replace(/가려보게/g, '가려보세요')
  next = next.replace(/돌아보게/g, '돌아보세요')
  next = next.replace(/맞춰 보게/g, '맞춰 보세요')
  next = next.replace(/적어 보게/g, '적어 보세요')
  next = next.replace(/정리해 보게/g, '정리해 보세요')
  next = next.replace(/남겨 두게/g, '남겨 두세요')
  next = next.replace(/미뤄 두게/g, '미뤄 두세요')
  next = next.replace(/준비해 두게/g, '준비해 두세요')
  next = next.replace(/한 호흡만 늦추게/g, '한 호흡만 늦추세요')
  next = next.replace(/사라지지는 말게/g, '사라지지는 마세요')
  next = next.replace(/표식으로 삼게/g, '표식으로 삼으세요')
  next = next.replace(/시작하게/g, '시작하세요')
  next = next.replace(/오래 쓰게/g, '오래 쓰세요')
  next = next.replace(/줄여 가게/g, '줄여 가세요')
  next = next.replace(/표시하게/g, '표시하세요')
  next = next.replace(/보겠네/g, '볼게요')
  next = next.replace(/하겠네/g, '할게요')
  next = next.replace(/않겠네/g, '않겠어요')
  next = next.replace(/나누겠네/g, '나눌게요')
  next = next.replace(/잡겠네/g, '잡을게요')
  next = next.replace(/펼쳐 보겠네/g, '펼쳐 볼게요')
  next = next.replace(/법일세/g, '법이에요')
  next = next.replace(/구조일세/g, '구조예요')
  next = next.replace(/풀이일세/g, '풀이예요')
  next = next.replace(/신호일세/g, '신호예요')
  next = next.replace(/공기일세/g, '공기예요')
  next = next.replace(/기준일세/g, '기준이에요')
  next = next.replace(/좌표일세/g, '좌표예요')
  next = next.replace(/결과물일세/g, '결과물이에요')
  next = next.replace(/사람일세/g, '사람이에요')
  next = next.replace(/층일세/g, '층이에요')
  next = next.replace(/일세(?=[.。!？\s,"'”’]|$)/g, '입니다')
  next = next.replace(/봐야 하네/g, '봐야 해요')
  next = next.replace(/잡아야 하네/g, '잡아야 해요')
  next = next.replace(/확인해야 하네/g, '확인해야 해요')
  next = next.replace(/세워야 하네/g, '세워야 해요')
  next = next.replace(/중요하네/g, '중요해요')
  next = next.replace(/위험하네/g, '위험해요')
  next = next.replace(/필요하네/g, '필요해요')
  next = next.replace(/정확하네/g, '정확해요')
  next = next.replace(/선명하네/g, '선명해요')
  next = next.replace(/달라지네/g, '달라져요')
  next = next.replace(/드러나네/g, '드러나요')
  next = next.replace(/움직이네/g, '움직여요')
  next = next.replace(/붙네/g, '붙어요')
  next = next.replace(/열리네/g, '열려요')
  next = next.replace(/새네/g, '세요')
  next = next.replace(/크네/g, '커요')
  next = next.replace(/깊네/g, '깊어요')
  next = next.replace(/맞네/g, '맞아요')
  next = next.replace(/남네/g, '남아요')
  next = next.replace(/오네/g, '와요')
  next = next.replace(/가네/g, '가요')
  next = next.replace(/하네(?=[.。!？\s,"'”’]|$)/g, '해요')
  next = next.replace(/되네(?=[.。!？\s,"'”’]|$)/g, '돼요')
  next = next.replace(/이네(?=[.。!？\s,"'”’]|$)/g, '이에요')
  next = next.replace(/쪽일세/g, '쪽이에요')
  next = next.replace(/것일세/g, '것이에요')
  next = next.replace(/상태일세/g, '상태예요')
  next = next.replace(/출발점일세/g, '출발점이에요')
  next = next.replace(/대비일세/g, '대비예요')
  next = next.replace(/온도일세/g, '온도예요')
  next = next.replace(/조건일세/g, '조건이에요')
  next = next.replace(/도구일세/g, '도구예요')
  next = next.replace(/지도일세/g, '지도예요')
  next = next.replace(/옷일세/g, '옷이에요')
  next = next.replace(/이름일세/g, '이름이에요')
  next = next.replace(/있네(?=[.。!？\s,"'\'”’]|$)/g, '있어요')
  next = next.replace(/보네(?=[.。!？\s,"'\'”’]|$)/g, '보여요')
  next = next.replace(/대네(?=[.。!？\s,"'\'”’]|$)/g, '대요')
  next = next.replace(/묶네(?=[.。!？\s,"'\'”’]|$)/g, '묶어요')
  next = next.replace(/정하네(?=[.。!？\s,"'\'”’]|$)/g, '정해요')
  next = next.replace(/재네(?=[.。!？\s,"'\'”’]|$)/g, '재요')
  next = next.replace(/앞서네(?=[.。!？\s,"'\'”’]|$)/g, '앞서요')
  next = next.replace(/잡히네(?=[.。!？\s,"'\'”’]|$)/g, '잡혀요')
  next = next.replace(/겹치네(?=[.。!？\s,"'\'”’]|$)/g, '겹쳐요')
  next = next.replace(/선명해지네/g, '선명해져요')
  next = next.replace(/지치네(?=[.。!？\s,"'\'”’]|$)/g, '지쳐요')
  next = next.replace(/바뀌네(?=[.。!？\s,"'\'”’]|$)/g, '바뀌어요')
  next = next.replace(/흔들리네/g, '흔들려요')
  next = next.replace(/말하네(?=[.。!？\s,"'\'”’]|$)/g, '말해요')
  next = next.replace(/많네(?=[.。!？\s,"'\'”’]|$)/g, '많아요')
  next = next.replace(/빠르네(?=[.。!？\s,"'\'”’]|$)/g, '빨라요')
  next = next.replace(/정해지네/g, '정해져요')
  next = next.replace(/나오네(?=[.。!？\s,"'\'”’]|$)/g, '나와요')
  next = next.replace(/이렇네(?=[.。!？\s,"'\'”’]|$)/g, '이래요')
  next = next.replace(/편하네(?=[.。!？\s,"'\'”’]|$)/g, '편해요')
  next = next.replace(/충분하네(?=[.。!？\s,"'\'”’]|$)/g, '충분해요')
  next = next.replace(/읽게(?=[.。!？\s,"'\'”’]|$)/g, '읽으세요')
  next = next.replace(/가게(?=[.。!？\s,"'\'”’]|$)/g, '가세요')
  next = next.replace(/두게(?=[.。!？\s,"'\'”’]|$)/g, '두세요')
  next = next.replace(/고르게(?=[.。!？\s,"'\'”’]|$)/g, '고르세요')
  next = next.replace(/쥐게(?=[.。!？\s,"'\'”’]|$)/g, '쥐세요')
  next = next.replace(/쌓게(?=[.。!？\s,"'\'”’]|$)/g, '쌓으세요')
  next = next.replace(/관찰하게(?=[.。!？\s,"'\'”’]|$)/g, '관찰하세요')
  next = next.replace(/마무리하게(?=[.。!？\s,"'\'”’]|$)/g, '마무리하세요')
  next = next.replace(/세우겠네/g, '세울게요')
  next = next.replace(/살피겠네/g, '살필게요')
  next = next.replace(/쓰겠네/g, '쓸게요')
  next = next.replace(/하였네/g, '했어요')
  next = next.replace(/했군(?=[.。!？\s,"'\'”’]|$)/g, '했어요')
  // Never replace an arbitrary stem + 네/군: 읽겠네 -> 읽겠요 corrupts Korean.
  next = next.replace(/읽겠네/g, '읽어볼게요')
  next = next.replace(/찾겠네/g, '찾아볼게요')
  next = next.replace(/적었네/g, '적어 주셨네요')
  next = next.replace(/보았네/g, '봤어요')
  next = next.replace(/잡네/g, '잡아요')
  next = next.replace(/보이는군/g, '보여요')
  next = next.replace(/올라오는군/g, '올라와요')
  next = next.replace(/움직이는군/g, '움직여요')
  next = next.replace(/바꾸는군/g, '바꿔요')
  next = next.replace(/안정시키는군/g, '안정시켜요')
  next = next.replace(/들어오는군/g, '들어와요')
  next = next.replace(/걸리는군/g, '걸려요')
  next = next.replace(/갈리는군/g, '갈려요')
  next = next.replace(/있는군/g, '있어요')
  next = next.replace(/약하군/g, '약해요')
  next = next.replace(/충분하군/g, '충분해요')
  next = next.replace(/보았군/g, '봤어요')
  next = next.replace(/라 했네/g, '라 했어요')
  next = next.replace(/이군(?=[.。!？\s,"'”’]|$)/g, '이에요')
  next = next.replace(/보게(?=[.。!？\s,"'”’]|$)/g, '보세요')
  next = next.replace(/걸세(?=[.。!？\s,"'”’]|$)/g, '거예요')
  next = next.replace(/허허…?\s*/g, '')

  next = next.replace(/아닐세/g, '아니에요')
  next = next.replace(/쉬우네|쉽네/g, '쉬워요')
  next = next.replace(/갈리네/g, '갈려요')
  next = next.replace(/닿네/g, '닿아요')
  next = next.replace(/가르네/g, '가려요')
  next = next.replace(/줄어드네/g, '줄어들어요')
  next = next.replace(/않네/g, '않아요')
  next = next.replace(/읽히네/g, '읽혀요')
  next = next.replace(/길어지네/g, '길어져요')
  next = next.replace(/두리 있네/g, '두고 있어요')
  next = next.replace(/있을세|있네/g, '있어요')
  next = next.replace(/공기일세/g, '공기예요')
  next = next.replace(/달들일세/g, '달들이에요')
  next = next.replace(/결일세/g, '결이에요')
  next = next.replace(/법일세/g, '법이에요')
  next = next.replace(/오해하지 말게/g, '오해하지 마세요')
  next = next.replace(/사라지지는 말게/g, '사라지지는 마세요')
  next = next.replace(/놓치지만 말게/g, '놓치지만 마세요')
  next = next.replace(/정하게(?=[.。!？\s,"'\'”’]|$)/g, '정하세요')
  next = next.replace(/삼게(?=[.。!？\s,"'\'”’]|$)/g, '삼으세요')
  next = next.replace(/말게(?=[.。!？\s,"'\'”’]|$)/g, '마세요')
  next = next.replace(/이군(?=[.。!？\s,"'\'”’]|$)/g, '이에요')
  next = next.replace(/하지\./g, '하지요.')
  next = next.replace(/보이에요/g, '보여요')
  // Unrecognised endings stay intact; generation-time voice and review handle them.

  return next
}

/** Apply neutralize only for non-classic services. */
export function applyServiceTone(text: string, serviceKey?: string | null): string {
  if (toneClose(serviceKey) === 'classic') return text
  return neutralizeDosase(text)
}
