import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseServiceDraftFields } from '../../src/admin/service-draft.js'

const valid = {
  title: '천명사주',
  tagline: '내 인생의 흐름을 읽습니다.',
  summary: '기질, 돈, 일, 관계와 큰 흐름을 실제 서비스 기준으로 설명합니다.',
  category: '종합',
  discoveryVisible: true,
  landingPath: '/cmdg/',
}

describe('서비스 초안 입력 검증', () => {
  it('실제 canonicalKey와 고객 경로에 맞는 구조화 필드만 받는다', () => {
    assert.deepEqual(parseServiceDraftFields('cmdg', valid), valid)
  })

  it('정본에 없는 서비스와 다른 서비스 경로를 거부한다', () => {
    assert.throws(() => parseServiceDraftFields('not-real', valid), /SERVICE_KEY_INVALID/)
    assert.throws(() => parseServiceDraftFields('cmdg', { ...valid, landingPath: '/love/this-year' }), /SERVICE_LANDING_PATH_INVALID/)
  })

  it('빈 필드, 과도한 길이, 문자열 boolean을 거부한다', () => {
    assert.throws(() => parseServiceDraftFields('cmdg', { ...valid, title: '   ' }), /SERVICE_TITLE_INVALID/)
    assert.throws(() => parseServiceDraftFields('cmdg', { ...valid, summary: '가'.repeat(1001) }), /SERVICE_SUMMARY_INVALID/)
    assert.throws(() => parseServiceDraftFields('cmdg', { ...valid, discoveryVisible: 'true' }), /SERVICE_DISCOVERY_INVALID/)
  })

  it('가격·판매 상태·canonicalKey 같은 비허용 필드가 섞이면 거부한다', () => {
    assert.throws(() => parseServiceDraftFields('cmdg', { ...valid, amount: 1 }), /SERVICE_DRAFT_FIELDS_INVALID/)
    assert.throws(() => parseServiceDraftFields('cmdg', { ...valid, canonicalKey: 'cmdg' }), /SERVICE_DRAFT_FIELDS_INVALID/)
  })
})
