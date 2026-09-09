import { describe, expect, it } from 'vitest'
import { findById, groupCustomers, groupNodes, type FleetEnvironment } from '../../shared/utils/fleet'

function env(partial: Partial<FleetEnvironment> & Pick<FleetEnvironment, 'id' | 'status' | 'type'>): FleetEnvironment {
  return {
    headline: `${partial.customer?.displayName || 'Acme'} · ${partial.type}`,
    displayName: partial.type,
    slug: partial.slug || `acme-${partial.type.toLowerCase()}`,
    containerName: 'x-app',
    composeFile: 'docker-compose.provisioned.yml',
    envFileLocal: 'data/provisioned/x.env',
    envFileExample: 'data/provisioned/x.env',
    healthUrl: 'http://127.0.0.1:52200/api/health',
    accessUrl: 'http://localhost:52200',
    expectedImage: 'martial-arts-acquisition:s4',
    sqliteVolume: 'x-sqlite',
    assetsVolume: 'x-assets',
    isolationMarker: 'x-isolation',
    runtime: 'running',
    healthOk: partial.status === 'healthy',
    customer: {
      id: 'cust-1',
      slug: 'acme',
      displayName: 'Acme BJJ',
      timezone: 'America/Denver',
      adminEmail: 'admin@acme.local',
    },
    node: {
      id: 'node-1',
      name: 'laptop',
      kind: 'laptop',
      driver: 'local-docker',
    },
    ...partial,
  }
}

describe('workspace lookup', () => {
  const rows = [
    env({ id: 'env-prod', status: 'healthy', type: 'PROD' }),
    env({
      id: 'env-si',
      status: 'stopped',
      type: 'DEV',
      customer: {
        id: 'cust-2',
        slug: 'strategic-insights',
        displayName: 'Strategic Insights Consulting, LLC',
        timezone: 'America/Denver',
        adminEmail: 'admin@si.local',
      },
    }),
  ]
  const summaryCustomers = groupCustomers(rows)
  const summaryNodes = groupNodes(rows)

  it('finds customer, environment, and node by stable id', () => {
    expect(findById(summaryCustomers, 'cust-2')?.displayName).toBe('Strategic Insights Consulting, LLC')
    expect(findById(rows, 'env-prod')?.type).toBe('PROD')
    expect(findById(summaryNodes, 'node-1')?.name).toBe('laptop')
  })

  it('returns null when the registry has no matching id', () => {
    expect(findById(summaryCustomers, 'missing')).toBeNull()
    expect(findById(rows, 'missing')).toBeNull()
    expect(findById(summaryNodes, 'missing')).toBeNull()
  })
})
