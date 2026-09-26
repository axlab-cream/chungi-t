import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

test('직장 핏은 잘림 없는 대표 이미지와 21개 단일 토글 이미지를 사용한다', () => {
  const blocks = JSON.parse(read('사주/data/longform-blocks.json'))
  const service = blocks.services.job_choice as {
    thumbnail: string
    summaryImageFit: string
    sectionImages: string[]
  }

  assert.equal(service.summaryImageFit, 'wide')
  assert.match(service.thumbnail, /^\/work\/job-choice\/assets\/job-choice\/reading-v2\/00-.+\.webp$/)
  assert.equal(service.sectionImages.length, 21)
  assert.equal(new Set(service.sectionImages).size, 21)
  for (const image of [service.thumbnail, ...service.sectionImages]) {
    assert.ok(existsSync(join(root, '사주', image)), `이미지 파일이 없습니다: ${image}`)
  }
})

test('직장 핏 삽입형 리더는 공용 마크다운·이미지·토글 컴포넌트를 사용한다', () => {
  const reader = read('사주/js/umsh-report-access.js')
  const style = read('사주/css/umsh-verified-inplace.css')
  const longformStyle = read('사주/css/umsh-longform.css')
  const page = read('사주/work/job-choice/06-step-6_1-report-detail/index.html')

  assert.match(reader, /function renderMarkdownTable\(markdown, caption\)/)
  assert.match(reader, /function serviceCardBody\(section, payload, body, index\)/)
  assert.match(reader, /function configuredSectionImage\(config, order\)/)
  assert.match(reader, /function renderSectionImage\(section, serviceKey\)/)
  assert.match(reader, /renderSectionImage\(section, reportServiceKey\(payload\)\)/)
  assert.match(style, /\.reading-card\.is-ready\s+> summary::after \{ content: "펼치기 \+"; \}/)
  assert.match(style, /\.reading-card\.is-ready\[open\] > summary::after \{ content: "접기 −"; \}/)
  assert.match(style, /aspect-ratio: 3 \/ 2/)
  assert.match(longformStyle, /\.umsh-summary-figure\.is-wide-summary/)
  assert.match(longformStyle, /object-fit: contain/)
  assert.match(page, /id="umsh-inplace-css"/)
  assert.match(page, /umsh-report-access\.js\?v=20260926-reading-toggle-v4/)
})
