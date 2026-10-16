import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

// 2026-10-15 비회원 무료 결과 시트·로그인 화면 약관 동의(필수 3·선택 1). docs/auth/guest-member-plan.md
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const consentSource = readFileSync(join(ROOT, '사주/js/umsh-consent.js'), 'utf8')
const authSource = readFileSync(join(ROOT, '사주/js/umsh-auth-session.js'), 'utf8')
const sheetSource = readFileSync(join(ROOT, '사주/js/umsh-guest-save-sheet.js'), 'utf8')
const cmdg = readFileSync(join(ROOT, '사주/사주/index.html'), 'utf8')
const TOKEN = 'sb-proj-auth-token'

function memoryStorage(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed))
  return {
    store,
    get length() { return store.size },
    key(index: number) { return [...store.keys()][index] ?? null },
    getItem(key: string) { return store.has(key) ? store.get(key)! : null },
    setItem(key: string, value: string) { store.set(key, String(value)) },
    removeItem(key: string) { store.delete(key) },
  }
}

/** umsh-consent.js 가 쓰는 만큼만 흉내 낸 아주 작은 DOM. */
class FakeElement {
  tagName: string
  children: FakeElement[] = []
  attrs = new Map<string, string>()
  classes = new Set<string>()
  listeners = new Map<string, Array<(event: any) => void>>()
  checked = false
  textContent = ''
  parent: FakeElement | null = null
  focused = false
  private html = ''
  constructor(tag: string) { this.tagName = tag.toUpperCase() }
  get classList() {
    const classes = this.classes
    return {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
      contains: (name: string) => classes.has(name),
      toggle: (name: string, on?: boolean) => { const next = on ?? !classes.has(name); if (next) classes.add(name); else classes.delete(name); return next },
    }
  }
  set className(value: string) { this.classes = new Set(value.split(/\s+/).filter(Boolean)) }
  get className() { return [...this.classes].join(' ') }
  get offsetWidth() { return 1 }
  get isConnected() { return true }
  setAttribute(name: string, value: string) { this.attrs.set(name, String(value)) }
  getAttribute(name: string) { return this.attrs.get(name) ?? null }
  removeAttribute(name: string) { this.attrs.delete(name) }
  hasAttribute(name: string) { return this.attrs.has(name) }
  appendChild(child: FakeElement) { child.parent = this; this.children.push(child); return child }
  addEventListener(type: string, fn: (event: any) => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]) }
  focus() { this.focused = true }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this) }
  set innerHTML(value: string) {
    this.html = value
    this.children = []
    // data-consent / data-consent-row / data-consent-all / .umsh-cs-alert 만 만든다.
    for (const match of value.matchAll(/<(div|input|button)([^>]*)>/g)) {
      const el = new FakeElement(match[1])
      for (const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
        if (attr[1] === 'class') el.className = attr[2] ?? ''
        else el.setAttribute(attr[1], attr[2] ?? '')
      }
      this.appendChild(el)
    }
  }
  get innerHTML() { return this.html }
  private all(): FakeElement[] { return this.children.flatMap((c) => [c, ...c.all()]) }
  querySelector(selector: string): FakeElement | null { return this.querySelectorAll(selector)[0] ?? null }
  querySelectorAll(selector: string): FakeElement[] {
    const attr = selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/)
    if (attr) return this.all().filter((el) => el.hasAttribute(attr[1]) && (attr[2] === undefined || el.getAttribute(attr[1]) === attr[2]))
    const cls = selector.match(/^\.([\w-]+)$/)
    if (cls) return this.all().filter((el) => el.classes.has(cls[1]))
    return []
  }
  matches(selector: string) { const attr = selector.match(/^\[([\w-]+)\]$/); return Boolean(attr && this.hasAttribute(attr[1])) }
  dispatch(type: string, target: FakeElement) { for (const fn of this.listeners.get(type) ?? []) fn({ target }) }
}

