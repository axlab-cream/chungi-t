import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// 2026-10-15 요청: 목록 선택 처리(체크박스·전체 선택)와 실행 전 경고 팝업. 브라우저 동작은 로컬 QA 스크립트로 확인했고,
// 여기서는 화면마다 연결이 빠지거나 법정 보관 목록에 잘못 붙지 않았는지 지킨다.
const html = readFileSync(new URL('../../admin-ui/index.html', import.meta.url), 'utf8')
const helper = html.slice(html.indexOf('      function adminBulkSelect('), html.indexOf('       * 브라우저 확인 창 대신 쓰는 확인 팝업.'))

test('실행 전에는 항상 경고 팝업을 띄우고, 삭제는 "삭제"를 입력해야 버튼이 켜진다', () => {
  assert.match(helper, /openAdminModal\(\{ title: '정말 ' \+ opts\.verb \+ '할까요\?'/)
  assert.match(helper, /admin-confirm-warn/)
  assert.match(helper, /submit\.disabled = typed\.value\.trim\(\) !== '삭제'/)
  assert.match(helper, /typed\.value\.trim\(\) !== '삭제'\)\) return;/, '입력 없이 눌러도 실행되지 않는다')
})

test('전체 선택은 바꿀 값을 먼저 잡아 두고, 숨은 줄·고를 수 없는 줄은 건너뛴다', () => {
  assert.match(helper, /var target = all\.checked;/)
  assert.match(helper, /!box\.disabled && !box\.closest\('tr'\)\.hidden/)
})

test('체크박스 열은 정렬 대상이 아니다', () => {
  assert.match(html, /th\.hasAttribute\('data-select'\)\) return;/)
})

test('화면마다 이미 있는 동작으로 묶는다', () => {
  for (const [key, verb, endpoint] of [
    ['members', '삭제', "'/api/admin/v1/members/' + encodeURIComponent(item.id), { method: 'DELETE'"],
    ['coupons', '사용 중단', "'/disable'"],
    ['popups', '내리기', "'/archive'"],
    ['content', '삭제', "'/archive'"],
    ['push-scheduled', '예약 취소', "'/cancel'"],
  ]) {
    const at = html.indexOf(`adminBulkSelect({ key: '${key}'`)
    assert.ok(at > 0, key)
    const block = html.slice(at, html.indexOf('rerender:', at))
    assert.ok(block.includes(`verb: '${verb}'`), key + ' verb')
    assert.ok(block.includes(endpoint), key + ' endpoint')
  }
  assert.match(html, /adminBulkSelect\(\{ key: 'members'[^]*?typed: true/, '회원 삭제는 입력 확인까지 받는다')
  assert.match(html, /purchaseCount > 0 \? '결제 기록이 있어 삭제할 수 없습니다/, '결제 회원은 고를 수 없다')
})

test('결제·환불·변경 이력에는 붙이지 않는다(법정 보관)', () => {
  for (const name of ['loadPaymentsHistory', 'loadRefundsQueue', 'loadLiveAudit']) {
    const at = html.indexOf(`async function ${name}(`)
    const end = html.indexOf('\n      async function ', at + 10)
    assert.ok(at > 0, name)
    assert.doesNotMatch(html.slice(at, end), /adminBulkSelect/, name)
  }
})
