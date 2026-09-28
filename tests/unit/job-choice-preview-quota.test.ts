import assert from 'node:assert/strict'
import test from 'node:test'
import {
  claimJobChoicePreview,
  claimServicePreview,
  jobChoicePreviewStatus,
  servicePreviewStatus,
} from '../../src/work/jobchoice-preview-quota.js'

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
