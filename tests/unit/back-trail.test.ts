import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import vm from 'node:vm'

/**
 * 2026-10-08 상단 뒤로 가기 경로. 마이페이지에서 들어간 화면에서 뒤로 가면 마이페이지로 돌아와야 한다.
 * service-shell.js 를 셸 호스트 없이 실행하면 경로 규칙(window.UMSHBackTrail)만 만들고 끝난다.
 */
const source = readFileSync(new URL('../../사주/js/service-shell.js', import.meta.url), 'utf8')
const win: any = { location: { pathname: '/', search: '' }, UMSHLoading: {} } // 로딩 오버레이 주입은 건너뛴다
vm.runInNewContext(source, { window: win, document: { querySelector: () => null, head: null, documentElement: null } })
const { create } = win.UMSHBackTrail

function memoryStorage(initial?: string) {
  const data = new Map<string, string>(initial ? [['umsh-back-trail', initial]] : [])
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, dump: () => JSON.parse(data.get('umsh-back-trail') || '[]') }
}
const at = (href: string) => { const u = new URL(href, 'https://umsh.kr'); return { pathname: u.pathname, search: u.search } }

/** 사용자가 화면을 차례로 연다. 각 화면이 열릴 때 기록된다. */
function visit(trail: any, ...paths: string[]) { for (const p of paths) trail.record(at(p)) }

describe('상단 뒤로 가기 경로', () => {
  it('마이페이지 → 결제 내역에서 뒤로 가면 마이페이지', () => {
    const trail = create(memoryStorage())
    visit(trail, '/', '/my', '/orders')
    assert.equal(trail.target(at('/orders')), '/my')
  })

  it('마이페이지에서 여러 화면을 오가도 매번 마이페이지로 돌아온다', () => {
    const s = memoryStorage(); const trail = create(s)
    for (const child of ['/coupons.html', '/refunds', '/notices', '/inquiries', '/profile', '/faq']) {
      visit(trail, '/my', child)
      assert.equal(trail.target(at(child)), '/my', child)
      visit(trail, '/my') // 뒤로 돌아옴
    }
    assert.deepEqual(s.dump(), ['/my'])
  })

  it('두 단계 들어갔다가 두 번 뒤로', () => {
    const trail = create(memoryStorage())
    visit(trail, '/my', '/orders', '/love/this-year/06-step-6_1-report-detail/index.html')
    assert.equal(trail.target(at('/love/this-year/06-step-6_1-report-detail/index.html')), '/orders')
    visit(trail, '/orders')
    assert.equal(trail.target(at('/orders')), '/my')
  })

  it('새로고침은 기록을 늘리지 않는다', () => {
    const s = memoryStorage(); const trail = create(s)
    visit(trail, '/my', '/orders', '/orders', '/orders')
    assert.deepEqual(s.dump(), ['/my', '/orders'])
    assert.equal(trail.target(at('/orders')), '/my')
  })

  it('같은 화면의 .html·index.html·끝 / 주소를 같은 화면으로 본다', () => {
    const trail = create(memoryStorage())
    visit(trail, '/my.html', '/coupons.html')
    assert.equal(trail.target(at('/coupons')), '/my')
  })

  it('주소의 쿼리까지 기억한다(결과 화면 등으로 정확히 돌아감)', () => {
    const trail = create(memoryStorage())
    visit(trail, '/vault?tab=love', '/report-view?id=r1')
    assert.equal(trail.target(at('/report-view?id=r1')), '/vault?tab=love')
  })

  describe('예외', () => {
    it('바로 들어온 마이페이지 하위 화면(공유 링크·푸시)은 마이페이지로', () => {
      const trail = create(memoryStorage())
      visit(trail, '/inquiries')
      assert.equal(trail.target(at('/inquiries')), '/my')
    })

    it('바로 들어온 일반 화면은 홈으로', () => {
      const trail = create(memoryStorage())
      visit(trail, '/love/this-year/01-step-1-story/index.html')
      assert.equal(trail.target(at('/love/this-year/01-step-1-story/index.html')), '/')
    })

    it('로그인을 거쳐 돌아와도 로그인 화면으로 되돌아가지 않는다', () => {
      const trail = create(memoryStorage())
      visit(trail, '/my', '/orders', '/signup', '/orders')
      assert.equal(trail.target(at('/orders')), '/my')
    })

    it('결제 결과에서 뒤로 가면 결제창이 아니라 결제를 시작한 서비스 화면', () => {
      const trail = create(memoryStorage())
      visit(trail, '/love/this-year/04-step-4-report/index.html', '/payment', '/payment/result?orderId=o1')
      assert.equal(trail.target(at('/payment/result?orderId=o1')), '/love/this-year/04-step-4-report')
    })

    it('저장소를 못 쓰면(사생활 보호 모드) 상위 화면 규칙만 쓴다', () => {
      const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
      const trail = create(broken)
      assert.doesNotThrow(() => visit(trail, '/my', '/orders'))
      assert.equal(trail.target(at('/orders')), '/my')
      assert.equal(trail.target(at('/search')), '/')
    })

    it('저장된 값이 망가져 있어도 동작한다', () => {
      const trail = create(memoryStorage('{"not":"a list"'))
      visit(trail, '/my', '/refunds')
      assert.equal(trail.target(at('/refunds')), '/my')
      const trail2 = create(memoryStorage(JSON.stringify(['javascript:alert(1)', 'https://evil.example', '/my'])))
      visit(trail2, '/refunds')
      assert.equal(trail2.target(at('/refunds')), '/my')
    })

    it('기록은 20개까지만 남긴다', () => {
      const s = memoryStorage(); const trail = create(s)
      for (let i = 0; i < 30; i++) visit(trail, `/report-view?id=${i}`)
      assert.equal(s.dump().length, 20)
    })

    it('하단 탭 이동도 뒤로 가기로 되돌아간다(MY → 보관함 → 뒤로 = MY)', () => {
      const trail = create(memoryStorage())
      visit(trail, '/my', '/vault')
      assert.equal(trail.target(at('/vault')), '/my')
    })
  })
})

describe('상단 뒤로 가기 버튼 연결', () => {
  it('버튼 이름이 "뒤로 가기"이고 무조건 홈으로 가지 않는다', () => {
    assert.match(source, /data-shell-back aria-label="뒤로 가기"/)
    assert.doesNotMatch(source, /data-shell-back[^]*?navigate\('\/'\);\s*\}, true\)/)
    assert.match(source, /backTrail\.target\(window\.location\)/)
  })
  it('공용 크롬이 새 셸 스크립트 버전을 싣는다(캐시 갱신)', () => {
    const chrome = readFileSync(new URL('../../사주/js/umsh-chrome.js', import.meta.url), 'utf8')
    assert.match(chrome, /service-shell\.js\?v=20261008-inline-back/)
  })
})
