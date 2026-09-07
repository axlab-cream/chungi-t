import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { ReportOwner, ReportRecord } from '../../src/report/report-store.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

// This test file runs in its own Node test process. Set these BEFORE the dynamic
// store import so dotenv and pg can never select a real project or database.
const testEnv = {
  NODE_ENV: 'test',
  SUPABASE_URL: 'https://report-store-test.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'mock-public-key',
  SUPABASE_SERVICE_ROLE_KEY: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"role":"service_role","ref":"report-store-test"}').toString('base64url')}.mock_signature`,
} as const
const oldEnv = new Map<string, string | undefined>(Object.keys(testEnv).concat('DATABASE_URL', 'REPORT_STORAGE_DIR', 'VERCEL').map((key) => [key, process.env[key]]))
Object.assign(process.env, testEnv)
delete process.env.DATABASE_URL
delete process.env.REPORT_STORAGE_DIR
delete process.env.VERCEL

const owner: ReportOwner = { id: 'owner-a', email: 'a@example.invalid', provider: 'mock', accessToken: 'mock-token-a' }
const otherOwner: ReportOwner = { id: 'owner-b', email: 'b@example.invalid', accessToken: 'mock-token-b' }
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const context = { serviceKey: 'work_job', name: '저장 경로 검증', concern: '특별한 문제 없이 잘 지냅니다.' }
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

interface Row {
  report_id: string
  user_id: string
  user_email?: string | null
  auth_provider?: string | null
  payload: ReportRecord
  created_at?: string
  updated_at?: string
}
interface Call {
  method: string
  url: URL
  headers: Headers
  body?: Record<string, unknown>
}

/** A deliberately small PostgREST model: only the contract this store uses. */
class FakeReportRest {
  rows = new Map<string, Row>()
  calls: Call[] = []
  rejectServiceKey = false
  beforePatch?: (call: Call, rows: Map<string, Row>) => void

  private response(rows: unknown, status = 200): Response {
    return new Response(JSON.stringify(copy(rows)), { status, headers: { 'content-type': 'application/json' } })
  }

  fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    assert.equal(url.origin, testEnv.SUPABASE_URL, 'A real network URL must never be reached')
    assert.equal(url.pathname, '/rest/v1/cheongi_reports')
    const headers = new Headers(init?.headers)
    const method = init?.method ?? 'GET'
    const call: Call = { method, url, headers, body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined }
    this.calls.push(call)
    const authorization = headers.get('authorization')
    const privileged = authorization === `Bearer ${testEnv.SUPABASE_SERVICE_ROLE_KEY}`
    if (privileged && this.rejectServiceKey) return this.response({ message: 'mock stale server key' }, 401)
    // The production table is private even to an authenticated row owner. RLS
    // cannot hide selected JSON fields or enforce the application's paywall.
    if (!privileged) return this.response({ message: 'mock private table permission denied' }, 403)
    assert.equal(headers.get('apikey'), testEnv.SUPABASE_SERVICE_ROLE_KEY)

    if (method === 'POST') {
      const row = copy(call.body) as unknown as Row
      assert.ok(row.user_id, 'Inserts must bind a verified owner')
      const existing = this.rows.get(row.report_id)
      if (existing && headers.get('prefer')?.includes('resolution=ignore-duplicates')) return this.response([])
      row.created_at = existing?.created_at ?? row.payload.createdAt
      row.updated_at = row.payload.updatedAt
      this.rows.set(row.report_id, row)
      return this.response([row], existing ? 200 : 201)
    }

    if (method === 'PATCH') this.beforePatch?.(call, this.rows)
    let matched = [...this.rows.values()]
    const reportFilter = url.searchParams.get('report_id')
    if (reportFilter) {
      assert.ok(reportFilter.startsWith('eq.'))
      matched = matched.filter((row) => row.report_id === reportFilter.slice(3))
    }
    const userFilter = url.searchParams.get('user_id')
    assert.ok(userFilter && userFilter.startsWith('eq.') && userFilter.length > 3, 'Every read or mutation must constrain its owner despite the privileged key')
    if (userFilter) {
      assert.ok(userFilter.startsWith('eq.'))
      matched = matched.filter((row) => row.user_id === userFilter.slice(3))
    }
    const eitherId = url.searchParams.get('or')
    if (eitherId) {
      const ids = eitherId.match(/^\(payload->>resultId\.eq\.([\w-]+),payload->report->>publicId\.eq\.([\w-]+)\)$/)
      assert.ok(ids, 'UUID lookup must filter the JSON payload fields, not a missing SQL column')
      matched = matched.filter((row) => row.payload.resultId === ids[1] || row.payload.report.publicId === ids[2])
    }
    const revisionFilter = url.searchParams.get('payload->>revision')
    if (revisionFilter) {
      matched = matched.filter((row) => revisionFilter === 'is.null' ? row.payload.revision === undefined : String(row.payload.revision) === revisionFilter.slice(3))
    }

