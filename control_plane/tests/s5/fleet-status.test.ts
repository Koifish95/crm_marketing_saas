import { describe, expect, it, vi } from 'vitest'
import {
  FLEET_STATUS_KEY,
  fleetStatusCachedData,
  pollFleetUntilHealthy,
  shouldReuseFleetStatusCache,
} from '../../shared/utils/fleet'

describe('fleet status fetch reuse', () => {
  it('uses a stable key so pages share GET /api/status', () => {
    expect(FLEET_STATUS_KEY).toBe('fleet-status')
  })

  it('reuses payload only on the initial load, not on Refresh', () => {
    expect(shouldReuseFleetStatusCache('initial')).toBe(true)
    expect(shouldReuseFleetStatusCache('refresh:manual')).toBe(false)
    expect(shouldReuseFleetStatusCache('refresh:hook')).toBe(false)
    expect(shouldReuseFleetStatusCache('watch')).toBe(false)
    expect(shouldReuseFleetStatusCache()).toBe(false)
  })

  it('prefers payload data, then static data, for Refresh-except reuse', () => {
    const payload = { [FLEET_STATUS_KEY]: { checkedAt: 'payload' } }
    const staticData = { [FLEET_STATUS_KEY]: { checkedAt: 'static' } }
    expect(fleetStatusCachedData(FLEET_STATUS_KEY, payload, staticData)).toEqual({ checkedAt: 'payload' })
    expect(fleetStatusCachedData(FLEET_STATUS_KEY, undefined, staticData)).toEqual({ checkedAt: 'static' })
    expect(fleetStatusCachedData(FLEET_STATUS_KEY, {}, {})).toBeUndefined()
  })

  it('polls until healthy and stops on timeout', async () => {
    let healthy = false
    const refresh = vi.fn(async () => {
      healthy = true
    })
    await expect(pollFleetUntilHealthy({
      isHealthy: () => healthy,
      refresh,
      sleep: async () => {},
      attempts: 2,
      delayMs: 0,
    })).resolves.toBe('healthy')
    expect(refresh).toHaveBeenCalledTimes(1)

    const idle = vi.fn(async () => {})
    await expect(pollFleetUntilHealthy({
      isHealthy: () => false,
      refresh: idle,
      sleep: async () => {},
      attempts: 2,
      delayMs: 0,
    })).resolves.toBe('timeout')
    expect(idle).toHaveBeenCalledTimes(2)
  })
})