function loadConsent(session = memoryStorage(), local = memoryStorage(), fetchImpl?: (url: string, init?: any) => Promise<any>) {
  const head = new FakeElement('head')
  const document = { head, getElementById: () => null, createElement: (tag: string) => new FakeElement(tag) }
  const calls: Array<{ url: string; init: any }> = []
  const fetch = fetchImpl ?? (async (url: string, init?: any) => {
    calls.push({ url, init })
    if (url === '/api/auth/config') return { ok: true, status: 200, json: async () => ({ consentVersion: '2026-10-15' }) }
    return { ok: true, status: 200, json: async () => ({ ok: true }) }
  })
  const context: any = { setTimeout, clearTimeout, Date, Number, Boolean, String, JSON, Promise, console, document, sessionStorage: session, localStorage: local, fetch }
  context.window = context
  context.globalThis = context
  runInNewContext(consentSource, context)
  return { consent: context.UMSHConsent, session, local, calls }
}

function check(root: FakeElement, key: string, on = true) {
  const box = root.querySelector(`[data-consent="${key}"]`)!
  box.checked = on
  root.dispatch('change', box)
}

test('필수 셋(이용약관·개인정보·만 14세)을 다 체크해야 통과하고, 마케팅은 선택이다', () => {
  const { consent } = loadConsent()
  const host = new FakeElement('div')
  const ctl = consent.render(host, { source: 'guest-sheet' })
  assert.equal(ctl.isValid(), false)
  check(ctl.element, 'terms'); check(ctl.element, 'privacy')
  assert.equal(ctl.isValid(), false, '만 14세 이상도 필수')
  check(ctl.element, 'age14')
  assert.equal(ctl.isValid(), true)
  const values = ctl.values()
  assert.equal(values.marketing, false)
  assert.equal(values.source, 'guest-sheet')
  assert.equal(values.version, '2026-10-15')
})

test('필수를 빼고 누르면 빠진 줄만 흔들고 빨간 테두리·안내 한 줄을 띄우며 첫 칸으로 이동한다', () => {
  const { consent } = loadConsent()
  const ctl = consent.render(new FakeElement('div'), { source: 'login' })
  check(ctl.element, 'terms')
  ctl.shakeMissing()
  const row = (key: string) => ctl.element.querySelector(`[data-consent-row="${key}"]`)!
  assert.equal(row('terms').classes.has('is-missing'), false)
  assert.ok(row('privacy').classes.has('is-missing') && row('privacy').classes.has('is-shaking'))
  assert.ok(row('age14').classes.has('is-missing'))
  assert.equal(row('marketing').classes.has('is-missing'), false, '선택 항목은 흔들지 않는다')
  assert.equal(ctl.element.querySelector('.umsh-cs-alert')!.textContent, '필수 항목에 동의해 주세요')
  assert.equal(ctl.element.querySelector('[data-consent="privacy"]')!.focused, true)
  check(ctl.element, 'privacy'); check(ctl.element, 'age14')
  assert.equal(row('privacy').classes.has('is-missing'), false, '체크하면 빨간 테두리가 빠진다')
  assert.equal(ctl.element.querySelector('.umsh-cs-alert')!.textContent, '')
})

test('모두 동의는 선택까지 한 번에 체크하고, 체크 상태는 이 탭에서 다시 열어도 남는다', () => {
  const session = memoryStorage()
  const { consent } = loadConsent(session)
  const first = consent.render(new FakeElement('div'), {})
  const all = first.element.querySelector('[data-consent-all]')!
  all.checked = true
  first.element.dispatch('change', all)
  assert.equal(first.values().marketing, true)
  const again = consent.render(new FakeElement('div'), {})
  assert.equal(again.isValid(), true)
  assert.equal(again.values().marketing, true)
})

test('로그인 화면: 이 브라우저가 지금 버전에 동의했으면 한 줄로 줄이고 바로 통과한다', () => {
  const { consent } = loadConsent(memoryStorage(), memoryStorage({ umsh_consent_ok_v1: '2026-10-15' }))
  const ctl = consent.render(new FakeElement('div'), { compactIfAgreed: true })
  assert.equal(ctl.alreadyAgreed, true)
  assert.equal(ctl.isValid(), true)
  assert.match(ctl.element.innerHTML, /약관에 동의했어요/)
})

test('로그인으로 넘어가는 동안 동의는 이 탭에만 두고, 필수가 빠지면 남기지 않는다', () => {
  const { consent, session, local } = loadConsent()
  consent.savePending({ terms: true, privacy: true, age14: false, marketing: true })
  assert.equal(consent.readPending(), null)
  consent.savePending({ version: '2026-10-15', terms: true, privacy: true, age14: true, marketing: true, source: 'guest-sheet' })
  const pending = consent.readPending()
  assert.equal(pending.marketing, true)
  assert.equal(pending.source, 'guest-sheet')
  assert.ok(session.getItem('umsh_consent_pending_v1'))
  assert.equal(local.getItem('umsh_consent_pending_v1'), null, '공용 PC에 남지 않게 localStorage 에는 두지 않는다')
})

