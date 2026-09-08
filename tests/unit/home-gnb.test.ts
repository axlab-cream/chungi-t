import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const source = readFileSync('사주/js/umsh-home-reading.js', 'utf8')
const reveal = source.slice(source.indexOf('function reveal()'), source.indexOf('function render(payload)'))
for (const page of ['step-4-report','step-5-chat','step-6_1-report']) {
  test(`home ${page} preserves the existing common GNB before removing its temporary wrapper`, () => {
    const events: string[] = [], liveHost = { identity: 'original-header' }
    const root = { querySelector: () => ({remove: () => events.push('placeholder-removed')}), prepend: (node: unknown) => {assert.equal(node, liveHost);events.push('header-moved')} }
    const guard = { querySelector: () => liveHost, remove: () => events.push('guard-removed') }
    let hasGuard = true
    const document = {getElementById: (id: string) => id === page ? root : id === 'umsh-verified-layout' && hasGuard ? guard : null, documentElement:{removeAttribute: () => {}}, querySelectorAll: () => []}
    runInNewContext(reveal + '; reveal()', {document})
    assert.deepEqual(events, ['placeholder-removed','header-moved','guard-removed'])
    hasGuard = false
    runInNewContext(reveal + '; reveal()', {document})
    assert.equal(events.length, 3)
  })
}
