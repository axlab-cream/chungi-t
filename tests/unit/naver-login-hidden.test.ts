import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

// Naver Login is in development review: only accounts registered in the Naver developer
// console can sign in, so every other customer hit a dead end (2026-10-02). It stays hidden
// until review passes and NAVER_LOGIN_ENABLED=true is set in the deployment environment.
const serverPath = new URL('../../src/server/app.ts', import.meta.url)
const pages = ['../../사주/사주/index.html', '../../사주/cmdg/index.html'].map(path => new URL(path, import.meta.url))

test('public auth config omits Naver unless NAVER_LOGIN_ENABLED is exactly true', async () => {
  const server = await readFile(serverPath, 'utf8')

  assert.match(server, /const NAVER_LOGIN_ENABLED = process\.env\.NAVER_LOGIN_ENABLED\?\.trim\(\) === 'true'/)
  assert.match(server, /naver: NAVER_LOGIN_ENABLED \? SUPABASE_NAVER_PROVIDER : '',/)
})

test('login sheets render no Naver button while the provider is off or config is loading', async () => {
  for (const page of pages) {
    const html = await readFile(page, 'utf8')
    const start = html.indexOf('function renderAuthProviderButton(')
    assert.ok(start > 0, `${page.pathname} has no provider renderer`)
    const head = html.slice(start, start + 400)
    assert.match(head, /if \(providerName === "naver" && !authConfigData\?\.providers\?\.naver\) return "";/, `${page.pathname} still renders a dead Naver button`)
  }
})
