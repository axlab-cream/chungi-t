import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOME_READING_SECTIONS, homeReadingCorpus, homeReadingInstruction } from '../../src/report/home-reading-corpus.js'
import { formatRagForPrompt } from '../../src/rag/retriever.js'

test('all twelve home readings receive only their dedicated corpus block', () => {
  const ids = new Set<string>()
  for (const id of HOME_READING_SECTIONS) {
    const chunks = homeReadingCorpus(id)
    assert.equal(chunks.length, 1)
    assert.ok(chunks[0].knowledge?.condition.includes(`section.id=${id}`))
    assert.match(formatRagForPrompt(chunks), /예를 들어/)
    ids.add(chunks[0].id)
  }
  assert.equal(ids.size, 12)
  assert.throws(() => homeReadingCorpus('unknown'), /UNKNOWN_HOME_READING_SECTION/)
})

test('legacy home report sections keep working after the twelve-section migration', () => {
  assert.equal(homeReadingCorpus('house-energy')[0].id, homeReadingCorpus('terrain-support')[0].id)
  assert.equal(homeReadingCorpus('spatial-fix')[0].id, homeReadingCorpus('reality-action')[0].id)
  assert.match(homeReadingInstruction('house-energy'), /터 유사도/)
  assert.match(homeReadingInstruction('spatial-fix'), /section_contract/)
})

test('home corpus revision is registered and guidance is not in customer advice', () => {
  const corpus = JSON.parse(readFileSync('data/corpus/home-fit-service.json', 'utf8'))
  const registry = JSON.parse(readFileSync('data/corpus/registry.json', 'utf8'))
  assert.equal(corpus.version, '3.0.0')
  assert.ok(JSON.stringify(registry).includes('home-fit-service'))
  for (const block of corpus.knowledgeBlocks) {
    assert.doesNotMatch(block.advice, /제시한다|설명한다|붙인다|말한다|번역한다/)
    assert.match(block.real_world_pattern.join(' '), /예를 들어/)
  }
})
