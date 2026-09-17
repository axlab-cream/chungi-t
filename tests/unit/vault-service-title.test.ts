import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { listAdminServiceDirectory, serviceTitleForKey } from '../../src/server/service-directory.js'
import { getPaymentProduct } from '../../src/payment/catalog.js'

/**
 * 2026-09-17: 보관함이 상품 이름을 자기 화면 안에 다시 적어 두고 있었다.
 *
 * `사주/vault.html` 안에 서비스키 → 제목 맵이 하드코딩돼 있었고, 이미 카탈로그와 갈라져
 * 있었다 — `lucky_color` 가 카탈로그에서는 "나한테 운 붙는 색과 물건" 인데 보관함에서는
 * "색과 물건" 으로 나왔다. 상품을 팔 때 쓰는 이름과 산 것을 다시 볼 때의 이름이 다르면
 * 같은 상품인지 알 수 없다.
 *
 * 제목은 결제 카탈로그 하나만 갖는다. 보관함은 서버가 내려준 것을 그대로 쓴다.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const vaultHtml = readFileSync(join(root, '사주', 'vault.html'), 'utf8')

test('보관함 제목은 결제 카탈로그의 판매 제목을 그대로 쓴다', () => {
  assert.equal(serviceTitleForKey('cmdg'), '천명사주')
  assert.equal(serviceTitleForKey('money_save'), '소비성향')
  assert.equal(serviceTitleForKey('quit_fortune'), '퇴사운')
  // 갈라져 있던 바로 그 항목. 축약하지 않는다.
  assert.equal(serviceTitleForKey('lucky_color'), '나한테 운 붙는 색과 물건')
})

test('이름이 바뀌기 전에 저장된 키도 같은 제목으로 열린다', () => {
  assert.equal(serviceTitleForKey('home_fit'), serviceTitleForKey('home_pungsu'))
  assert.equal(serviceTitleForKey('home'), '집 풍수')
  // 저장 레코드는 종합사주를 saju_master 로도 적는다(report-store 의 기본값).
  assert.equal(serviceTitleForKey('saju_master'), '천명사주')
})

test('모르는 키와 빈 값은 제목을 지어내지 않는다', () => {
  assert.equal(serviceTitleForKey(undefined), undefined)
  assert.equal(serviceTitleForKey(''), undefined)
  assert.equal(serviceTitleForKey('없는_서비스'), undefined)
})

test('카탈로그에 있는 모든 서비스가 제목을 돌려준다', () => {
  for (const entry of listAdminServiceDirectory()) {
    const title = serviceTitleForKey(entry.key)
    assert.equal(title, getPaymentProduct(entry.key)?.title, `${entry.key} 제목이 카탈로그와 다르다`)
    assert.ok(title && title.trim().length > 0, `${entry.key} 제목이 비어 있다`)
  }
})

test('보관함 화면은 제목 맵을 다시 적어 두지 않는다', () => {
  // 화면에 두 번째 표가 생기면 카탈로그가 바뀌어도 보관함만 옛 이름으로 남는다.
  assert.doesNotMatch(vaultHtml, /const titles\s*=/, 'vault.html 에 제목 맵이 다시 생겼다')
  assert.doesNotMatch(vaultHtml, /cmdg:\s*'천명사주'/)
  assert.match(vaultHtml, /report\.serviceTitle/, '서버가 내려준 제목을 써야 한다')
})
