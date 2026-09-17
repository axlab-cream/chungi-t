import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { fixCopulaSpelling } from '../../src/report/tone-v2-review.js'

/**
 * 2026-09-17: `이에요/예요` 오기가 첫 시도 검수 실패의 가장 큰 사유였다.
 *
 * 소비성향 항목을 두 번 돌린 6건 중 4건이 이 하나로 떨어졌다 — "지출예요", "돈줄예요",
 * "기준예요". 내용 결함이 아니라 표기 오류인데, 떨어지면 항목 전체를 다시 쓴다.
 * 재시도 한 번이 30~60초이고 목차가 41~70개이므로 그대로 정체가 된다.
 *
 * 받침 판정은 기계적으로 정확하다. 그래서 거부하지 않고 고친다.
 */

test('받침이 있으면 이에요로 고친다', () => {
  for (const [given, want] of [
    ['지출예요', '지출이에요'],
    ['돈줄예요', '돈줄이에요'],
    ['기준예요', '기준이에요'],
    ['명분예요', '명분이에요'],
    ['장면예요', '장면이에요'],
    ['외상예요', '외상이에요'],
    ['타입예요', '타입이에요'],
    // `에요` 로 잘못 쓴 자리도 같은 규칙이다.
    ['지출에요', '지출이에요'],
  ]) {
    assert.equal(fixCopulaSpelling(given), want, `${given} 교정 실패`)
  }
})

test('받침이 없으면 그대로 둔다', () => {
  // 옳은 형태를 건드리면 멀쩡한 문장이 틀린 문장이 된다.
  for (const kept of ['거예요', '수예요', '구조예요', '후보예요', '풀이예요', '차이예요']) {
    assert.equal(fixCopulaSpelling(kept), kept, `${kept} 를 건드렸다`)
  }
})

test('홀로 선 이예요와 아니예요를 고친다', () => {
  assert.equal(fixCopulaSpelling('이예요'), '이에요')
  assert.equal(fixCopulaSpelling('아니예요'), '아니에요')
})

test('문장 안에서도 해당 자리만 고친다', () => {
  const given = '수입 통로는 월급형예요. 새는 곳은 관계와 정산이고, 그건 이유가 아니라 핑계예요.'
  const want = '수입 통로는 월급형이에요. 새는 곳은 관계와 정산이고, 그건 이유가 아니라 핑계예요.'
  assert.equal(fixCopulaSpelling(given), want)
})

test('빈 값과 비문자열을 안전하게 다룬다', () => {
  assert.equal(fixCopulaSpelling(''), '')
  assert.equal(fixCopulaSpelling(undefined as unknown as string), '')
})
