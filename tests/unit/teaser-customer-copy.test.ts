import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(join(dir, item.name)) : [join(dir, item.name)])
}

test('all dedicated teasers omit implementation notes and static authentication state demonstrations', () => {
  const pages = files('사주').filter(path => path.includes('04-step-4-report') && path.endsWith('.html'))
  assert.equal(pages.length, 14)
  for (const path of pages) {
    const visible = readFileSync(path, 'utf8').replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, '')
    assert.doesNotMatch(visible, /로그인과 결제 상태|중복 결제를 막고 이어서 복구|사용자가 지정한 대분류|운영 서버 기준으로|처리되어야 합니다|정책 문구로 연결해야|운영 결제 모듈 연결 전|상태별로 다음 행동|로그인 복귀 확인|실패 상태 확인|05 결과 목록과 06 상세|결제 후 05 단계/, path)
    assert.doesNotMatch(visible, /class="state-stack"|class="state-item"/, path)
    assert.match(visible, /(?:href=|<button)/, `${path}: customer actions remain`)
  }
})
