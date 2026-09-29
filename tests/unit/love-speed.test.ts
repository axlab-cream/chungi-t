import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import express from 'express'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { calculateLoveResult, parseLoveInput } from '../../src/play/love-speed.js'
import { loveSpeedRouter } from '../../src/play/love-speed-route.js'

test('existing signup OAuth callback resumes the game only after authentication, without requiring a birth profile', () => {
  const source = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8')
  const functions = source.slice(source.indexOf('      function returnToLoveSpeedAfterAuth'), source.indexOf('      function isStandaloneSignupFlow'))
  let target = ''
  const removed: string[] = []
  const context: any = { initialAuthEntry: 'love-speed', URL, AUTH_PENDING_KEY:'pending', AUTH_FORM_KEY:'form', sessionStorage:{ removeItem:(key:string)=>removed.push(key) }, location:{origin:'https://umsh.kr',replace:(url:string)=>{target=url}} }
  runInNewContext(functions, context)
  const callback = new URL(context.signupReturnUrl())
  assert.equal(callback.pathname, '/cmdg/')
  assert.equal(callback.searchParams.get('entry'), 'love-speed')
  assert.equal(context.returnToLoveSpeedAfterAuth(null), false)
  assert.equal(target, '')
  assert.equal(context.returnToLoveSpeedAfterAuth({access_token:'test-only'}), true)
  assert.equal(target, '/play/love-speed/')
  assert.ok(!removed.includes('umsh:love-speed:v1'))
  context.initialAuthEntry='today'; target=''
  assert.equal(context.returnToLoveSpeedAfterAuth({access_token:'test-only'}),false)
  assert.equal(target,'')
  assert.ok(source.indexOf('if (returnToLoveSpeedAfterAuth(authSession)) return;') < source.indexOf('await fetchUserProfile({ apply: false }).catch(() => undefined);',source.indexOf('initAuth().then(async')))
})

test('browser result resolution explains unavailable, expired, denied and failed sessions without opening a result', async () => {
  const source=readFileSync(new URL('../../사주/play/love-speed/app.js',import.meta.url),'utf8')
  const resolver=source.slice(source.indexOf('  async function resolveResult()'),source.indexOf('  function renderResult'))
  for (const mode of ['disabled','expired','denied','network']) {
    let message=''; let opened=false
    const context:any={ busy:false, preview:false, generation:0, auth:{config:{enabled:mode!=='disabled'}}, show(){}, document:{getElementById:()=>null}, gate:(text:string)=>{message=text}, state:{answers:[0,0,0,0,0],mbti:null}, AbortSignal, window:{UMSHAuthSession:{bindServiceSession:async()=>mode==='expired'?null:{access_token:'test-only'}}}, fetch:async()=>{if(mode==='network')throw Error('raw-private-error'); return {status:401}}, renderResult:()=>{opened=true} }
    runInNewContext(resolver,context)
    await context.resolveResult()
    assert.ok(message.length>0,mode)
    assert.ok(!message.includes('raw-private-error'))
    assert.equal(opened,false)
    assert.equal(context.busy,false)
  }
})

test('sharing sends only the public type; cancellation never falls back to clipboard', async () => {
  const source = readFileSync(new URL('../../사주/play/love-speed/app.js', import.meta.url), 'utf8')
  const shareSource = source.slice(source.indexOf('  async function share(data,'), source.indexOf('  function sampleResult'))
  let payload: any
  let copied = 0
  const context: any = { track() {}, types: { spark: { name: '불꽃급랭형' } }, navigator: { share: async (data: unknown) => { payload = data }, clipboard: { writeText: async () => { copied++ } } }, notice() {} }
  runInNewContext(shareSource, context)
  await context.share({ type: 'spark', name: 'PRIVATE', mbti: 'ENFP', answers: [0,1,2,3,0], birth: 'PRIVATE' })
  assert.equal(payload.url, 'https://umsh.kr/play/love-speed/?type=spark&src=share')
  assert.deepEqual(Object.keys(payload), ['title','text','url'])
  assert.ok(!JSON.stringify(payload).includes('PRIVATE'))
  assert.ok(!JSON.stringify(payload).includes('ENFP'))
  context.navigator.share = async () => { throw Object.assign(Error(), { name: 'AbortError' }) }
  await context.share({ type: 'spark' })
  assert.equal(copied, 0)
  delete context.navigator.share
  await context.share({ type: 'spark' })
  assert.equal(copied, 1)
})

