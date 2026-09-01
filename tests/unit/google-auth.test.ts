import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pagePath = new URL('../../사주/사주/index.html', import.meta.url)
const serverPath = new URL('../../src/server/app.ts', import.meta.url)

test('Google identity only runs on umsh.kr, not Vercel app hosts', async () => {
  const page = await readFile(pagePath, 'utf8')

  assert.match(page, /function googleIdentityOrigins\(\)/)
  assert.match(page, /"https:\/\/umsh\.kr"/)
  assert.match(page, /CANONICAL_REDIRECT_HOSTS|vercel\\\.app/)
  const originsBlock = page.slice(page.indexOf('function googleIdentityOrigins'), page.indexOf('function shouldUseGoogleIdentity'))
  assert.doesNotMatch(originsBlock, /chungi-t\.vercel\.app/)
  assert.match(page, /authClient\.auth\.signInWithIdToken\(\{/)
})

test('production Vercel aliases redirect to umsh.kr', async () => {
  const server = await readFile(serverPath, 'utf8')
  assert.match(server, /CANONICAL_REDIRECT_HOSTS/)
  assert.match(server, /chungi-t\.vercel\.app/)
  assert.match(server, /https:\/\/umsh\.kr/)
})

test('public auth config exposes the Google Web Client ID', async () => {
  const server = await readFile(serverPath, 'utf8')
  assert.match(server, /googleClientId: SUPABASE_GOOGLE_CLIENT_ID/)
})
