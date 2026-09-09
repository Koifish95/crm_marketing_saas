import { describe, expect, it } from 'vitest'
import {
  clearLoginThrottleForTests,
  isLoginThrottled,
  loginThrottleKey,
  recordLoginFailure,
  resetLoginThrottle,
  THROTTLE_AFTER_FAILURES,
} from '../../server/services/login-throttle'

describe('M7 login throttling', () => {
  it('progressively blocks a key after repeated failures and resets on success', () => {
    clearLoginThrottleForTests()
    const key = loginThrottleKey('127.0.0.1', 'staff@example.com')
    const now = 1_000_000
    for (let i = 0; i < THROTTLE_AFTER_FAILURES; i += 1) {
      recordLoginFailure(key, now)
    }
    expect(isLoginThrottled(key, now)).toBe(false)
    recordLoginFailure(key, now)
    expect(isLoginThrottled(key, now)).toBe(true)
    expect(isLoginThrottled(key, now + 500)).toBe(true)
    expect(isLoginThrottled(key, now + 120_000)).toBe(false)
    resetLoginThrottle(key)
    expect(isLoginThrottled(key, now)).toBe(false)
  })

  it('uses the same keying for unknown and known emails so existence is not leaked', () => {
    expect(loginThrottleKey('10.0.0.1', 'missing@example.com')).toContain('missing@example.com')
    expect(loginThrottleKey('10.0.0.1', 'admin@local')).toContain('admin@local')
  })
})
