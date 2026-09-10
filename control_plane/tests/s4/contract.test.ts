import { describe, expect, it } from 'vitest'
import {
  HOST_PORT_MAX,
  HOST_PORT_MIN,
  PROVISIONED_COMPOSE_FILE,
  PROVISIONED_IMAGE,
  accessUrlForPort,
  allocateHostPorts,
  assertProvisionSlug,
  defaultEnvironmentPair,
  extraEnvironmentNames,
  environmentNames,
  healthUrlForPort,
} from '../../server/services/provision-contract'

describe('S4 provision contract', () => {
  it('accepts strategic-insights and names a unique isolated pair', () => {
    expect(assertProvisionSlug('Strategic-Insights')).toBe('strategic-insights')
    const [prod, dev] = defaultEnvironmentPair('strategic-insights')
    expect(prod.slug).toBe('strategic-insights-prod')
    expect(prod.containerName).toBe('strategic-insights-prod-app')
    expect(prod.sqliteVolume).toBe('strategic-insights-prod-sqlite')
    expect(prod.isolationMarker).toBe('strategic-insights-prod-isolation')
    expect(prod.composeFile).toBe(PROVISIONED_COMPOSE_FILE)
    expect(prod.expectedImage).toBe(PROVISIONED_IMAGE)
    expect(dev.slug).toBe('strategic-insights-dev')
    expect(prod.composeProject).not.toBe(dev.composeProject)
    expect(prod.isolationMarker).not.toMatch(/m10a/)
  })

  it('refuses reserved and malformed slugs', () => {
    expect(() => assertProvisionSlug('lab-acme')).toThrow(/reserved/)
    expect(() => assertProvisionSlug('renzo-prod')).toThrow(/reserved/)
    expect(() => assertProvisionSlug('martial-arts')).toThrow(/reserved/)
    expect(() => assertProvisionSlug('webhosting-renzo')).toThrow(/reserved/)
    expect(() => assertProvisionSlug('RenzoKaysville')).toThrow(/reserved/)
    expect(() => assertProvisionSlug('ab')).toThrow(/Invalid/)
    expect(() => assertProvisionSlug('Strategic Insights')).toThrow(/Invalid/)
  })

  it('allocates unused ports in the laptop provision range', () => {
    expect(allocateHostPorts([52200, 52040, 52100], 2)).toEqual([52201, 52202])
    expect(healthUrlForPort(52210)).toBe('http://127.0.0.1:52210/api/health')
    expect(() => healthUrlForPort(52040)).toThrow(/outside/)
    expect(HOST_PORT_MIN).toBe(52200)
    expect(HOST_PORT_MAX).toBe(52999)
    expect(environmentNames('nova-bjj', 'PROD').assetsVolume).toBe('nova-bjj-prod-assets')
  })

  it('names extra non-PROD environments without colliding with the default pair', () => {
    const extra = extraEnvironmentNames('nova-bjj', 'DEV', 'DEV-JOHN')
    expect(extra.slug).toBe('nova-bjj-dev-john')
    expect(extra.displayName).toBe('DEV-JOHN')
    expect(extra.type).toBe('DEV')
    expect(extra.isolationMarker).toBe('nova-bjj-dev-john-isolation')
    expect(extraEnvironmentNames('nova-bjj', 'STAGE', 'STAGE').slug).toBe('nova-bjj-stage')
    expect(() => extraEnvironmentNames('nova-bjj', 'DEV', 'prod')).toThrow(/non-PROD/)
    expect(() => extraEnvironmentNames('renzo', 'STAGE', 'STAGE')).toThrow(/reserved/)
  })

  it('builds a staff access URL for any positive host port', () => {
    expect(accessUrlForPort(52200)).toBe('http://localhost:52200')
    expect(accessUrlForPort(52040)).toBe('http://localhost:52040')
    expect(() => accessUrlForPort(0)).toThrow(/positive/)
  })
})
