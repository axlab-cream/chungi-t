import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { SUPER_ADMIN_SCOPES } from '../../src/auth/staff.js'

/**
 * 2026-09-19: 서비스 수정 기능을 배포한 뒤에야 로컬 관리자 계정(umsh.kr/admin 의 실제
 * 로그인 경로)에 services:write/publish 가 빠져 403 이 난다는 것을 알았고, 곧이어
 * refunds:read/request/approve 도 통째로 빠져 환불 메뉴 전체가 막혀 있었다는 것도
 * 실제 운영에서 확인했다 — 두 번 다 "라우트만 있고 화면이 없던 동안" 발견되지 못했다.
 *
 * 두 admin 인증 경로(Supabase 이메일 허용목록 super_admin, 로컬 비밀번호 로그인)는
 * 같은 운영 화면 전체를 써야 하므로 같은 권한 집합이어야 한다. 앞으로 어느 한쪽에만
 * scope 를 추가하고 잊으면 이 테스트가 실패한다.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

function localAdminScopes(): string[] {
  const source = readFileSync(join(ROOT, 'src/server/app.ts'), 'utf8')
  const start = source.indexOf('const LOCAL_ADMIN_SCOPES')
  const line = source.slice(start, source.indexOf('\n', start))
  const match = line.match(/\[([^\]]*)\]/)
  if (!match) throw new Error('LOCAL_ADMIN_SCOPES 배열을 찾지 못했다')
  return Array.from(match[1].matchAll(/'([^']+)'/g)).map((m) => m[1])
}

test('LOCAL_ADMIN_SCOPES 는 SUPER_ADMIN_SCOPES 와 같은 권한 집합이다', () => {
  const local = localAdminScopes()
  const superScopes = [...SUPER_ADMIN_SCOPES]
  assert.deepEqual([...local].sort(), [...superScopes].sort(),
    '두 admin 로그인 경로의 권한이 어긋났다 — 한쪽에서만 동작하는 관리자 화면이 생긴다')
})
