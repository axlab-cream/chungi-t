import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KNOWN_SERVICE_KEYS, loadServiceSystemPrompt } from '../../src/prompt/service-system.js'
import { loadTonePersona } from '../../src/prompt/tone-v2.js'
import { loadSystemPrompt } from '../../src/conversation/prompt-builder.js'

test('new persona bundle reaches all conversation and report system prompts', () => {
  for (const key of KNOWN_SERVICE_KEYS) {
    const persona = loadTonePersona(key)
    assert.ok(persona.displayName, `${key}: persona displayName`)
    assert.equal(persona.definitionStatus, 'specified', `${key}: persona definition status`)
    assert.equal(persona.displayNameStatus, 'draft', `${key}: persona display name status`)
    assert.ok(persona.lexicon, `${key}: persona lexicon`)
    assert.notEqual(persona.rhythm, undefined, `${key}: persona rhythm contract`)
    const prompt = loadServiceSystemPrompt(key)
    assert.ok(prompt.includes(persona.promise))
    assert.ok(prompt.includes(`최종 말투: ${persona.fields['말투']}`))
    assert.ok(prompt.includes('처방 숫자'))
    assert.equal(loadSystemPrompt(key), prompt)
  }
})
test('unknown service cannot fall back to old persona', () => {
  assert.throws(() => loadSystemPrompt('missing-service'), /Unknown tone-v2 service/)
  assert.throws(() => loadSystemPrompt('../../prompts/system-prompt'), /Unknown tone-v2 service/)
  assert.equal(loadSystemPrompt('cmdg'), loadSystemPrompt('saju_master'))
})
