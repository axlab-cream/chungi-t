import test from 'node:test'
import assert from 'node:assert/strict'
import { homeReadingInstruction, reviewHomeNarrative } from '../../src/report/home-reading-corpus.js'

test('home instruction uses a dedicated narrative instead of repeated input recap', () => {
  assert.match(homeReadingInstruction('entrance-flow'), /등록값을 다시 읽어주지/)
  assert.match(homeReadingInstruction('saju-house-ohaeng'), /개인 보완 오행을 정하지/)
  assert.match(homeReadingInstruction('terrain-support'), /section_contract/)
  assert.match(homeReadingInstruction('terrain-support'), /터 유사도, 측정값, 사용자 체감, 계산값, 전통 상징/)
  assert.throws(() => homeReadingInstruction('bad'), /UNKNOWN/)
})
test('recap and astrology definition are rejected outside their dedicated sections', () => {
  assert.ok(reviewHomeNarrative('[불편한 출입] 확인된 입력은 아파트입니다.','entrance-flow').length)
  assert.equal(reviewHomeNarrative('[전체 조건] 사용자 체감으로는 아파트 생활 목적을 함께 봅니다.\n\n[오늘 행동] 오늘: 비용 0원 · 난이도 1 · 관찰 지표는 집에 들어올 때 먼저 거슬리는 장면이에요.','home-fit-overall').length,0)
  assert.ok(reviewHomeNarrative('[작은 불] 일간(日干, 태어난 날의 천간)은 정화입니다.','sleep-recovery').length)
  assert.equal(reviewHomeNarrative('[작은 불] 계산값과 전통 상징으로 보면 일간(日干, 태어난 날의 천간)은 정화입니다.\n\n[7일 행동] 7일: 비용 0원 · 난이도 1 · 관찰 지표는 집에서 생각이 과열되는 시간대예요.','saju-house-ohaeng').length,0)
})
test('subject-focused conditional scenes pass, generic titles and room tours fail', () => {
  assert.deepEqual(reviewHomeNarrative('[짐을 내려놓을 여유] 사용자 체감으로 현관의 꺾임이 보이면 짐을 든 손이 어디서 멈추는지 봐야 해요.\n\n[오늘 할 일] 오늘: 비용 0원 · 난이도 1 · 관찰 지표는 문 앞에서 멈추는 횟수예요.','entrance-flow'),[])
  assert.ok(reviewHomeNarrative('[다음 행동] 현관 침실 책상 창밖을 확인하세요.','entrance-flow').length>=2)
  assert.ok(reviewHomeNarrative('제목이 없는 문단','entrance-flow').length)
})
test('short observations cannot become home-fit verdicts', () => {
  assert.ok(reviewHomeNarrative('[아침 확인] 30분 안에 몸이 풀리면 이 집은 맞는 편이에요.','home-fit-overall').length)
  assert.ok(reviewHomeNarrative('[체감 확인] 좋아지면 궁합이 좋다는 뜻이에요.','sleep-recovery').length)
  assert.deepEqual(reviewHomeNarrative('[체감 확인] 사용자 체감으로 아침에 몸이 무거운 날이 반복되면 빛과 소리 중 무엇이 먼저 걸리는지 좁혀보세요.\n\n[7일 실험] 7일: 비용 0원 · 난이도 1 · 관찰 지표는 기상 직후 몸무게감이에요.','sleep-recovery'),[])
})
test('home narrative requires public evidence labels and action metadata', () => {
  assert.ok(reviewHomeNarrative('[근거] MEASURED slope 2.8\n\n[오늘] 오늘 바로 확인하세요.','terrain-support').length)
  assert.ok(reviewHomeNarrative('[근거] 사용자 체감으로 볼 때 흐름이 분명해요.\n\n[오늘] 오늘 바로 확인하세요.','terrain-support').some(issue => /비용|난이도|관찰/.test(issue)))
  assert.ok(reviewHomeNarrative('[근거] 사용자 체감과 측정 전 항목을 나눠 보면 외부 흐름은 아직 더 봐야 해요.\n\n[오늘] 오늘: 비용 0원 · 난이도 1 · 관찰 지표는 창가에서 들리는 반복 소리예요.','terrain-support').some(issue => /결손|터 유사도/.test(issue)))
  assert.deepEqual(reviewHomeNarrative('[터 유사도] 비슷한 터의 생활 패턴으로 보면 출입 부담과 받침감이 먼저 보여요.\n\n[오늘] 오늘: 비용 0원 · 난이도 1 · 관찰 지표는 집에 도착한 직후 몸의 긴장도예요.','terrain-support'),[])
})

test('observation needs a concrete target, not a heading or a bare imperative', () => {
  for (const action of ['오늘 바로 확인하세요.', '잘 관찰해 보세요.', '확인하고 기록하세요.']) {
    assert.ok(reviewHomeNarrative(`[관찰 대상] 사용자 체감으로 살펴봐요.\n\n[행동] ${action}`, 'entrance-flow').some(issue => /대상/.test(issue)))
  }
  assert.deepEqual(reviewHomeNarrative('[출입 동선] 사용자 체감에서 출입의 불편을 구분해요.\n\n[문 앞의 여유] 짐을 내려놓을 공간이 있는지 확인해 보세요.', 'entrance-flow'), [])
})
