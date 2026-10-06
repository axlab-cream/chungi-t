import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

/**
 * 2026-10-06: PDF 저장은 모든 서비스에서 본문 끝 공통 자리(`.umsh-pdf-dock` 또는 리더 도구)에 둔다.
 *
 * 올해연애·냥궁합·두사람궁합·행운은 상단바(contextbar/header)에 따로 PDF 버튼이 남아 있었다.
 * 상세 화면 버튼은 지워진 sessionStorage 사본을 찾다 `window.print()` 로 떨어졌고, 목차 화면
 * 버튼은 "열린 뒤 저장할 수 있어요" 안내만 띄웠다. 상단에 `#btn-pdf` 가 있으면 공용 자리
 * (`ensurePdfDock`)도 생기지 않아, 서비스마다 버튼 위치가 달랐다.
 */
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const pages = [
  '사주/love/this-year/05-step-5-chat/chat.html',
  '사주/love/this-year/06-step-6_1-report-detail/index.html',
  '사주/match/cat/05-step-5-chat/chat.html',
  '사주/match/cat/06-step-6_1-report-detail/index.html',
  '사주/match/couple/05-step-5-chat/chat.html',
]

test('service pages no longer put their own PDF button in the top bar', () => {
  for (const page of pages) {
    const html = read(page)
    assert.doesNotMatch(html, /id="(?:btn-pdf|btnPdf)"/, `${page} 상단에 화면 전용 PDF 버튼이 남아 있다`)
    assert.doesNotMatch(html, /openFromStorage\(\)/, `${page} 가 지워진 저장 사본에 기대는 PDF 경로를 쓴다`)
  }
})

test('lucky service places its PDF button at the end of the page, not in the header', () => {
  const lucky = read('사주/js/lucky-service.js')
  assert.doesNotMatch(lucky, /\$\('#step-[^']*header'\)/, '행운 PDF 버튼이 다시 상단바에 붙는다')
  assert.match(lucky, /dock\.className = 'umsh-pdf-dock'/)
  assert.match(lucky, /page\.insertBefore\(dock, before\)/)
})
