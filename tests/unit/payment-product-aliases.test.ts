import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  canonicalPaymentProductKey,
  getPaymentProduct,
  listPaymentProducts,
  paymentProductKeyFromPath,
} from '../../src/payment/catalog.js'

const ROOT = process.cwd()
const SAJU = join(ROOT, '사주')
const PAUSED = new Set(['home_pungsu', 'lucky_color', 'pass_angle', 'newyear_flow', 'wedding_day'])

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'assets' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, found)
    else if (/\.(html|js)$/.test(entry.name)) found.push(path)
  }
  return found
}

test('시드 별칭은 카탈로그 정식 키로 열린다', () => {
  const cases: Array<[string, string]> = [
    ['save', 'money_save'],
    ['couple_match', 'match_couple'],
    ['love_thisyear', 'love_this_year'],
    ['marriage_compatibility', 'marry_match'],
    ['home_fit', 'home_pungsu'],
    ['pass_angle_exam', 'pass_angle'],
    ['money_save', 'money_save'],
    ['cmdg', 'cmdg'],
  ]
  for (const [raw, expected] of cases) {
    assert.equal(canonicalPaymentProductKey(raw), expected, raw)
    assert.equal(getPaymentProduct(raw)?.key, expected, raw)
  }
})

test('복귀 경로만 있어도 공개 서비스 상품을 찾는다', () => {
  assert.equal(paymentProductKeyFromPath('/money/save/04-step-4-report/index.html'), 'money_save')
  assert.equal(paymentProductKeyFromPath('/match/couple/04-step-4-report/'), 'match_couple')
  assert.equal(paymentProductKeyFromPath('/work/job-choice/04-step-4-report/index.html'), 'job_choice')
  assert.equal(paymentProductKeyFromPath('/work/job'), 'work_job')
})

const FREE_KEYS = new Set(['today_fortune', 'today'])

test('페이지가 결제창에 넘기는 키는 모두 상품으로 해석된다', () => {
  const keys = new Set<string>()
  const paymentUrlRe = /\/payment(?:\?([^'"\s]*))?/g
  const queryKeyRe = /(?:^|&)(?:product|service|service_key|productKey)=([a-z0-9_-]+)/gi
  const setRe = /searchParams\.set\(\s*['"]product['"]\s*,\s*(?:encodeURIComponent\()?([A-Za-z0-9_.]+)/g
  const literalRe = /service_key:\s*['"]([a-z0-9_-]+)['"]/gi
  const apiKeyRe = /apiKey:\s*['"]([a-z0-9_-]+)['"]/g

  for (const file of walk(SAJU)) {
    const text = readFileSync(file, 'utf8')
    paymentUrlRe.lastIndex = 0
    let urlMatch: RegExpExecArray | null
    while ((urlMatch = paymentUrlRe.exec(text))) {
      const query = urlMatch[1] || ''
      queryKeyRe.lastIndex = 0
      let queryMatch: RegExpExecArray | null
      while ((queryMatch = queryKeyRe.exec(query))) keys.add(queryMatch[1])
    }
    for (const re of [literalRe, apiKeyRe]) {
      re.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = re.exec(text))) keys.add(match[1])
    }
    setRe.lastIndex = 0
    let assigned: RegExpExecArray | null
    while ((assigned = setRe.exec(text))) {
      if (/SERVICE\.|service\./.test(assigned[1])) {
        const seed = text.match(/service_key:\s*['"]([a-z0-9_-]+)['"]/i)
        if (seed) keys.add(seed[1])
      }
    }
  }

  const unresolved = [...keys].filter((key) => {
    if (FREE_KEYS.has(key) || ['SERVICE', 'service', 'productKey'].includes(key)) return false
    return !canonicalPaymentProductKey(key)
  })
  assert.deepEqual(unresolved, [], `결제 키를 카탈로그에서 못 찾는다: ${unresolved.join(', ')}`)
})

test('STEP4 HTML 시드 키는 결제 상품으로 열린다', () => {
  const seedRe = /service_key["']?\s*[:=]\s*["']([a-z0-9_-]+)["']/gi
  const altRe = /serviceKey:\s*["']([a-z0-9_-]+)["']/g
  const files = walk(SAJU).filter((file) => /04-step-4-report[\\/]index\.html$/i.test(file))
  assert.ok(files.length >= 10, `STEP4 페이지가 ${files.length}개뿐이다`)
  const unresolved: string[] = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const keys = new Set<string>()
    for (const re of [seedRe, altRe]) {
      re.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = re.exec(text))) keys.add(match[1])
    }
    for (const key of keys) {
      if (FREE_KEYS.has(key)) continue
      if (!getPaymentProduct(key)) unresolved.push(`${file}: ${key}`)
    }
  }
  assert.deepEqual(unresolved, [], unresolved.join('\n'))
})

test('공개 카탈로그 상품은 금액이 있고 일시정지 키가 아니다', () => {
  const open = listPaymentProducts().filter((product) => !PAUSED.has(product.key))
  assert.ok(open.length >= 10, `공개 상품이 ${open.length}개뿐이다`)
  for (const product of open) {
    assert.ok(product.amount > 0, product.key)
    assert.ok(product.title.trim(), product.key)
  }
})
