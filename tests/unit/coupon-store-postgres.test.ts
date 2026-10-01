import test from 'node:test'
import assert from 'node:assert/strict'
import { Pool } from 'pg'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

test('coupon schema exposes neither table nor CAS function to customer roles', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261002100000_coupon_store.sql', import.meta.url), 'utf8')
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /REVOKE ALL ON public.coupon_state FROM PUBLIC, anon, authenticated/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public.coupon_state_cas\(bigint, jsonb\) FROM PUBLIC, anon, authenticated/)
  assert.match(sql, /SECURITY INVOKER SET search_path = pg_catalog/)
})
test('production without storage rejects reads rather than using memory', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {listWallet} from './src/coupons/store.ts'; try { await listWallet('qa'); process.exit(1) } catch(e) { if(e.code !== 'COUPON_STORAGE_UNAVAILABLE' || e.status !== 503) process.exit(2) }"], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: '', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' } })
  assert.equal(result.status, 0, result.stderr)
})
// Opt-in integration QA uses only an explicitly named loopback database. It is
// excluded from ordinary tests instead of attempting a production connection.
if (process.env.COUPON_QA_DATABASE_URL) {
  test('local PostgreSQL CAS serializes claims and binds; customer roles are denied', async () => {
    const uri = new URL(process.env.COUPON_QA_DATABASE_URL!)
    assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname))
    process.env.NODE_ENV = 'test'
    const { configureCouponStorageForTests, createCampaign, claimCoupon, bindFreeCoupon, listWallet } = await import('../../src/coupons/store.js')
    const pool = new Pool({ connectionString: uri.toString(), max: 6 })
    try {
      await pool.query("UPDATE public.coupon_state SET revision=0,data='{\"campaigns\":[],\"wallets\":[],\"audit\":[]}'")
      configureCouponStorageForTests({
        async read() { const { rows } = await pool.query('SELECT revision,data FROM public.coupon_state WHERE id=1'); return { revision: Number(rows[0].revision), data: rows[0].data } },
        async compareAndSet(revision, data) { const { rows } = await pool.query('SELECT public.coupon_state_cas($1,$2::jsonb) AS applied', [revision, JSON.stringify(data)]); return rows[0].applied },
      })
      await createCampaign({ code: 'LOCALQA1', title: 'Isolated QA', kind: 'service_free', productKey: 'cmdg', value: 1, maxClaims: 2, startsAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z' }, 'qa-admin', 'qa-create')
      const outcomes = await Promise.allSettled(Array.from({ length: 12 }, (_, n) => claimCoupon(`owner-${n}`, 'LOCALQA1')))
      assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 2)
      const w = outcomes.find(r => r.status === 'fulfilled')!
      assert.equal(w.status, 'fulfilled')
      if (w.status !== 'fulfilled') throw new Error('missing winner')
      const binds = await Promise.allSettled(Array.from({ length: 8 }, (_, n) => bindFreeCoupon(w.value.ownerId, w.value.id, 'cmdg', `report-${n}`)))
      assert.equal(binds.filter(r => r.status === 'fulfilled').length, 1)
      assert.ok((await listWallet(w.value.ownerId))[0].reportId)
      const { rows } = await pool.query("SELECT data, revision FROM public.coupon_state WHERE id=1")
      assert.equal(rows[0].data.wallets.length, 2)
      assert.equal(rows[0].data.audit[0].actor, 'qa-admin')
      const direct = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {listCampaigns} from './src/coupons/store.ts'; const rows=await listCampaigns(); process.exit(rows.length===1 && rows[0].claimCount===2 ? 0 : 1)"], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: uri.toString(), SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' } })
      assert.equal(direct.status, 0, direct.stderr)
      for (const role of ['anon', 'authenticated']) {
        const client = await pool.connect()
        try {
          await client.query(`SET ROLE ${role}`)
          await assert.rejects(client.query('SELECT * FROM public.coupon_state'), /permission denied/)
          await assert.rejects(client.query("SELECT public.coupon_state_cas(0,'{}')"), /permission denied/)
        } finally { await client.query('RESET ROLE'); client.release() }
      }
      const client = await pool.connect()
      try { await client.query('SET ROLE service_role'); assert.equal((await client.query('SELECT * FROM public.coupon_state')).rows.length, 1) }
      finally { await client.query('RESET ROLE'); client.release() }
    } finally { configureCouponStorageForTests(null); await pool.end() }
  })
}
