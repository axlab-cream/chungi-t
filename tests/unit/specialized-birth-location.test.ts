import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { InputError } from '../../src/server/input-error.js'
import { parseBirthLocation, birthLocationKey, birthForIdentity } from '../../src/saju/birth-location.js'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { parseCoupleMatchRequest, createCoupleMatchReportId } from '../../src/match/couple-service.js'
import { parseMarryMatchRequest, createMarryMatchReportId } from '../../src/match/marry-service.js'
import { parseLoveAgainRequest, createLoveAgainReportId } from '../../src/love/again-service.js'
import { parseLoveMindRequest, createLoveMindReportId } from '../../src/love/mind-service.js'
import { parseLoveSignalRequest, createLoveSignalReportId } from '../../src/love/signal-service.js'
import { parseLoveThisYearRequest, createLoveThisYearReportId } from '../../src/love/thisyear-service.js'
import { parseLoveSpouseRequest, createLoveSpouseReportId } from '../../src/love/spouse-service.js'
import { parseMoneySaveRequest, createMoneySaveReportId } from '../../src/money/save-service.js'
import { createNewYearReportId } from '../../src/flow/newyear-service.js'
import { parseWeddingRequest, createWeddingReportId } from '../../src/day/wedding-service.js'
import type { BirthInput } from '../../src/types/index.js'

const birth: BirthInput = {year:1992,month:6,day:15,hour:9,minute:30,gender:'female',calendar:'solar'}
const foreign: BirthInput = {...birth,birthTimeZone:'America/New_York',birthTimeDisambiguation:'later'}
const request = {
  selfBirth: foreign, selfBirthTimeKnown: true, partnerBirth: {...foreign,birthTimeKnown:true}, partnerBirthTimeKnown: true,
  relationshipStage: '연애 중', conflictPattern:'갈등', focus:'관계', relationshipTemperature:'보통', marriagePlan:'논의 중',
  breakupReason:'거리',currentSignal:'연락 있음',breakupPeriod:'1개월',contactPattern:'가끔',recentSignal:'대화 있음',signalFocus:'대화',
  relationshipStatus:'single',partnerStarBasis:'official_star',
}

test('birth location validates only explicit zone and fold choice',()=>{
 assert.deepEqual(parseBirthLocation({}),{})
 assert.deepEqual(parseBirthLocation({locale:'en',country:'US'}),{})
 assert.deepEqual(parseBirthLocation(foreign as unknown as Record<string,unknown>),{birthTimeZone:'America/New_York',birthTimeDisambiguation:'later'})
 for(const raw of [{birthTimeZone:'bad/zone'},{birthTimeZone:5},{birthTimeDisambiguation:'random'}]) {
  assert.throws(()=>parseBirthLocation(raw),err=>err instanceof InputError && err.status===400)
 }
 assert.deepEqual(birthLocationKey({...birth,birthTimeZone:'Asia/Seoul',birthTimeDisambiguation:'later'}),{})
 assert.deepEqual(birthForIdentity({...birth,birthTimeZone:'Asia/Seoul',birthTimeDisambiguation:'later'}),birth)
})

for (const [label, parse] of [
 ['couple',parseCoupleMatchRequest],['marry',parseMarryMatchRequest],['again',parseLoveAgainRequest],['mind',parseLoveMindRequest],['signal',parseLoveSignalRequest],
] as const) {
 test(label+' partner birth propagates zone and repeated-clock choice',()=>{
  const result=parse(request)
  assert.equal(result.partnerBirth?.birthTimeZone,'America/New_York')
  assert.equal(result.partnerBirth?.birthTimeDisambiguation,'later')
  assert.equal(result.partnerBirthTimeKnown,true)
  assert.throws(()=>parse({...request,partnerBirth:{...foreign,birthTimeZone:'bad/zone'}}),err=>err instanceof InputError && err.message==='INVALID_BIRTH_TIME_ZONE')
  assert.throws(()=>parse({...request,partnerBirth:{...foreign,birthTimeDisambiguation:'first'}}),err=>err instanceof InputError && err.message==='INVALID_BIRTH_TIME_DISAMBIGUATION')
 })
}
for (const [label, parse] of [
 ['couple',parseCoupleMatchRequest],['marry',parseMarryMatchRequest],['signal',parseLoveSignalRequest],['thisyear',parseLoveThisYearRequest],
] as const) {
 test(label+' self birth propagates zone and rejects invalid input',()=>{
  const result=parse(request)
  assert.equal(result.selfBirth?.birthTimeZone,'America/New_York')
  assert.equal(result.selfBirth?.birthTimeDisambiguation,'later')
  assert.throws(()=>parse({...request,selfBirth:{...foreign,birthTimeZone:'bad/zone'}}),err=>err instanceof InputError)
 })
}
test('optional partner birth stays absent when no date is provided',()=>{
 assert.equal(parseLoveAgainRequest({...request,partnerBirth:undefined}).partnerBirth,undefined)
 assert.equal(parseLoveMindRequest({...request,partnerBirth:undefined}).partnerBirth,undefined)
})
test('wedding legacy ISO date and explicit nested partner birth both propagate',()=>{
 const flat=parseWeddingRequest({candidateDate1:'2027-06-15',partnerBirth:'1992-06-15',partnerTime:'9:30',partnerBirthTimeZone:'America/New_York',partnerBirthTimeDisambiguation:'later'})
 assert.equal(flat.partnerBirth?.birthTimeZone,'America/New_York')
 assert.equal(flat.partnerBirth?.birthTimeDisambiguation,'later')
 const nested=parseWeddingRequest({candidateDate1:'2027-06-15',partnerBirth:{...foreign,birthTimeKnown:true}})
 assert.equal(nested.partnerBirth?.birthTimeZone,'America/New_York')
 assert.equal(nested.partnerBirth?.minute,30)
 assert.equal(nested.partnerBirthTimeKnown,true)
 assert.throws(()=>parseWeddingRequest({partnerBirth:{...foreign,birthTimeZone:'bad/zone'}}),err=>err instanceof InputError)
})

