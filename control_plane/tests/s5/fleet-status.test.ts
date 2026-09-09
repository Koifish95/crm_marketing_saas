import { describe, expect, it } from 'vitest'
import { FLEET_STATUS_KEY, fleetStatusCachedData } from '../../shared/utils/fleet'

describe('fleet status fetch reuse', () => {
  it('uses a stable key so pages share GET /api/status', () => {
    expect(FLEET_STATUS_KEY).toBe('fleet-status')
  })

  it('prefers payload data, then static data, for Refresh-except reuse', () => {
    const payload = { [FLEET_STATUS_KEY]: { checkedAt: 'payload' } }
    const staticData = { [FLEET_STATUS_KEY]: { checkedAt: 'static' } }
    expect(fleetStatusCachedData(FLEET_STATUS_KEY, payload, staticData)).toEqual({ checkedAt: 'payload' })
    expect(fleetStatusCachedData(FLEET_STATUS_KEY, undefined, staticData)).toEqual({ checkedAt: 'static' })
    expect(fleetStatusCachedData(FLEET_STATUS_KEY, {}, {})).toBeUndefined()
  })
})
