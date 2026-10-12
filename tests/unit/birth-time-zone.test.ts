import test from 'node:test'
import assert from 'node:assert/strict'
import {civilUtcMs} from '../../src/saju/civil-time.js'
import {birthUtcMs, calculateStemBranchIndices} from '../../src/saju/calculator.js'
import type {BirthInput} from '../../src/types/index.js'
const iso = (...args: Parameters<typeof civilUtcMs>) => new Date(civilUtcMs(...args)).toISOString()
test('existing Korean values and named Seoul are identical', () => {
 for (const year of [1970,1990,2024]) for (const month of [1,4,7,11]) {
  const b: BirthInput = {year,month,day:15,hour:23,minute:30,gender:'female',calendar:'solar'}
  assert.equal(birthUtcMs(b),Date.UTC(year,month-1,15,14,30))
  assert.deepEqual(calculateStemBranchIndices(b),calculateStemBranchIndices({...b,birthTimeZone:undefined}))
 }
})
test('Tokyo, US winter/summer and London civil clocks', () => {
 assert.equal(iso(2024,7,15,15,30,'Asia/Tokyo'),'2024-07-15T06:30:00.000Z')
 assert.equal(iso(2024,7,15,15,30,'America/New_York'),'2024-07-15T19:30:00.000Z')
 assert.equal(iso(2024,1,15,15,30,'America/New_York'),'2024-01-15T20:30:00.000Z')
 assert.equal(iso(2024,7,15,15,30,'Europe/London'),'2024-07-15T14:30:00.000Z')
})
test('spring clock gap is rejected and autumn fold requires choice', () => {
 assert.throws(()=>civilUtcMs(2024,3,10,2,30,'America/New_York'),/NONEXISTENT/)
 assert.throws(()=>civilUtcMs(2024,11,3,1,30,'America/New_York'),/AMBIGUOUS/)
 assert.equal(iso(2024,11,3,1,30,'America/New_York','earlier'),'2024-11-03T05:30:00.000Z')
 assert.equal(iso(2024,11,3,1,30,'America/New_York','later'),'2024-11-03T06:30:00.000Z')
})
test('half-hour/quarter-hour offsets and half-hour DST', () => {
 assert.equal(iso(2024,7,15,15,30,'Asia/Kathmandu'),'2024-07-15T09:45:00.000Z')
 assert.equal(iso(2024,7,15,15,30,'Australia/Adelaide'),'2024-07-15T06:00:00.000Z')
 assert.throws(()=>civilUtcMs(2024,10,6,2,15,'Australia/Lord_Howe'),/NONEXISTENT/)
})
test('unknown zone and invalid calendar dates are rejected', () => {
 assert.throws(()=>civilUtcMs(2024,1,1,0,0,'bad/zone'),/INVALID_BIRTH_TIME_ZONE/)
 assert.throws(()=>civilUtcMs(2024,2,30),/INVALID_BIRTH_DATE_TIME/)
})

test('unique times immediately after DST transitions do not inherit the old offset', () => {
 assert.equal(iso(2024,3,10,3,30,'America/New_York'),'2024-03-10T07:30:00.000Z')
 assert.equal(iso(2024,11,3,2,30,'America/New_York'),'2024-11-03T07:30:00.000Z')
 assert.throws(()=>civilUtcMs(2024,1,1,1.5,0,'Asia/Tokyo'),/INVALID_BIRTH_DATE_TIME/)
})

test('DST gaps and folds return actionable 400, not server errors', async () => {
 const {respondRequestFailure} = await import('../../src/server/input-error.js')
 for (const code of ['NONEXISTENT_BIRTH_LOCAL_TIME','AMBIGUOUS_BIRTH_LOCAL_TIME','INVALID_BIRTH_TIME_ZONE']) {
  let status=0, body:any
  respondRequestFailure({status(n){status=n;return {json(v){body=v}}}},new Error(code),'server failure')
  assert.equal(status,400);assert.equal(body.code,code)
 }
})
