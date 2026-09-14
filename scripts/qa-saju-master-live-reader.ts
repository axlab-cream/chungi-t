/** Local-only, read-only visual QA for the completed isolated Saju Master result. */
import express from 'express'
import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const evidence = JSON.parse(readFileSync(resolve('tone-v2/evaluations/P04-saju-master-full-outline-generation-20260914.json'), 'utf8'))
const sourceRecord = String(evidence?.evidence?.sourceRecord || '')
const recordRoot = resolve('.cache/reading-live-20260914-saju-master/records')
const recordPath = resolve(sourceRecord)
if (!sourceRecord || !recordPath.startsWith(`${recordRoot}${sep}`)) throw new Error('Saju Master QA evidence has no safe isolated record identity')
const record = JSON.parse(readFileSync(recordPath, 'utf8'))
const sections = record?.report?.sections
const corpusPack = record?.corpus?.activePacks?.find((pack: { id?: string }) => pack.id === 'saju-master-service')
if (record.reportId !== evidence.identity.reportId) throw new Error('Saju Master QA record report identity mismatch')
if (record.resultId !== evidence.identity.resultId) throw new Error('Saju Master QA record result identity mismatch')
if (record?.context?.serviceKey !== 'saju_master') throw new Error('Saju Master QA record has the wrong service')
if (corpusPack?.version !== '2.1.0' || corpusPack?.contentHash !== '6c7753669476fd0e') throw new Error('Saju Master QA record has the wrong corpus snapshot')
if (record?.status !== 'complete' || !Array.isArray(sections) || sections.length !== 37) throw new Error('Saju Master QA requires one complete 37-section isolated record')
if (sections.some((section: { status?: string }) => section.status !== 'complete')) throw new Error('Saju Master QA refuses an incomplete section')

const reportPath = `/cmdg/index.html?reportId=${encodeURIComponent(record.resultId)}`
const app = express()
app.get('/api/auth/config', (_request, response) => response.json({ enabled: false, developmentReportAccess: true }))
app.get('/api/report/:id', (request, response) => {
  if (request.params.id !== record.resultId) return response.status(404).json({ error: 'QA record not found' })
  response.setHeader('Cache-Control', 'no-store')
  return response.json({ resultId: record.resultId, serviceKey: 'saju_master', report: record.report, context: record.context })
})
app.get('/r/:id', (request, response) => {
  if (request.params.id !== record.resultId) return response.status(404).send('QA record not found')
  return response.sendFile(resolve('사주/report-view.html'))
})
app.get('/qa/saju-master-mobile-frame', (request, response) => {
  const requested = String(request.query.section || sections[0].id)
  const section = sections.some((item: { id?: string }) => item.id === requested) ? requested : sections[0].id
  const source = `${reportPath}&section=${encodeURIComponent(section)}`
  response.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Saju Master 390px QA</title><style>html,body{margin:0;background:#28251f}iframe{display:block;width:390px;height:844px;border:0;background:#000}</style></head><body><iframe title="Saju Master reader at 390 pixels" src="${source}"></iframe><pre data-frame-metrics hidden></pre><script>document.querySelector('iframe').addEventListener('load',function(){var frame=this;setTimeout(function(){var w=frame.contentWindow,d=frame.contentDocument,r=d.querySelector('#umsh-verified-layout'),b=r.getBoundingClientRect(),cards=Array.from(r.querySelectorAll('details.reading-card')),visible=Array.from(r.querySelectorAll('h1,p,a,button,summary')).filter(function(n){var x=n.getBoundingClientRect();return x.width>0&&x.height>0}),outside=visible.filter(function(n){var x=n.getBoundingClientRect();return x.left<b.left-1||x.right>b.right+1});document.querySelector('[data-frame-metrics]').textContent=JSON.stringify({innerWidth:w.innerWidth,rootWidth:Math.round(b.width),cards:cards.length,openCards:cards.filter(function(n){return n.open}).length,outside:outside.length,overflow:r.scrollWidth>r.clientWidth,title:r.querySelector('h1').textContent})},700)})</script></body></html>`)
})
app.use(express.static(resolve('사주')))

const port = Number(process.env.SAJU_MASTER_QA_PORT || 8798)
app.listen(port, '127.0.0.1', () => console.log(`Read-only Saju Master live-reader QA on 127.0.0.1:${port}; isolated synthetic data only.`))
