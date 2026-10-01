import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildMarryMatchContext,
  buildMarryMatchReport,
  marryMatchTeaserPreview,
  marryMatchTeaserSection,
  parseMarryMatchRequest,
} from '../../src/match/marry-service.js'
import type { BirthInput } from '../../src/types/index.js'

const root = process.cwd()
const selfBirth: BirthInput = { year: 1990, month: 3, day: 14, hour: 8, minute: 20, gender: 'female', calendar: 'solar' }

function fixture() {
  const input = parseMarryMatchRequest({
    partnerName: '민수',
    partnerBirthText: '19881209',
    partnerBirth: { gender: 'male', calendar: 'solar', hour: 19, minute: 10 },
    partnerBirthTimeKnown: true,
    relationshipStage: '연애 중',
    marriagePlan: '1년 안에 결혼을 구체화하고 싶음',
    concern: '생활비와 양가 일정을 잘 맞출 수 있을지 궁금해요.',
  })
  const analysis = analyzeSaju(selfBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth)
  const context = { ...buildMarryMatchContext('현아', input, partnerAnalysis, analysis), birthTimeKnown: true }
  const report = buildMarryMatchReport(analysis, partnerAnalysis, selfBirth, context, input, 'marry-teaser-test')
  return { analysis, context, report }
}

test('marriage teaser uses the actual relationship input and both saju calculations', () => {
  const { analysis, context, report } = fixture()
  const preview = marryMatchTeaserPreview(context, report.sections.length)
  const sections = report.sections.slice(0, 2).map((section, index) => marryMatchTeaserSection(section, index, analysis, context))

  assert.match(preview.headline, /현아.*민수.*함께 책임지는 방식/)
  assert.match(preview.summary, /생활비와 양가 일정/)
  assert.match(preview.paidValue, /24개 항목/)
  assert.equal(sections.length, 2)
  assert.notEqual(sections[0].imageSrc, sections[1].imageSrc)
  assert.match(sections[0].interpretation, /1년 안에 결혼/)
  assert.match(sections[0].interpretation, /\[확인할 장면\]/)
  assert.match(sections[0].interpretation, /\[결정 전에 물어볼 질문\]/)
  assert.match(sections[1].interpretation, /생활비·집안일·가족 일정/)
  assert.match(sections[0].storytelling?.tableMd || '', /직접 알려 준 답/)
  assert.match(sections[1].storytelling?.tableMd || '', /사주의 네 기둥/)
  assert.equal(sections[1].storytelling?.chartPoints?.length, 10)
  assert.deepEqual(Object.keys(context.partner?.elementCount || {}).sort(), ['earth', 'fire', 'metal', 'water', 'wood'])
})

test('marriage teaser excludes unknown birth hours from visible pillars and counts', () => {
  const input = parseMarryMatchRequest({
    partnerBirthText: '19881209', partnerBirth: { gender: 'male', calendar: 'solar' }, partnerBirthTimeKnown: false,
    relationshipStage: '연애 중', marriagePlan: '시기를 정하고 싶음', concern: '같이 살아도 괜찮을까요?',
  })
  const analysis = analyzeSaju(selfBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth)
  const context = { ...buildMarryMatchContext('현아', input, partnerAnalysis, analysis), birthTimeKnown: false }
  const report = buildMarryMatchReport(analysis, partnerAnalysis, selfBirth, context, input, 'marry-unknown-time')
  const teaser = marryMatchTeaserSection(report.sections[1], 1, analysis, context)
  assert.match(teaser.storytelling?.tableMd || '', /태어난 시간 \| 입력하지 않음 \| 입력하지 않음/)
  assert.equal(teaser.storytelling?.chartPoints?.reduce((sum, point) => sum + Number(point.value), 0), 12)
})

test('marriage teaser accepts a new self saju as report input without replacing the saved profile', () => {
  const input = parseMarryMatchRequest({
    selfName: '새 사주',
    selfBirth: { year: 1994, month: 7, day: 9, gender: 'female', calendar: 'solar', birthTimeKnown: false },
    selfBirthTimeKnown: false,
    partnerBirthText: '19881209', partnerBirth: { gender: 'male', calendar: 'solar' }, partnerBirthTimeKnown: false,
  })
  assert.equal(input.selfName, '새 사주')
  assert.deepEqual(input.selfBirth, { year: 1994, month: 7, day: 9, hour: 12, minute: 0, gender: 'female', calendar: 'solar', isLeapMonth: false })
  assert.equal(input.selfBirthTimeKnown, false)

  const server = readFileSync(join(root, 'src/server/app.ts'), 'utf8')
  const bridge = readFileSync(join(root, '사주/js/marry-service.js'), 'utf8')
  assert.match(server, /const selectedBirth = input\.selfBirth \?\? profile!\.birth/)
  assert.match(server, /selectedProfile: UserBirthProfile/)
  assert.doesNotMatch(bridge, /syncSelfProfile|method:\s*'POST'[\s\S]{0,160}\/api\/user\/profile/)
})

test('marriage teaser is wired to saved preview, expanded locked toc, quota and payment gate', () => {
  const server = readFileSync(join(root, 'src/server/app.ts'), 'utf8')
  const quota = readFileSync(join(root, 'src/work/jobchoice-preview-quota.ts'), 'utf8')
  const access = readFileSync(join(root, '사주/js/umsh-report-access.js'), 'utf8')
  const bridge = readFileSync(join(root, '사주/js/marry-service.js'), 'utf8')
  const input = readFileSync(join(root, '사주/match/marry/02-step-2-saju-input/index.html'), 'utf8')
  const report = readFileSync(join(root, '사주/match/marry/04-step-4-report/index.html'), 'utf8')

  assert.match(server, /marryMatchTeaserPreview/)
  assert.match(server, /marryMatchTeaserSection/)
  assert.match(quota, /'marry_match'/)
  assert.match(access, /function renderMarryMatchTeaserSections\(/)
  assert.match(access, /renderLockedTeaserToc\(payload\.toc, \{ all: true, collapsible: true, open: true/)
  assert.match(access, /renderSectionImage\(section, 'marry_match'\)/)
  assert.match(access, /normalizeMarryMatchTeaserCopy/)
  assert.match(bridge, /preview: true/)
  assert.match(bridge, /function loadSavedReport\(\)/)
  assert.match(bridge, /\?preview=1/)
  assert.match(bridge, /data-umsh-step', '03-loading'/)
  assert.match(bridge, /location\.assign\(teaserUrl\(reportId\)\)/)
  assert.match(input, /UMSHMarryService\.createPreviewFromInput\(payload\)/)
  assert.match(report, /id="umsh-preview-host"[^>]*data-umsh-slot="preview"/)
  assert.match(report, /umsh-verified-inplace\.css/)
  assert.match(report, /\.hero h1\s*\{\s*max-width:\s*11ch/)
  assert.doesNotMatch(report, /(?:^|\n)\s*h1\s*\{\s*max-width:\s*11ch/)
})
