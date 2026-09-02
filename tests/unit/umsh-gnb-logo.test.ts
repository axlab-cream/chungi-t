import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'

const SAJU_ROOT = join(process.cwd(), '사주')

function htmlFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return htmlFiles(path)
    return entry.isFile() && entry.name.endsWith('.html') ? [path] : []
  })
}

test('every visible UMSH header uses the main logo directly or through shared chrome', () => {
  const failures = htmlFiles(SAJU_ROOT).flatMap((path) => {
    const html = readFileSync(path, 'utf8')
    if (!/<header\b/i.test(html)) return []

    const usesMainLogo = /umsh-brand-logo\.png/.test(html)
    const usesSharedChrome = /data-umsh-chrome/.test(html) && /umsh-chrome\.js/.test(html)
    return usesMainLogo || usesSharedChrome ? [] : [relative(process.cwd(), path)]
  })

  assert.deepEqual(failures, [])
})
