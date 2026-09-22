import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import { savedReadingHref, serviceHrefForKey } from '../../src/server/service-directory.js'

/**
 * 2026-09-14 회귀 방지: 보관함에서 연 풀이가 서비스 디자인이 아니라 공용 리더로 열렸다.
 *
 * `사주/vault.html` 은 집 풍수 하나만 자기 06-1 화면으로 보내고 나머지는 전부
 * `/r/:id` 로 보냈다. `/r/:id` 가 띄우는 `report-view.html` 은 서비스 디자인이 아니라
 * 공용 리더 껍데기다 — `data-umsh-verified-inplace` 옵트인도, 슬롯도 없다. 결제해서 본
 * 화면과 보관함에서 다시 연 화면이 달라 보이는 이유가 이것이었다.
 *
 * 고친 방식: 어느 화면에서 열지는 서비스 디렉터리(서버)가 정하고, 보관함은 응답에 담긴
 * `openPath` 를 따라간다. 아래 검사는 (1) 등록된 06-1 화면이 배선 없이 남지 않도록,
 * (2) 경로가 실제 파일과 옵트인을 가리키도록, (3) 보관함이 서비스별 경로를 다시 들고
 * 있지 않도록 고정한다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SITE = join(root, '사주')
const DIRECTORY = join(root, 'src', 'server', 'service-directory.ts')
const VAULT = join(SITE, 'vault.html')
const APP = join(root, 'src', 'server', 'app.ts')

const DETAIL_DIR = '06-step-6_1-report-detail'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

/** 주석에 든 예시 경로가 계약 검사에 걸리지 않게 걷어낸다. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*(?:\/\/).*$/gm, '')
}

/** 소스에 적힌 reportPath 목록. 시드는 내부 값이라 파일에서 직접 읽는다. */
function declaredReportPaths(): string[] {
  return [...read(DIRECTORY).matchAll(/reportPath: '([^']+)'/g)].map((match) => match[1])
}

/** 사이트에 실제로 존재하는 06-1 상세 화면 전부. */
function detailPagesOnDisk(): string[] {
  const found: string[] = []
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'assets' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const child = join(dir, entry.name)
      if (entry.name === DETAIL_DIR) {
        const page = join(child, 'index.html')
        if (existsSync(page)) found.push(page)
        continue
      }
      walk(child, depth + 1)
    }
  }
  walk(SITE, 0)
  return found.sort()
}

