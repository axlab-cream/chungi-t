import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { canStartAnotherSection, SECTION_RESERVE_MS } from '../../src/report/report-queue.js'

/**
 * 2026-09-17 레이턴시 전략.
 *
 * 실측: 보관함 목록 API 2.7초(13행 189KB), 워커는 잡 10개를 한 줄로 세우고 시간 예산 없이
 * 300초 강제 종료까지 돌다 죽어 lease 240초를 기다렸다.
 *
 * 세운 원칙 —
 *  1. 리포트 안은 순차(앞 항목을 참고해야 한다 — 품질). 이건 건드리지 않는다
 *  2. 리포트 간은 병렬. 서로 독립이다
 *  3. 한 실행은 시간 조각으로 자른다. 죽어서 방치되는 것보다 깨끗하게 돌아와 5초 뒤 잇는다
 *  4. 목록은 카드에 필요한 것만 싣는다. 단, 원본이 필요한 화면은 그대로 둔다
 * 모델·토큰·프롬프트는 바꾸지 않았다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

test('남은 예산이 한 칸을 못 끝내면 새 칸을 시작하지 않는다', () => {
  const now = 1_000_000
  // 예산이 없으면(직접 호출 등) 예전처럼 끝까지 돈다.
  assert.equal(canStartAnotherSection(now, undefined), true)
  // 여유가 넉넉하면 시작한다.
  assert.equal(canStartAnotherSection(now, now + SECTION_RESERVE_MS + 1), true)
  // 딱 예약분만 남아도 시작한다(끝낼 수 있다).
  assert.equal(canStartAnotherSection(now, now + SECTION_RESERVE_MS), true)
  // 그보다 적으면 시작해 놓고 함수가 죽는 쪽이라 멈춘다.
  assert.equal(canStartAnotherSection(now, now + SECTION_RESERVE_MS - 1), false)
  assert.equal(canStartAnotherSection(now, now), false)
})

test('예약분은 재시도까지 감안한 한 칸 분량이다', () => {
  // 첫 시도 중앙값 34초, 재시도가 붙으면 두 배. 그 아래로 내리면 도중에 죽는 칸이 생긴다.
  assert.ok(SECTION_RESERVE_MS >= 60_000 && SECTION_RESERVE_MS <= 120_000)
})

test('워커는 리포트 간에는 나란히, 함수 한도 앞에서 돌아온다', () => {
  const worker = read('src/admin/ops-worker.ts')
  // 한 줄로 세우던 루프가 사라지고 차선(lane)으로 나뉜다.
  assert.doesNotMatch(worker, /for \(const job of jobs\) \{/)
  assert.match(worker, /WORKER_CONCURRENCY = 3/)
  assert.match(worker, /Promise\.all\(lanes\)/)
  // 300초 한도·240초 lease 보다 앞에서 돌아오는 예산.
  const budget = Number(worker.match(/WORKER_BUDGET_MS = (\d[\d_]*)/)?.[1].replace(/_/g, ''))
  assert.ok(budget > 0 && budget < 240_000, `예산 ${budget}ms 은 lease 240초보다 앞이어야 한다`)
  // 예산이 처리기까지 전달된다.
  assert.match(worker, /deadlineAt: ctx\.deadlineAt/)
})

test('진행한 실행은 시도 횟수를 태우지 않고, 매분 대기·실패 해석을 다시 태운다', () => {
  // 퇴사운 32/48 실측(2026-09-17): 실제 생성 ~20분, 나머지 7시간은 dead 로 빠져 기다린 시간.
  //  - claim 이 올린 attempts 는 실패한 실행만 남긴다
  //  - 차선 수만큼만 집어 집은 작업마다 예산을 온전히 쓴다
  //  - 해석 완성은 오류여도 1분 뒤 다시 집는다. 다른 잡만 지수 백오프
  //  - 되살리기(backfill)는 워커가 바쁜 분에도 돈다. 안 그러면 그 사이 산 회원이 큐에 안 탄다
  const worker = read('src/admin/ops-worker.ts')
  assert.match(worker, /if \(!error\) body\.attempts = Math\.max\(0, job\.attempts - 1\)/)
  assert.match(worker, /finished \? 'succeeded' : !error \? 'retry' :/)
  assert.match(worker, /p_limit: WORKER_CONCURRENCY/)
  assert.match(worker, /REPORT_COMPLETION_JOB_KIND \? 60_000/)
  const app = read('src/server/app.ts')
  assert.match(app, /await backfillReportCompletions\(/)
  assert.doesNotMatch(app, /worked\.claimed < worked\.capacity \? await backfillReportCompletions/)
})

test('예산으로 멈춘 것은 실패로 던지지 않는다', () => {
  const job = read('src/report/report-completion-job.ts')
  assert.match(job, /if \(budget\.exhausted\) return after/)
})

test('보관함은 슬림 목록을 받고, 천명사주는 원본을 그대로 받는다', () => {
  const vault = read('사주/vault.html')
  assert.match(vault, /\/api\/user\/reports\?limit=30&view=list/)
  const app = read('src/server/app.ts')
  assert.match(app, /const slim = String\(req\.query\.view \?\? ''\) === 'list'/)
  // 천명사주 화면은 analysis 로 보관함을 동기화한다. 그 호출은 view=list 를 붙이지 않는다.
  const cmdg = read('사주/사주/index.html')
  const calls = cmdg.match(/\/api\/user\/reports[^'"`]*/g) ?? []
  assert.ok(calls.length > 0)
  for (const call of calls) assert.doesNotMatch(call, /view=list/, `천명사주가 슬림 목록을 받으면 동기화가 빈다: ${call}`)
  assert.match(cmdg, /item\?\.reportId && item\?\.analysis/)
})

test('슬림 행은 원본을 싣지 않고 리포트를 복제하지도 않는다', () => {
  const app = read('src/server/app.ts')
  const fn = app.slice(app.indexOf('function historyEntryFromRecord('), app.indexOf('initialConcern:', app.indexOf('function historyEntryFromRecord(')))
  assert.match(fn, /const full = slim \? undefined : toUiAnalysisFromRecord\(record\)/)
  assert.match(fn, /analysis: full,/)
  assert.match(fn, /reportProgressOf\(record\)/)
})
