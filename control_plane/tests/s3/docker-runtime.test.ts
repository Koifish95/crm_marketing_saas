import { describe, expect, it } from 'vitest'
import { assertRegisteredContainerName, runtimeFromInspect } from '../../server/services/docker-runtime'

const registered = ['lab-acme-prod-app', 'lab-acme-dev-app'] as const

describe('docker runtime adapter', () => {
  it('inspects only an exact registered container name', () => {
    expect(() => assertRegisteredContainerName('lab-acme-prod-app', registered)).not.toThrow()
    expect(() => assertRegisteredContainerName('lab-acme', registered)).toThrow(/exact registered/i)
    expect(() => assertRegisteredContainerName('renzo-prod-app', registered)).toThrow(/exact registered/i)
    expect(() => assertRegisteredContainerName('lab-acme-prod-app; docker prune', registered)).toThrow()
  })

  it('maps inspect output to running, stopped, missing, or unknown', () => {
    expect(runtimeFromInspect(0, 'true\n', '')).toBe('running')
    expect(runtimeFromInspect(0, 'false\n', '')).toBe('stopped')
    expect(runtimeFromInspect(1, '', 'Error: No such object: lab-acme-prod-app')).toBe('missing')
    expect(runtimeFromInspect(1, '', 'Cannot connect to the Docker daemon')).toBe('unknown')
  })
})
