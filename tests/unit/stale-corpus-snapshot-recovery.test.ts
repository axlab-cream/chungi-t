import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { getCorpusSnapshot, isCorpusSnapshotUsable } from '../../src/rag/corpus-registry.js'
import { retrieveRagChunks } from '../../src/rag/retriever.js'
import { generateReportSectionNow } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, getReportRecord, mutateReportRecord } from '../../src/report/report-store.js'
import { loadHighlightTopics } from '../../src/report/longform-blocks.js'
import type { BirthInput, CorpusSnapshot, SajuReport, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-18: 운영에서 love_mind 0/21·cmdg 0/37·money_save 0/41 이 사흘째 10분 간격으로
 * 같은 자리에서 죽었다. 레코드에 박힌 코퍼스 스냅샷이 개정 전 것이라 retrieveRagChunks 가
 * "Corpus snapshot hash mismatch" 로 첫 줄에서 던졌고, 진단은 뭉뚱그린 한 줄뿐이었다.
 * 재현되지 않는 스냅샷이면 활성 스냅샷으로 만들고 레코드에 다시 박아야 한다.
 */
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'love_this_year', name: '스냅샷 점검', concern: '특별한 문제 없이 잘 지내고 있습니다.' }
const owner = { id: 'stale-corpus-snapshot-test-owner' }
const section = (id: string): SajuReportSection => ({ id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '관계', categoryEn: 'Love', classification: '현재 관계를 유지할 기준', hook: '', interpretation: '', patternKeys: [], ragTopics: [] })
const template = (ids: string[]): SajuReport => ({ title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) })
const passingReading = '현재 입력에서 관계를 바꿀 이유는 확인되지 않아요. 특별한 문제 없이 지낸다고 적었으니 숨은 갈등을 전제하지 않아요.\n\n예를 들어 약속 간격이 달라도 서로 불편하지 않다면 연락 횟수를 늘릴 이유가 없어요. 지금 그런 약속을 지키고 있다는 뜻은 아니에요.\n\n먼저 현재 방식에서 편한 점을 확인해 보세요. 새로운 걱정을 만들기보다 실제 불편이 생겼을 때 그 장면부터 이야기해요.'

const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-stale-snapshot'
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

// 2026-09-18: 항목 생성 앞에 총평·요약·하이라이트 호출이 붙었다. 이 검사는 항목 호출만 세므로 그 셋은 미리 채워 둔다.
async function seedLongformBlocks(reportId: string) {
  const topics = loadHighlightTopics(context.serviceKey)
  await mutateReportRecord(reportId, owner, (draft) => {
    draft.report.verdict = { statement: '지금 방식을 유지해도 괜찮아요.', decidedAt: new Date().toISOString() }
    draft.report.summary = { text: '요약', status: 'complete' }
    if (topics) draft.report.highlights = topics.map((topic) => ({ title: topic.title, text: '하이라이트', status: 'complete' }))
  })
}

function staleSnapshot(): CorpusSnapshot {
  const active = JSON.parse(JSON.stringify(getCorpusSnapshot())) as CorpusSnapshot
  active.fingerprint = 'stale-' + active.fingerprint.slice(6)
  active.activePacks = active.activePacks.map((pack) => pack.id === 'myeongri-basics' ? { ...pack, contentHash: '0000000000000000' } : pack)
  return active
}

describe('개정 전 코퍼스 스냅샷이 박힌 리포트도 이어서 완성된다', { concurrency: false }, () => {
  it('재현되지 않는 스냅샷은 usable 이 아니고, 검색은 여전히 fail-closed 로 던진다', () => {
    assert.equal(isCorpusSnapshotUsable(getCorpusSnapshot()), true)
    assert.equal(isCorpusSnapshotUsable(undefined), true)
    const stale = staleSnapshot()
    assert.equal(isCorpusSnapshotUsable(stale), false)
    assert.throws(() => retrieveRagChunks('연애', analysis, 4, context, stale), /Corpus snapshot hash mismatch/)
  })

  it('실제 생성 경로: 스냅샷이 재현되지 않으면 활성 스냅샷으로 만들고 레코드에 다시 박는다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    await seedLongformBlocks(reportId)
    const stale = staleSnapshot()
    await mutateReportRecord(reportId, owner, (draft) => { draft.corpus = stale })
    assert.equal((await getReportRecord(reportId, owner))?.corpus?.fingerprint, stale.fingerprint)

    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async () => {
      calls += 1
      return {
        id: 'resp', model: 'gpt-5.5',
        choices: [{ message: { content: JSON.stringify({ id: 'one', hook: '지금 방식을 유지해도 괜찮아요.', interpretation: passingReading }) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 500, completion_tokens: 400, total_tokens: 900 },
      }
    }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })
    assert.equal(calls, 1, '스냅샷 불일치로 모델 호출 전에 죽으면 안 된다')
    assert.equal(result.status, 'complete')
    const saved = await getReportRecord(reportId, owner)
    assert.equal(saved?.corpus?.fingerprint, getCorpusSnapshot().fingerprint, '레코드의 스냅샷이 활성 스냅샷으로 갈아타야 다음 항목·검수가 같은 근거를 본다')
  })

  it('원인 모를 실패는 사유를 진단에 남긴다 — 뭉뚱그린 한 줄만 남기지 않는다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    await seedLongformBlocks(reportId)
    OpenAI.Chat.Completions.prototype.create = (async () => { throw new Error('BOOM_TEST_CAUSE') }) as unknown as typeof sdkCreate

    const result = await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })
    assert.equal(result.status, 'failed')
    const failed = result.attempts?.find((attempt) => attempt.status === 'failed')
    assert.ok(failed?.error?.includes('BOOM_TEST_CAUSE'), `진단에 원인이 없다: ${failed?.error}`)
  })
})
