// Verifies that Git/Vercel/Supabase/payment wiring is live end to end.
// Usage: node scripts/check-integrations.mjs [--base https://umsh.kr]
// Exits 1 when a required check fails, so it can gate a deploy.

const DEFAULT_BASE = 'https://umsh.kr'
const REQUIRED_TABLES = ['cheongi_reports', 'cheongi_user_profiles', 'cheongi_payment_orders']
const TIMEOUT_MS = 15000

function parseBase(argv) {
  const index = argv.indexOf('--base')
  if (index >= 0 && argv[index + 1]) return argv[index + 1].replace(/\/$/, '')
  return (process.env.PUBLIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
  const text = await response.text()
  try {
    return { status: response.status, body: JSON.parse(text) }
  } catch {
    return { status: response.status, body: text }
  }
}

const results = []
function record(name, ok, detail, required = true) {
  results.push({ name, ok, detail, required })
  const mark = ok ? 'PASS' : required ? 'FAIL' : 'WARN'
  console.log(`${mark.padEnd(4)}  ${name.padEnd(34)} ${detail}`)
}

async function checkHealth(base) {
  try {
    const { status, body } = await getJson(`${base}/api/health`)
    record('server /api/health', status === 200 && body?.ok === true, `HTTP ${status}`)
    record('OpenAI key configured', body?.openai === true, body?.openai ? 'ready' : 'OPENAI_API_KEY missing')
  } catch (error) {
    record('server /api/health', false, `unreachable: ${error.message}`)
  }
}

async function checkAuth(base) {
  try {
    const { status, body } = await getJson(`${base}/api/auth/config`)
    record('Supabase auth config', status === 200 && body?.enabled === true, `HTTP ${status}`)
    record(
      'Supabase publishable key',
      Boolean(body?.publishableKey),
      body?.publishableKey ? 'present' : 'SUPABASE_PUBLISHABLE_KEY missing',
    )
    return { url: body?.url || '', key: body?.publishableKey || '' }
  } catch (error) {
    record('Supabase auth config', false, `unreachable: ${error.message}`)
    return { url: '', key: '' }
  }
}

// PostgREST answers 42501 for an existing RLS-protected table and PGRST205 when the
// table is absent, so an anonymous probe is enough to prove a table was created.
async function checkTables({ url, key }) {
  if (!url || !key) {
    record('Supabase tables', false, 'skipped: no Supabase URL/key from /api/auth/config')
    return
  }
  for (const table of REQUIRED_TABLES) {
    try {
      const { body } = await getJson(`${url}/rest/v1/${table}?select=*&limit=1`, {
        apikey: key,
        Authorization: `Bearer ${key}`,
      })
      const code = body?.code
      const exists = code !== 'PGRST205'
      record(`table ${table}`, exists, exists ? 'exists' : 'MISSING - run the matching .sql file')
    } catch (error) {
      record(`table ${table}`, false, `probe failed: ${error.message}`)
    }
  }
}

async function checkPayment(base) {
  try {
    const { status, body } = await getJson(`${base}/api/payment/config`)
    if (status !== 200) {
      record('payment config', false, `HTTP ${status}`)
      return
    }
    record('Inicis MID/SignKey', body?.configured === true, body?.configured ? 'ready' : 'INICIS_MID / INICIS_SIGNKEY missing')
    record(
      'payment order storage',
      body?.storageReady === true,
      body?.storage === 'memory' ? 'memory - orders would be lost between requests' : `${body?.storage}`,
    )
    record('checkout enabled', body?.checkoutEnabled === true, body?.setupMessage || 'ready')
  } catch (error) {
    record('payment config', false, `unreachable: ${error.message}`)
  }
}

const base = parseBase(process.argv.slice(2))
console.log(`\nchungi-t integration check -> ${base}\n`)

await checkHealth(base)
const supabase = await checkAuth(base)
await checkTables(supabase)
await checkPayment(base)

const failed = results.filter((r) => !r.ok && r.required)
console.log('')
if (failed.length === 0) {
  console.log('All required checks passed.')
  process.exit(0)
}
console.log(`${failed.length} required check(s) failed:`)
for (const item of failed) console.log(`  - ${item.name}: ${item.detail}`)
process.exit(1)
