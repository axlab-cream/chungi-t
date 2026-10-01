import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import {
  buildLoveSignalContext,
  buildLoveSignalReport,
  loveSignalTeaserPreview,
  loveSignalTeaserSection,
  parseLoveSignalRequest,
} from '../../src/love/signal-service.js'
import type { BirthInput } from '../../src/types/index.js'

const root = process.cwd()
const selfBirth: BirthInput = { year: 1992, month: 8, day: 20, hour: 12, minute: 0, gender: 'female', calendar: 'solar' }

function fixture() {
  const input = parseLoveSignalRequest({
    relationshipStage: '연애 중',
    signalFocus: '연락 온도차',
    partnerName: '하나',
    partnerBirthText: '19940912',
    partnerBirth: { gender: 'male', calendar: 'solar', hour: 9 },
    partnerBirthTimeKnown: true,
    concern: '요즘 답장이 늦고 약속 설명이 달라져서 불안해요.',
  })
  const analysis = analyzeSaju(selfBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth)
  const context = buildLoveSignalContext('민지', input, partnerAnalysis)
  const report = buildLoveSignalReport(analysis, partnerAnalysis, selfBirth, context, input, 'signal-teaser-test')
  return { analysis, context, report }
}

test('love signal teaser uses the actual relationship input and two saju calculations', () => {
  const { analysis, context, report } = fixture()
  const preview = loveSignalTeaserPreview(context, report.sections.length)
  const sections = report.sections.slice(0, 2).map((section, index) => loveSignalTeaserSection(section, index, analysis, context))

  assert.match(preview.headline, /하나.*연락 온도차/)
  assert.match(preview.summary, /요즘 답장이 늦고 약속 설명이 달라져서 불안해요/)
  assert.match(preview.paidValue, /21개 항목/)
  assert.equal(sections.length, 2)
  assert.notEqual(sections[0].imageSrc, sections[1].imageSrc)
  assert.match(sections[0].interpretation, /외도의 증거가 아니라/)
  assert.match(sections[0].interpretation, /\[확인할 장면\]/)
  assert.match(sections[0].interpretation, /\[결정 전에 물어볼 질문\]/)
  assert.match(sections[0].interpretation, /\[해법\]/)
  assert.match(sections[0].storytelling?.tableMd || '', /직접 알려 준 답/)
  assert.match(sections[1].storytelling?.tableMd || '', /사주의 네 기둥/)
  assert.equal(sections[1].storytelling?.chartPoints?.length, 10)
  assert.deepEqual(Object.keys(context.partner?.elementCount || {}).sort(), ['earth', 'fire', 'metal', 'water', 'wood'])
  assert.ok(context.partner?.pillarElements?.day)
})

test('love signal teaser excludes an unknown birth hour from the visible pillars and element counts', () => {
  const input = parseLoveSignalRequest({
    relationshipStage: '연애 중', signalFocus: '연락 변화', partnerBirthText: '19940912',
    partnerBirth: { gender: 'male', calendar: 'solar' }, partnerBirthTimeKnown: false,
  })
  const analysis = analyzeSaju(selfBirth)
  const partnerAnalysis = analyzeSaju(input.partnerBirth)
  const context = { ...buildLoveSignalContext('민지', input, partnerAnalysis), birthTimeKnown: false }
  const report = buildLoveSignalReport(analysis, partnerAnalysis, selfBirth, context, input, 'unknown-time')
  const teaser = loveSignalTeaserSection(report.sections[1], 1, analysis, context)
  assert.match(teaser.storytelling?.tableMd || '', /태어난 시간 \| 입력하지 않음 \| 입력하지 않음/)
  assert.match(teaser.storytelling?.chartCaption || '', /시간 기둥은 제외/)
  assert.ok(teaser.storytelling?.chartPoints?.every((point) => /세 기둥/.test(point.note || '')))
  assert.equal(teaser.storytelling?.chartPoints?.reduce((sum, point) => sum + Number(point.value), 0), 12)
})

