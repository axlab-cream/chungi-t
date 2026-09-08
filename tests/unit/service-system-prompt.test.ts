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
import { SERVICE_VOICE_CONTRACTS, formatServiceVoiceContract } from '../../src/prompt/service-voice-contracts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPTS_ROOT = join(__dirname, '../../prompts')

describe('service-system prompt wiring', () => {
  it('home prompt does not force a room tour in every section', () => {
    const prompt = loadServiceSystemPrompt('home_fit')
    assert.doesNotMatch(prompt, /필수 용어: 오행.*현관·침실·책상·창밖/)
    assert.match(prompt, /모든 공간이나 같은 명리 소개를 매 항목에 필수로 넣지 않습니다/)
  })
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

  it('all 20 manifest service files exist, including new year and wedding', () => {
    const manifest = JSON.parse(readFileSync(join(PROMPTS_ROOT, 'services-manifest.json'), 'utf-8')) as {
      services: Array<{ key: string }>
    }
    assert.equal(manifest.services.length, 20)
    assert.equal(KNOWN_SERVICE_KEYS.length, 20)
    for (const { key } of manifest.services) {
      assert.ok(KNOWN_SERVICE_KEYS.includes(key as (typeof KNOWN_SERVICE_KEYS)[number]), `known list missing ${key}`)
      const path = join(PROMPTS_ROOT, 'services', `${key}.md`)
      assert.ok(existsSync(path), `missing prompts/services/${key}.md`)
    }
  })

  it('all 20 services have enforceable voice contracts in the runtime prompt', () => {
    assert.equal(Object.keys(SERVICE_VOICE_CONTRACTS).length, 20)
    for (const key of KNOWN_SERVICE_KEYS) {
      const contract = SERVICE_VOICE_CONTRACTS[key]
      assert.equal(contract.serviceKey, key)
      assert.ok(contract.userQuestion.length >= 12, `${key}: userQuestion too short`)
      assert.ok(/먼저|보여|준다|잡아/.test(contract.teaserJob), `${key}: teaser job must guide preview`)
      assert.ok(contract.reportJob.length >= 25, `${key}: report job too short`)
      assert.ok(contract.requiredScenes.length >= 3, `${key}: needs concrete scenes`)
      assert.ok(contract.decisionCriteria.length >= 3, `${key}: needs decision criteria`)
      assert.ok(contract.holdConditions.length >= 3, `${key}: needs hold conditions`)
      assert.ok(contract.forbiddenCustomerCopy.length >= 3, `${key}: needs forbidden copy`)
      const full = loadServiceSystemPrompt(key)
      assert.ok(full.includes(formatServiceVoiceContract(key)), `${key}: runtime prompt missing contract`)
    }
  })

  it('service contracts do not expose internal customer-hostile wording', () => {
    const joined = Object.values(SERVICE_VOICE_CONTRACTS).map((contract) => [
      contract.promise,
      contract.userQuestion,
      contract.teaserJob,
      contract.reportJob,
      contract.requiredScenes.join(' '),
      contract.decisionCriteria.join(' '),
    ].join(' ')).join('\n')
    assert.doesNotMatch(joined, /측정 전|자료가 아직 없어요|DEM|서버 권한|로그인과 결제 상태|풀이\s*\d+/)
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
