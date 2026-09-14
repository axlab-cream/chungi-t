/**
 * Local-only, read-only visual QA for the completed isolated New Year result.
 * The tracked evidence identifies the ignored record; this server never mutates it.
 */
import express from 'express'
import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const evidencePath = resolve('tone-v2/evaluations/P04-newyear-flow-full-outline-generation-20260913.json')
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
const sourceRecord = String(evidence?.evidence?.sourceRecord || '')
const recordPath = resolve(sourceRecord)
const recordRoot = resolve('.cache/reading-live-20260907/records')
if (!sourceRecord || !recordPath.startsWith(`${recordRoot}${sep}`)) throw new Error('New Year QA evidence has no safe isolated sourceRecord')
const record = JSON.parse(readFileSync(recordPath, 'utf8'))
const sections = record?.report?.sections
if (record?.context?.serviceKey !== 'newyear_flow') throw new Error('New Year QA record has the wrong service')
if (record?.status !== 'complete' || !Array.isArray(sections) || sections.length !== 36) {
  throw new Error('New Year QA requires one complete 36-section isolated record')
}
if (sections.some((section: { status?: string }) => section.status !== 'complete')) {
  throw new Error('New Year QA refuses an incomplete section')
}

const app = express()
app.get('/api/auth/config', (_request, response) => response.json({ enabled: false, developmentReportAccess: true }))
app.get('/api/report/:id', (request, response) => {
  if (request.params.id !== record.resultId) return response.status(404).json({ error: 'QA record not found' })
  response.setHeader('Cache-Control', 'no-store')
  return response.json({ resultId: record.resultId, serviceKey: 'newyear_flow', report: record.report, context: record.context })
})
app.get('/qa/newyear-mobile-frame', (request, response) => {
  const requested = String(request.query.section || sections[0].id)
  const section = sections.some((item: { id?: string }) => item.id === requested) ? requested : sections[0].id
  const source = `/flow/newyear/06-step-6_1-report-detail/index.html?reportId=${encodeURIComponent(record.resultId)}&section=${encodeURIComponent(section)}`
  response.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>New Year 390px QA</title><style>html,body{margin:0;background:#28251f}iframe{display:block;width:390px;height:844px;border:0;background:#000}</style></head><body><iframe title="New Year reader at 390 pixels" src="${source}"></iframe><pre data-frame-metrics hidden></pre><script>document.querySelector('iframe').addEventListener('load',function(){var frame=this;setTimeout(function(){var w=frame.contentWindow,d=frame.contentDocument,r=d.querySelector('#umsh-verified-layout'),b=r.getBoundingClientRect(),cards=Array.from(r.querySelectorAll('details.reading-card')),visible=Array.from(r.querySelectorAll('h1,p,a,button,summary')).filter(function(n){var x=n.getBoundingClientRect();return x.width>0&&x.height>0}),outside=visible.filter(function(n){var x=n.getBoundingClientRect();return x.left<b.left-1||x.right>b.right+1});document.querySelector('[data-frame-metrics]').textContent=JSON.stringify({innerWidth:w.innerWidth,rootWidth:Math.round(b.width),cards:cards.length,openCards:cards.filter(function(n){return n.open}).length,outside:outside.length,overflow:r.scrollWidth>r.clientWidth,title:r.querySelector('h1').textContent})},500)})</script></body></html>`)
})
app.use(express.static(resolve('사주')))

const port = Number(process.env.NEWYEAR_QA_PORT || 8793)
app.listen(port, '127.0.0.1', () => {
  console.log(`Read-only New Year live-reader QA on 127.0.0.1:${port}; isolated synthetic data only.`)
})
