import { describe, expect, it } from 'vitest'
import { LISTEN_HOST, LISTEN_PORT, listenAddress } from '../../shared/utils/listen'

describe('control plane listen', () => {
  it('binds localhost 52100', () => {
    expect(LISTEN_HOST).toBe('127.0.0.1')
    expect(LISTEN_PORT).toBe(52100)
    expect(listenAddress()).toBe('http://127.0.0.1:52100')
  })
})
