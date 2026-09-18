import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { ensureReportLongform, generateReportSectionNow } from '../../src/report/report-queue.js'
import { createOrGetReportRecord, getReportRecord, mutateReportRecord } from '../../src/report/report-store.js'
import type { BirthInput, SajuReport, SajuReportSection } from '../../src/types/index.js'

/**
 * 2026-09-18: 결론·한눈에 보기·하이라이트가 전부 목업처럼 보였다. 실제로는 진짜 LLM 호출인데
 * `generateReportSectionNow` 안, 첫 항목 생성 **앞**에 줄줄이 있어서 두 가지가 동시에 틀렸다.
 *  1. 목차가 이미 끝난 리포트는 이 코드에 닿지 못해 영영 비었다 — 화면은 설정에 적어 둔 축
 *     문구와 "준비하고 있어요" 골격만 보여 줬다(운영 리포트 전부가 그 상태).
 *  2. 독자가 기다리는 첫 항목이 LLM 왕복 다섯 번 뒤에야 시작했다.
 * 이제 별도 경로로 나란히 돈다.
 */
const birth: BirthInput = { year: 1994, month: 3, day: 11, hour: 9, gender: 'female', calendar: 'solar' }
const analysis = analyzeSaju(birth)
const context = { serviceKey: 'quit_fortune', name: '블록 점검', concern: '팀 분위기가 걱정됩니다.' }
const owner = { id: 'report-longform-pipeline-test-owner' }
const section = (id: string): SajuReportSection => ({ id, order: 1, imageKey: '', imageSrc: '', imageAlt: '', category: '판단', categoryEn: 'Decision', classification: '지금 나갈 자리인가', hook: '', interpretation: '', patternKeys: [], ragTopics: [] })
const template = (ids: string[]): SajuReport => ({ title: '테스트', subtitle: '', model: 'template', generatedBy: 'template', sections: ids.map(section) })

const sdkCreate = OpenAI.Chat.Completions.prototype.create
const previousKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-longform-pipeline'
after(() => { OpenAI.Chat.Completions.prototype.create = sdkCreate; if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey })

