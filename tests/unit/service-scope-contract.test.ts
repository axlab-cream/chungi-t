import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { MARRY_MATCH_TOC } from '../../src/match/marry-service.js'

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')

const scopes = [
  { id: 'save', check: 'save', groups: 8, items: 16 },
  { id: 'quit', check: 'quit', groups: 8, items: 20 },
  { id: 'couple', check: 'couple', groups: 14, items: 28 },
  { id: 'marry', check: 'marry', groups: 10, items: 24 },
  { id: 'signal', check: 'signal', groups: 10, items: 21 },
  { id: 'thisyear', check: 'thisyear', groups: 8, items: 24 },
  { id: 'jobchoice', check: 'jobchoice', groups: 10, items: 21 },
  { id: 'cat', check: 'cat', groups: 10, items: 20 },
  { id: 'lucky', check: 'lucky', groups: 6, items: 13 },
  { id: 'wedding', check: 'wedding', groups: 6, items: 12 },
  { id: 'newyear', check: 'newyear', groups: 10, items: 20 },
]

test('축소된 서비스 범위가 런타임 검수값과 고객 안내에서 일치한다', () => {
  const marryItems = MARRY_MATCH_TOC.reduce((total, group) => total + group.items.length, 0)
  assert.equal(MARRY_MATCH_TOC.length, 10)
  assert.equal(marryItems, 24)

  const about = read('사주/about.html')

  for (const scope of scopes) {
    const guard = read(`scripts/check-${scope.check}.mjs`)
    assert.match(guard, new RegExp(`const EXPECTED_GROUPS = ${scope.groups}`), `${scope.id} 묶음 검수값`)
    assert.match(guard, new RegExp(`const EXPECTED_ITEMS = ${scope.items}`), `${scope.id} 항목 검수값`)

    const start = about.indexOf(`<details class="shell service-detail" id="service-${scope.id}"`)
    const end = about.indexOf('</details>', start)
    assert.ok(start >= 0 && end > start, `${scope.id} 상세 안내를 찾을 수 없습니다`)
    assert.match(
      about.slice(start, end),
      new RegExp(`상세 풀이 목차 · ${scope.groups}묶음 ${scope.items}개 항목`),
      `${scope.id} 고객 안내 범위`,
    )
    const chips = about.slice(start, end).match(/class="toc-chip"/g) ?? []
    assert.equal(chips.length, scope.groups, `${scope.id} 고객 안내 묶음 칩 수`)
  }
})
