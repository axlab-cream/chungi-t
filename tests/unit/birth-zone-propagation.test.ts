import assert from 'node:assert/strict'
import test, {after} from 'node:test'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import type {BirthInput} from '../../src/types/index.js'

const env = {...process.env}
const originalFetch = globalThis.fetch
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = ''
process.env.SUPABASE_URL = 'https://birth-zone.synthetic.invalid'
process.env.SUPABASE_ANON_KEY = 'synthetic-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = ''
let stored: Record<string, unknown> | null = null
const calls: string[] = []
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
 const url = new URL(String(input))
 assert.equal(url.origin,'https://birth-zone.synthetic.invalid')
 assert.equal(url.pathname,'/rest/v1/cheongi_user_profiles')
 calls.push(init?.method || 'GET')
 if (init?.method === 'POST') stored = JSON.parse(String(init.body))
 return new Response(JSON.stringify(stored ? [stored] : []), {headers:{'content-type':'application/json'}})
}) as typeof fetch
const profileStore = await import('../../src/user/profile-store.js')
const reportStore = await import('../../src/report/report-store.js')
after(() => {globalThis.fetch = originalFetch; for(const key of Object.keys(process.env)) if(!(key in env)) delete process.env[key];Object.assign(process.env,env)})
const owner = {id:'aaaaaaaa-0000-0000-0000-000000000001', accessToken:'synthetic-token'}
const birth: BirthInput = {year:1990,month:5,day:12,hour:1,minute:30,gender:'female',calendar:'solar'}

test('profile builder, JSONB write, reload preserve foreign timezone and fold choice',async()=>{
 const b = {...birth,birthTimeZone:'America/New_York',birthTimeDisambiguation:'later' as const}
 const profile = profileStore.buildUserBirthProfile({owner,name:'Synthetic',birth:b})
 assert.deepEqual(profile.birth,{...b,isLeapMonth:false})
 const saved = await profileStore.saveUserBirthProfile(profile,owner)
 assert.equal(saved.birth.birthTimeZone,'America/New_York')
 assert.equal(saved.birth.birthTimeDisambiguation,'later')
 const row = stored as unknown as {profile_payload:{birth_time_zone:string;birth_time_disambiguation:string}}
 assert.equal(row.profile_payload.birth_time_zone,'America/New_York')
 assert.equal(row.profile_payload.birth_time_disambiguation,'later')
 const loaded = await profileStore.getUserBirthProfile(owner)
 assert.deepEqual(loaded?.birth,saved.birth)
 assert.ok(calls.includes('POST'))
})
test('legacy profile JSONB remains without invented timezone',async()=>{
 stored = {...stored,profile_payload:{}}
 const old = await profileStore.getUserBirthProfile(owner)
 assert.equal(old?.birth.birthTimeZone,undefined)
 assert.equal(old?.birth.birthTimeDisambiguation,undefined)
 const built = profileStore.buildUserBirthProfile({owner,name:'Synthetic',birth})
 assert.equal('birthTimeZone' in built.birth,false)
})
test('Korean omitted/named-Seoul report and lineage IDs unchanged; foreign/fold IDs distinct',()=>{
 const context={serviceKey:'saju_master'}
 const reportId = (b:BirthInput)=>reportStore.createReportId(b,context,'synthetic-corpus',owner.id)
 const lineage = (b:BirthInput)=>reportStore.createReportLineageId(b,context,owner.id)
 assert.equal(reportId(birth),reportId({...birth,birthTimeZone:'Asia/Seoul'}))
 assert.equal(lineage(birth),lineage({...birth,birthTimeZone:'Asia/Seoul'}))
 const ny={...birth,birthTimeZone:'America/New_York'}
 assert.notEqual(reportId(ny),reportId(birth))
 assert.notEqual(lineage(ny),lineage(birth))
 assert.notEqual(reportId({...ny,birthTimeDisambiguation:'earlier'}),reportId({...ny,birthTimeDisambiguation:'later'}))
})
for (const locale of ['en','ja']) {
 const html=readFileSync(new URL(`../../.vercel-localized/${locale}/cmdg/index.html`,import.meta.url),'utf8')
 test(`${locale} inline scripts compile and new birthplace state is blank`,()=>{
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
   if (/type=["']application\/ld\+json/.test(script[0])) continue
   new vm.Script(script[1])
  }
  assert.match(html,/birthTimeZone: ""/)
  assert.match(html,/Intl\.supportedValuesOf\("timeZone"\)/)
  assert.match(html,/select id="birthTimeZone" name="birthTimeZone" required/)
  assert.ok(!html.includes('resolvedOptions().timeZone'))
 })
 test(`${locale} primary API builder emits selected zone and fold and preserves payload`,()=>{
  const start=html.indexOf('      function normalizeBirthGender(value) {')
  const end=html.indexOf('      async function analyzeBirth()',start)
  assert.ok(start>0&&end>start)
  const sandbox={state:{birth:'19900512',time:'01:30',gender:locale==='ja'?'女性':'Female',calendar:locale==='ja'?'陽暦':'Solar',name:'Synthetic',birthTimeZone:'America/New_York',birthTimeDisambiguation:'later'}}
  vm.createContext(sandbox)
  const payload=vm.runInContext(html.slice(start,end)+'\nparseBirthInput()',sandbox)
  assert.equal(payload.birthTimeZone,'America/New_York')
  assert.equal(payload.birthTimeDisambiguation,'later')
  assert.equal(payload.year,1990)
  assert.equal(payload.hour,1)
  assert.equal(payload.gender,'female')
  for (const [gender,calendar] of [['Woman','Lunar calendar'],['female','lunar'],['女性','陰暦'],['女性','旧暦']]) {
   sandbox.state.gender=gender; sandbox.state.calendar=calendar
   const restored=vm.runInContext('parseBirthInput()',sandbox)
   assert.equal(restored.gender,'female')
   assert.equal(restored.calendar,'lunar')
  }
  const applyStart=html.indexOf('      function applyUserProfile(profile, options = {}) {')
  const applyEnd=html.indexOf('      function localUserProfileFromState()',applyStart)
  Object.assign(sandbox,{profileDateValue:(b:BirthInput)=>`${b.year}.${b.month}.${b.day}`,pad2:(v:number)=>String(v).padStart(2,'0'),syncBirthSessionFromState:()=>{},restoredProfile:{name:'Synthetic',birth:{...birth,calendar:'lunar',birthTimeZone:'America/New_York',birthTimeDisambiguation:'later'},context:{},birthTimeKnown:true}})
  const reopened=vm.runInContext(html.slice(applyStart,applyEnd)+'\napplyUserProfile(restoredProfile); parseBirthInput()',sandbox)
  assert.equal(reopened.gender,'female')
  assert.equal(reopened.calendar,'lunar')
  assert.equal(reopened.birthTimeZone,'America/New_York')
  assert.equal(reopened.birthTimeDisambiguation,'later')
  assert.match(html,/state\.birthTimeZone = birth\.birthTimeZone \|\| "Asia\/Seoul"/)
  assert.match(html,/birthTimeZone: state\.birthTimeZone/)
  assert.match(html,/saved\.birthTimeZone \|\| birth\.birthTimeZone \|\| "Asia\/Seoul"/)
 })
}
