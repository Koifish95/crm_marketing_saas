import { Socket } from 'node:net'

export function firstForwardedFor(header: string | undefined | null): string | undefined {
  const first = (header || '').split(',')[0]?.trim()
  return first || undefined
}

export function normalizeIp(address: string | undefined | null): string {
  let value = (address || '').trim().toLowerCase()
  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1)
  }
  const zone = value.indexOf('%')
  if (zone >= 0) {
    value = value.slice(0, zone)
  }
  if (value.startsWith('::ffff:')) {
    value = value.slice('::ffff:'.length)
  }
  return value
}

function isIpv4Loopback(value: string) {
  const parts = value.split('.')
  if (parts.length !== 4) {
    return false
  }
  const octets = parts.map(part => Number.parseInt(part, 10))
  if (octets.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }
  return octets[0] === 127
}

export function isLoopbackAddress(address: string | undefined | null): boolean {
  const value = normalizeIp(address)
  if (!value) {
    return false
  }
  if (value === 'localhost' || value === '::1' || value === '0:0:0:0:0:0:0:1') {
    return true
  }
  if (value === '7f00:1') {
    return true
  }
  return isIpv4Loopback(value)
}

export function isLoopbackConnection(input: {
  remoteAddress?: string | null
  forwardedFor?: string | null
  realIp?: string | null
}): boolean {
  if (isLoopbackAddress(input.remoteAddress)) {
    return true
  }
  if (normalizeIp(input.remoteAddress)) {
    return false
  }
  return isLoopbackAddress(firstForwardedFor(input.forwardedFor))
    || isLoopbackAddress(input.realIp)
}

/**
 * Nitro SSR calls same-origin routes through `node-mock-http`, which builds an
 * unenv socket with an empty remoteAddress. A real TCP peer is always `node:net.Socket`.
 * Missing sockets and plain objects are not this path.
 */
export function isNitroInProcessSocket(socket: object | null | undefined): boolean {
  if (!socket || socket instanceof Socket) {
    return false
  }
  const marker = (socket as { __unenv__?: unknown }).__unenv__
  return marker !== null && typeof marker === 'object'
}
