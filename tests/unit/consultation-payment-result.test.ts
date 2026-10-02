import { it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { getPaymentProduct } from '../../src/payment/catalog.js'

const source = readFileSync(new URL('../../사주/js/payment-result.js', import.meta.url), 'utf8')
async function render(order: object, owner = 'qa-owner') {
  const result = { innerHTML: '', classList: { toggle() {}, remove() {} } }
  const storage = new Map([['umsh:consultation:checkout-draft:v1', JSON.stringify({ ownerId: 'qa-owner', conversationId: 'qa-session', text: 'synthetic', createdAt: Date.now() })]])
  const session = { user: { id: owner }, access_token: 'synthetic' }
  const window = { location: { search: '?product=cheonmyeong_consultation&state=paid&orderId=qa-order' }, localStorage: {}, sessionStorage: { getItem: (key: string) => storage.get(key), removeItem: (key: string) => storage.delete(key) }, supabase: { createClient: () => ({ auth: { getSession: async () => ({ data: { session } }), onAuthStateChange() {} } }) } }
  const fetch = async (url: string) => Response.json(url === '/api/payment/config' ? { catalog: [getPaymentProduct('cheonmyeong_consultation')] } : url === '/api/auth/config' ? { enabled: true, url: 'https://example.invalid', publishableKey: 'synthetic' } : { order })
  vm.runInNewContext(source, { window, document: { querySelector: () => result }, URLSearchParams, fetch, Date });
  await new Promise(resolve => setTimeout(resolve, 10))
  return { result, storage }
}
it('consultation paid URL alone never confirms a failed or wrong-product order', async () => {
  for (const order of [{ productKey: 'cheonmyeong_consultation', amount: 4900, status: 'failed' }, { productKey: 'cmdg', amount: 4900, status: 'paid' }]) {
    const { result } = await render(order)
    assert.doesNotMatch(result.innerHTML, /구매가 확인됐어요/)
    assert.match(result.innerHTML, /질문권 결제를 확인/)
  }
})
it('verified consultation purchase returns to its same-owner conversation and clears other-owner draft', async () => {
  const order = { productKey: 'cheonmyeong_consultation', amount: 4900, status: 'paid' }
  const own = await render(order)
  assert.match(own.result.innerHTML, /질문 5회 구매가 확인/)
  assert.match(own.result.innerHTML, /conversationId=qa-session/)
  const other = await render(order, 'other-owner')
  assert.equal(other.storage.size, 0)
  assert.doesNotMatch(other.result.innerHTML, /qa-session/)
})
it('server-confirmed discounted consultation order returns to consultation, zero or invalid amount does not', async () => {
  assert.match((await render({ productKey:'cheonmyeong_consultation',amount:3900,status:'paid' })).result.innerHTML,/질문 5회 구매가 확인/)
  for (const amount of [0,-1,4901,'3900']) assert.doesNotMatch((await render({productKey:'cheonmyeong_consultation',amount,status:'paid'})).result.innerHTML,/질문 5회 구매가 확인/)
})
