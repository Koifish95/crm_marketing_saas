import { describe, expect, it } from 'vitest'
import {
  CSRF_REJECTED_MESSAGE,
  assertMutatingOrigin,
  isAllowedUploadType,
  isLoopbackAddress,
  trustedClientIp,
  uploadMaxBytes,
} from '@crm/core/shared/utils/request-security'
import {
  generateInitialAccessPassword,
  isForbiddenBootstrapPassword,
} from '@crm/core/shared/utils/bootstrap-password'

describe('Customer #1 request security', () => {
  it('ignores spoofed x-forwarded-for unless the remote address is a trusted proxy', () => {
    expect(trustedClientIp({
      remoteAddress: '203.0.113.10',
      forwardedFor: '1.2.3.4',
      trustedProxies: [],
    })).toBe('203.0.113.10')
    expect(trustedClientIp({
      remoteAddress: '127.0.0.1',
      forwardedFor: '1.2.3.4',
      trustedProxies: ['127.0.0.1'],
    })).toBe('1.2.3.4')
  })

  it('rejects cross-origin mutating requests and allows same-origin or loopback without origin', () => {
    expect(assertMutatingOrigin({
      method: 'POST',
      origin: 'https://evil.example',
      host: 'academy.example',
      protocol: 'https',
      publicOrigin: 'https://academy.example',
      remoteAddress: '203.0.113.10',
    })).toEqual({ ok: false, statusCode: 403, message: CSRF_REJECTED_MESSAGE })
    expect(assertMutatingOrigin({
      method: 'POST',
      origin: 'https://academy.example',
      host: 'academy.example',
      protocol: 'https',
      publicOrigin: 'https://academy.example',
      remoteAddress: '203.0.113.10',
    }).ok).toBe(true)
    expect(assertMutatingOrigin({
      method: 'POST',
      remoteAddress: '127.0.0.1',
    }).ok).toBe(true)
    expect(assertMutatingOrigin({ method: 'GET', origin: 'https://evil.example' }).ok).toBe(true)
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true)
  })

  it('limits upload size and type', () => {
    expect(uploadMaxBytes()).toBe(20 * 1024 * 1024)
    expect(isAllowedUploadType('image/jpeg')).toBe(true)
    expect(isAllowedUploadType('application/x-msdownload')).toBe(false)
  })

  it('never generates the universal setup password', () => {
    expect(isForbiddenBootstrapPassword('setup')).toBe(true)
    const password = generateInitialAccessPassword()
    expect(password).not.toBe('setup')
    expect(password.startsWith('A')).toBe(true)
    expect(password.endsWith('!')).toBe(true)
  })
})
