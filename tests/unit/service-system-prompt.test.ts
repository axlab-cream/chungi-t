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
import { loadTonePersona } from '../../src/prompt/tone-v2.js'
import { loadSystemPrompt } from '../../src/conversation/prompt-builder.js'
import { listPaymentProducts } from '../../src/payment/catalog.js'

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
    assert.ok(master.includes('최종 말투: 격식체'))
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

  it('saju_master uses the final formal voice and explicitly retires old address', () => {
    clearServiceSystemPromptCache()
    const block = loadServiceBlock('saju_master')
    assert.ok(block.includes('최종 말투: 격식체'))
    assert.ok(block.includes('`자네`·`~일세` 금지'))
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
    assert.equal(KNOWN_SERVICE_KEYS.length, 20)
    for (const key of KNOWN_SERVICE_KEYS) {
      const contract = loadTonePersona(key)
      assert.equal(contract.key, key)
      assert.equal(Object.keys(contract.fields).length, 13)
      for (const [name, value] of Object.entries(contract.fields)) assert.ok(value.length > 0, `${key}: missing ${name}`)
      const full = loadServiceSystemPrompt(key)
      assert.ok(full.includes(contract.promise), `${key}: runtime prompt missing promise`)
      for (const [name, value] of Object.entries(contract.fields)) {
        if (name !== '대표 문장') assert.ok(full.includes(value), `${key}: runtime prompt missing ${name}`)
      }
    }
  })

  it('service contracts do not expose internal customer-hostile wording', () => {
    const joined = KNOWN_SERVICE_KEYS.map(key => loadTonePersona(key).promise).join('\n')
    assert.doesNotMatch(joined, /측정 전|자료가 아직 없어요|DEM|서버 권한|로그인과 결제 상태|풀이\s*\d+/)
  })

  /**
   * wedding_day 는 카탈로그에 올라간 뒤에도 prompts/services 에 없어서, 결제된 서비스가
   * 공통팩이 아니라 레거시 system-prompt.md 로 생성되고 있었다(3,540자, 서비스 목소리 없음).
   * loadServiceBlock 은 없으면 던지지만 loadSystemPrompt 가 그 예외를 삼켜 조용히 떨어진다.
   * 그래서 파일 존재가 아니라 '결제되는 상품 전부가 자기 목소리를 갖는지'를 검사한다.
   */
  it('every paid catalog product has its own voice prompt, not the legacy fallback', () => {
    const legacy = readFileSync(join(PROMPTS_ROOT, 'system-prompt.md'), 'utf-8')
    const common = loadCommonSystemPrompt()
    for (const product of listPaymentProducts()) {
      const key = normalizeServiceKey(product.key)
      const assembled = loadSystemPrompt(key)
      assert.ok(
        assembled.includes(common.slice(0, 120)),
        `${product.key}: 공통 시스템팩이 빠졌습니다. prompts/services/${key}.md 를 추가하세요.`,
      )
      assert.equal(
        assembled.startsWith(legacy.slice(0, 40)),
        false,
        `${product.key}: 레거시 system-prompt.md 로 떨어졌습니다.`,
      )
      const block = loadServiceBlock(key)
      assert.ok(assembled.includes(block.split('\n')[0].slice(0, 50)), `${product.key}: 서비스 블록이 조립되지 않았습니다.`)
    }
  })

  it('wedding_day speaks as a date-selection adviser and never pronounces a day lucky', () => {
    const block = loadServiceBlock('wedding_day')
    assert.match(block, /택일/)
    assert.match(block, /후보일/)
    // 계산값과 통념을 가르는 규칙, 그리고 날짜 선고 금지가 프롬프트에 남아 있어야 한다.
    assert.match(block, /손 없는 날/)
    assert.match(block, /길일·흉일로 단정/)
    assert.match(block, /합·충·파·해/)
    assert.match(block, /해요체/)
    assert.match(loadServiceSystemPrompt('wedding_day'), /일주\(日柱, 그 날의 기둥\)/)
    // 다른 서비스의 목소리가 섞이면 안 된다.
    assert.doesNotMatch(block, /자네|~일세/)
    assert.doesNotMatch(block, /context\.newyear/)
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
    assert.throws(() => loadServiceBlock('not_a_real_service'), /Unknown tone-v2 service/)
  })
})
