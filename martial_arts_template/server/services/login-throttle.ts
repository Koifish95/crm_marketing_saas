const buckets = new Map<string, { failures: number, blockedUntil: number }>()

export const THROTTLE_AFTER_FAILURES = 5

export function loginThrottleKey(ip: string | null | undefined, email: string) {
  return `${ip || 'unknown'}::${email}`
}

export function isLoginThrottled(key: string, nowMs = Date.now()) {
  const bucket = buckets.get(key)
  if (!bucket) {
    return false
  }
  return bucket.blockedUntil > nowMs
}

export function recordLoginFailure(key: string, nowMs = Date.now()) {
  const current = buckets.get(key) ?? { failures: 0, blockedUntil: 0 }
  const failures = current.failures + 1
  const extra = Math.max(0, failures - THROTTLE_AFTER_FAILURES)
  const delayMs = extra === 0 ? 0 : Math.min(60_000, 1000 * (2 ** Math.min(extra, 5)))
  buckets.set(key, {
    failures,
    blockedUntil: delayMs ? nowMs + delayMs : 0,
  })
  return { failures, blockedUntil: delayMs ? nowMs + delayMs : 0 }
}

export function resetLoginThrottle(key: string) {
  buckets.delete(key)
}

export function clearLoginThrottleForTests() {
  buckets.clear()
}
