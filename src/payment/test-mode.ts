import '../env/load.js'

export function isPaymentTestMode(): boolean {
  const enabled = ['1', 'true', 'yes'].includes((process.env.PAYMENT_TEST_MODE ?? '').trim().toLowerCase())
  return enabled && process.env.NODE_ENV !== 'production'
}
