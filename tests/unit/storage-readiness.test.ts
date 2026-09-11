import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  assertDurableStorage,
  isProductionRuntime,
  storageReadiness,
} from '../../src/payment/storage-readiness.js'
import { checkPaymentStorageReadiness, savePaymentOrder } from '../../src/payment/order-store.js'
import { checkUserProfileStorageReadiness } from '../../src/user/profile-store.js'

const previous = { VERCEL_ENV: process.env.VERCEL_ENV, NODE_ENV: process.env.NODE_ENV }

function withEnv(values: Record<string, string | undefined>, run: () => void): void {
  const restore: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(values)) {
    restore[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    run()
  } finally {
    for (const [key, value] of Object.entries(restore)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

afterEach(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('[TASK] 저장소 영속성 게이트 (U20)', () => {
  describe('보안', () => {
    it('운영에서 비영속 저장소는 쓰기를 막는다', () => {
      // 설정이 빠지면 `storageMode()` 가 조용히 memory 로 떨어진다. 서버리스에서
      // 그것은 다음 요청에서 사라진다 — 결제는 받았는데 주문 기록이 없는 상태다.
      withEnv({ VERCEL_ENV: 'production' }, () => {
        const readiness = storageReadiness('memory')
        assert.equal(readiness.durable, false)
        assert.equal(readiness.ok, false)
        assert.equal(readiness.errorCode, 'STORAGE_NOT_DURABLE')
        assert.throws(() => assertDurableStorage('결제 주문', readiness), /사용할 수 없습니다/)
      })
    })

    it('막는 메시지가 환경변수 이름을 노출하지 않는다', () => {
      // 이 오류는 고객 응답까지 올라갈 수 있다.
      withEnv({ VERCEL_ENV: 'production' }, () => {
        try {
          assertDurableStorage('결제 주문', storageReadiness('memory'))
          assert.fail('막지 않았다')
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          for (const leak of ['DATABASE_URL', 'SUPABASE', 'SERVICE_ROLE', 'memory']) {
            assert.ok(!message.includes(leak), `메시지에 ${leak} 가 노출됐다`)
          }
        }
      })
    })

    it('운영에서 주문 저장이 실제로 거부된다', async () => {
      // 판정만 있고 쓰기 경로가 그것을 보지 않으면 아무것도 막지 못한다.
      assert.equal(checkPaymentStorageReadiness().mode, 'memory', '이 검사는 메모리 모드에서만 의미가 있다')
      process.env.VERCEL_ENV = 'production'
      await assert.rejects(
        () => savePaymentOrder({
          orderId: 'gate-check', ownerId: 'owner-gate',
          buyerEmail: 'buyer@synthetic.invalid', buyerTel: '00000000000',
          productKey: 'wedding_day', productTitle: '결혼 택일', amount: 24900,
          status: 'ready', createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z',
        }),
        /사용할 수 없습니다/,
      )
    })

    it('키가 빠진 supabase 모드도 막는다', () => {
      const readiness = storageReadiness('supabase', true)
      assert.equal(readiness.durable, true, '영속 저장소이긴 하다')
      assert.equal(readiness.ok, false)
      assert.equal(readiness.errorCode, 'STORAGE_KEY_MISSING')
    })
  })

  describe('정상 동작', () => {
    it('개발·테스트에서는 메모리 저장소를 허용한다', () => {
      // 여기서 막으면 로컬 개발과 테스트가 불가능하다.
      withEnv({ VERCEL_ENV: undefined, NODE_ENV: 'test' }, () => {
        const readiness = storageReadiness('memory')
        assert.equal(readiness.ok, true)
        assert.doesNotThrow(() => assertDurableStorage('결제 주문', readiness))
      })
    })

    it('Preview 는 운영이 아니다', () => {
      // Preview 에서 막으면 검수를 할 수 없다.
      withEnv({ VERCEL_ENV: 'preview' }, () => {
        assert.equal(isProductionRuntime(), false)
        assert.equal(storageReadiness('memory').ok, true)
      })
    })

    it('영속 저장소는 통과한다', () => {
      withEnv({ VERCEL_ENV: 'production' }, () => {
        for (const mode of ['postgres', 'supabase', 'file'] as const) {
          const readiness = storageReadiness(mode)
          assert.equal(readiness.durable, true, mode)
          assert.equal(readiness.ok, true, mode)
          assert.doesNotThrow(() => assertDurableStorage('결제 주문', readiness))
        }
      })
    })

    it('주문·프로필 저장소가 판정을 제공한다', () => {
      // `report-store` 에만 있던 판정이다. 없으면 `/api/health` 가 상태를 알려줄 수 없다.
      for (const readiness of [checkPaymentStorageReadiness(), checkUserProfileStorageReadiness()]) {
        assert.ok(['postgres', 'supabase', 'memory', 'file'].includes(readiness.mode))
        assert.equal(typeof readiness.durable, 'boolean')
        assert.equal(typeof readiness.ok, 'boolean')
      }
    })
  })

  describe('경계값', () => {
    it('`VERCEL_ENV` 가 있으면 `NODE_ENV` 보다 우선한다', () => {
      // Vercel Preview 는 `NODE_ENV=production` 으로 돈다. 그것만 보면 Preview 를
      // 운영으로 오판해 검수가 막힌다.
      withEnv({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }, () => {
        assert.equal(isProductionRuntime(), false)
      })
      withEnv({ VERCEL_ENV: 'production', NODE_ENV: 'development' }, () => {
        assert.equal(isProductionRuntime(), true)
      })
    })

    it('공백만 있는 `VERCEL_ENV` 는 없는 것으로 본다', () => {
      withEnv({ VERCEL_ENV: '   ', NODE_ENV: 'production' }, () => {
        assert.equal(isProductionRuntime(), true)
      })
    })
  })
})