    if (method === 'GET') {
      if (url.searchParams.get('order') === 'updated_at.desc') matched.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
      const limit = url.searchParams.get('limit')
      if (limit) matched = matched.slice(0, Number(limit))
      return this.response(matched)
    }
    assert.ok(reportFilter, 'Mutations must explicitly constrain the report')
    assert.equal(headers.get('prefer'), 'return=representation')
    if (method === 'PATCH') {
      assert.ok(revisionFilter, 'A mutation needs a revision compare-and-swap')
      const payload = call.body?.payload as ReportRecord
      matched = matched.map((row) => {
        const updated = { ...row, payload: copy(payload), updated_at: String(call.body?.updated_at) }
        this.rows.set(row.report_id, updated)
        return updated
      })
    } else if (method === 'DELETE') {
      matched.forEach((row) => this.rows.delete(row.report_id))
    } else {
      assert.fail(`Unsupported mocked REST method: ${method}`)
    }
    return this.response(matched)
  }
}

let rest = new FakeReportRest()
const realFetch = globalThis.fetch
// Never forward to realFetch, including an unexpected request during import.
globalThis.fetch = (...args) => rest.fetch(...args)
const store = await import('../../src/report/report-store.js')
after(() => {
  globalThis.fetch = realFetch
  for (const [key, value] of oldEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
beforeEach(() => { rest = new FakeReportRest() })

function section(id: string): SajuReportSection {
  return { id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '일', categoryEn: 'Work', classification: id, hook: '현재 좋은 조건을 유지할 기준', patternKeys: [], ragTopics: [], interpretation: '현재 알려진 내용에서는 특별한 문제가 확인되지 않습니다. 실제 경험을 기준으로 판단합니다.' }
}
function template(ids = ['one', 'two']): SajuReport {
  return { title: '모의 저장 검증', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) }
}
function create(reportId = 'rest-report-a', reportOwner = owner, ids?: string[]) {
  return store.createOrGetReportRecord({ reportId, birth, context, templateReport: template(ids), owner: reportOwner })
}

function isolatedStoreCheck(script: string, env: Record<string, string> = {}): void {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
    ${script}
  `], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, ...testEnv, DATABASE_URL: '', REPORT_STORAGE_DIR: '', VERCEL: '', NEXT_PUBLIC_SUPABASE_URL: '', VITE_SUPABASE_URL: '', ...env },
    encoding: 'utf8', timeout: 20_000,
  })
  assert.equal(child.status, 0, child.stderr || child.stdout)
}

describe('Supabase REST report persistence (mock fetch, no database or network)', { concurrency: false }, () => {
  it('requires an explicit owner but no user token, using only the private server credential', async () => {
    assert.equal(store.getReportStorageMode(), 'supabase')
    await assert.rejects(store.getReportRecord('unknown'), /REPORT_ACCESS_DENIED/)
    await assert.rejects(store.getReportRecord('unknown', owner.accessToken as unknown as ReportOwner), /REPORT_ACCESS_DENIED/)
    await assert.rejects(store.listReportRecords({ id: '' }), /REPORT_ACCESS_DENIED/)
    await assert.rejects(store.deleteReportRecord('unknown', { id: '' }), /REPORT_ACCESS_DENIED/)
    await assert.rejects(store.mutateReportRecord('unknown', undefined, () => {}), /REPORT_ACCESS_DENIED/)
    assert.equal(await store.findReportRecord('invalid,(query)', owner), null)
    assert.equal(rest.calls.length, 0)
    assert.equal(await store.getReportRecord('unknown', { id: owner.id }), null)
    assert.deepEqual(await store.listReportRecords({ id: owner.id }), [])
    assert.ok(rest.calls.every((call) => call.headers.get('authorization') === `Bearer ${testEnv.SUPABASE_SERVICE_ROLE_KEY}`))
  })

  it('fails closed without the server key even when a valid user token and public key are available', () => {
    // A fresh process is necessary because module configuration is intentionally
    // captured once; no real .env file or network request is used by this child.
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      let fetches = 0;
      globalThis.fetch = async () => { fetches += 1; throw new Error('Real networking is forbidden'); };
      const store = await import('./src/report/report-store.ts');
      const owner = { id: 'owner-a', accessToken: 'mock-token-a' };
      assert.equal(store.getReportStorageMode(), 'supabase');
      const missing = /서버 전용 리포트 저장소 키/;
      assert.throws(() => store.assertDurableReportStorage(), missing);
      await assert.rejects(store.getReportRecord('keyless', owner), missing);
      await assert.rejects(store.findReportRecord('keyless', owner), missing);
      await assert.rejects(store.listReportRecords(owner), missing);
      await assert.rejects(store.deleteReportRecord('keyless', owner), missing);
      await assert.rejects(store.mutateReportRecord('keyless', owner, () => {}), missing);
      await assert.rejects(store.saveReportRecord({ reportId: 'keyless', owner }), missing);
      await assert.rejects(store.createOrGetReportRecord({ reportId: 'keyless', owner }), missing);
      assert.equal(fetches, 0);
    `], {
      cwd: fileURLToPath(new URL('../..', import.meta.url)),
      env: { ...process.env, ...testEnv, DATABASE_URL: '', REPORT_STORAGE_DIR: '', VERCEL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
      encoding: 'utf8',
      timeout: 20_000,
    })
    assert.equal(child.status, 0, child.stderr || child.stdout)
  })

  it('uses opaque secret keys only in apikey for every CRUD request', () => {
    isolatedStoreCheck(`
      const rows = new Map();
      const methods = new Set();
      globalThis.fetch = async (input, init = {}) => {
        const url = new URL(input);
        assert.equal(url.origin, ${JSON.stringify(testEnv.SUPABASE_URL)});
        const headers = new Headers(init.headers);
        assert.equal(headers.get('apikey'), 'sb_secret_mock_server_key');
        assert.equal(headers.has('authorization'), false);
        const method = init.method || 'GET'; methods.add(method);
        const body = init.body ? JSON.parse(init.body) : undefined;
        if (method === 'POST') { rows.set(body.report_id, body); return Response.json([body]); }
        assert.equal(url.searchParams.get('user_id'), 'eq.owner-a');
        const matched = [...rows.values()].filter(row => !url.searchParams.get('report_id') || url.searchParams.get('report_id') === 'eq.' + row.report_id);
        if (method === 'PATCH') matched.forEach(row => { row.payload = body.payload; });
        if (method === 'DELETE') matched.forEach(row => rows.delete(row.report_id));
        return Response.json(matched);
      };
      const store = await import('./src/report/report-store.ts');
      const owner = ${JSON.stringify(owner)};
      const { record } = await store.createOrGetReportRecord({ reportId: 'opaque-key-test', owner, birth: ${JSON.stringify(birth)}, context: ${JSON.stringify(context)}, templateReport: ${JSON.stringify(template(['one']))} });
      assert.equal((await store.getReportRecord(record.reportId, owner)).reportId, record.reportId);
      assert.equal((await store.listReportRecords(owner)).length, 1);
      await store.mutateReportRecord(record.reportId, owner, next => { next.error = 'synthetic'; });
      assert.equal(await store.deleteReportRecord(record.reportId, owner), true);
      assert.deepEqual([...methods].sort(), ['DELETE', 'GET', 'PATCH', 'POST']);
    `, { SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_mock_server_key' })
  })

  it('probes zero rows with bounded secret-free cached/coalesced diagnostics and a three-second timeout', () => {
    isolatedStoreCheck(`
      let calls = 0;
      let behavior = 'ok';
      let lastSignal;
      globalThis.fetch = async (input, init = {}) => {
        calls += 1;
        const url = new URL(input);
        assert.equal(url.origin, ${JSON.stringify(testEnv.SUPABASE_URL)});
        assert.equal(url.pathname, '/rest/v1/cheongi_reports');
        assert.equal(url.searchParams.toString(), 'select=report_id&limit=0');
        const headers = new Headers(init.headers);
        assert.equal(headers.get('apikey'), 'sb_secret_mock_server_key');
        assert.equal(headers.has('authorization'), false);
        lastSignal = init.signal;
        if (behavior === 'timeout') return new Promise(() => {});
        if (behavior === 'network') throw new Error('PRIVATE sb_secret_mock_server_key message');
        await Promise.resolve();
        return new Response('PRIVATE sb_secret_mock_server_key response body', { status: behavior === 'denied' ? 403 : 200 });
      };
      const store = await import('./src/report/report-store.ts');
      const [first, second] = await Promise.all([store.checkReportStorageReadiness(), store.checkReportStorageReadiness()]);
      assert.deepEqual(first, { mode: 'supabase', ok: true, durable: true, keyKind: 'secret', httpStatus: 200 });
      assert.deepEqual(first, second); assert.equal(calls, 1);
      first.ok = false;
      assert.equal((await store.checkReportStorageReadiness()).ok, true); assert.equal(calls, 1);
      let now = Date.now(); Date.now = () => now;
      now += 30_001; behavior = 'denied';
      const denied = await store.checkReportStorageReadiness();
      assert.equal(denied.httpStatus, 403); assert.equal(denied.errorCode, 'REPORT_STORAGE_AUTH_REJECTED'); assert.equal(denied.ok, false);
      assert.doesNotMatch(JSON.stringify(denied), /PRIVATE|sb_secret_mock_server_key|response body/);
      now += 30_001; behavior = 'network';
      const unavailable = await store.checkReportStorageReadiness();
      assert.equal(unavailable.errorCode, 'REPORT_STORAGE_UNAVAILABLE');
      assert.doesNotMatch(JSON.stringify(unavailable), /PRIVATE|sb_secret_mock_server_key|message/);
      now += 30_001; behavior = 'timeout';
      const realSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (callback, delay) => { assert.equal(delay, 3000); return realSetTimeout(callback, 0); };
      const timeout = await store.checkReportStorageReadiness();
      assert.equal(timeout.errorCode, 'REPORT_STORAGE_TIMEOUT'); assert.equal(lastSignal.aborted, true);
      assert.equal(calls, 4);
    `, { SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_mock_server_key' })
  })

  it('reports only booleans for legacy JWT role/project checks and uses legacy Bearer headers', () => {
    for (const matching of [true, false]) {
      const key = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ role: matching ? 'service_role' : 'anon', ref: matching ? 'synthetic-project' : 'different-project' })).toString('base64url')}.synthetic_signature`
      isolatedStoreCheck(`
        globalThis.fetch = async (input, init) => {
          assert.equal(new URL(input).searchParams.get('limit'), '0');
          const headers = new Headers(init.headers);
          assert.equal(headers.get('apikey'), process.env.SUPABASE_SERVICE_ROLE_KEY);
          assert.equal(headers.get('authorization'), 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY);
          return Response.json([]);
        };
        const store = await import('./src/report/report-store.ts');
        const health = await store.checkReportStorageReadiness();
        assert.equal(health.keyKind, 'legacy-jwt');
        assert.equal(health.jwtRoleMatches, ${matching});
        assert.equal(health.jwtProjectMatches, ${matching});
        assert.equal(health.ok, ${matching});
        assert.doesNotMatch(JSON.stringify(health), /synthetic-project|different-project|service_role|synthetic_signature/);
      `, { SUPABASE_SERVICE_ROLE_KEY: key, SUPABASE_URL: 'https://synthetic-project.supabase.co' })
    }
  })

  it('reports missing credentials and non-durable memory without making a request', () => {
    isolatedStoreCheck(`
      const store = await import('./src/report/report-store.ts');
      assert.deepEqual(await store.checkReportStorageReadiness(), { mode: 'supabase', ok: false, durable: true, keyKind: 'missing', errorCode: 'REPORT_STORAGE_KEY_MISSING' });
    `, { SUPABASE_SERVICE_ROLE_KEY: '' })
    isolatedStoreCheck(`
      const store = await import('./src/report/report-store.ts');
      assert.deepEqual(await store.checkReportStorageReadiness(), { mode: 'memory', ok: false, durable: false, keyKind: 'none', errorCode: 'REPORT_STORAGE_NOT_DURABLE' });
    `, { SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_URL: '' })
  })

  it('uses SELECT 1 for Postgres and reports local-file durability without inspecting or writing reports', () => {
    isolatedStoreCheck(`
      const { Pool } = await import('pg');
      let queries = 0;
      Pool.prototype.query = async text => { assert.equal(text, 'SELECT 1'); queries += 1; return { rows: [{ '?column?': 1 }] }; };
      const store = await import('./src/report/report-store.ts');
      assert.deepEqual(await store.checkReportStorageReadiness(), { mode: 'postgres', ok: true, durable: true, keyKind: 'none' });
      assert.equal(queries, 1);
    `, { DATABASE_URL: 'postgresql://synthetic:synthetic@localhost:5432/synthetic_readiness' })
    isolatedStoreCheck(`
      const { FileReportStorage } = await import('./src/report/file-report-storage.ts');
      FileReportStorage.prototype.read = async () => { throw new Error('Readiness must not read a report'); };
      FileReportStorage.prototype.list = async () => { throw new Error('Readiness must not enumerate reports'); };
      FileReportStorage.prototype.insert = async () => { throw new Error('Readiness must not write a report'); };
      const store = await import('./src/report/report-store.ts');
      assert.deepEqual(await store.checkReportStorageReadiness(), { mode: 'file', ok: true, durable: true, keyKind: 'none' });
    `, { REPORT_STORAGE_DIR: fileURLToPath(new URL('../../.cache/readiness-not-created', import.meta.url)) })
  })

  it('stores a frozen initial identity and preview without serializing an access token', async () => {
    const { record, created } = await create()
    assert.equal(created, true)
    assert.match(record.resultId!, /^[a-f0-9-]{36}$/)
    assert.equal(record.status, 'pending')
    assert.equal(record.revision, 0)
    assert.ok(record.preview?.summary)
    assert.equal(record.owner?.accessToken, undefined)
    assert.equal(record.report.publicId, record.resultId)
    assert.equal(new Set(record.report.sections.map((item) => item.generationId)).size, 2)
    assert.ok(record.report.sections.every((item) => item.status === 'pending'))
    const inserted = rest.calls.find((call) => call.method === 'POST')!
    assert.equal(inserted.headers.get('prefer'), 'resolution=ignore-duplicates,return=representation')
    assert.equal(inserted.body?.user_id, owner.id)
    assert.doesNotMatch(JSON.stringify(inserted.body), /mock-token-a|accessToken/)
    assert.equal(owner.accessToken, 'mock-token-a', 'The caller session must not be mutated')
    const client = store.toClientReport(record)
    assert.equal(client.publicUrl, `/r/${record.resultId}`)
    assert.equal(client.storage, 'supabase')
  })

  it('returns the first stored snapshot when concurrent insert-ignore requests race', async () => {
    const [first, second] = await Promise.all([create(), create()])
    assert.equal(rest.calls.filter((call) => call.method === 'POST').length, 2)
    assert.equal(Number(first.created) + Number(second.created), 1)
    assert.equal(first.record.resultId, second.record.resultId)
    assert.deepEqual(first.record.report, second.record.report)
    assert.equal(rest.rows.size, 1)
    const again = await create()
    assert.equal(again.created, false)
    assert.deepEqual(again.record, first.record)
  })

  it('enforces owner filters for legacy IDs and UUID payload lookup without forwarding session tokens', async () => {
    const first = await create()
    await create('rest-report-b', otherOwner)
    assert.equal(await store.getReportRecord(first.record.reportId, otherOwner), null)
    assert.equal(await store.findReportRecord(first.record.resultId!, otherOwner), null)
    const byResult = await store.findReportRecord(first.record.resultId!, owner)
    assert.deepEqual(byResult, first.record)
    const uuidLookup = rest.calls.filter((call) => call.url.searchParams.has('or')).at(-1)!
    assert.equal(uuidLookup.url.searchParams.get('user_id'), `eq.${owner.id}`)
    assert.equal(uuidLookup.url.searchParams.get('limit'), '1')
    assert.equal(uuidLookup.headers.get('authorization'), `Bearer ${testEnv.SUPABASE_SERVICE_ROLE_KEY}`)
    assert.equal(await store.findReportRecord(first.record.reportId, { ...otherOwner, accessToken: owner.accessToken }), null)
    assert.ok(rest.calls.every((call) => call.headers.get('authorization') === `Bearer ${testEnv.SUPABASE_SERVICE_ROLE_KEY}`))
    // Older rows may only have the public UUID nested inside the report.
    delete rest.rows.get(first.record.reportId)!.payload.resultId
    assert.equal((await store.findReportRecord(first.record.resultId!, owner))?.report.publicId, first.record.resultId)
  })

  it('uses a bounded owner-scoped vault list and never falls back to a user token on server-key errors', async () => {
    await create()
    await create('rest-report-b', otherOwner)
    const callsBefore = rest.calls.length
    const listed = await store.listReportRecords({ id: owner.id }, 500)
    assert.deepEqual(listed.map((item) => item.owner?.id), [owner.id])
    const [privileged] = rest.calls.slice(callsBefore)
    assert.equal(privileged.headers.get('authorization'), `Bearer ${testEnv.SUPABASE_SERVICE_ROLE_KEY}`)
    assert.equal(privileged.url.searchParams.get('user_id'), `eq.${owner.id}`)
    assert.equal(privileged.url.searchParams.get('limit'), '100')
    rest.rejectServiceKey = true
    const beforeFailure = rest.calls.length
    await assert.rejects(store.listReportRecords(owner), /목록 조회에 실패/)
    assert.equal(rest.calls.length, beforeFailure + 1)
    assert.equal(rest.calls.at(-1)?.headers.get('authorization'), `Bearer ${testEnv.SUPABASE_SERVICE_ROLE_KEY}`)
  })

  it('rejects a foreign owner collision instead of claiming an ignored insert was saved', async () => {
    const first = await create()
    await assert.rejects(create(first.record.reportId, otherOwner), /소유권 또는 저장 결과/)
    assert.equal(rest.rows.size, 1)
    assert.deepEqual((await store.getReportRecord(first.record.reportId, owner))?.report, first.record.report)
    assert.equal(await store.mutateReportRecord(first.record.reportId, otherOwner, (next) => { next.error = 'forbidden' }), null)
    assert.equal(rest.calls.filter((call) => call.method === 'PATCH').length, 0)
  })

  it('keeps direct browser access private and checks payload ownership after privileged reads', async () => {
    const { record } = await create()
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      const response = await rest.fetch(`${testEnv.SUPABASE_URL}/rest/v1/cheongi_reports?user_id=eq.${owner.id}`, {
        method,
        headers: { apikey: testEnv.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${owner.accessToken}` },
      })
      assert.equal(response.status, 403)
      assert.doesNotMatch(await response.text(), /interpretation|savedChat|raw|reportId/)
    }
    rest.rows.get(record.reportId)!.payload.owner!.id = otherOwner.id
    await assert.rejects(store.getReportRecord(record.reportId, owner), /REPORT_ACCESS_DENIED/)
    await assert.rejects(store.listReportRecords(owner), /REPORT_ACCESS_DENIED/)
  })

  it('deletes only the exact owner/report pair using the server key without needing a session token', async () => {
    const first = await create('delete-a', { id: owner.id })
    await create('delete-b', otherOwner)
    assert.equal(await store.deleteReportRecord(first.record.reportId, otherOwner), false)
    assert.equal(await store.deleteReportRecord(first.record.reportId, { id: owner.id }), true)
    assert.equal(await store.deleteReportRecord(first.record.reportId, owner), false)
    assert.deepEqual([...rest.rows.keys()], ['delete-b'])
    const deletes = rest.calls.filter((call) => call.method === 'DELETE')
    assert.ok(deletes.every((call) => call.url.searchParams.get('report_id') === 'eq.delete-a'))
    assert.deepEqual(deletes.map((call) => call.url.searchParams.get('user_id')), ['eq.owner-b', 'eq.owner-a', 'eq.owner-a'])
  })

  it('merges simultaneous section updates with revision CAS instead of dropping one result', async () => {
    const { record } = await create()
    await Promise.all(['one', 'two'].map((id) => store.updateReportSection(record.reportId, { ...section(id), interpretation: `saved-${id}` }, { generatedBy: 'openai', model: 'mock' }, owner)))
    const saved = await store.getReportRecord(record.reportId, owner)
    assert.deepEqual(saved?.report.sections.map((item) => item.interpretation), ['saved-one', 'saved-two'])
    assert.equal(saved?.revision, 2)
    assert.equal(saved?.status, 'complete')
    assert.deepEqual(saved?.report.progress, { complete: 2, total: 2 })
    const patches = rest.calls.filter((call) => call.method === 'PATCH')
    assert.deepEqual(patches.map((call) => call.url.searchParams.get('payload->>revision')), ['eq.0', 'eq.0', 'eq.1'])
    assert.ok(patches.every((call) => call.url.searchParams.get('user_id') === `eq.${owner.id}`))
    assert.deepEqual(saved?.report.sections.map((item) => item.generationId), record.report.sections.map((item) => item.generationId))
    assert.equal(saved?.resultId, record.resultId)
  })

  it('re-reads a stale revision and applies its mutation to the newer snapshot', async () => {
    const { record } = await create()
    let competitorWritten = false
    rest.beforePatch = (_call, rows) => {
      if (competitorWritten) return
      competitorWritten = true
      const row = rows.get(record.reportId)!
      row.payload.revision = 1
      row.payload.chatHistory = [{ role: 'user', content: 'A competing update already saved this.' }]
    }
    let callbackCalls = 0
    const saved = await store.mutateReportRecord(record.reportId, owner, (next) => {
      callbackCalls += 1
      next.error = '추가된 상태 메모'
      next.owner!.accessToken = owner.accessToken
    })
    assert.equal(callbackCalls, 2)
    assert.equal(saved?.revision, 2)
    assert.equal(saved?.chatHistory?.[0].content, 'A competing update already saved this.')
    assert.equal(saved?.error, '추가된 상태 메모')
    assert.equal(saved?.owner?.accessToken, undefined)
    assert.ok(rest.calls.filter((call) => call.method === 'PATCH').every((call) => !JSON.stringify(call.body).includes('accessToken')))
  })

  it('uses an is.null CAS for legacy snapshots with no revision field', async () => {
    const { record } = await create()
    delete rest.rows.get(record.reportId)!.payload.revision
    const saved = await store.markReportStatus(record.reportId, 'generating', undefined, owner)
    assert.equal(saved?.revision, 1)
    assert.equal(rest.calls.find((call) => call.method === 'PATCH')?.url.searchParams.get('payload->>revision'), 'is.null')
  })

  it('does not overwrite completed text or status, while allowing separate chat history to persist', async () => {
    const { record } = await create('complete-report', owner, ['one'])
    await store.updateReportSection(record.reportId, { ...section('one'), interpretation: 'A paid result already saved.' }, { generatedBy: 'openai', model: 'mock' }, owner)
    const before = await store.getReportRecord(record.reportId, owner)
    const patchesBefore = rest.calls.filter((call) => call.method === 'PATCH').length
    await store.updateReportSection(record.reportId, { ...section('one'), interpretation: 'Must not replace paid text.' }, { generatedBy: 'openai', model: 'replacement' }, owner)
    await store.markReportStatus(record.reportId, 'failed', 'Must not demote a completed result.', owner)
    assert.equal(rest.calls.filter((call) => call.method === 'PATCH').length, patchesBefore)
    await assert.rejects(store.updateReportSection(record.reportId, section('unknown'), { generatedBy: 'openai', model: 'mock' }, owner), /항목.*다릅니다/)
    await store.updateReportChatHistory(record.reportId, [{ role: 'user', content: '저장된 해석에 대한 질문' }], owner)
    const saved = await store.findReportRecord(record.resultId!, owner)
    assert.deepEqual(saved?.report, before?.report)
    assert.deepEqual(saved?.preview, before?.preview)
    assert.equal(saved?.status, 'complete')
    assert.equal(saved?.chatHistory?.[0].content, '저장된 해석에 대한 질문')
    assert.equal(saved?.revision, 2)
  })

  it('bounds retries under sustained contention without writing its stale snapshot', async () => {
    const { record } = await create()
    rest.beforePatch = (_call, rows) => { rows.get(record.reportId)!.payload.revision! += 1 }
    await assert.rejects(store.mutateReportRecord(record.reportId, owner, (next) => { next.error = 'Do not persist this stale update.' }), /동시에 변경 중/)
    assert.equal(rest.calls.filter((call) => call.method === 'PATCH').length, 12)
    assert.equal(rest.rows.get(record.reportId)?.payload.error, undefined)
  })
})
