/** Local-only synthetic browser fixture. Never loads credentials or writes customer data. */
process.env.NODE_ENV = 'test'
for (const key of Object.keys(process.env)) {
  if (/DATABASE|SUPABASE|OPENAI|ANTHROPIC|INICIS|PAYMENT|VERCEL|REPORT_STORAGE/.test(key)) delete process.env[key]
}
globalThis.fetch = async () => { throw new Error('External server requests disabled in the today UI fixture') }
const { default: express } = await import('express')
const { default: app } = await import('../src/server/app.js')
const { buildTodayFortune } = await import('../src/saju/today-fortune.js')
const { buildUserBirthProfile } = await import('../src/user/profile-store.js')
const profile = buildUserBirthProfile({ owner: { id: 'local-synthetic-only' }, name: '가상 고객', birth: { year: 1995, month: 5, day: 15, hour: 14, gender: 'female', calendar: 'solar' }, birthTimeKnown: true, context: {} })
const fixture = express()
fixture.get('/api/report/local-today-ui', (_req, res) => res.json({
  resultId: 'local-today-ui', reportId: 'local-today-ui', publicUrl: '/r/local-today-ui',
  todayFortune: buildTodayFortune(profile, new Date('2026-09-07T03:00:00Z')),
  report: { serviceKey: 'today', title: '오늘운 UI 합성 검증', sections: [], status: 'complete' },
}))
fixture.use(app)
fixture.listen(8796, '127.0.0.1', () => console.log('Synthetic fixture: http://127.0.0.1:8796/today/free?reportId=local-today-ui'))
