import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const SAJU_ROOT = join(process.cwd(), '사주')

/** 05 단계 폴더를 모두 찾는다. 서비스가 늘어도 목록을 손보지 않게 훑어서 모은다. */
function chatDirs(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue
    const path = join(dir, name.name)
    if (name.name === '05-step-5-chat') found.push(path)
    else if (name.name !== 'node_modules' && name.name !== 'assets') chatDirs(path, found)
  }
  return found
}

test('결과 목록 폴더는 모두 index.html 을 가진다', () => {
  // place/home 과 work/move 만 이 파일이 없어서, 주소를 공유하면 404 였다.
  const dirs = chatDirs(SAJU_ROOT).filter((dir) => existsSync(join(dir, 'chat.html')))
  assert.ok(dirs.length >= 14, `05 단계 폴더를 ${dirs.length}개만 찾았다`)
  const missing = dirs.filter((dir) => !existsSync(join(dir, 'index.html')))
  assert.deepEqual(missing, [], 'chat.html 만 있고 index.html 이 없는 폴더')
})

test('결제 화면은 product 와 service 두 이름을 같은 상품 키로 읽는다', () => {
  // 각 서비스 CTA 폴백은 `/payment?service=<키>` 로 보낸다. 한쪽만 읽으면
  // 그 경로로 들어온 고객이 "상품 정보를 확인하지 못했습니다" 에서 멈춘다.
  const source = readFileSync(join(SAJU_ROOT, 'js', 'payment.js'), 'utf8')
  assert.match(source, /query\.get\('product'\)\s*\|\|\s*query\.get\('service'\)/)
  assert.match(source, /canonicalProductKey/)
  assert.match(source, /pausedKeys/)
})

test('결제 복귀 기본 주소는 umsh.kr 이고 umsh.app 이 아니다', () => {
  // `kr.umsh.app` 은 Play 패키지명이다. 웹 복귀 주소로 새어 들어오면 결제가 끊긴다.
  const source = readFileSync(join(process.cwd(), 'src', 'payment', 'inicis.ts'), 'utf8')
  assert.match(source, /envValue\(process\.env\.PUBLIC_BASE_URL, 'https:\/\/umsh\.kr'\)/)
  assert.doesNotMatch(source, /https:\/\/umsh\.app/)
})
