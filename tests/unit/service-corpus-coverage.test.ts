import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const registry = JSON.parse(readFileSync(join(ROOT, 'data/corpus/registry.json'), 'utf-8'))

/** 01~06_1 흐름을 가진 서비스와, 그 서비스가 인용해야 할 전용 팩. */
const SERVICE_PACKS: Array<[string, string]> = [
  ['결혼궁합', 'marry-match-service'],
  ['커플궁합', 'match-couple-service'],
  ['고양이 궁합', 'cat-compatibility-service'],
  ['소비성향', 'money-save-service'],
  ['퇴사운', 'quit-fortune-service'],
  ['직장 선택', 'job-choice-service'],
  ['관계 신호', 'couple-signal-service'],
  ['올해 연애운', 'love-this-year-service'],
  ['합격운', 'pass-angle-service'],
  ['이직운', 'work-move-service'],
  ['집 풍수', 'home-fit-service'],
]

test('모든 서비스가 자기 전용 코퍼스 팩을 가진다', () => {
  for (const [name, id] of SERVICE_PACKS) {
    const pack = registry.packs.find((entry: { id: string }) => entry.id === id)
    assert.ok(pack, `${name}: ${id} 팩이 레지스트리에 없습니다`)
    assert.equal(pack.status, 'active', `${name}: 팩이 비활성입니다`)
    assert.ok(pack.retrievalBoost >= 18, `${name}: 검색 가중치가 너무 낮습니다`)
  }
})

test('전용 팩은 읽을 수 있는 판단 블록으로 되어 있다', () => {
  const required = ['id', 'topic', 'keywords', 'concept', 'condition', 'interpretation',
    'real_world_pattern', 'risk', 'opportunity', 'advice', 'confidence', 'forbidden_generalization']

  for (const [name, id] of SERVICE_PACKS) {
    const pack = registry.packs.find((entry: { id: string }) => entry.id === id)
    const corpus = JSON.parse(readFileSync(join(ROOT, 'data', pack.path), 'utf-8'))
    const blocks = corpus.knowledgeBlocks ?? corpus.chunks ?? []
    // 기존 구형 팩이 8개라 그 아래로 내려가는 것만 막는다.
    assert.ok(blocks.length >= 8, `${name}: 판단 블록이 ${blocks.length}개뿐입니다`)

    const ids = blocks.map((block: { id: string }) => block.id)
    assert.equal(new Set(ids).size, ids.length, `${name}: 중복된 블록 id가 있습니다`)

    // knowledgeBlocks 형식의 팩만 필드 규약을 강제한다. 구형 chunks 팩은 형식이 다르다.
    if (corpus.knowledgeBlocks) {
      blocks.forEach((block: Record<string, unknown>) => {
        required.forEach((field) => assert.ok(field in block, `${name} ${block.id}: ${field} 없음`))
        // 사용자에게 보이는 문장은 코퍼스 내부 표기를 담으면 안 된다.
        const prose = `${block.interpretation} ${block.advice}`
        assert.doesNotMatch(prose, /concept:|condition:|Feature JSON/, `${name} ${block.id}: 내부 표기 유입`)
      })
    }
  }
})
