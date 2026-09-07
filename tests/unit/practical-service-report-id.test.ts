import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { BirthInput } from '../../src/types/index.js'
import { createMoneySaveReportId, parseMoneySaveRequest } from '../../src/money/save-service.js'
import { createWorkQuitReportId, parseWorkQuitRequest } from '../../src/work/quit-service.js'
import { createWorkJobReportId, parseWorkJobRequest } from '../../src/work/job-service.js'
import { createJobChoiceReportId, parseJobChoiceRequest } from '../../src/work/jobchoice-service.js'
import { createCatCompatReportId, parseCatCompatRequest } from '../../src/pet/cat-service.js'
import { createLuckyColorReportId, parseLuckyColorRequest } from '../../src/body/lucky-service.js'

const ownerId = 'synthetic-id-regression'
const birth: BirthInput = { year: 1990, month: 5, day: 15, hour: 12, gender: 'female', calendar: 'solar' }
const money = parseMoneySaveRequest({ moneyHabit: '계획에 따라 저축합니다' })
const quit = parseWorkQuitRequest({ reason: '장기 계획을 검토합니다' })
const job = parseWorkJobRequest({ currentJob: '기획자' })
const choice = parseJobChoiceRequest({ companyName: '검증 회사', roleName: '기획', workMode: 'onsite', commute: '30분', salaryFeeling: 'high' })
const cat = parseCatCompatRequest({ catName: '나비', household: 'single_cat', ageBand: 'unknown', touchStyle: 'loves_touch', playEnergy: 'medium', routineFlags: ['none'], focusArea: 'today_action', upcomingEvent: 'none' })
const lucky = parseLuckyColorRequest({ displayName: '검증' })

const cases = [
  { key: 'money_save', tail: { input: money }, create: (value: BirthInput) => createMoneySaveReportId(ownerId, value, money) },
  { key: 'quit_fortune', tail: { input: quit }, create: (value: BirthInput) => createWorkQuitReportId(ownerId, value, quit) },
  { key: 'work_job', tail: { input: job }, create: (value: BirthInput) => createWorkJobReportId(ownerId, value, job) },
  { key: 'job_choice', tail: { input: choice }, create: (value: BirthInput) => createJobChoiceReportId(ownerId, value, choice) },
  { key: 'cat_compatibility', tail: { input: cat }, create: (value: BirthInput) => createCatCompatReportId(ownerId, value, cat) },
  { key: 'lucky_color', tail: { displayName: lucky.displayName ?? '' }, create: (value: BirthInput) => createLuckyColorReportId(ownerId, value, lucky) },
]

for (const item of cases) {
  test(`${item.key} preserves legacy zero-minute IDs and distinguishes nonzero birth minutes`, () => {
    const legacy = createHash('sha256').update(JSON.stringify({ ownerId, birth, ...item.tail, serviceKey: item.key })).digest('hex').slice(0, 28)
    assert.equal(item.create(birth), legacy)
    assert.equal(item.create({ ...birth, minute: 0 }), legacy)
    const first = item.create({ ...birth, minute: 15 })
    const second = item.create({ ...birth, minute: 45 })
    assert.notEqual(first, legacy)
    assert.notEqual(first, second)
    assert.equal(item.create({ ...birth, minute: 15 }), first)
    assert.match(first, /^[a-f0-9]{28}$/)
  })
}
