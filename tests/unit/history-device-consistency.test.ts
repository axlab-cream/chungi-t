import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

/**
 * 2026-09-17: 로그인 이력은 기기가 아니라 계정에 붙는다.
 *
 * PC 에서 본 보관함과 휴대폰에서 본 보관함이 달라지면, 산 것이 사라진 것처럼 보인다.
 * 운영에서 같은 계정으로 375x812 와 966x910 를 각각 열어 목록이 완전히 같은 것을
 * 확인했다(13건, reportId·진행률·단계까지 일치).
 *
 * 그 성질은 화면이 **서버만 보기 때문에** 유지된다. 이력 화면이 localStorage 나
 * sessionStorage 를 내용의 출처로 쓰기 시작하면 그때부터 기기마다 갈린다.
 * 이 파일이 지키는 것은 그 경계다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

/** 계정 이력을 보여 주는 화면. 여기서는 저장소를 내용의 출처로 쓰지 않는다. */
const HISTORY_SCREENS = ['사주/vault.html', '사주/my.html', '사주/orders.html', '사주/destiny.html']

test('이력 화면은 브라우저 저장소에서 목록을 읽지 않는다', () => {
  for (const path of HISTORY_SCREENS) {
    const html = read(path)
    assert.doesNotMatch(
      html, /localStorage|sessionStorage/,
      `${path} 가 브라우저 저장소를 쓴다. 이력은 계정에 붙어야 하고, 저장소를 쓰면 PC 와 휴대폰이 갈린다.`,
    )
  }
})

test('보관함은 로그인 토큰으로 서버에 묻는다', () => {
  const html = read('사주/vault.html')
  assert.match(html, /\/api\/user\/reports/)
  assert.match(html, /Authorization: `Bearer \$\{auth\.access_token\}`/)
})

test('기기에 남기는 것은 어느 해석을 보던 중이었나뿐이고, 계정별로 나뉜다', () => {
  // 주소에 reportId 가 없을 때 마지막으로 보던 것을 되살리는 힌트다. 목록의 출처가 아니다.
  // 계정 id 를 키에 넣어야 로그아웃 뒤 다른 사람이 앞사람의 해석을 열지 않는다.
  const access = read('사주/js/umsh-report-access.js')
  assert.match(access, /'umsh:report-identity:'\s*\+\s*ownerId/)
  assert.doesNotMatch(access, /sessionStorage\.setItem\('umsh:report-identity:'\s*\+\s*key/)
})

test('서버가 이력을 계정으로만 고른다', () => {
  // 목록은 요청한 사람의 소유로만 만들어진다. 기기 정보는 들어오지 않는다.
  const app = read('src/server/app.ts')
  const route = app.slice(app.indexOf("app.get('/api/user/reports'"), app.indexOf("app.get('/api/user/destiny'"))
  assert.match(route, /requireSupabaseUser\(req, res\)/)
  assert.match(route, /listReportRecords\(owner,/)
  assert.doesNotMatch(route, /user-agent|userAgent|device/i)
})
