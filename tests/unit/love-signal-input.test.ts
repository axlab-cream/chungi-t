import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const html = readFileSync(join(root, '사주', 'love', 'signal', '02-step-2-saju-input', 'index.html'), 'utf8')

test('관계 신호 입력 화면은 내부 단계 설명 대신 사용자의 고민을 중심으로 안내한다', () => {
  assert.doesNotMatch(html, /04 리포트|무료 티저 문구|운영 기준|필수 7개|약 2분|관성·재성|사주 계산에는|같은 브라우저 세션/)
  assert.match(html, /요즘 달라졌다고 느낀 장면을 적어 주세요/)
  assert.match(html, /첫 무료 해석부터 이 고민을 중심으로 풀어드립니다/)
  assert.match(html, /두 사람 사이에서 달라진 장면부터 짚어봅니다/)
})

test('관계 신호 입력 히어로는 세로 원본의 얼굴을 보존할 높이와 초점을 사용한다', () => {
  assert.match(html, /\.hero\s*\{[\s\S]*?min-height:\s*360px/)
  assert.match(html, /\.hero :is\(img, video\)\s*\{[\s\S]*?object-position:\s*center top/)
  assert.match(html, /<img src="\.\.\/assets\/signal\/videos\/06-form-guide-poster\.webp"/)
  assert.doesNotMatch(html, /<video class="signal-video"/)
})

test('날짜와 포인트 선택창의 펼침 목록은 흰 바탕에서 진한 글자로 읽힌다', () => {
  assert.match(html, /select option\s*\{[\s\S]*?background:\s*#fff8ee[\s\S]*?color:\s*#24110e/)
})
