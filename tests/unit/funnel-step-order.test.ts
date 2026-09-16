import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

/**
 * 공개 퍼널은 1→2→4→5→6 만 탄다. 남은 03은 02로 되돌린다.
 * 근거: design-system/customer-kit.md 퍼널 CTA 맵.
 */
const SAJU = join(process.cwd(), '사주')

const PUBLIC: Array<{ key: string; dir: string; extraInput?: boolean }> = [
  { key: 'love_this_year', dir: 'love/this-year' },
  { key: 'job_choice', dir: 'work/job-choice' },
  { key: 'quit_fortune', dir: 'work/quit' },
  { key: 'money_save', dir: 'money/save' },
  { key: 'cat_compatibility', dir: 'match/cat' },
  { key: 'match_couple', dir: 'match/couple' },
  { key: 'marry_match', dir: 'match/marry' },
  { key: 'couple_signal', dir: 'love/signal' },
  { key: 'work_move', dir: 'work/move' },
]

const REQUIRED = [
  '01-step-1-story',
  '02-step-2-saju-input',
  '04-step-4-report',
  '05-step-5-chat',
  '06-step-6_1-report-detail',
]

function htmlOf(dir: string, step: string): string {
  const base = join(SAJU, dir, step)
  if (step === '05-step-5-chat') {
    const chat = join(base, 'chat.html')
    let html = existsSync(chat)
      ? readFileSync(chat, 'utf8')
      : readFileSync(join(base, 'index.html'), 'utf8')
    const shared = join(SAJU, dir, 'shared')
    if (existsSync(shared)) {
      for (const name of readdirSync(shared)) {
        if (name.endsWith('.js')) html += `\n${readFileSync(join(shared, name), 'utf8')}`
      }
    }
    return html
  }
  return readFileSync(join(base, 'index.html'), 'utf8')
}


test('공개 서비스는 01·02·04·05·06 폴더를 갖고, 남은 03은 02로 되돌린다', () => {
  const missing: string[] = []
  for (const service of PUBLIC) {
    for (const step of REQUIRED) {
      const base = join(SAJU, service.dir, step)
      if (!existsSync(base)) missing.push(`${service.key}: ${step} 없음`)
      else if (step === '05-step-5-chat' && !existsSync(join(base, 'chat.html')) && !existsSync(join(base, 'index.html'))) {
        missing.push(`${service.key}: 05 화면 파일 없음`)
      } else if (step !== '05-step-5-chat' && !existsSync(join(base, 'index.html'))) {
        missing.push(`${service.key}: ${step}/index.html 없음`)
      }
    }
    const three = join(SAJU, service.dir, '03-step-3-service-input', 'index.html')
    if (service.extraInput && !existsSync(three)) missing.push(`${service.key}: STEP3가 있어야 한다`)
    if (!service.extraInput && existsSync(three)) {
      const extra = readFileSync(three, 'utf8')
      if (!extra.includes('02-step-2-saju-input')) missing.push(`${service.key}: 남은 STEP3는 02로 돌려야 한다`)
      if (/<form[\s\S]*04-step-4-report/.test(extra) && !/location\.replace|http-equiv="refresh"/.test(extra)) {
        missing.push(`${service.key}: STEP3가 고객 입력 단계로 남아 있다`)
      }
    }
  }
  assert.deepEqual(missing, [])
})

test('공개 서비스는 다음 단계로만 보낸다', () => {
  const broken: string[] = []
  for (const service of PUBLIC) {
    const story = htmlOf(service.dir, '01-step-1-story')
    if (!story.includes('02-step-2-saju-input')) broken.push(`${service.key}: 01이 02로 안 간다`)
    if ((service.key === 'job_choice' || service.key === 'couple_signal') && !/<a[^>]+href=["'][^"']*02-step-2-saju-input/.test(story)) {
      broken.push(`${service.key}: 01 CTA가 실링크가 아니다`)
    }
    if (service.key === 'job_choice' && /<footer class="footer">/.test(story)) {
      broken.push(`${service.key}: 01에 페이지 제목 푸터가 남아 있다`)
    }
    if (/href=["'][^"']*05-step-5/.test(story) || /href=["'][^"']*06-step-6/.test(story) || /href=["'][^"']*04-step-4/.test(story)) {
      broken.push(`${service.key}: 01이 입력 앞 단계로 건너뛴다`)
    }

    const input = htmlOf(service.dir, '02-step-2-saju-input')
    if (service.extraInput) {
      if (!input.includes('03-step-3-service-input')) broken.push(`${service.key}: 02가 03으로 안 간다`)
    } else if (!input.includes('04-step-4-report')) {
      broken.push(`${service.key}: 02가 04로 안 간다`)
    }

    if (service.extraInput) {
      const extra = htmlOf(service.dir, '03-step-3-service-input')
      if (!extra.includes('04-step-4-report')) broken.push(`${service.key}: 03이 04로 안 간다`)
    }

    const teaser = htmlOf(service.dir, '04-step-4-report')
    if (!teaser.includes('05-step-5-chat')) broken.push(`${service.key}: 04가 05로 안 간다`)
    if (teaser.includes('06-step-6_1-report-detail')) broken.push(`${service.key}: 04가 06으로 건너뛴다`)

    const toc = htmlOf(service.dir, '05-step-5-chat')
    if (!toc.includes('06-step-6_1-report-detail')) broken.push(`${service.key}: 05가 06으로 안 간다`)

    const detail = htmlOf(service.dir, '06-step-6_1-report-detail')
    if (!detail.includes('05-step-5-chat')) broken.push(`${service.key}: 06이 목차(05)로 못 돌아간다`)
  }
  assert.deepEqual(broken, [])
})

test('05 목록 폴더는 디렉터리 주소로도 chat.html 에 닿는다', () => {
  const missing: string[] = []
  for (const service of PUBLIC) {
    const dir = join(SAJU, service.dir, '05-step-5-chat')
    const files = existsSync(dir) ? readdirSync(dir) : []
    if (!files.includes('chat.html')) missing.push(`${service.key}: chat.html 없음`)
    if (!files.includes('index.html')) missing.push(`${service.key}: 05 index.html 없음`)
  }
  assert.deepEqual(missing, [])
})

test('천명사주는 폴더 6단계가 아니라 한 화면 단계다', () => {
  assert.equal(existsSync(join(SAJU, 'cmdg', '01-step-1-story')), false)
  const html = readFileSync(join(SAJU, 'cmdg', 'index.html'), 'utf8')
  assert.match(html, /data-step="landing"/)
  assert.match(html, /data-step="name"|data-step="concern"|티저/)
})