test('동의 기록 API 가 실패해도 던지지 않는다(로그인을 막지 않는다)', async () => {
  const { consent } = loadConsent(memoryStorage(), memoryStorage(), async () => { throw new Error('offline') })
  const result = await consent.postConsent('tok', { terms: true, privacy: true, age14: true, marketing: false })
  assert.equal(result.ok, false)
})

function loadAuth(local = memoryStorage(), session = memoryStorage(), fetchImpl?: (url: string, init?: any) => Promise<any>) {
  const calls: Array<{ url: string; init: any }> = []
  const fetch = fetchImpl ?? (async (url: string, init?: any) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ ok: true, current: true, version: '2026-10-15' }) } })
  const context: any = { setTimeout: () => 0, clearTimeout, Date, Number, Boolean, String, JSON, Promise, Math, console, localStorage: local, sessionStorage: session, fetch, crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' } }
  context.window = context
  context.globalThis = context
  runInNewContext(authSource, context)
  return { auth: context.UMSHAuthSession, local, session, calls }
}

const guestValue = JSON.stringify({ access_token: 'guest-tok', user: { id: 'guest-1', is_anonymous: true } })
const memberValue = JSON.stringify({ access_token: 'member-tok', user: { id: 'member-1', is_anonymous: false } })

test('기기 번호는 한 번 만들면 이 브라우저에 그대로 남는다', () => {
  const local = memoryStorage()
  const first = loadAuth(local).auth.deviceId()
  assert.match(first, /^[0-9a-f-]{36}$/)
  assert.equal(loadAuth(local).auth.deviceId(), first)
  assert.equal(local.getItem('umsh_device_id_v1'), first)
})

test('비회원 방문은 비회원 토큰으로, 탭·계정·서비스마다 한 번만 남긴다. 회원이면 남기지 않는다', async () => {
  const { auth, calls } = loadAuth(memoryStorage(), memoryStorage({ [TOKEN]: guestValue }))
  assert.equal(await auth.recordGuestVisit('today'), true)
  assert.equal(await auth.recordGuestVisit('today'), false)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/api/guest/visit')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer guest-tok')
  const body = JSON.parse(calls[0].init.body)
  assert.deepEqual([body.service, body.deviceId], ['today', '11111111-2222-4333-8444-555555555555'])

  const member = loadAuth(memoryStorage({ [TOKEN]: memberValue }), memoryStorage({ [TOKEN]: guestValue }))
  assert.equal(await member.auth.recordGuestVisit('today'), false)
  assert.equal(member.calls.length, 0)
})

test('회원 세션이 생기면 받아 둔 동의를 회원 토큰으로 기록하고, 이 브라우저에 동의 버전만 남긴다', async () => {
  const pending = JSON.stringify({ version: '2026-10-15', terms: true, privacy: true, age14: true, marketing: true, source: 'guest-sheet', at: Date.now() })
  const { auth, calls, session, local } = loadAuth(memoryStorage({ [TOKEN]: memberValue }), memoryStorage({ umsh_consent_pending_v1: pending }))
  const result = await auth.syncMemberConsent()
  assert.equal(result.recorded, true)
  assert.equal(calls[0].url, '/api/consents')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer member-tok')
  const body = JSON.parse(calls[0].init.body)
  assert.deepEqual([body.terms, body.privacy, body.age14, body.marketing, body.source], [true, true, true, true, 'guest-sheet'])
  assert.equal(session.getItem('umsh_consent_pending_v1'), null)
  assert.equal(local.getItem('umsh_consent_ok_v1'), '2026-10-15')
})

test('동의 저장소가 아직 없으면(503) 받아 둔 동의를 지우지 않고 다시 묻지도 않는다', async () => {
  const pending = JSON.stringify({ version: '2026-10-15', terms: true, privacy: true, age14: true, marketing: false, source: 'login', at: Date.now() })
  const { auth, session } = loadAuth(memoryStorage({ [TOKEN]: memberValue }), memoryStorage({ umsh_consent_pending_v1: pending }), async () => ({ ok: false, status: 503, json: async () => ({}) }))
  const result = await auth.syncMemberConsent()
  assert.equal(result.error, true)
  assert.ok(session.getItem('umsh_consent_pending_v1'))
})

