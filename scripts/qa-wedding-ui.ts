/** Local-only synthetic visual QA. Never imported by the production server. */
import express from 'express'
import { resolve } from 'node:path'
import { analyzeSaju } from '../src/saju/analyzer.js'
import { buildWeddingContext, buildWeddingReport, buildWeddingTeaser, parseWeddingRequest } from '../src/day/wedding-service.js'
import type { BirthInput } from '../src/types/index.js'
const birth: BirthInput = { year: 1990, month: 4, day: 12, hour: 12, minute: 0, gender: 'female', calendar: 'solar', isLeapMonth: false }
const input = parseWeddingRequest({ candidateDate1: '2027-05-15', candidateDate2: '2027-05-22', candidateDate3: '2027-10-09', partnerBirth: '1988-03-11', partnerTime: '14:30', format: '예식장', familyLimit: '가족 일정 조율 필요' })
const analysis = analyzeSaju(birth)
const context = buildWeddingContext('가독성 테스트', input)
const teaser = buildWeddingTeaser(analysis, input, context)
const app = express()
app.get('/api/auth/config', (_req, res) => res.json({ enabled: false, developmentReportAccess: true }))
app.get('/api/report/:id', (req, res) => {
  const report = buildWeddingReport(analysis, birth, context, input, 'qa-wedding')
  res.json(req.params.id === 'qa-preview' ? { resultId: 'qa-preview', serviceKey: 'wedding_day', previewOnly: true, preview: { headline: teaser.headline, summary: teaser.lines[0], signals: teaser.lines.slice(1) }, paymentUrl: '/payment?qa-only=1' } : { resultId: 'qa-wedding', report, context })
})
app.use(express.static(resolve('사주')))
app.listen(8791, '127.0.0.1', () => console.log('Synthetic wedding UI QA on 127.0.0.1:8791; no production auth, payments or customer data.'))
