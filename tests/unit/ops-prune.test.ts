import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

/**
 * 2026-09-19: 9/18 중복 사고가 남긴 succeeded 쌍둥이 수백 건이 작업 큐 화면의 최근 100건을
 * 다 차지했다. 운영자가 기준 시각 이전 내역을 지울 수 있게 한다. 지키는 것:
 *   1. running 과 일시정지 표지 행(ops.pause)은 어떤 경우에도 지우지 않는다.
 *   2. 기준 시각은 최소 1시간 전 — "방금"을 받으면 진행 중 리포트의 작업이 사라진다.
 *   3. 미리보기(dryRun)는 행을 읽지 않고 건수만 센다.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const previousEnv = { ...process.env }
process.env.SUPABASE_URL = 'https://ops-prune.synthetic.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_synthetic_prune'

const calls: Array<{ url: URL; init?: RequestInit }> = []
const nativeFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  calls.push({ url, init })
  if (url.pathname.endsWith('/ops_jobs') && (!init?.method || init.method === 'GET')) {
    return new Response('[]', { headers: { 'content-type': 'application/json', 'content-range': '0-0/312' } })
  }
  if (url.pathname.endsWith('/ops_jobs') && init?.method === 'DELETE') {
    return Response.json(Array.from({ length: 312 }, (_, i) => ({ id: `j${i}` })))
  }
  throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
}) as typeof fetch

const ops = await import('../../src/admin/ops-queue.js')

after(() => {
  globalThis.fetch = nativeFetch
  for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
  Object.assign(process.env, previousEnv)
})

describe('작업 내역 정리', { concurrency: false }, () => {
  before(() => { calls.length = 0 })
  const cutoff = '2026-09-18T06:00:00.000Z'

  it('미리보기는 count 헤더만 읽고, running·일시정지 표지 행은 필터로 뺀다', async () => {
    assert.equal(await ops.countOpsJobsBefore(cutoff), 312)
    const call = calls.at(-1)!
    assert.equal(call.init?.method ?? 'GET', 'GET')
    assert.equal(new Headers(call.init?.headers).get('prefer'), 'count=exact')
    assert.equal(call.url.searchParams.get('updated_at'), `lt.${cutoff}`)
    assert.equal(call.url.searchParams.get('state'), 'neq.running')
    assert.equal(call.url.searchParams.get('kind'), 'neq.ops.pause')
    assert.equal(call.url.searchParams.get('limit'), '1')
  })

  it('삭제는 같은 필터로 DELETE 하고 지운 행 수를 돌려준다', async () => {
    assert.equal(await ops.deleteOpsJobsBefore(cutoff), 312)
    const call = calls.at(-1)!
    assert.equal(call.init?.method, 'DELETE')
    assert.equal(call.url.searchParams.get('updated_at'), `lt.${cutoff}`)
    assert.equal(call.url.searchParams.get('state'), 'neq.running')
    assert.equal(call.url.searchParams.get('kind'), 'neq.ops.pause')
  })

  it('기준 시각이 1시간 이내이거나 미래면 지우지 않는다', async () => {
    const recent = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    await assert.rejects(ops.deleteOpsJobsBefore(recent), /OPS_PRUNE_CUTOFF_INVALID/)
    await assert.rejects(ops.deleteOpsJobsBefore(new Date(Date.now() + 60_000).toISOString()), /OPS_PRUNE_CUTOFF_INVALID/)
    await assert.rejects(ops.deleteOpsJobsBefore('not-a-date'), /OPS_PRUNE_CUTOFF_INVALID/)
    assert.equal(await ops.countOpsJobsBefore(recent), 0)
  })

  it('실패 코드 전용 정리는 나이 제한 없이 곧바로 지운다 — 처리기를 태우지 않고 닫힌 행이라 안전하다', async () => {
    assert.equal(await ops.countOpsJobsByErrorCode('OPS_DUPLICATE_TARGET'), 312)
    const countCall = calls.at(-1)!
    assert.equal(countCall.url.searchParams.get('last_error'), 'eq.OPS_DUPLICATE_TARGET')
    assert.equal(countCall.url.searchParams.get('state'), 'neq.running')
    assert.equal(countCall.url.searchParams.get('kind'), 'neq.ops.pause')
    assert.equal(countCall.url.searchParams.has('updated_at'), false, '나이 필터가 없어야 한다')

    assert.equal(await ops.deleteOpsJobsByErrorCode('OPS_DUPLICATE_TARGET'), 312)
    const deleteCall = calls.at(-1)!
    assert.equal(deleteCall.init?.method, 'DELETE')
    assert.equal(deleteCall.url.searchParams.get('last_error'), 'eq.OPS_DUPLICATE_TARGET')
  })

  it('형태가 이상한 실패 코드는 거절한다', async () => {
    assert.equal(await ops.countOpsJobsByErrorCode('not a code'), 0)
    await assert.rejects(ops.deleteOpsJobsByErrorCode('not a code'), /OPS_PRUNE_ERROR_CODE_INVALID/)
  })

  it('errorCode 라우트는 나이 검사를 건너뛰고, before 와 같은 감사 명령 경로를 쓴다', () => {
    const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
    const route = source.slice(source.indexOf("app.post('/api/admin/v1/jobs/prune'"), source.indexOf("app.post('/api/admin/v1/jobs/purge'"))
    assert.match(route, /requireStaff\(req, res, 'settings:write'\)/)
    assert.match(route, /countOpsJobsByErrorCode\(errorCode\)/)
    assert.match(route, /'ops\.jobs\.prune_by_error'/)
    assert.match(route, /deleteOpsJobsByErrorCode\(errorCode\)/)
  })

  it('라우트는 settings:write 를 요구하고, 실제 삭제만 감사 명령을 거치며, 1시간 규칙을 서버에서도 건다', () => {
    const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
    const route = source.slice(source.indexOf("app.post('/api/admin/v1/jobs/prune'"), source.indexOf("app.post('/api/admin/v1/jobs/purge'"))
    assert.match(route, /requireStaff\(req, res, 'settings:write'\)/)
    assert.match(route, /if \(dryRun\) \{ res\.json\(\{ before, dryRun: true, count: await countOpsJobsBefore\(before\) \}\); return \}/)
    assert.match(route, /executeAdminCommand\(/)
    assert.match(route, /'ops\.jobs\.prune'/)
    assert.match(route, /60 \* 60 \* 1000/)
  })

  it('화면은 미리보기 뒤에만 삭제 버튼을 열고, 확인 뒤에 지운다', () => {
    const ui = readFileSync(join(ROOT, 'admin-ui/index.html'), 'utf8')
    const jobs = ui.slice(ui.indexOf('async function loadOpsJobs'), ui.indexOf('async function renderReportDiagnostics'))
    assert.match(jobs, /body: JSON\.stringify\(\{ before: before, dryRun: true \}\)/)
    assert.match(jobs, /pruneDelete\.disabled = !payload\.count;/)
    assert.match(jobs, /window\.confirm\(before \+ ' 이전에 마지막으로 갱신된 작업 내역을 영구 삭제합니다/)
  })
})