test('받아 둔 동의가 없고 서버가 지금 버전 동의가 있다고 하면 시트를 띄우지 않는다', async () => {
  const { auth, calls } = loadAuth(memoryStorage({ [TOKEN]: memberValue }))
  const result = await auth.syncMemberConsent()
  assert.equal(result.current, true)
  assert.equal(calls[0].url, '/api/consents/status')
  assert.equal((await auth.syncMemberConsent()).skipped, true, '탭마다 한 번만 묻는다')
})

test('결과 시트: 동의 묶음을 SNS 버튼 위에 넣고, 필수가 빠지면 흔들고 넘어가지 않는다', () => {
  assert.match(sheetSource, /data-consent-host/)
  const onProvider = sheetSource.slice(sheetSource.indexOf('function onProvider('), sheetSource.indexOf('function open('))
  const shakeAt = onProvider.indexOf('shakeMissing()')
  const loginAt = onProvider.indexOf('login(opts, provider)')
  assert.ok(shakeAt > 0 && loginAt > shakeAt)
  assert.match(onProvider, /savePending\(values\)/)
  assert.match(onProvider, /currentGuestToken/)
  assert.match(sheetSource, /LOGIN_PROVIDER_KEY = 'umsh_login_provider_v1'/)
  assert.match(sheetSource, /recordGuestVisit/)
})

test('로그인 화면: 동의 묶음을 SNS 버튼 위에 두고, 모든 SNS 버튼과 구글 버튼 덮개가 동의를 거친다', () => {
  const login = cmdg.slice(cmdg.indexOf('function renderLogin()'), cmdg.indexOf('function renderLoading()'))
  assert.ok(login.indexOf('data-consent-host') > 0 && login.indexOf('data-consent-host') < login.indexOf('auth-provider-list'))
  assert.match(login, /mountLoginConsent\(\)/)
  assert.match(login, /maybeAutoStartProvider\(\)/)
  assert.match(cmdg, /if \(!loginConsentReady\(\)\) return;\n\s+signInWithProvider\(providerButton\.dataset\.authProvider\)/)
  assert.match(cmdg, /data-consent-cover/)
  assert.match(cmdg, /<script src="\/js\/umsh-consent\.js\?v=/)
  const signIn = cmdg.slice(cmdg.indexOf('async function signInWithProvider('), cmdg.indexOf('function isGuestTeaserFlow'))
  assert.ok(signIn.indexOf('saveLoginConsent()') > 0 && signIn.indexOf('saveLoginConsent()') < signIn.indexOf('signInWithOAuth'))
  const google = cmdg.slice(cmdg.indexOf('async function handleGoogleCredentialResponse('), cmdg.indexOf('async function signInWithProvider('))
  assert.ok(google.indexOf('saveLoginConsent()') > 0 && google.indexOf('saveLoginConsent()') < google.indexOf('signInWithIdToken'))
})

test('결과 시트에서 고른 SNS 는 시트에서 받은 동의가 있을 때만 로그인 화면이 한 번 이어서 시작한다', () => {
  const auto = cmdg.slice(cmdg.indexOf('function maybeAutoStartProvider('), cmdg.indexOf('function setAuthMessage('))
  assert.match(auto, /readPending/)
  assert.match(auto, /shouldUseGoogleIdentity\(\)\) return/)
  const take = cmdg.slice(cmdg.indexOf('function takeRequestedProvider('), cmdg.indexOf('function maybeAutoStartProvider('))
  assert.match(take, /sessionStorage\.removeItem\(LOGIN_PROVIDER_KEY\)/, '한 번 쓰면 지운다')
  assert.match(take, /params\.delete\("provider"\)/)
})

// 2026-10-15 운영 QA: 비회원 첫 결과(04)는 서버 프로필 저장 전이라 "로컬 입력만 있음" 길로 온다. 그 길에서도 동의 시트를 건다.
test('단계형 서비스 04: 로컬 입력만 있는 비회원도 동의·저장 시트를 건다', () => {
  const gate = readFileSync(new URL('../../사주/js/umsh-funnel-auth-gate.js', import.meta.url), 'utf8')
  assert.match(gate, /if \(hasLocalGuestProfile\(\)\) \{ if \(isGuest\) armGuestSaveSheet\(\); return reveal\(\); \}/)
  assert.match(gate, /if \(onTeaser && isGuest\) armGuestSaveSheet\(\)/)
})

