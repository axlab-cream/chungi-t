import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync('사주/love/signal/01-step-1-story/index.html', 'utf8')

test('관계 신호 STEP1은 불안의 시작부터 무료 해석까지 한 이야기로 이어진다', () => {
  assert.match(html, /달라진 건 사랑일까요,[\s\S]*우리 사이일까요/)
  assert.match(html, /설명이 사라져서/)
  assert.match(html, /늘 같은 순서/)
  assert.match(html, /사랑하는 방식이 다르면/)
  assert.match(html, /이 관계를 믿어도 되는 이유/)
  assert.match(html, /우리 둘의 첫 두 장면/)
})

test('관계 신호 STEP1은 중복 고정 CTA와 가격 선노출을 제거한다', () => {
  assert.doesNotMatch(html, /class="sticky-cta"/)
  assert.doesNotMatch(html, /class="price-line"/)
  assert.doesNotMatch(html, /class="top-pill">19,900원/)
  assert.equal((html.match(/우리 관계 무료 해석 열기/g) ?? []).length, 1)
  assert.equal((html.match(/우리 관계의 첫 신호 보기/g) ?? []).length, 1)
})

test('관계 신호 STEP1은 전문 용어 대신 실제 관계 장면을 먼저 보여 준다', () => {
  assert.match(html, /애정을 확인하는 속도/)
  assert.match(html, /다툰 뒤 돌아오는 방식/)
  assert.match(html, /관계 밖에서 흔들리는 순간/)
  assert.doesNotMatch(html, />명리궁합</)
  assert.doesNotMatch(html, />오행 온도</)
  assert.doesNotMatch(html, />일지 시그널</)
  assert.doesNotMatch(html, /합충형파해|원진식/)
})

test('리포트 범위 카드는 버튼처럼 가장하지 않고 읽는 정보로 제공한다', () => {
  assert.equal((html.match(/class="preview-card"/g) ?? []).length, 5)
  assert.doesNotMatch(html, /<a class="preview-card"/)
})
