import { describe, expect, it } from 'vitest'
import { PREFERRED_PORT, FORBIDDEN_PORTS, isForbiddenPort } from '../../scripts/listen-port.mjs'

describe('Sales listen port', () => {
  it('prefers 5040 and forbids MA and Docker ports', () => {
    expect(PREFERRED_PORT).toBe(5040)
    expect(FORBIDDEN_PORTS).toEqual([3000, 5000, 5010, 5020, 5030])
    expect(isForbiddenPort(5030)).toBe(true)
    expect(isForbiddenPort(5040)).toBe(false)
  })
})
