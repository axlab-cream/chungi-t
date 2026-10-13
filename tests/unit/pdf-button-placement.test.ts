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

/**
 * 2026-10-12: 정책이 바뀌었다. PDF 저장은 보관함(`/vault`) 카드 한 곳에서만 받는다.
 * 결과 화면(상세 06 · 고유 주소 `/r/:id` · 상담 chat)에는 더 이상 두지 않는다.
 */
test('result screens no longer offer their own PDF button', () => {
  const chatHtml = read('사주/chat.html')
  assert.doesNotMatch(chatHtml, /id="btn-pdf"/, '상담 화면에 PDF 버튼이 남아 있다')
  assert.doesNotMatch(chatHtml, /umsh-pdf-dock/, '상담 화면에 PDF 도크가 남아 있다')

  const chatJs = read('사주/js/chat.js')
  assert.doesNotMatch(chatJs, /data-report-pdf>PDF/, '리포트 본문에 PDF 버튼이 남아 있다')

  const access = read('사주/js/umsh-report-access.js')
  assert.doesNotMatch(access, /data-umsh-pdf>PDF/, '공용 리더 도구에 PDF 버튼이 남아 있다')
})

test('the vault keeps the only PDF entry point', () => {
  const vault = read('사주/vault.html')
  assert.match(vault, /class="vault-pdf/, '보관함 카드에서 PDF 버튼이 사라졌다')
  assert.match(vault, /downloadPdf\(button/, '보관함 PDF 내려받기 동작이 사라졌다')
})
