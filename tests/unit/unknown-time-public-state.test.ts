import test from 'node:test'
import assert from 'node:assert/strict'
import { readBirthClock, projectUnknownBirthTime } from '../../src/saju/birth-time-certainty.js'

test('known clock is explicit and range validated, blank never becomes midnight',()=>{
  assert.deepEqual(readBirthClock({hour:0,minute:0},true),{hour:0,minute:0})
  assert.deepEqual(readBirthClock({hour:'23',minute:'59'},true),{hour:23,minute:59})
  for(const hour of [undefined,null,'', ' ',24,-1,1.5,'bad'])assert.equal(readBirthClock({hour,minute:0},true),null)
  for(const minute of ['',null,60,-1,1.5])assert.equal(readBirthClock({hour:12,minute},true),null)
})
test('explicit unknown has a boundary-only placeholder, never infers certainty',()=>{
  assert.deepEqual(readBirthClock({},false),{hour:12,minute:0})
  assert.deepEqual(readBirthClock({hour:22,minute:59},false),{hour:12,minute:0})
})
test('known public analysis is untouched',()=>{
  const source={birth:{hour:22,minute:59},pillars:{hour:{hanja:'KNOWN'}},report:{sections:[]}}
  assert.equal(projectUnknownBirthTime(source,true),source)
})
test('unknown public structured analysis cannot expose provisional hour-derived facts',()=>{
  const report={sections:[{interpretation:'stored customer reading untouched'}]}
  const source={birth:{year:1990,hour:12,minute:0},pillars:{year:{hanja:'YEAR'},month:{hanja:'MONTH'},day:{hanja:'DAY'},hour:{hanja:'PROVISIONAL'}},dayMaster:{hanja:'DAY',strength:'PROVISIONAL'},elements:{wood:'PROVISIONAL'},elementCount:{wood:'PROVISIONAL'},dominantElement:'PROVISIONAL',weakElement:'PROVISIONAL',usefulGod:'PROVISIONAL',tenGods:['PROVISIONAL'],fortune:{currentDaewoon:'PROVISIONAL'},preview:{personality:'PROVISIONAL'},summary:'PROVISIONAL',report}
  const result=projectUnknownBirthTime(source,false)
  assert.ok(!JSON.stringify(result).includes('PROVISIONAL'))
  assert.equal((result as any).birthTimeKnown,false)
  assert.equal((result as any).birth.hour,undefined)
  assert.equal((result as any).pillars.hour,undefined)
  assert.equal((result as any).pillars.day.hanja,'DAY')
  assert.equal((result as any).dayMaster.strength,undefined)
  assert.equal((result as any).uncertainty.code,'BIRTH_TIME_UNKNOWN')
  assert.equal(result.report,report)
  assert.equal(source.birth.hour,12)
  assert.equal(source.pillars.hour.hanja,'PROVISIONAL')
})
