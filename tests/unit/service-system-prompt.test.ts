import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  KNOWN_SERVICE_KEYS,
  clearServiceSystemPromptCache,
  loadCommonSystemPrompt,
  loadServiceBlock,
  loadServiceSystemPrompt,
  normalizeServiceKey,
} from '../../src/prompt/service-system.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPTS_ROOT = join(__dirname, '../../prompts')

describe('service-system prompt wiring', () => {
  it('normalizeServiceKey applies aliases and defaults', () => {
    assert.equal(normalizeServiceKey(undefined), 'saju_master')
    assert.equal(normalizeServiceKey(null), 'saju_master')
    assert.equal(normalizeServiceKey(''), 'saju_master')
    assert.equal(normalizeServiceKey('  '), 'saju_master')
    assert.equal(normalizeServiceKey('love_thisyear'), 'love_this_year')
    assert.equal(normalizeServiceKey('home_pungsu'), 'home_fit')
    assert.equal(normalizeServiceKey('home'), 'home_fit')
    assert.equal(normalizeServiceKey('love_signal'), 'couple_signal')
    assert.equal(normalizeServiceKey('today'), 'today_fortune')
    assert.equal(normalizeServiceKey('money_save'), 'money_save')
    assert.equal(normalizeServiceKey(' Love-This-Year '), 'love_this_year')
  })

  it('loadServiceSystemPrompt returns common + service-specific content', () => {
    clearServiceSystemPromptCache()
    const common = loadCommonSystemPrompt()
    assert.ok(common.includes('운명상회'))
    assert.ok(common.includes('해설자'))

    const money = loadServiceSystemPrompt('money_save')
    assert.ok(money.includes(common.slice(0, 40)))
    assert.ok(money.includes('돈 습관') || money.includes('소비') || money.includes('지출'))
    assert.ok(loadServiceBlock('money_save').includes('해요체'))

    const master = loadServiceSystemPrompt('saju_master')
    assert.ok(master.includes('~하네/~군/~일세/~보게') || master.includes('~일세'))
    assert.ok(master.includes('천명사주'))
  })

  it('money_save service block lacks old CHEONMYEONG guide cues', () => {
    clearServiceSystemPromptCache()
    const block = loadServiceBlock('money_save')
    // Old global CHEONMYEONG_TONE_GUIDE examples must not live in money_save.md.
    assert.equal(block.includes('허허'), false)
    assert.equal(block.includes('자네 말이야'), false)
    assert.equal(block.includes('~하게'), false)
    assert.equal(block.includes('~일세'), false)
    assert.ok(block.includes('해요체'))
  })

  it('saju_master contains 하게체 cues from its md file', () => {
    clearServiceSystemPromptCache()
    const block = loadServiceBlock('saju_master')
    assert.ok(block.includes('~하네') || block.includes('~일세') || block.includes('~보게'))
    assert.ok(block.includes('자네') || block.includes('하게'))
  })

  it('all 19 manifest service files exist, including the new year service', () => {
    const manifest = JSON.parse(readFileSync(join(PROMPTS_ROOT, 'services-manifest.json'), 'utf-8')) as {
      services: Array<{ key: string }>
    }
    assert.equal(manifest.services.length, 19)
    assert.equal(KNOWN_SERVICE_KEYS.length, 19)
    for (const { key } of manifest.services) {
      assert.ok(KNOWN_SERVICE_KEYS.includes(key as (typeof KNOWN_SERVICE_KEYS)[number]), `known list missing ${key}`)
      const path = join(PROMPTS_ROOT, 'services', `${key}.md`)
      assert.ok(existsSync(path), `missing prompts/services/${key}.md`)
    }
  })

  it('newyear has its own grounded 2027 prompt and never falls back to the master persona', () => {
    const block = loadServiceBlock('newyear_flow')
    assert.match(block, /context\.newyear/)
    assert.match(block, /2027년/)
    assert.match(block, /2026년/)
    assert.match(block, /출생 시각 미상/)
    assert.match(block, /문제·위험·해결/)
    assert.match(loadServiceSystemPrompt('newyear_flow'), /세운\(歲運, 한 해의 흐름\)/)
    assert.doesNotMatch(block, /자네|~일세/)
    assert.throws(() => loadServiceBlock('not_a_real_service'), /서비스 프롬프트가 없습니다/)
  })
})