test('love signal teaser converts stored option codes and labels legacy summaries honestly', () => {
  const { analysis, context, report } = fixture()
  const legacyContext = {
    ...context,
    concern: '현재 관계: 연애 중 · 신경 쓰이는 신호: cold_mood',
    partner: { ...context.partner, pillarElements: undefined },
  }
  const preview = loveSignalTeaserPreview(legacyContext, report.sections.length)
  const teaser = loveSignalTeaserSection(report.sections[1], 1, analysis, legacyContext)

  assert.match(preview.headline, /표현이 식은 느낌/)
  assert.doesNotMatch(preview.headline, /cold_mood/)
  assert.match(teaser.storytelling?.tableMd || '', /저장된 사주 계산값/)
  assert.doesNotMatch(teaser.storytelling?.tableMd || '', /사주의 네 기둥/)
  assert.match(teaser.storytelling?.tableCaption || '', /저장된 두 사람의 사주 계산값/)
})

test('love signal teaser is wired to saved report preview, quota, locked toc, and payment gate', () => {
  const server = readFileSync(join(root, 'src/server/app.ts'), 'utf8')
  const access = readFileSync(join(root, '사주/js/umsh-report-access.js'), 'utf8')
  const bridge = readFileSync(join(root, '사주/js/signal-service.js'), 'utf8')
  const quota = readFileSync(join(root, 'src/work/jobchoice-preview-quota.ts'), 'utf8')
  const inputHtml = readFileSync(join(root, '사주/love/signal/02-step-2-saju-input/index.html'), 'utf8')
  const html = readFileSync(join(root, '사주/love/signal/04-step-4-report/index.html'), 'utf8')

  assert.match(server, /serviceKey === 'couple_signal'/)
  assert.match(server, /loveSignalTeaserPreview/)
  assert.match(server, /loveSignalTeaserSection/)
  assert.match(quota, /'couple_signal'/)
  assert.match(bridge, /reportId \? \{ reportId, preview: true \}/)
  assert.match(access, /renderLoveSignalTeaserSections/)
  assert.match(access, /renderLockedTeaserToc\(payload\.toc, \{ all: true, collapsible: true, open: true/)
  assert.match(html, /\.hero h1\s*\{[\s\S]{0,180}max-width: 11ch/)
  assert.doesNotMatch(html, /\n\s{6}h1 \{\s*\n\s*max-width: 11ch/)
  assert.match(access, /hideLoveSignalTeaserShell/)
  assert.match(access, /입력값 다시 확인/)
  assert.match(html, /id="umsh-preview-host"/)
  assert.match(bridge, /createPreviewFromInput/)
  assert.match(bridge, /self\?\.source === 'manual'/)
  assert.match(server, /const selectedBirth = input\.selfBirth \?\? profile!\.birth/)
  assert.match(server, /specializedAnalyzeResponse\(progressive, selectedBirth, context, selectedProfile\)/)
  assert.match(bridge, /data-umsh-step', '03-loading'/)
  assert.match(bridge, /location\.assign\(teaserUrl\(reportId\)\)/)
  assert.match(inputHtml, /UMSHSignalService\.createPreviewFromInput\(payload\)/)
  assert.doesNotMatch(inputHtml, /window\.location\.href = `\$\{nextRoute\}/)
  assert.match(inputHtml, /writeSession\(storageKeys\.reportInput, payload\)[\s\S]{0,320}submit\.disabled = false/)
})

test('love signal customer copy removes raw markdown labels and specialist toc terms', () => {
  const access = readFileSync(join(root, '사주/js/umsh-report-access.js'), 'utf8')
  assert.match(access, /normalizeLoveSignalTeaserCopy/)
  assert.match(access, /가까운 관계에서 붙고 부딪히는 방식/)
  assert.match(access, /사랑을 표현하고 약속을 지키는 방식/)
  assert.match(access, /다섯 기운이 서로 돕는 구간/)
})
