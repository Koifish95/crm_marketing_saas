import { describe, expect, it } from 'vitest'
import {
  FALLBACK_PORTS,
  FORBIDDEN_PORT,
  PREFERRED_PORT,
  isForbiddenPort,
  parseListeningPids,
  readNuxtLockPid,
} from '../scripts/listen-port.mjs'

describe('listen port helpers', () => {
  it('never treats Docker host ports or 3000 as allowed and keeps 5030 then 5031–5035', () => {
    expect(PREFERRED_PORT).toBe(5030)
    expect(FALLBACK_PORTS).toEqual([5031, 5032, 5033, 5034, 5035])
    expect(isForbiddenPort(FORBIDDEN_PORT)).toBe(true)
    expect(isForbiddenPort(3000)).toBe(true)
    expect(isForbiddenPort(5000)).toBe(true)
    expect(isForbiddenPort(5010)).toBe(true)
    expect(isForbiddenPort(5020)).toBe(true)
    expect(isForbiddenPort(5030)).toBe(false)
    expect(FALLBACK_PORTS).not.toContain(3000)
    expect(FALLBACK_PORTS).not.toContain(5000)
  })

  it('parses Windows LISTENING pids for the exact port only', () => {
    const output = [
      'TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       23840',
      'TCP    [::]:5000              [::]:0                 LISTENING       23840',
      'TCP    0.0.0.0:50000          0.0.0.0:0              LISTENING       99',
      'TCP    127.0.0.1:5000         127.0.0.1:54321        ESTABLISHED     12',
    ].join('\n')
    expect(parseListeningPids(output, 5000)).toEqual([23840])
  })

  it('reads the Nuxt lock pid', () => {
    expect(readNuxtLockPid('{"pid":26120,"command":"dev","port":5000}')).toBe(26120)
    expect(readNuxtLockPid('not-json')).toBeNull()
  })
})