const analysis=analyzeSaju(birth)
const couple=parseCoupleMatchRequest({...request,selfBirth:undefined,partnerBirth:birth,partnerBirthTimeKnown:true})
const marry=parseMarryMatchRequest({...request,selfBirth:undefined,partnerBirth:birth,partnerBirthTimeKnown:true})
const again=parseLoveAgainRequest({...request,partnerBirth:birth})
const mind=parseLoveMindRequest({...request,partnerBirth:birth})
const signal=parseLoveSignalRequest({...request,selfBirth:undefined,partnerBirth:birth})
const thisyear=parseLoveThisYearRequest({...request,selfBirth:undefined})
const spouse=parseLoveSpouseRequest({relationshipStatus:'single',loveTarget:'여자',marriagePriority:'성격',meetingRoute:'소개'})
const money=parseMoneySaveRequest({moneyHabit:'planned',incomePattern:'stable',leakPoint:'shopping',relationSpending:'none',savingGoal:'save'})
const wedding=parseWeddingRequest({candidateDate1:'2027-06-15',partnerBirth:'1992-06-15',partnerTime:'9:30'})
const creators: Array<[string,(b:BirthInput)=>string]> = [
 ['couple',b=>createCoupleMatchReportId('owner',b,couple)],['marry',b=>createMarryMatchReportId('owner',b,marry)],
 ['again',b=>createLoveAgainReportId('owner',b,again)],['mind',b=>createLoveMindReportId('owner',b,mind)],
 ['signal',b=>createLoveSignalReportId('owner',b,signal)],['thisyear',b=>createLoveThisYearReportId('owner',b,thisyear)],
 ['spouse',b=>createLoveSpouseReportId('owner',b,spouse)],['money',b=>createMoneySaveReportId('owner',b,money)],
 ['newyear',b=>createNewYearReportId(analysis,b,'owner')],['wedding',b=>createWeddingReportId(analysis,b,wedding)],
]
for(const [label,create] of creators) test(label+' identity: implicit/explicit Seoul identical; foreign zone/fold distinct',()=>{
 assert.equal(create(birth),create({...birth,birthTimeZone:'Asia/Seoul'}))
 assert.equal(create(birth),create({...birth,birthTimeZone:'Asia/Seoul',birthTimeDisambiguation:'later'}))
 assert.notEqual(create(birth),create({...birth,birthTimeZone:'America/New_York'}))
 assert.notEqual(create({...foreign,birthTimeDisambiguation:'earlier'}),create(foreign))
})
test('couple and marry partner full-object identities normalize Seoul and isolate foreign zone',()=>{
 for(const [make,input] of [[createCoupleMatchReportId,couple],[createMarryMatchReportId,marry]] as const) {
  const old=make('owner',birth,input as any)
  assert.equal(make('owner',birth,{...input,partnerBirth:{...input.partnerBirth,birthTimeZone:'Asia/Seoul'}} as any),old)
  assert.notEqual(make('owner',birth,{...input,partnerBirth:{...input.partnerBirth,birthTimeZone:'America/New_York'}} as any),old)
 }
})
test('legacy again identity bytes remain unchanged',()=>{
 const fingerprint=JSON.stringify({ownerId:'owner',birth:{year:birth.year,month:birth.month,day:birth.day,hour:birth.hour,...(birth.minute?{minute:birth.minute}:{}),gender:birth.gender,calendar:birth.calendar},input:again,serviceKey:'love_again'})
 assert.equal(createLoveAgainReportId('owner',birth,again),createHash('sha256').update(fingerprint).digest('hex').slice(0,28))
})
