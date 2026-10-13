import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

// Execute the complete production restore function and its real birth parsers.
// Storage is an in-memory map; no customer records, endpoints or providers are used.
function sourceRange(html: string, startMarker: string, endMarker: string) {
  const start = html.indexOf(startMarker)
  const end = html.indexOf(endMarker, start)
  assert.ok(start >= 0 && end > start, `Missing source range: ${startMarker}`)
  return html.slice(start, end)
}

function runtime(locale: string) {
  const html = readFileSync(new URL(`../../.vercel-localized/${locale}/cmdg/index.html`, import.meta.url), 'utf8')
  const storage = new Map<string, string>()
  const state: Record<string, any> = {serviceKey: 'love_this_year', reportRequestToken: 0}
  const sandbox = {
    state,
    SERVICE_CATALOG: {love_this_year: {key: 'love_this_year', plan: 'synthetic', defaultRelationship: '', defaultOrientation: '', defaultWork: ''}},
    LOVE_THIS_YEAR_SERVICE_KEY: 'love_this_year',
    normalizeServiceKey: (value: string) => value,
    stopReportTyping: () => {},
    setActiveReportId: (value: string) => {state.activeReportId = value},
    sessionStorage: {setItem: (key: string, value: string) => {storage.set(key, value)}},
    fetch: () => assert.fail('Partner restore must not call a live endpoint'),
  }
  vm.createContext(sandbox)
  vm.runInContext([
    sourceRange(html, '      function currentService() {', '      function servicePathForCurrentPage() {'),
    sourceRange(html, '      function pad2(value) {', '      function historySubtitle(entry) {'),
    sourceRange(html, '      function normalizeBirthGender(value) {', '      async function analyzeBirth() {'),
  ].join('\n'), sandbox)
  return {
    state,
    storage,
    calendarTokens: new Set([...html.matchAll(/data-key="partnerCalendar" data-value="([^"]*)"/g)].map(match => match[1])),
    genderTokens: new Set([...html.matchAll(/data-key="partnerGender" data-value="([^"]*)"/g)].map(match => match[1])),
    restore: (payload: object) => {Object.assign(sandbox, {payload}); return vm.runInContext('applyReadingPayload(payload)', sandbox)},
    partner: () => JSON.parse(JSON.stringify(vm.runInContext('getPartnerContext()', sandbox))),
  }
}

function fixture(partner: object, source: 'saved' | 'context') {
  return {
    analysis: {report: {reportId: 'synthetic-report', sections: [{id: 'synthetic-section', title: '저장 제목 原文', content: '저장 풀이 원문: 1998년, 12,000원은 그대로 보존한다.'}]}, birth: {year: 1990, month: 5, day: 12, hour: 1, minute: 30, gender: 'female', calendar: 'lunar'}},
    birthState: {serviceKey: 'love_this_year', birthTimeKnown: true, name: 'Synthetic owner 원문', concern: 'Saved concern 原文', ...(source === 'saved' ? {partner} : {})},
    context: {serviceKey: 'love_this_year', ...(source === 'context' ? {partner} : {})},
    chatHistory: [{role: 'user', content: 'Saved chat 원문'}],
  }
}

for (const locale of ['en', 'ja']) {
  for (const source of ['saved', 'context'] as const) {
    for (const calendar of ['solar', 'lunar']) {
      for (const gender of ['male', 'female']) {
        for (const known of [false, true]) {
          test(`${locale} ${source} partner restore preserves ${calendar}/${gender}, time known=${known}`, () => {
            const rt = runtime(locale)
            const partner = {mode: 'known', name: 'Synthetic counterpart 原文', relationship: 'Saved relationship 원문', birthTimeKnown: known,
              birth: {year: 1998, month: 1, day: 23, hour: known ? 1 : 12, minute: known ? 30 : 0, calendar, gender}}
            const payload = fixture(partner, source)
            const original = JSON.stringify(payload)
            assert.equal(rt.restore(payload), true)
            assert.deepEqual(rt.partner(), partner, 'Restored partner context must retain canonical calendar and gender')
            // Restored UI selections must match the same tokens used by fresh selection buttons.
            assert.equal(rt.state.partnerCalendar, locale === 'en' ? (calendar === 'lunar' ? 'Lunar' : 'Solar') : (calendar === 'lunar' ? '旧暦' : '新暦'))
            assert.equal(rt.state.partnerGender, locale === 'en' ? (gender === 'female' ? 'Female' : 'Male') : (gender === 'female' ? '女性' : '男性'))
            assert.ok(rt.calendarTokens.has(rt.state.partnerCalendar), 'Restored calendar must select an actual button')
            assert.ok(rt.genderTokens.has(rt.state.partnerGender), 'Restored gender must select an actual button')
            const persisted = JSON.parse(rt.storage.get('cheongi_birth')!)
            assert.deepEqual(persisted.partner, partner)
            assert.equal(persisted.calendar, 'lunar')
            assert.equal(persisted.gender, 'female')
            assert.equal(persisted.year, 1990)
            assert.equal(persisted.month, 5)
            assert.equal(persisted.day, 12)
            assert.equal(persisted.hour, 1)
            assert.equal(persisted.minute, 30)
            assert.equal(persisted.concern, payload.birthState.concern)
            assert.equal(rt.storage.get('cheongi_chat_history'), JSON.stringify(payload.chatHistory))
            assert.equal(rt.storage.get('cheongi_analysis'), JSON.stringify(payload.analysis))
            assert.equal(JSON.stringify(payload), original, 'Saved source and report content must not be modified')
            // A second reopen must remain stable instead of changing the canonical values.
            const reopened = fixture(persisted.partner, source)
            assert.equal(rt.restore(reopened), true)
            assert.deepEqual(rt.partner(), partner)
          })
        }
      }
    }
  }
  test(`${locale} saved partner takes precedence over context without changing either original`, () => {
    const rt = runtime(locale)
    const savedPartner = {mode: 'known', name: 'Saved', relationship: 'Original', birthTimeKnown: true,
      birth: {year: 1998, month: 1, day: 23, hour: 9, minute: 15, calendar: 'lunar', gender: 'female'}}
    const payload = {...fixture(savedPartner, 'saved'), context: {serviceKey: 'love_this_year', partner: {...savedPartner, name: 'Context', birth: {...savedPartner.birth, calendar: 'solar', gender: 'male'}}}}
    const original = JSON.stringify(payload)
    assert.equal(rt.restore(payload), true)
    assert.deepEqual(rt.partner(), savedPartner)
    assert.equal(JSON.stringify(payload), original)
  })
  test(`${locale} absent partner stays absent and missing analysis has no side effects`, () => {
    const rt = runtime(locale)
    assert.equal(rt.restore({}), false)
    assert.equal(rt.storage.size, 0)
    assert.deepEqual(rt.state, {serviceKey: 'love_this_year', reportRequestToken: 0})
    const payload = fixture({mode: 'none', relationship: 'Original none relationship'}, 'context')
    assert.equal(rt.restore(payload), true)
    assert.deepEqual(rt.partner(), {mode: 'none', relationship: 'Original none relationship'})
    assert.deepEqual(JSON.parse(rt.storage.get('cheongi_birth')!).partner, rt.partner())
  })
}
