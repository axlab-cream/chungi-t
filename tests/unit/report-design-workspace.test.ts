import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const workspace = join(root, 'design-workspace', 'report-pages')
const pages = ['index.html', 'teaser.html', 'reading-list.html', 'reading-detail.html']
const assets = ['teaser-hero.webp', 'reading-list-cover.webp', 'reading-detail-hero.webp']
const context = { window: {} as { reportPreviewServices?: Array<{ key: string; title: string; source: string; image: string; conclusion: string; summary: string; sections: string[]; teaser?: { title: string; lead: string; signals: string[][]; syntheticPartner?: boolean } }> } }
runInNewContext(readFileSync(join(workspace, 'js/services.js'), 'utf8'), context)
const services = context.window.reportPreviewServices || []

describe('해석 화면 디자인 작업실', () => {
  it('세 화면과 허브, 공통 스타일, 로컬 이미지가 독립 폴더에 있다', () => {
    for (const file of [...pages, 'css/tokens.css', 'css/components.css', 'css/pages.css', 'js/preview.js', 'js/services.js', 'README.md']) {
      assert.equal(existsSync(join(workspace, file)), true, `${file} 파일이 필요하다`)
    }
    for (const file of assets) assert.equal(existsSync(join(workspace, 'assets', file)), true, `${file} 이미지가 필요하다`)
  })

  it('각 디자인 페이지는 샌드박스와 예시 데이터임을 분명히 밝힌다', () => {
    for (const file of pages.slice(1)) {
      const html = readFileSync(join(workspace, file), 'utf8')
      assert.match(html, /DESIGN SANDBOX/)
      assert.match(html, /디자인 확인용 예시|preview-content/)
      assert.match(html, /편집 가이드/)
      assert.match(html, /<meta name="viewport"/)
      assert.match(html, /id="preview-content"/)
    }
    assert.match(readFileSync(join(workspace, 'js/preview.js'), 'utf8'), /<h1[\s>]/)
  })

  it('운영 API·인증·결제·분석·브라우저 저장소와 연결하지 않는다', () => {
    const files = [...pages, 'css/tokens.css', 'css/components.css', 'css/pages.css', 'js/preview.js', 'js/services.js']
    const forbidden = [
      /fetch\s*\(/i,
      /XMLHttpRequest/i,
      /\/api\//i,
      /supabase/i,
      /localStorage/i,
      /sessionStorage/i,
      /umsh-analytics/i,
      /umsh-report-access/i,
      /checkout|payment|결제하기/i,
    ]
    for (const file of files) {
      const content = readFileSync(join(workspace, file), 'utf8')
      for (const pattern of forbidden) assert.doesNotMatch(content, pattern, `${file}에 운영 연결 표현 ${pattern}이 있다`)
      assert.doesNotMatch(content, /(?:https?:)?\/\//i, `${file}은 외부 자원을 참조하면 안 된다`)
      assert.doesNotMatch(content, /@import\b/i, `${file}은 외부 스타일을 불러오면 안 된다`)
      assert.doesNotMatch(content, /url\(\s*['"]?\s*(?:https?:|\/\/)/i, `${file}은 외부 CSS 자원을 참조하면 안 된다`)
    }
  })

  it('HTML의 모든 상대 자원 경로가 작업 폴더 안에 있고 실제 존재한다', () => {
    for (const file of pages) {
      const content = readFileSync(join(workspace, file), 'utf8')
      const refs = [...content.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
      for (const ref of refs) {
        if (ref.startsWith('#')) continue
        const clean = ref.split(/[?#]/, 1)[0]
        const target = resolve(dirname(join(workspace, file)), clean)
        assert.equal(target.startsWith(`${resolve(workspace)}${sep}`), true, `${file}의 ${ref}가 작업 폴더 밖을 가리킨다`)
        assert.equal(existsSync(target), true, `${file}의 ${ref}가 존재하지 않는다`)
      }
    }
  })

  it('20개 서비스마다 세 화면을 독립 URL로 열고 로컬 이미지만 참조한다', () => {
    assert.equal(services.length, 20)
    assert.equal(new Set(services.map((service) => service.key)).size, 20)
    for (const service of services) {
      assert.ok(service.title)
      assert.ok(service.conclusion)
      assert.ok(service.summary)
      assert.equal(service.sections.length, 3)
      assert.equal(existsSync(join(workspace, service.image)), true, `${service.key} 이미지가 필요하다`)
      assert.ok(['verified', 'template'].includes(service.source))
    }
    const script = readFileSync(join(workspace, 'js/preview.js'), 'utf8')
    for (const page of pages.slice(1)) {
      const html = readFileSync(join(workspace, page), 'utf8')
      assert.match(html, /js\/services\.js/)
      assert.match(html, /js\/preview\.js/)
      assert.match(html, /id="preview-content"/)
    }
    assert.match(script, /encodeURIComponent\(service\.key\)/)
    assert.match(script, /해석 목록/)
    assert.match(script, /해석 상세/)
  })

  it('실제 무료 티저를 확인한 서비스와 미확인 예시를 구분한다', () => {
    const confirmed = services.filter((service) => service.teaser)
    assert.equal(confirmed.length, 10)
    assert.equal(confirmed.filter((service) => service.teaser?.syntheticPartner).length, 3)
    for (const service of confirmed) {
      assert.equal(service.source, 'verified')
      assert.ok(service.teaser?.title)
      assert.ok(service.teaser?.lead)
      assert.ok((service.teaser?.signals.length || 0) >= 3)
    }
    const script = readFileSync(join(workspace, 'js/preview.js'), 'utf8')
    assert.match(script, /운영 티저 구조 확인/)
    assert.match(script, /운영 티저 미확인/)
  })

  it('비식별 자료에 리포트 ID·개인 이름·회사명·원본 링크를 넣지 않는다', () => {
    const data = readFileSync(join(workspace, 'js/services.js'), 'utf8')
    assert.doesNotMatch(data, /reportId|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
    assert.doesNotMatch(data, /정재용|더크림유니언/)
    assert.doesNotMatch(data, /https?:\/\//i)
  })
})
