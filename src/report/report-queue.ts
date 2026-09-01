import type { BirthInput, SajuAnalysis, SajuReportContext, SajuReportSection } from '../types/index.js'
import { isOpenAiConfigured } from '../llm/openai-adapter.js'
import { buildOpenAiReportSectionFromBase, getReportModel } from './report-generator.js'
import {
  getReportRecord,
  markReportStatus,
  type ReportOwner,
  type ReportRecord,
  updateReportSection,
} from './report-store.js'

const inFlightReports = new Map<string, Promise<ReportRecord | null>>()
const inFlightSections = new Set<string>()

export async function generateReportSectionNow(params: {
  reportId: string
  analysis: SajuAnalysis
  birth: BirthInput
  context: SajuReportContext
  sectionId: string
  owner?: ReportOwner
}): Promise<SajuReportSection> {
  const key = `${params.reportId}:${params.sectionId}`
  const record = await getReportRecord(params.reportId, params.owner?.accessToken)
  const section = record?.report.sections.find((item) => item.id === params.sectionId)
  if (!section) throw new Error('리포트 섹션을 찾지 못했습니다.')
  if (section.status === 'complete') return section

  if (inFlightSections.has(key)) {
    return section
  }

  inFlightSections.add(key)
  await updateReportSection(
    params.reportId,
    section,
    {
      generatedBy: section.generatedBy ?? 'template',
      model: section.model ?? 'template',
      status: 'generating',
    },
    params.owner,
  )

  try {
    if (!isOpenAiConfigured()) {
      await updateReportSection(
        params.reportId,
        section,
        {
          generatedBy: 'template',
          model: 'template',
          status: 'complete',
          error: 'OPENAI_API_KEY가 설정되지 않았습니다.',
        },
        params.owner,
      )
      return {
        ...section,
        generatedBy: 'template',
        model: 'template',
        status: 'complete',
        error: 'OPENAI_API_KEY가 설정되지 않았습니다.',
      }
    }
    const generated = await buildOpenAiReportSectionFromBase(
      params.analysis,
      params.birth,
      params.context,
      section,
    )
    await updateReportSection(
      params.reportId,
      generated,
      {
        generatedBy: 'openai',
        model: getReportModel(),
        status: 'complete',
      },
      params.owner,
    )
    return {
      ...generated,
      generatedBy: 'openai',
      model: getReportModel(),
      status: 'complete',
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : '리포트 섹션 생성 실패'
    await updateReportSection(
      params.reportId,
      section,
      {
        generatedBy: 'template',
        model: 'template',
        status: 'complete',
        error,
      },
      params.owner,
    )
    return {
      ...section,
      generatedBy: 'template',
      model: 'template',
      status: 'complete',
      error,
    }
  } finally {
    inFlightSections.delete(key)
  }
}

export async function preGenerateReport(params: {
  reportId: string
  analysis: SajuAnalysis
  birth: BirthInput
  context: SajuReportContext
  owner?: ReportOwner
}): Promise<ReportRecord | null> {
  const currentRun = inFlightReports.get(params.reportId)
  if (currentRun) return currentRun

  const run = (async () => {
    try {
      await markReportStatus(params.reportId, 'generating', undefined, params.owner)
      const record = await getReportRecord(params.reportId, params.owner?.accessToken)
      const sections = record?.report.sections ?? []

      for (const section of sections) {
        const current = await getReportRecord(params.reportId, params.owner?.accessToken)
        const latest = current?.report.sections.find((item) => item.id === section.id)
        if (latest?.status === 'complete') continue
        await generateReportSectionNow({
          reportId: params.reportId,
          analysis: params.analysis,
          birth: params.birth,
          context: params.context,
          sectionId: section.id,
          owner: params.owner,
        })
      }

      const finished = await getReportRecord(params.reportId, params.owner?.accessToken)
      const allComplete = finished?.report.sections.every((section) => section.status === 'complete')
      return markReportStatus(params.reportId, allComplete ? 'complete' : 'failed', undefined, params.owner)
    } catch (err) {
      return markReportStatus(
        params.reportId,
        'failed',
        err instanceof Error ? err.message : '리포트 사전 생성 실패',
        params.owner,
      )
    } finally {
      inFlightReports.delete(params.reportId)
    }
  })()

  inFlightReports.set(params.reportId, run)
  return run
}

export function startReportPreGeneration(params: {
  reportId: string
  analysis: SajuAnalysis
  birth: BirthInput
  context: SajuReportContext
  owner?: ReportOwner
}): void {
  void preGenerateReport(params)
}
