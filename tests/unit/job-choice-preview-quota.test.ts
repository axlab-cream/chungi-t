import assert from 'node:assert/strict'
import test from 'node:test'
import {
  claimJobChoicePreview,
  claimServicePreview,
  jobChoicePreviewStatus,
  previewQuotaBlocksAccess,
  servicePreviewStatus,
} from '../../src/work/jobchoice-preview-quota.js'

test('무료 조회를 모두 쓴 뒤에도 구매 또는 관리자 권한은 티저 재열람을 막지 않는다', () => {
  const exhausted = { used: 5, limit: 5 as const, allowed: false }
  assert.equal(previewQuotaBlocksAccess(exhausted, false), true)
  assert.equal(previewQuotaBlocksAccess(exhausted, true), false)
})

test('직장 선택 무료 결과는 계정별 서로 다른 입력 5건까지 허용하고 같은 입력 재열람은 차감하지 않는다', async () => {
  const owner = 'job-choice-quota-owner'
  for (let index = 1; index <= 5; index += 1) {
    assert.deepEqual(await claimJobChoicePreview(owner, `input-${index}`), { used: index, limit: 5, allowed: true })
  }
  assert.deepEqual(await claimJobChoicePreview(owner, 'input-1'), { used: 5, limit: 5, allowed: true })
  assert.deepEqual(await claimJobChoicePreview(owner, 'input-6'), { used: 5, limit: 5, allowed: false })
  assert.deepEqual(await jobChoicePreviewStatus(owner), { used: 5, limit: 5, allowed: false })
  assert.deepEqual(await claimJobChoicePreview('another-job-choice-owner', 'input-6'), { used: 1, limit: 5, allowed: true })
})

test('저축운 무료 결과 횟수는 직장 선택 횟수와 분리하고 같은 저축 입력은 재차감하지 않는다', async () => {
  const owner = 'shared-preview-quota-owner'
  assert.deepEqual(await claimJobChoicePreview(owner, 'same-lineage'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('money_save', owner, 'same-lineage'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('money_save', owner, 'same-lineage'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await jobChoicePreviewStatus(owner), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await servicePreviewStatus('money_save', owner), { used: 1, limit: 5, allowed: true })
})

test('이직운 무료 결과도 서비스별 5회이며 같은 리포트 재열람은 차감하지 않는다', async () => {
  const owner = 'work-move-preview-quota-owner'
  assert.deepEqual(await claimServicePreview('work_move', owner, 'move-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('work_move', owner, 'move-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('work_move', owner, 'move-lineage-2'), { used: 2, limit: 5, allowed: true })
  assert.deepEqual(await servicePreviewStatus('work_move', owner), { used: 2, limit: 5, allowed: true })
})

test('커플궁합 무료 결과는 다른 서비스와 분리된 5회이고 같은 두 사람 리포트는 재차감하지 않는다', async () => {
  const owner = 'match-couple-preview-quota-owner'
  assert.deepEqual(await claimServicePreview('match_couple', owner, 'couple-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('match_couple', owner, 'couple-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('match_couple', owner, 'couple-lineage-2'), { used: 2, limit: 5, allowed: true })
  assert.deepEqual(await servicePreviewStatus('match_couple', owner), { used: 2, limit: 5, allowed: true })
})

test('올해 연애운 무료 결과는 다른 서비스와 분리된 5회이고 같은 리포트 재열람은 차감하지 않는다', async () => {
  const owner = 'love-this-year-preview-quota-owner'
  assert.deepEqual(await claimServicePreview('love_this_year', owner, 'love-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('love_this_year', owner, 'love-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('love_this_year', owner, 'love-lineage-2'), { used: 2, limit: 5, allowed: true })
  assert.deepEqual(await servicePreviewStatus('love_this_year', owner), { used: 2, limit: 5, allowed: true })
})

test('고양이 궁합 무료 결과는 다른 서비스와 분리된 5회이고 같은 리포트 재열람은 차감하지 않는다', async () => {
  const owner = 'cat-compat-preview-quota-owner'
  assert.deepEqual(await claimServicePreview('cat_compatibility', owner, 'cat-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('cat_compatibility', owner, 'cat-lineage-1'), { used: 1, limit: 5, allowed: true })
  assert.deepEqual(await claimServicePreview('cat_compatibility', owner, 'cat-lineage-2'), { used: 2, limit: 5, allowed: true })
  assert.deepEqual(await servicePreviewStatus('cat_compatibility', owner), { used: 2, limit: 5, allowed: true })
})
