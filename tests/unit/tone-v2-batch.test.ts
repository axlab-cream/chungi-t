import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateToneOutline } from '../../src/report/tone-v2-batch.js'

const outline = [{ id: 'first', title: 'First' }, { id: 'last', title: 'Last' }]
test('generation preserves the supplied complete outline and carries prior full text', async () => {
  const result = await generateToneOutline(outline, async ({ item, previous }) => {
    if (item.id === 'last') assert.equal(previous[0].body, 'first body')
    return { ...item, body: `${item.id} body` }
  }, () => [])
  assert.deepEqual(result.map(({ id }) => id), ['first', 'last'])
})
test('a rejected item stops the pipeline and never substitutes a template', async () => {
  let calls = 0
  await assert.rejects(generateToneOutline(outline, async ({ item }) => {
    calls++
    return { ...item, body: 'invalid copy' }
  }, () => ['evidence mismatch']), /Review failed/)
  assert.equal(calls, 1)
})
test('empty, duplicate, missing and renamed outline entries fail explicitly', async () => {
  const generate = async () => ({ id: 'wrong', title: 'wrong', body: 'text' })
  await assert.rejects(generateToneOutline([], generate, () => []), /source outline/)
  await assert.rejects(generateToneOutline([outline[0], outline[0]], generate, () => []), /source outline/)
  await assert.rejects(generateToneOutline(outline, generate, () => []), /Outline mismatch/)
})
