/**
 * Local-only, read-only visual QA for the completed isolated Wedding result.
 * The tracked evidence identifies the ignored record; this server never mutates it.
 */
import express from 'express'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const evidencePath = resolve('tone-v2/evaluations/P04-wedding-day-full-outline-generation-20260913.json')
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
const sourceRecord = String(evidence?.evidence?.sourceRecord || '')
if (!sourceRecord || sourceRecord.startsWith('..')) throw new Error('Wedding QA evidence has no safe isolated sourceRecord')

const recordPath = resolve(sourceRecord)
const record = JSON.parse(readFileSync(recordPath, 'utf8'))
const sections = record?.report?.sections
if (record?.context?.serviceKey !== 'wedding_day') throw new Error('Wedding QA record has the wrong service')
if (record?.status !== 'complete' || !Array.isArray(sections) || sections.length !== 20) {
  throw new Error('Wedding QA requires one complete 20-section isolated record')
}
if (sections.some((section: { status?: string }) => section.status !== 'complete')) {
  throw new Error('Wedding QA refuses an incomplete section')
}

const app = express()
app.get('/api/auth/config', (_request, response) => response.json({ enabled: false, developmentReportAccess: true }))
app.get('/api/report/:id', (request, response) => {
  if (request.params.id !== record.resultId) return response.status(404).json({ error: 'QA record not found' })
  response.setHeader('Cache-Control', 'no-store')
  return response.json({ resultId: record.resultId, report: record.report, context: record.context })
})
app.get('/day/wedding/06-step-6_1-report-detail/index.html', (request, response, next) => {
  if (request.query.qaViewport !== '390') return next()
  const source = readFileSync(resolve('사주/day/wedding/06-step-6_1-report-detail/index.html'), 'utf8')
  const constrained = source.replace('</head>', '<style data-local-qa>.phone{width:390px!important;max-width:390px!important}</style></head>')
  response.type('html').send(constrained)
})
app.get('/qa/wedding-mobile-frame', (request, response) => {
  const requested = String(request.query.section || '1-1')
  const section = sections.some((item: { id?: string }) => item.id === requested) ? requested : '1-1'
  const source = `/day/wedding/06-step-6_1-report-detail/index.html?reportId=${encodeURIComponent(record.resultId)}&section=${encodeURIComponent(section)}`
  response.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Wedding 390px QA</title><style>html,body{margin:0;background:#e9ded2}iframe{display:block;width:390px;height:844px;border:0;background:white}</style></head><body><iframe title="Wedding reader at 390 pixels" src="${source}"></iframe><pre data-frame-metrics hidden></pre><script>document.querySelector('iframe').addEventListener('load',function(){var frame=this;setTimeout(function(){var w=frame.contentWindow,d=frame.contentDocument,r=d.querySelector('.phone'),b=r.getBoundingClientRect(),nodes=Array.from(r.querySelectorAll('h1,h2,h3,p,a,button,select')).filter(function(n){var x=n.getBoundingClientRect();return x.width>0&&x.height>0}),outside=nodes.filter(function(n){var x=n.getBoundingClientRect();return x.left<b.left-1||x.right>b.right+1});document.querySelector('[data-frame-metrics]').textContent=JSON.stringify({innerWidth:w.innerWidth,rootWidth:Math.round(b.width),outside:outside.length,overflow:r.scrollWidth>r.clientWidth,paragraphs:r.querySelectorAll('[data-body] p').length,options:r.querySelectorAll('[data-section-select] option').length,progress:r.querySelector('[data-reading-progress]').textContent,title:r.querySelector('[data-title]').textContent})},500)})</script></body></html>`)
})
app.use(express.static(resolve('사주')))

const port = Number(process.env.WEDDING_QA_PORT || 8792)
app.listen(port, '127.0.0.1', () => {
  console.log(`Read-only Wedding live-reader QA on 127.0.0.1:${port}; isolated synthetic data only.`)
})
