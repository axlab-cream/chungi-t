export function assertRequestedPrefixComplete(input: {
  firstFailureIndex: number
  completedInRequestedPrefix: number
  requestedPrefixSize: number
}): void {
  if (input.firstFailureIndex >= 0) return
  if (input.completedInRequestedPrefix !== input.requestedPrefixSize) {
    throw new Error('A no-failure run must complete every section in the requested prefix')
  }
}
