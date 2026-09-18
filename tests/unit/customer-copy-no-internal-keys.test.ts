import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (relative: string) => readFileSync(join(root, relative), 'utf8')

/**
 * 2026-09-18: 올해 연애운 06-1 의 항목마다 "확인된 기준" 칩이 붙어 내부 식별자를 그대로
 * 찍고 있었다 — `service:love_this_year`, `birth:solar:1975-9-26:5`, `yearPillar:乙卯`,
 * `dayMasterElement:wood`. 한 페이지에 열 군데였고 생년월일과 내부 서비스 키가 노출됐다.
 * 생성기가 쓰는 값이지 고객에게 보여 줄 내용이 아니다.
 */
test('섹션 근거 칩은 고객 화면에 내부 식별자를 그리지 않는다', () => {
  const access = read('사주/js/umsh-report-access.js')
  const start = access.indexOf('function renderSectionEvidence')
  assert.notEqual(start, -1, '근거 칩 렌더러를 찾지 못했다')
  const body = access.slice(start, access.indexOf('\n  }', start))
  // patternKeys·ragTopics 를 다시 화면에 붙이면 같은 노출이 되살아난다.
  assert.doesNotMatch(body, /patternKeys/, '내부 식별자를 다시 그리고 있다')
  assert.doesNotMatch(body, /ragTopics/, '내부 식별자를 다시 그리고 있다')
  assert.doesNotMatch(body, /story-evidence/, '근거 칩 마크업이 되살아났다')
})

/**
 * 가드는 검증 전 슬롯을 가린다. visibility 로 가리면 상자가 남아 빈 구멍이 되므로
 * display 로 접는다. 브라우저가 옛 파일을 들고 있으면 고쳐도 반영되지 않으니, 페이지가
 * 가리키는 캐시 버전도 함께 올라가야 한다.
 */
test('06-1 페이지는 공용 접근 스크립트를 한 버전으로만 가리킨다', () => {
  const pages: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.html')) pages.push(full)
    }
  }
  walk(join(root, '사주'))
  const versions = new Set<string>()
  for (const page of pages) {
    for (const match of readFileSync(page, 'utf8').matchAll(/umsh-report-access\.js\?v=([a-z0-9-]+)/g)) {
      versions.add(match[1])
    }
  }
  assert.ok(versions.size > 0, '공용 접근 스크립트를 참조하는 페이지가 없다')
  assert.equal(versions.size, 1, `버전이 갈리면 일부 페이지만 옛 스크립트를 받는다: ${[...versions].join(', ')}`)
})