test('friend invitation always shares the public test URL and supports copy/manual fallbacks', async () => {
  const source = readFileSync(new URL('../../사주/play/love-speed/app.js', import.meta.url), 'utf8')
  const shareSource = source.slice(source.indexOf('  async function share(data,'), source.indexOf('  function sampleResult'))
  let payload: any; let copied = ''; let html = ''; let message = ''
  const context: any = { track() {}, types: { spark: { name: '불꽃급랭형' } }, navigator: { share: async (data: unknown) => { payload = data } }, notice: (text: string) => { message = text }, esc: (value: string) => value, document: { getElementById: () => ({ set innerHTML(value: string) { html = value } }) } }
  runInNewContext(shareSource, context)
  await context.share()
  assert.equal(payload.url, 'https://umsh.kr/play/love-speed/?src=share')
  assert.ok(payload.text.includes('같이'))
  await context.share({ type: 'PRIVATE&birth=PRIVATE' })
  assert.equal(payload.url, 'https://umsh.kr/play/love-speed/?src=share')
  assert.ok(!JSON.stringify(payload).includes('PRIVATE'))
  context.navigator.share = async () => { throw Object.assign(Error(), { name: 'AbortError' }) }
  await context.share()
  assert.equal(html, '')
  delete context.navigator.share
  context.navigator.clipboard = { writeText: async (text: string) => { copied = text } }
  await context.share()
  assert.equal(copied, 'https://umsh.kr/play/love-speed/?src=share')
  assert.ok(message.includes('친구'))
  let nativeCalls = 0
  context.navigator.share = async () => { nativeCalls++ }
  await context.share(undefined, true)
  assert.equal(nativeCalls, 0)
  assert.equal(copied, 'https://umsh.kr/play/love-speed/?src=share')
  delete context.navigator.share
  context.navigator.clipboard.writeText = async () => { throw Error('denied') }
  await context.share()
  assert.ok(html.includes('readonly'))
  assert.ok(html.includes('https://umsh.kr/play/love-speed/'))
})

test('public link preview declares a real 1200x630 PNG without personal metadata', () => {
  const html = readFileSync(new URL('../../사주/play/love-speed/index.html', import.meta.url), 'utf8')
  const png = readFileSync(new URL('../../사주/play/love-speed/share-banner-v1.png', import.meta.url))
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
  assert.ok(html.includes('property="og:image" content="https://umsh.kr/play/love-speed/share-banner-v1.png"'))
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'))
  assert.ok(html.includes('property="og:image:alt"'))
})

test('all 1024 answer combinations produce bounded scores and reach all four types', () => {
  const types = new Set()
  for (let i = 0; i < 1024; i++) {
    const answers = Array.from({ length: 5 }, (_, j) => (i >> (j * 2)) & 3)
    const r = calculateLoveResult({ answers, mbti: null })
    types.add(r.type)
    for (const n of Object.values(r.stats)) assert.ok(Number.isInteger(n) && n >= 0 && n <= 100)
  }
  assert.equal(types.size, 4)
})
test('invalid answers and MBTI are rejected; unknown accepted', () => {
  for (const input of [null, {}, { answers: [0,0,0,0] }, { answers: [0,0,0,0,4] }, { answers: [0,0,0,0,NaN] }, { answers: [0,0,0,0,0], mbti: '<script>' }]) assert.throws(() => parseLoveInput(input))
  assert.equal(parseLoveInput({ answers: [0,0,0,0,0], mbti: null }).mbti, null)
})
test('sa ju and MBTI supply context without fabricating probabilities or leaking profile', () => {
  const input = { answers: [0,0,0,0,0], mbti: 'ENFP', name: 'PRIVATE', birth: 'PRIVATE' }
  const r = calculateLoveResult(input, { dayMasterElement: 'fire' }, false)
  assert.ok(r.sajuNote.includes('출생 시간은 미상'))
  assert.ok(r.mbtiNote.includes('ENFP'))
  assert.ok(!JSON.stringify(r).includes('PRIVATE'))
  assert.deepEqual(r.stats, calculateLoveResult({ ...input, mbti: null }).stats)
  assert.ok(calculateLoveResult({ ...input, mbti: null }).sajuNote.includes('다섯 답변만'))
})
test('route enforces auth, validates input, uses owner context and fails closed', async () => {
  let mode = 'anonymous'
  let calls = 0
  const app = express().use(express.json()).use('/api/play/love-speed', loveSpeedRouter({
    authenticate: async (_req, res) => { if (mode === 'anonymous') { res.status(401).json({ error: 'login' }); return null }; return { id: 'owner' } },
    context: async owner => { calls++; assert.equal(owner.id, 'owner'); if (mode === 'failure') throw Error('private details'); return { saju: null, birthTimeKnown: false } },
  }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address() as { port: number }
  const post = (body: unknown) => fetch(`http://127.0.0.1:${address.port}/api/play/love-speed/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  try {
    assert.equal((await post({ answers: [0,0,0,0,0] })).status, 401)
    assert.equal(calls, 0)
    mode = 'member'
    assert.equal((await post({ answers: [0] })).status, 400)
    const response = await post({ answers: [0,0,0,0,0] })
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal((await response.json()).type, 'spark')
    mode = 'failure'
    const failed = await post({ answers: [0,0,0,0,0] })
    assert.equal(failed.status, 503)
    assert.ok(!(await failed.text()).includes('private details'))
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
