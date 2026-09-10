import { describe, expect, it } from 'vitest'
import { assertRegisteredHealthUrl, combineStatus, parseHealthBody } from '../../server/services/health'

const registered = [
  'http://127.0.0.1:52040/api/health',
  'http://127.0.0.1:52050/api/health',
] as const

describe('health combine', () => {
  it('probes only registered loopback URLs', () => {
    expect(() => assertRegisteredHealthUrl(registered[0], registered)).not.toThrow()
    expect(() => assertRegisteredHealthUrl('http://127.0.0.1:5000/api/health', registered)).toThrow(/registered/i)
    expect(() => assertRegisteredHealthUrl('https://app.renzogracieutah.com/api/health', registered)).toThrow()
  })

  it('requires ok and reachable database', () => {
    expect(parseHealthBody(200, { ok: true, database: 'reachable' }).ok).toBe(true)
    expect(parseHealthBody(200, { ok: true, database: 'down' }).ok).toBe(false)
    expect(parseHealthBody(500, { ok: true, database: 'reachable' }).ok).toBe(false)
  })

  it('combines runtime and health', () => {
    expect(combineStatus('running', true)).toBe('healthy')
    expect(combineStatus('running', false)).toBe('unhealthy')
    expect(combineStatus('stopped', null)).toBe('stopped')
    expect(combineStatus('missing', null)).toBe('missing')
    expect(combineStatus('unknown', null)).toBe('unknown')
  })
})
