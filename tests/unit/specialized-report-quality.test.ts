import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSaju } from '../../src/saju/analyzer.js'
import { normalizeReportCopy } from '../../src/report/copy-guide.js'
import { evaluateReportQuality } from '../../src/report/report-quality.js'
import type { BirthInput, SajuReport } from '../../src/types/index.js'

const birth: BirthInput = {
  year: 1992,
  month: 8,
  day: 20,
  hour: 12,
  minute: 0,
  gender: 'male',
  calendar: 'solar',
}

test('공통 문구 가이드는 내부 용어를 제거하고 후킹·해법 구조를 보강한다', () => {
  const report: SajuReport = {
    title: '테스트 RAG 리포트',
    subtitle: '코퍼스 기반 테스트',
    model: 'template',
    generatedBy: 'template',
    sections: [{
      id: 'money-1',
      order: 1,
      imageKey: 'money',
      imageSrc: '/assets/test.png',
      imageAlt: '테스트',
      category: '돈의 흐름',
      categoryEn: 'Money',
      classification: '돈이 새는 자리',
      hook: '돈이 새는 자리',
      patternKeys: ['money'],
      ragTopics: ['재물운'],
      interpretation: 'RAG 근거는 이렇네. 돈이 새는 장면을 살피겠네.\n\n반복 지출을 적어 보게.',
    }],
  }

  const normalized = normalizeReportCopy(report)
  const section = normalized.sections[0]
  assert.equal(normalized.title, '테스트 참고 자료 리포트')
  assert.match(section.hook, /돈이 새는 자리 ·/)
  assert.match(section.interpretation, /^\[주요 포인트\]/)
  assert.match(section.interpretation, /\[해법\]/)
  assert.doesNotMatch(section.interpretation, /RAG|코퍼스|검색된 지식|지식 블록/)
})

test('전용 서비스 품질 평가는 템플릿과 OpenAI 결과를 구분한다', () => {
  const analysis = analyzeSaju(birth)
  const report: SajuReport = {
    title: '소비성향 해석문',
    subtitle: '돈이 남는 구조를 봅니다',
    model: 'money-save-rag-template',
    generatedBy: 'template',
    sections: [{
      id: 'money-leak-1',
      order: 1,
      imageKey: 'money-save',
      imageSrc: '/assets/test.png',
      imageAlt: '소비성향 풀이',
      category: '돈이 새는 구멍',
      categoryEn: 'Money Leak',
      classification: '반복 지출의 이름',
      hook: '반복 지출의 이름 · 놓치기 쉬운 신호',
      patternKeys: ['money', 'save'],
      ragTopics: ['돈구멍: 돈이 새는 지점', '재물운: 돈이 들어오는 방식'],
      interpretation: '[주요 포인트] 재성은 돈이 들어오는 방식이고 비겁은 비교와 관계 비용으로 드러날 수 있네.\n\n지출과 저축 목표를 나누어 보게.\n\n[해법] 이번 달에는 반복 지출을 기록하고 관계 비용의 상한선을 정해 보게.',
      generatedBy: 'template',
    }],
  }

  const quality = evaluateReportQuality(report, analysis, {
    serviceKey: 'money_save',
    target: '본인',
    concern: '돈이 남지 않습니다',
  })
  assert.equal(quality.llmGroundingPercent, 0)
  assert.ok(quality.overallPercent <= 82)
  assert.match(quality.categories[0].evidence.join(' '), /내부 용어 미노출/)
})
