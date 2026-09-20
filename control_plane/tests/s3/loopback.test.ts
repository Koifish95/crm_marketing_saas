import { describe, expect, it } from 'vitest'
import { isLoopbackAddress, isLoopbackConnection, normalizeIp } from '../../shared/utils/loopback'

describe('control plane loopback', () => {
  it('accepts IPv4, localhost, and IPv6 loopback forms', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('127.0.0.2')).toBe(true)
    expect(isLoopbackAddress('localhost')).toBe(true)
    expect(isLoopbackAddress('::1')).toBe(true)
    expect(isLoopbackAddress('[::1]')).toBe(true)
    expect(isLoopbackAddress('::1%1')).toBe(true)
    expect(isLoopbackAddress('0:0:0:0:0:0:0:1')).toBe(true)
  })

  it('accepts Windows IPv4-mapped IPv6 loopback, including uppercase', () => {
    expect(normalizeIp('::FFFF:127.0.0.1')).toBe('127.0.0.1')
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('::FFFF:127.0.0.1')).toBe(true)
    expect(isLoopbackAddress('::ffff:7f00:1')).toBe(true)
    expect(isLoopbackConnection({ remoteAddress: '::FFFF:127.0.0.1' })).toBe(true)
  })

  it('refuses non-loopback peers and empty addresses', () => {
    expect(isLoopbackAddress(undefined)).toBe(false)
    expect(isLoopbackAddress('')).toBe(false)
    expect(isLoopbackAddress('192.168.0.13')).toBe(false)
    expect(isLoopbackAddress('8.8.8.8')).toBe(false)
    expect(isLoopbackAddress('::ffff:8.8.8.8')).toBe(false)
    expect(isLoopbackConnection({ remoteAddress: '10.0.0.4' })).toBe(false)
  })

  it('trusts loopback forwarded headers only when the TCP peer is missing', () => {
    expect(isLoopbackConnection({
      remoteAddress: undefined,
      forwardedFor: '127.0.0.1',
    })).toBe(true)
    expect(isLoopbackConnection({
      remoteAddress: undefined,
      realIp: '::1',
    })).toBe(true)
    expect(isLoopbackConnection({
      remoteAddress: '8.8.8.8',
      forwardedFor: '127.0.0.1',
    })).toBe(false)
    expect(isLoopbackConnection({
      remoteAddress: undefined,
      forwardedFor: '8.8.8.8',
    })).toBe(false)
    expect(isLoopbackConnection({
      remoteAddress: undefined,
      forwardedFor: '127.0.0.1, 8.8.8.8',
    })).toBe(true)
    expect(isLoopbackConnection({})).toBe(false)
  })
})
