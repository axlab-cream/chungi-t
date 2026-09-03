import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pagePath = new URL('../../사주/사주/index.html', import.meta.url)
const serverPath = new URL('../../src/server/app.ts', import.meta.url)

test('Google login uses GIS on the umsh.kr origin', async () => {
  const page = await readFile(pagePath, 'utf8')

  assert.match(page, /function shouldUseGoogleIdentity\(\)/)
  assert.match(page, /"https:\/\/umsh\.kr"/)
  assert.match(page, /authClient\.auth\.signInWithIdToken\(\{/)
  assert.match(page, /providerName === "google" && isConfigured && shouldUseGoogleIdentity\(\)/)
})

test('public auth config exposes the Google Web Client ID', async () => {
  const server = await readFile(serverPath, 'utf8')

  assert.match(server, /process\.env\.SUPABASE_GOOGLE_CLIENT_ID/)
  assert.match(server, /googleClientId: SUPABASE_GOOGLE_CLIENT_ID/)
})
