import express from 'express'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const port = Number(process.env.PORT || 8797)
const evaluationPath = resolve('tone-v2/evaluations/P04-all-service-teaser-evidence-20260914.json')
const evaluation = JSON.parse(readFileSync(evaluationPath, 'utf8')) as {
  results: Array<{ serviceKey: string; preview: unknown; status: string }>
}
const selected = evaluation.results.find((result) => result.serviceKey === 'job_choice' && result.status === 'PASS')
if (!selected?.preview) throw new Error('job_choice PASS teaser evidence is required')

const app = express()
app.get('/api/auth/config', (_request, response) => response.json({ enabled: false, developmentReportAccess: true }))
app.get('/api/report/synthetic-teaser', (_request, response) => response.json({
  previewOnly: true,
  serviceKey: 'job_choice',
  reportId: 'synthetic-teaser',
  resultId: 'synthetic-teaser',
  preview: selected.preview,
  paymentUrl: '#qa-payment-not-run',
}))
app.use(express.static(resolve('사주'), { index: 'index.html' }))
app.listen(port, '127.0.0.1', () => console.log(`Read-only all-service teaser QA on 127.0.0.1:${port}; isolated synthetic data only.`))
