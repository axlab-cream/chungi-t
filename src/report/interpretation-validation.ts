import type { SajuReportContext, SajuReportSection } from '../types/index.js'

export interface InterpretationReview { passed: boolean; issues: string[]; characters: number; paragraphs: number }

/** Deterministic safety/format checks, not a claim of semantic or predictive accuracy. */
export function reviewInterpretation(text: string, context: SajuReportContext, siblings: SajuReportSection[] = []): InterpretationReview {
  const issues: string[] = []
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  const proseParagraphs = paragraphs.filter((paragraph) => {
    const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean)
    return !lines.every((line) => /^#{1,6}\s+\S/.test(line) || /^\|.*\|$/.test(line) || /^[-:|\s]+$/.test(line))
  })
  // Sanity floor only; the service contract, not a global long-form template, sets density.
  if (text.trim().length < 80) issues.push('질문의 답·근거·생활 장면·다음 기준을 갖춘 해석을 작성하세요.')
  if ((text.match(/[.!?。](?:\s|$)/g) ?? []).length < 3) issues.push('판단과 근거, 다음 기준을 구분해 완성된 문장으로 작성하세요.')
  if (proseParagraphs.some((paragraph) => {
    const sentences = paragraph.match(/[^.!?。]+[.!?。]+(?=\s|$)/g) ?? []
    return sentences.length < 2 || sentences.length > 4
  })) issues.push('각 의미 단락은 2~4개의 완성 문장으로 묶고 의미가 바뀌면 빈 줄을 두세요.')
  if (/[\p{L}\p{N}]+(?:\s*\/\s*[\p{L}\p{N}]+){3,}/u.test(text)) issues.push('긴 목록을 슬래시로 압축하지 말고 문장이나 항목으로 나누세요.')
  if (/\b(?:concept|condition|interpretation|serviceKey|main_purpose|desk_position|Feature JSON)\s*[:=]|상담 의도:|\d+점 번들|\bhot\/dry\b/i.test(text)) issues.push('내부 필드나 타 서비스 원문이 노출되었습니다.')
  if (/풀이\s*\d+|에서 보는 핵심|확인한 기준|이 풀이에 반영한 정보|상세는 서버 권한|서버 권한 확인|해석을 준비|로그인과 결제 상태|결제 전|진행 중|취소 또는 실패/.test(text)) issues.push('제작용 제목·운영 상태·권한/결제 안내를 고객 해석 본문에 노출하지 마세요.')
  if (/측정\s*전|자료\s*(?:없|미확인|부족)|(?<![\p{L}\p{N}])(?:DEM(?![A-Za-z0-9_])|(?:고도|사면|능선|골짜기)(?=$|[\s,.:;!?"'“”‘’()]|은|는|이|가|을|를|의|에|와|과|로|값|항목|자료))/u.test(text)) issues.push('데이터 결손이나 내부 지형 항목을 고객에게 직접 말하지 말고 유사도·생활 패턴으로 번역하세요.')
  if (/편재이|당신로|읽겠요|찾겠요|잡요|적었요|보았요|결를|년["”']?라\s|자시을/.test(text)) issues.push('조사 또는 종결어미를 바로잡으세요.')
  if (/바람기 레이더|반드시 (?:합격|이별|결혼)|외도를 (?:합니다|할|확인)/.test(text)) issues.push('확인되지 않은 사건을 단정하거나 외도 탐지처럼 표현하지 마세요.')
  if (/(?:이기는|합격하는) (?:사람|시험)|승부는[^.\n]{0,130}갈리/.test(text)) issues.push('행동이나 운이 승패를 결정한다고 단정하지 말고 실력 재현에 도움이 될 수 있는 조건으로 설명하세요.')
  if (new Set(paragraphs).size < paragraphs.length) issues.push('같은 문단이 중복되었습니다.')
  // 가이드가 확정 예언으로 금지한 표현. '반드시 합격' 류는 위에서 이미 걸리므로 남은 것만 본다.
  if (/무조건|100\s*%|망한다|이혼한다|사고가 난다|파산한다/.test(text)) issues.push('확정 예언 표현을 조건과 가능성의 말로 바꾸세요.')
  // 같은 문장을 두 번 말하면 분량이 아니라 반복이다. 문단 중복만 보면 놓친다.
  const said = new Set<string>()
  for (const sentence of text.match(/[^.!?。]+(?:[.!?。]+|$)/g) ?? []) {
    const key = sentence.replace(/^\[[^\]]+\]\s*/, '').replace(/\s+/g, '')
    if (key.length < 45) continue
    if (said.has(key)) { issues.push('같은 문장을 두 번 쓰지 말고 항목마다 다른 답을 쓰세요.'); break }
    said.add(key)
  }
  // 출생 시각을 받지 못했으면 시주에서 나온 결론을 확정으로 말할 수 없다. 시간을 모른다고
  // 밝히는 문장은 정상이므로, 시주를 근거로 단정하는 형태만 본다.
  if (context.birthTimeKnown === false
      && /시주\((?:時柱)?[^)]*\)?[는이가]\s*[^.\n]{0,40}(?:이므로|이니|여서|라서|해서|아서|어서|입니다|합니다|유리|불리)|시주를? 기준으로|태어난 시간이 [^.\n]{0,20}(?:이므로|이니)/.test(text)) {
    issues.push('출생 시각을 받지 못했으므로 시주를 근거로 단정하지 말고 확인이 필요하다고 밝히세요.')
  }
  const prior = new Set(siblings.flatMap((item) => item.interpretation.split(/\n\s*\n/)).map((part) => part.replace(/^\[[^\]]+\]\s*/, '').trim()).filter((part) => part.length > 100))
  if (paragraphs.filter((part) => prior.has(part.replace(/^\[[^\]]+\]\s*/, '').trim())).length >= 2) issues.push('다른 항목의 문단을 반복하지 말고 현재 질문에 고유한 답을 쓰세요.')
  if (context.serviceKey === 'home_fit') {
    const sentences = (value: string) => value.replace(/\[[^\]]+\]/g, '').split(/(?<=[.!?])\s+|\n+/).map(line => line.replace(/\s+/g, ' ').trim()).filter(line => line.length >= 45)
    const otherSentences = new Set(siblings.flatMap(item => sentences(item.interpretation)))
    if (sentences(text).filter(line => otherSentences.has(line)).length >= 2) issues.push('다른 집 풍수 항목과 긴 문장 2개 이상이 겹칩니다. 현재 공간과 질문에 맞는 다른 근거·생활 사례를 사용하세요.')
    if (/풀이\s*\d+|에서 보는 핵심|겁주기보다 확인 방법/.test(text)) issues.push('제작 지침이나 번호 대신 문단 주제가 드러나는 소제목을 쓰세요.')
    if (/두 가지 이상이 좋아지면/.test(text)) issues.push('개선된 항목 개수로 거주나 이사 결정을 판정하지 마세요.')
  }
  const input = JSON.stringify(context)
  if (/차단|연락.{0,10}(?:원하지|거부|하지 말)|접촉.{0,8}금지/.test(input)
      && /(?:부담 없는|가벼운|한 번|먼저).{0,20}(?:연락|확인.{0,5}건네|메시지).{0,20}(?:보내|건네|해보|해 보)/.test(text)) issues.push('명시적 연락 거부가 있으므로 재접촉을 제안하지 마세요.')
  // A bare Chinese word without a nearby reading/explanation is not accessible prose.
  for (const match of text.matchAll(/[一-龥]{2,}/g)) {
    const at = match.index ?? 0
    if (!/[가-힣]\($/.test(text.slice(Math.max(0, at - 20), at)) && !/^[（(][가-힣]/.test(text.slice(at + match[0].length))) {
      issues.push('한자 단독 표기를 한글 독음과 쉬운 뜻으로 설명하세요.')
      break
    }
  }
  return { passed: issues.length === 0, issues, characters: text.length, paragraphs: paragraphs.length }
}

export class InterpretationQualityError extends Error {
  constructor(public readonly review: InterpretationReview) {
    super(review.issues.join(' '))
    this.name = 'InterpretationQualityError'
  }
}
