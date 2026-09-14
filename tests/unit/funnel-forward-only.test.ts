import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-14 회귀 방지: 결제 흐름은 앞으로만 간다.
 *
 * 흐름은 01 스토리 → 02 사주 입력 → 04 무료 티저 → (결제) → 05 목록 → 06 상세다.
 * 그런데 04·05·06 화면에 01·02 로 되돌아가는 링크가 흩어져 있었다 — 뒤로 가기 화살표,
 * "입력 수정", "새 분석", "처음 화면 보기", 그리고 01 을 가리키던 상단 로고까지.
 *
 * 되돌아가면 그때까지의 입력과 티저가 버려진다. 로고는 01 이 아니라 홈(/)으로 간다.
 *
 * 06 → 05(목록으로)는 뒤로 가기가 아니다. 구매한 풀이 안에서 목차로 돌아가는
 * 정상 이동이라 검사 대상이 아니다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = join(root, '사주')

/**
 * 입력이 없거나 만료됐을 때만 뜨는 복구 패널. 여기 링크까지 지우면 막다른 길이 되므로
 * 지금은 남겨 두고, 대신 **여기에 적힌 것만** 남을 수 있게 고정한다.
 * 새로 생기면 이 목록에 없어서 실패한다 — 조용히 늘어나지 않게 하는 것이 목적이다.
 */
const RECOVERY_EXCEPTIONS = [
  'love/this-year/04-step-4-report/index.html',
  'match/cat/04-step-4-report/index.html',
  'match/couple/04-step-4-report/index.html',
  'match/marry/04-step-4-report/index.html',
  'place/home/04-step-4-report/index.html',
  // 이 한 건은 정적 마크업이 아니라 페이지 인라인 스크립트의 템플릿 문자열 안에 있다
  // (`renderFallbackNotice`). DOM 으로 훑는 도구는 못 보고 이 검사만 잡는다.
  'work/job-choice/04-step-4-report/index.html',
]

function stepRank(path: string): number | null {
  const match = path.match(/\/0(\d)-step-/)
  return match ? Number(match[1]) : null
}

/** 04 · 05 · 06 화면 전부. 서비스 폴더는 두 칸 깊이(me/lucky)다. */
function funnelPages(): string[] {
  const found: string[] = []
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const child = join(dir, entry.name)
      if (/^0[456]-step-/.test(entry.name)) {
        for (const file of ['index.html', 'chat.html']) {
          const page = join(child, file)
          if (existsSync(page)) found.push(page)
        }
        continue
      }
      walk(child, depth + 1)
    }
  }
  walk(SITE, 0)
  return found.sort()
}

interface BackLink { page: string; href: string; text: string }

function backLinks(): BackLink[] {
  const found: BackLink[] = []
  for (const page of funnelPages()) {
    const rel = relative(SITE, page).split('\\').join('/')
    const here = stepRank('/' + rel)
    if (here === null) continue
    const service = '/' + rel.split('/').slice(0, 2).join('/')
    const html = readFileSync(page, 'utf8')
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const [, href, inner] = match
      let target: string
      try { target = new URL(href, 'https://x/' + rel).pathname } catch { continue }
      if (!target.startsWith(service + '/')) continue
      const there = stepRank(target)
      // 앞으로 가거나 같은 단계면 통과. 06→05 는 there(5) >= 4 라 여기서 걸러진다.
      if (there === null || there >= here || there > 2) continue
      found.push({ page: rel, href, text: inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) })
    }
  }
  return found
}

test('1. 04·05·06 에서 01 스토리·02 입력으로 돌아가는 링크가 없다', () => {
  const offenders = backLinks()
    .filter((link) => !RECOVERY_EXCEPTIONS.includes(link.page))
    .map((link) => `${link.page} → ${link.href} ("${link.text}")`)
  assert.deepEqual(offenders, [], `뒤로 가는 링크:\n${offenders.join('\n')}`)
})

test('2. 복구 패널 예외는 목록에 적힌 화면에서만 나온다', () => {
  const pages = [...new Set(backLinks().map((link) => link.page))].sort()
  const unexpected = pages.filter((page) => !RECOVERY_EXCEPTIONS.includes(page))
  assert.deepEqual(unexpected, [], `예외 목록에 없는 화면에 뒤로 가는 링크가 생겼다: ${unexpected.join(', ')}`)
  // 예외가 통째로 사라졌다면 목록도 같이 정리해야 한다. 죽은 예외는 다음 사람을 헷갈리게 한다.
  const stale = RECOVERY_EXCEPTIONS.filter((page) => existsSync(join(SITE, page)) && !pages.includes(page))
  assert.deepEqual(stale, [], `예외 목록에 남아 있는데 실제로는 링크가 없다: ${stale.join(', ')}`)
})

test('3. 상단 로고는 서비스 01 이 아니라 홈으로 간다', () => {
  const offenders: string[] = []
  for (const page of funnelPages()) {
    const rel = relative(SITE, page).split('\\').join('/')
    const service = '/' + rel.split('/').slice(0, 2).join('/')
    const html = readFileSync(page, 'utf8')
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const [, href, inner] = match
      const text = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      if (!text.includes('운명상회')) continue
      let target: string
      try { target = new URL(href, 'https://x/' + rel).pathname } catch { continue }
      if (target.startsWith(service + '/')) offenders.push(`${rel} → ${href}`)
    }
  }
  assert.deepEqual(offenders, [], `로고가 서비스 안쪽으로 간다:\n${offenders.join('\n')}`)
})
