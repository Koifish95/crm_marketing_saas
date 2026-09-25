import { createServer } from 'node:http'
import { Socket } from 'node:net'
import { createApp, eventHandler, toNodeListener } from 'h3'
import { fetchNodeRequestHandler } from 'node-mock-http'
import { describe, expect, it } from 'vitest'
import { isLoopbackAddress, isLoopbackConnection, isNitroInProcessSocket, normalizeIp } from '../../shared/utils/loopback'

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

  it('accepts Nitro in-process sockets and still rejects a missing or spoofed peer', () => {
    expect(isNitroInProcessSocket(undefined)).toBe(false)
    expect(isNitroInProcessSocket(null)).toBe(false)
    expect(isNitroInProcessSocket({})).toBe(false)
    const tcpPeer = new Socket()
    Object.defineProperty(tcpPeer, 'remoteAddress', { value: '8.8.8.8' })
    Object.assign(tcpPeer, { __unenv__: {} })
    expect(isNitroInProcessSocket(tcpPeer)).toBe(false)
    expect(isLoopbackConnection({
      remoteAddress: tcpPeer.remoteAddress,
      forwardedFor: '127.0.0.1',
    })).toBe(false)
  })

  it('allows a Nitro localFetch SSR call and a real loopback TCP peer', async () => {
    const app = createApp()
    app.use(eventHandler((event) => {
      const socket = event.node.req.socket
      const forwardedFor = event.node.req.headers['x-forwarded-for']
      const realIp = event.node.req.headers['x-real-ip']
      const allowed = isNitroInProcessSocket(socket) || isLoopbackConnection({
        remoteAddress: socket?.remoteAddress,
        forwardedFor: Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor,
        realIp: Array.isArray(realIp) ? realIp[0] : realIp,
      })
      if (!allowed) {
        event.node.res.statusCode = 403
        return { ok: false }
      }
      return { ok: true }
    }))
    const handler = toNodeListener(app)

    const local = await fetchNodeRequestHandler(handler, '/api/status')
    expect(local.status).toBe(200)
    expect(await local.json()).toEqual({ ok: true })

    const server = createServer(handler)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    try {
      const address = server.address()
      if (!address || typeof address === 'string') {
        throw new Error('expected a TCP port')
      }
      const response = await fetch(`http://127.0.0.1:${address.port}/api/status`)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ ok: true })
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
      })
    }
  })
})
