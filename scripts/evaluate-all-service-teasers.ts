import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createSavedPreview, reviewTeaser, type ReportPreview } from '../src/report/report-preview.js'
import type { SajuReport, SajuReportSection } from '../src/types/index.js'

interface ExportedService {
  serviceKey: string
  serviceTitle: string
  reportTitle: string
  promise: string
  sourceKind: string
  sections: SajuReportSection[]
}

interface ExportPayload { services: ExportedService[] }

const root = resolve('.')
const inputPath = resolve(process.argv[2] ?? 'tmp/pdfs/final-service-reports.json')
const outputPath = resolve(process.argv[3] ?? 'tone-v2/evaluations/P04-all-service-teaser-evidence-20260914.json')

function normalize(value: string): string {
  return value.replace(/\s+/g, '').replace(/[.,!?·。'"“”‘’():：]/g, '').toLowerCase()
}

const source = JSON.parse(readFileSync(inputPath, 'utf8')) as ExportPayload
const paidServices = source.services.filter((service) => service.serviceKey !== 'today_fortune')

const results = paidServices.map((service) => {
  const report: SajuReport = {
    title: service.reportTitle,
    subtitle: service.promise,
    model: 'production-equivalent-evaluation',
    generatedBy: 'template',
    sections: service.sections,
  }
  let preview: ReportPreview
  try {
    preview = createSavedPreview(report, { serviceKey: service.serviceKey })
  } catch (error) {
    return {
      serviceKey: service.serviceKey,
      serviceTitle: service.serviceTitle,
      sourceKind: service.sourceKind,
      sectionCount: report.sections.length,
      preview: null,
      metrics: null,
      status: 'FAIL',
      issues: [`티저 조립 실패: ${error instanceof Error ? error.message : String(error)}`],
    }
  }
  const evidence = [report.title, ...report.sections.flatMap((section) => [section.hook, section.interpretation])].join('\n')
  const gate = reviewTeaser({ preview, sourceEvidence: evidence })
  const issues = [...gate.issues]
  if (!new RegExp(`(?:^|\\D)${report.sections.length}(?:\\D|$)`).test(preview.paidValue)) {
    issues.push(`전체 해석 범위에 정확한 ${report.sections.length}개 항목 수가 없습니다.`)
  }
  if (preview.summary.trim().length < 35) issues.push('요약이 입력 근거와 생활 맥락을 설명하기에 너무 짧습니다.')
  const semanticLines = [preview.headline, preview.summary, ...preview.insights].map(normalize).filter(Boolean)
  if (new Set(semanticLines).size !== semanticLines.length) issues.push('판정·요약·대표 근거가 서로 다른 정보를 말하지 않습니다.')
  if (/현재 화면|먼저 열|잠겨|결제 후|미리보기 범위/.test([preview.headline, preview.summary, ...preview.insights].join(' '))) {
    issues.push('해석 대신 화면·잠금 상태를 설명합니다.')
  }
  return {
    serviceKey: service.serviceKey,
    serviceTitle: service.serviceTitle,
    sourceKind: service.sourceKind,
    sectionCount: report.sections.length,
    preview,
    metrics: {
      headlineChars: preview.headline.trim().length,
      summaryChars: preview.summary.trim().length,
      representativeGrounds: preview.insights.length,
      exactSectionCount: new RegExp(`(?:^|\\D)${report.sections.length}(?:\\D|$)`).test(preview.paidValue),
    },
    status: issues.length === 0 ? 'PASS' : 'FAIL',
    issues,
  }
})

const failed = results.filter((result) => result.status === 'FAIL')
const payload = {
  taskId: 'task-tone-v2-all-service-teaser-release-20260914',
  generatedAt: new Date().toISOString(),
  scope: { totalServices: source.services.length, paidTeaserServices: paidServices.length, notApplicable: ['today_fortune'] },
  criteria: ['grounded one-line verdict', 'one or two representative grounds', 'recognizable everyday scene', 'exact full-report section count', 'distinct semantic lines', 'no operational, pressure, fake-quote or certain-event copy'],
  summary: { passed: results.length - failed.length, failed: failed.length, total: results.length },
  results,
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ outputPath, ...payload.summary, failures: failed.map((result) => ({ serviceKey: result.serviceKey, issues: result.issues })) }, null, 2))
if (failed.length > 0) process.exitCode = 1
