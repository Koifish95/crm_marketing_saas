import { describe, expect, it, vi } from 'vitest'
import { createClientId, isClientId } from '../../shared/utils/id'

describe('createClientId', () => {
  it('returns a UUID when crypto.randomUUID exists', () => {
    const id = createClientId()
    expect(isClientId(id)).toBe(true)
  })

  it('still returns a UUID when randomUUID is missing (HTTP insecure context)', () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', {
      getRandomValues: original.getRandomValues.bind(original),
    })
    try {
      const id = createClientId()
      expect(isClientId(id)).toBe(true)
      expect(id).not.toBe(createClientId())
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