// 2026-10-15 운영 QA: 결과 시트에서 동의하고 로그인 화면이 SNS 를 이어 시작할 때, "동의한 곳"이 로그인 화면으로 덮이지 않는다.
test('로그인 화면이 이어 시작할 때 시트 동의의 출처(guest-sheet)를 지킨다', () => {
  const cmdg = readFileSync(new URL('../../사주/사주/index.html', import.meta.url), 'utf8')
  const save = cmdg.slice(cmdg.indexOf('function saveLoginConsent()'), cmdg.indexOf('function takeRequestedProvider()'))
  assert.match(save, /readPending\?\.\(\)\?\.source === "guest-sheet"\) values\.source = "guest-sheet"/)
})

// 2026-10-15 대표 결정: 로그인한 회원에게 화면을 열자마자 동의 시트를 띄우지 않는다. 결제(운명 거래하기)처럼 필요할 때만 묻는다.
test('동의 기록이 없는 회원이라도 자동 확인(prompt 없음)에서는 시트를 띄우지 않고, 다음에 다시 물을 수 있게 남긴다', async () => {
  const fetchImpl = async (url: string) => ({ ok: true, status: 200, json: async () => (url === '/api/consents/status' ? { version: '2026-10-15', current: false } : { ok: true }) })
  const { auth, session } = loadAuth(memoryStorage({ [TOKEN]: memberValue }), memoryStorage(), fetchImpl)
  const result = await auth.syncMemberConsent()
  assert.equal(result.current, false)
  assert.equal(result.reconsented, undefined, '시트를 띄우지 않는다')
  assert.equal(session.getItem('umsh_consent_checked:member-1'), null, '확인했다고 남기지 않아야 결제 때 묻는다')
})

test('결제 직전 확인(ensureMemberConsent)은 동의가 있으면 바로 통과한다', async () => {
  const { auth } = loadAuth(memoryStorage({ [TOKEN]: memberValue }))
  assert.equal(await auth.ensureMemberConsent({ title: 't' }), true)
})