/** reportPath 의 주소 부분(쿼리·해시 제외)을 파일 경로로 바꾼다. */
function pageFor(reportPath: string): string {
  const address = reportPath.split('#')[0].split('?')[0]
  return join(SITE, address.replace(/^\//, ''))
}

test('1. 등록된 reportPath 는 모두 실제 파일을 가리킨다', () => {
  const declared = declaredReportPaths()
  assert.ok(declared.length > 0, 'reportPath 가 하나도 없다 — 배선이 통째로 사라졌다')
  const missing = declared.filter((path) => !existsSync(pageFor(path)))
  assert.deepEqual(missing, [], `파일이 없는 reportPath: ${missing.join(', ')}`)
})

test('2. 사이트에 있는 06-1 화면은 빠짐없이 보관함에 배선되어 있다', () => {
  // 오늘의 장애가 정확히 이것이다. 디자인은 등록되어 있는데 보관함이 그 주소를 몰랐다.
  const wired = new Set(declaredReportPaths().map((path) => pageFor(path)))
  const orphans = detailPagesOnDisk()
    .filter((page) => !wired.has(page))
    .map((page) => relative(root, page))
  assert.deepEqual(orphans, [], `06-1 화면이 있는데 보관함이 열지 못한다: ${orphans.join(', ')}`)
})

test('3. 보관함이 여는 화면은 인플레이스 옵트인과 해시 앵커를 갖췄다', () => {
  const problems: string[] = []
  for (const path of declaredReportPaths()) {
    const html = read(pageFor(path))
    if (!html.includes('data-umsh-verified-inplace')) problems.push(`${path}: 옵트인 없음`)
    if (!html.includes('umsh-report-access.js')) problems.push(`${path}: 열람 권한 스크립트 없음`)
    const hash = path.split('#')[1]
    // 해시를 달아 두고 그 id 가 없으면 화면은 맨 위에서 열린다. 조용한 실패라 고정한다.
    if (hash && !html.includes(`id="${hash}"`)) problems.push(`${path}: #${hash} 앵커 없음`)
  }
  assert.deepEqual(problems, [], problems.join(' / '))
})

test('4. savedReadingHref 는 저장 id 를 붙이고 쿼리·해시 순서를 지킨다', () => {
  const wedding = savedReadingHref('wedding_day', 'abc 123')
  assert.equal(wedding, '/day/wedding/06-step-6_1-report-detail/index.html?reportId=abc%20123#step-6_1-report')

  // 이미 쿼리를 가진 경로는 & 로 이어야 한다. ? 를 또 붙이면 section 이 통째로 날아간다.
  const home = savedReadingHref('home_pungsu', 'r1')
  assert.equal(home, '/place/home/06-step-6_1-report-detail/index.html?section=home-fit-overall&reportId=r1#step-6_1-report')
})

test('5. 옛 키로 저장된 풀이도 같은 화면으로 열린다', () => {
  const canonical = savedReadingHref('home_pungsu', 'r1')
  assert.equal(savedReadingHref('home_fit', 'r1'), canonical)
  assert.equal(savedReadingHref('home', 'r1'), canonical)
  assert.equal(serviceHrefForKey('home_fit'), serviceHrefForKey('home_pungsu'))
})

test('6. 화면이 없는 서비스와 빈 id 는 undefined 를 돌려준다', () => {
  // 폴백을 살려 두는 계약이다. 여기서 추측 경로를 만들면 리더 대신 404 가 나간다.
  assert.equal(savedReadingHref('does_not_exist', 'r1'), undefined)
  assert.equal(savedReadingHref(undefined, 'r1'), undefined)
  assert.equal(savedReadingHref('wedding_day', ''), undefined)
  assert.equal(savedReadingHref('wedding_day', '   '), undefined)
})

test('6b. 천명사주·직업운·상대방마음·재회운·배우자운도 06-1 으로 연다', () => {
  assert.equal(savedReadingHref('cmdg', 'r1'), '/cmdg/06-step-6_1-report-detail/index.html?reportId=r1#step-6_1-report')
  assert.equal(savedReadingHref('saju_master', 'r1'), '/cmdg/06-step-6_1-report-detail/index.html?reportId=r1#step-6_1-report')
  assert.equal(savedReadingHref('work_job', 'r1'), '/work/job/06-step-6_1-report-detail/index.html?reportId=r1#step-6_1-report')
  assert.equal(savedReadingHref('love_mind', 'r1'), '/love/mind/06-step-6_1-report-detail/index.html?reportId=r1#step-6_1-report')
  assert.equal(savedReadingHref('love_again', 'r1'), '/love/again/06-step-6_1-report-detail/index.html?reportId=r1#step-6_1-report')
  assert.equal(savedReadingHref('love_spouse', 'r1'), '/love/spouse/06-step-6_1-report-detail/index.html?reportId=r1#step-6_1-report')
})

test('저장된 오늘운은 보관함에서도 오늘운 포털 결과 화면으로 연다', () => {
  assert.equal(savedReadingHref('today_fortune', 'daily result'), '/cmdg/?reportId=daily%20result#todayResult')
  assert.equal(savedReadingHref('today', 'daily result'), '/cmdg/?reportId=daily%20result#todayResult')
})

test('7. 보관함은 서버가 준 openPath 를 따르고 서비스별 경로를 들고 있지 않다', () => {
  const vault = stripComments(read(VAULT))
  assert.ok(vault.includes('report.openPath'), 'vault.html 이 openPath 를 쓰지 않는다')
  assert.ok(vault.includes('`/r/${encodeURIComponent(savedId)}`'), '공용 리더 폴백이 사라졌다')
  const hardcoded = [...vault.matchAll(new RegExp(`[^\\s"'\`]*${DETAIL_DIR}[^\\s"'\`]*`, 'g'))].map((m) => m[0])
  assert.deepEqual(hardcoded, [], `vault.html 에 서비스별 상세 경로가 다시 들어왔다: ${hardcoded.join(', ')}`)
})

test('8. 보관함 응답에 openPath 가 실려 나간다', () => {
  const app = stripComments(read(APP))
  assert.ok(app.includes('openPath:'), 'historyEntryFromRecord 가 openPath 를 더 이상 싣지 않는다')
  assert.ok(
    app.includes('savedReadingHref(record.context?.serviceKey, String(resultId || record.reportId))'),
    'historyEntryFromRecord 가 savedReadingHref 를 더 이상 쓰지 않는다',
  )
})