function reply(content: string) {
  return { id: 'resp', model: 'gpt-5.5', choices: [{ message: { content }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }
}

/*
 * 검수를 실제로 통과하는 합성 본문. 이 서비스는 해요체이고 요약은 405자, 하이라이트는
 * 990자를 넘겨야 한다 — 짧은 자리표시자를 쓰면 블록이 'failed' 로 저장돼 배선을 검증하지 못한다.
 */
const PARAGRAPHS = [
  '확인된 조건만 놓고 보면 지금 자리를 바로 정리하기보다 남은 조건을 하나씩 채우는 쪽이 나아요. 팀 분위기가 걱정된다고 적어 주셨는데, 그 불편이 특정 사람과의 대화에서 오는지 맡은 업무 범위에서 오는지부터 나누어 보면 다음 선택이 한결 분명해져요. 오늘은 그 둘 가운데 어느 쪽이 더 자주 걸리는지만 적어 두세요.',
  '예를 들어 이번 주 회의에서 내 의견이 어디까지 반영되는지 한 번만 적어 두면, 버틸 이유와 나갈 이유가 같은 종이 위에서 비교돼요. 이력서와 포트폴리오가 지금 바로 낼 수 있는 상태인지, 다음 자리를 알아볼 시간이 하루에 얼마나 남는지도 같은 자리에서 함께 세어 보면 좋아요.',
  '그 두 가지가 채워지기 전까지는 지금 자리를 유지하면서 조건을 모으는 편이 안전해요. 조건이 갖춰졌다고 판단되면 그때 시점을 정해도 늦지 않아요. 먼저 이번 주에 확인할 항목 하나만 골라 적고, 그 항목이 정리되면 다음 항목으로 넘어가는 순서를 지켜 주세요.',
  '사람 때문에 지친 마음과 일 자체가 맞지 않는 마음은 해법이 달라요. 앞쪽이라면 자리를 옮기지 않고도 대화 방식이나 업무 경로를 바꿔 볼 여지가 남아 있고, 뒤쪽이라면 준비를 앞당기는 편이 나아요. 최근 한 달 가운데 가장 힘들었던 하루를 떠올리고 그날의 이유를 한 줄로 적어 보세요.',
]
const FILLERS = ['적어 둔 기록이 두 주쯤 쌓이면 흐름이 눈에 보여요.', '그때 다시 읽어 보고 판단해도 충분해요.']
const passingSummary = PARAGRAPHS.slice(0, 3).join(' ')
/** 요청한 문단 수를 지키면서 분량 예산을 넘긴다. 남는 분량은 마지막 문단에 붙인다. */
function passingHighlight(paragraphs = 3): string {
  const parts = Array.from({ length: paragraphs }, (_, index) => PARAGRAPHS[index % PARAGRAPHS.length])
  for (let index = 0; parts.join('\n\n').trim().length < 1020; index += 1) {
    parts[parts.length - 1] += ` ${FILLERS[index % FILLERS.length]}`
  }
  return parts.join('\n\n')
}
function blockReply(prompt: string): ReturnType<typeof reply> {
  if (/고정 결론만/.test(prompt)) return reply('{"statement":"지금은 보류가 나아요.","rankedChoices":["HOLD","GO"]}')
  if (/전체 요약만/.test(prompt)) return reply(JSON.stringify({ text: passingSummary }))
  const paragraphs = Number(/"paragraphs":(\d+)/.exec(prompt)?.[1] ?? 0) || 3
  return reply(JSON.stringify({ text: passingHighlight(paragraphs) }))
}

describe('결론·요약·하이라이트는 목차와 따로, 나란히 만들어진다', { concurrency: false }, () => {
  it('항목 생성은 더 이상 세 블록을 기다리지 않는다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    const prompts: string[] = []
    OpenAI.Chat.Completions.prototype.create = (async (request: { messages?: Array<{ content?: string }> }) => {
      prompts.push(String(request.messages?.[0]?.content ?? '') + String(request.messages?.[1]?.content ?? ''))
      // 항목 생성만 응답한다. 블록 호출이 섞여 들어오면 이 검사가 잡는다.
      return reply(JSON.stringify({ id: 'one', hook: '테스트 훅', interpretation: '본문' }))
    }) as unknown as typeof sdkCreate

    await generateReportSectionNow({ reportId, birth, analysis, context, sectionId: 'one', owner })
    const blockCalls = prompts.filter((text) => /고정 결론만|전체 요약만|하이라이트 항목만/.test(text))
    assert.deepEqual(blockCalls, [], '항목 생성 경로가 아직 블록을 만들고 있다')
  })

  it('목차가 이미 끝난 리포트에도 세 블록이 붙는다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    // 목차를 완료 상태로 얼린다 — 운영의 완료 리포트와 같은 조건.
    await mutateReportRecord(reportId, owner, (draft) => {
      draft.report.sections[0].hook = '완료된 훅'
      draft.report.sections[0].interpretation = '완료된 본문'
      draft.report.sections[0].status = 'complete'
      draft.status = draft.report.status = 'complete'
    })
    assert.equal((await getReportRecord(reportId, owner))?.status, 'complete')

    let calls = 0
    OpenAI.Chat.Completions.prototype.create = (async (request: { messages?: Array<{ content?: string }> }) => {
      calls += 1
      return blockReply(String(request.messages?.[0]?.content ?? '') + String(request.messages?.[1]?.content ?? ''))
    }) as unknown as typeof sdkCreate

    await ensureReportLongform({ reportId, owner })
    const saved = await getReportRecord(reportId, owner)
    assert.equal(saved?.report.verdict?.statement, '지금은 보류가 나아요.', '완료된 리포트에 결론이 붙지 않았다')
    assert.equal(saved?.report.summary?.status, 'complete', `요약이 저장되지 않았다: ${saved?.report.summary?.error ?? ''}`)
    assert.equal(saved?.report.highlights?.length, 3)
    assert.deepEqual(saved?.report.highlights?.map((item) => item.status), ['complete', 'complete', 'complete'])
    assert.deepEqual(saved?.report.highlights?.map((item) => item.title), ['GO/HOLD/타이밍 조정', '다섯 스승의 서로 다른 조언', '퇴사 전 체크리스트'], '카드 순서가 섞였다')
    // 완료된 목차 본문은 그대로여야 한다.
    assert.equal(saved?.report.sections[0].interpretation, '완료된 본문')
    assert.ok(calls >= 4, `결론 1 + 요약 1 + 하이라이트 3 이 돌아야 한다: ${calls}`)

    // 두 번째 호출은 이미 있는 것을 다시 만들지 않는다.
    const before = calls
    await ensureReportLongform({ reportId, owner })
    assert.equal(calls, before, '이미 만든 블록을 다시 만들고 있다')
  })

  it('요약과 하이라이트는 나란히 나간다 — 순차로 기다리지 않는다', async () => {
    const reportId = randomUUID()
    await createOrGetReportRecord({ reportId, birth, context, analysis, templateReport: template(['one']), owner })
    let inFlight = 0
    let peak = 0
    OpenAI.Chat.Completions.prototype.create = (async (request: { messages?: Array<{ content?: string }> }) => {
      const joined = String(request.messages?.[0]?.content ?? '') + String(request.messages?.[1]?.content ?? '')
      if (/고정 결론만/.test(joined)) return blockReply(joined)
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 30))
      inFlight -= 1
      return blockReply(joined)
    }) as unknown as typeof sdkCreate

    await ensureReportLongform({ reportId, owner })
    assert.ok(peak >= 4, `요약 1 + 하이라이트 3 이 동시에 나가야 한다. 최대 동시 ${peak}`)
  })

  it('서버와 화면이 같은 블록 설정 파일을 본다', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
    // 화면은 /data/longform-blocks.json 을 받고, 서버는 같은 파일에서 주제를 읽는다.
    assert.match(readFileSync(join(root, 'src/report/longform-blocks.ts'), 'utf8'), /사주\/data\/longform-blocks\.json/)
    assert.match(readFileSync(join(root, '사주/js/umsh-report-access.js'), 'utf8'), /\/data\/longform-blocks\.json/)
    // 리포트 조회가 블록 생성을 깨운다. 없으면 완료된 리포트는 영영 비어 있다.
    assert.match(readFileSync(join(root, 'src/server/app.ts'), 'utf8'), /startReportLongform\(\{ reportId: record\.reportId, owner \}\)/)
  })
})