test('운명 거래하기: 회원은 동의 확인 뒤 결제 시트, 비회원은 동의+로그인 시트(바로 그 SNS 로그인)', () => {
  const cmdg = readFileSync(join(ROOT, '사주/사주/index.html'), 'utf8')
  const pay = cmdg.slice(cmdg.indexOf('async function openTradePaySheet()'), cmdg.indexOf('async function beginAnalysisAfterAuth()'))
  assert.match(pay, /claimGuestNow\?\.\(\{ silent: true \}\)/, '로그인 직후 결과 옮기기 확인 시트가 결제 시트와 겹치지 않는다')
  assert.match(pay, /ensureMemberConsent\(/)
  assert.ok(pay.indexOf('ensureMemberConsent(') < pay.indexOf('UMSHPaySheet.open('), '동의 다음에 결제 시트')
  assert.match(pay, /if \(!agreed\) return;/)
  const login = cmdg.slice(cmdg.indexOf('function openTradeLoginSheet()'), cmdg.indexOf('const TRADE_ORIGIN_AMOUNT'))
  assert.match(login, /noInline: true/)
  assert.match(login, /signInWithProvider\(provider\)/, '로그인 화면을 거치지 않고 누른 SNS로 바로')
  assert.match(login, /sessionStorage\.setItem\(AUTH_PURCHASE_KEY, "1"\)/)
  assert.match(cmdg, /<script src="\/js\/umsh-pay-sheet\.js\?v=/)
})

test('결제 시트: 동의 체크 없이 안내 한 줄, 휴대폰은 처음 한 번, 앱·무료 이용권은 /payment 로', () => {
  const paySheet = readFileSync(join(ROOT, '사주/js/umsh-pay-sheet.js'), 'utf8')
  assert.doesNotMatch(paySheet, /type="checkbox"/, '결제 시트에서 약관 체크를 다시 받지 않는다')
  assert.match(paySheet, /결제 정보를 확인했으며/)
  assert.match(paySheet, /환불·취소 정책/)
  assert.match(paySheet, /TEL_PREFIX \+ userId/)
  assert.match(paySheet, /UMSHAppBilling\.isAvailable\(\)\)\) \{\s*global\.location\.assign\(fallback\)/)
  assert.match(paySheet, /item\.kind === 'service_free'\) \{[\s\S]*?location\.assign\(free\.pathname \+ free\.search\)/)
  assert.match(paySheet, /\/api\/payment\/purchase-status/, '이미 결제한 풀이는 다시 결제하지 않는다')
  assert.match(paySheet, /fetch\('\/api\/payment\/orders'/)
  assert.match(paySheet, /trackFunnel\('pay_open'/)
})

// 2026-10-16 대표 결정(서브 콘텐츠 /play): 결과를 맨 아래까지 내리면 동의+로그인 바텀시트. 결과 안 안내 카드(배너)는 없앤다.
test('무료 결과: 맨 아래까지 내리면 바텀시트를 한 번 올리고, 결과 안에 안내 카드를 넣지 않는다', () => {
  const when = sheetSource.slice(sheetSource.indexOf('function openWhenSeen('), sheetSource.indexOf('function confirmClaim('))
  assert.ok(when.includes("document.addEventListener('scroll', onScroll, { capture: true, passive: true })"))
  assert.ok(when.includes('if (wasSeen(opts.resultKey)) return;'), '닫은 결과는 다시 저절로 뜨지 않는다')
  assert.ok(when.includes('open(opts)'))
  assert.ok(when.includes('if (!done && !pageScrollable()) fire()'), '내릴 것이 없으면 잠깐 뒤에 올린다')
  assert.doesNotMatch(sheetSource, /showInline|umsh-gs-inline|이 결과를 저장할까요/)
})

// 2026-10-16 대표 결정 변경: 메인 콘텐츠(천명사주·오늘 운세·단계형·옛 단일 서비스)는 무료 결과에서 로그인·저장을 권하지 않는다.
test('메인 콘텐츠는 저장 카드를 걸지 않고 비회원 방문만 센다(서브 콘텐츠 /play 만 저장 권유)', () => {
  const cmdg = readFileSync(join(ROOT, '사주/사주/index.html'), 'utf8')
  assert.doesNotMatch(cmdg, /UMSHGuestSaveSheet\?\.openWhenSeen/)
  for (const page of ['사주/love/again/index.html', '사주/love/mind/index.html', '사주/love/spouse/index.html', '사주/work/job/index.html', '사주/today/free/index.html']) {
    const html = readFileSync(join(ROOT, page), 'utf8')
    assert.doesNotMatch(html, /openWhenSeen/, page)
    assert.match(html, /recordGuestVisit/, page)
  }
  const gate = readFileSync(join(ROOT, '사주/js/umsh-funnel-auth-gate.js'), 'utf8')
  assert.doesNotMatch(gate, /openWhenSeen/)
  for (const play of ['사주/play/solo-nara/app.js', '사주/play/love-speed/app.js']) assert.match(readFileSync(join(ROOT, play), 'utf8'), /openWhenSeen/, play)
})

test('저장하기·운명 거래하기로 로그인하고 돌아오면 "저장할까요?"를 다시 묻지 않고 옮긴다', async () => {
  const posts: any[] = []
  const fetchImpl = async (url: string, init?: any) => {
    const body = init?.body ? JSON.parse(init.body) : {}
    posts.push({ url, body })
    return { ok: true, status: 200, json: async () => (body.dryRun ? { reports: 1, profile: 'copied' } : { reports: 1, profile: 'copied' }) }
  }
  const session = memoryStorage({ [TOKEN]: guestValue, umsh_claim_intent_v1: String(Date.now()) })
  const { auth } = loadAuth(memoryStorage({ [TOKEN]: memberValue }), session, fetchImpl)
  const result = await auth.claimGuestNow()
  assert.equal(result.reports, 1)
  assert.deepEqual(posts.map((p) => [p.url, Boolean(p.body.dryRun)]), [['/api/auth/claim-guest', true], ['/api/auth/claim-guest', false]])
  assert.equal(session.getItem('umsh_claim_intent_v1'), null, '한 번 쓰고 지운다')
  assert.match(sheetSource, /setItem\('umsh_claim_intent_v1'/)
})
