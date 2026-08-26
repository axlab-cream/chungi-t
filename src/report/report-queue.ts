import type { BirthInput, SajuAnalysis, SajuReportContext, SajuReportSection } from '../types/index.js'
import { isOpenAiConfigured } from '../llm/openai-adapter.js'
import { buildOpenAiSajuReportSection, getReportModel } from './report-generator.js'
import {
  getReportRecord,
  markReportStatus,
  updateReportSection,
} from './report-store.js'

const inFlightReports = new Set<string>()
const inFlightSections = new Set<string>()

async function completeWithTemplate(reportId: string, section: SajuReportSection, error?: string): Promise<SajuReportSection> {
  await updateReportSection(reportId, section, {
    generatedBy: 'template',
    model: 'template',
    status: 'complete',
    error,
  })
  return {
    ...section,
    generatedBy: 'template',
    model: 'template',
    status: 'complete',
    error,
  }
}

export async function generateReportSectionNow(params: {
  reportId: string
  analysis: SajuAnalysis
  birth: BirthInput
  context: SajuReportContext
  sectionId: string
}): Promise<SajuReportSection> {
  const key = `${params.reportId}:${params.sectionId}`
  const record = await getReportRecord(params.reportId)
  const section = record?.report.sections.find((item) => item.id === params.sectionId)
  if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
  if (section.status === 'complete') return section

  if (inFlightSections.has(key)) {
    return section
  }

  inFlightSections.add(key)
  await updateReportSection(params.reportId, section, {
    generatedBy: section.generatedBy ?? 'template',
    model: section.model ?? 'template',
    status: 'generating',
  })

  try {
    if (!isOpenAiConfigured()) {
      return await completeWithTemplate(params.reportId, section, 'OPENAI_API_KEY가 설정되지 않았습니다.')
    }
    const generated = await buildOpenAiSajuReportSection(
      params.analysis,
      params.birth,
      params.sectionId,
      params.context,
    )
    await updateReportSection(params.reportId, generated, {
      generatedBy: 'openai',
      model: getReportModel(),
      status: 'complete',
    })
    return {
      ...generated,
      generatedBy: 'openai',
      model: getReportModel(),
      status: 'complete',
    }
  } catch (err) {
    return completeWithTemplate(
      params.reportId,
      section,
      err instanceof Error ? err.message : '리포트 섹션 생성 실패',
    )
  } finally {
    inFlightSections.delete(key)
  }
}

export function startReportPreGeneration(params: {
  reportId: string
  analysis: SajuAnalysis
  birth: BirthInput
  context: SajuReportContext
}): void {
  if (inFlightReports.has(params.reportId)) return
  inFlightReports.add(params.reportId)

  void (async () => {
    try {
      await markReportStatus(params.reportId, 'generating')
      const record = await getReportRecord(params.reportId)
      const sections = record?.report.sections ?? []

      for (const section of sections) {
        const current = await getReportRecord(params.reportId)
        const latest = current?.report.sections.find((item) => item.id === section.id)
        if (latest?.status === 'complete') continue
        await generateReportSectionNow({
          reportId: params.reportId,
          analysis: params.analysis,
          birth: params.birth,
          context: params.context,
          sectionId: section.id,
        })
      }

      const finished = await getReportRecord(params.reportId)
      const allComplete = finished?.report.sections.every((section) => section.status === 'complete')
      await markReportStatus(params.reportId, allComplete ? 'complete' : 'failed')
    } catch (err) {
      await markReportStatus(
        params.reportId,
        'failed',
        err instanceof Error ? err.message : '리포트 사전 생성 실패',
      )
    } finally {
      inFlightReports.delete(params.reportId)
    }
  })()
}
