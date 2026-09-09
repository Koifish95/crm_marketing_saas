import { describe, expect, it } from 'vitest'
import { filterByQuery, groupCustomers, groupNodes, summarizeFleet, worstStatus, type FleetEnvironment } from '../../shared/utils/fleet'

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

describe('fleet grouping', () => {
  it('rolls customer status to the worst environment', () => {
    expect(worstStatus(['healthy', 'stopped'])).toBe('stopped')
    expect(worstStatus(['healthy', 'unhealthy'])).toBe('unhealthy')
    const rows = [
      env({ id: 'p', status: 'healthy', type: 'PROD' }),
      env({ id: 'd', status: 'unhealthy', type: 'DEV' }),
    ]
    const [customer] = groupCustomers(rows)
    expect(customer?.overall).toBe('unhealthy')
    expect(customer?.environmentCount).toBe(2)
    expect(customer?.prod?.id).toBe('p')
  })

  it('summarizes counts and needs-attention without inventing metrics', () => {
    const summary = summarizeFleet([
      env({ id: 'p', status: 'healthy', type: 'PROD' }),
      env({ id: 'd', status: 'unknown', type: 'DEV' }),
    ])
    expect(summary.customerCount).toBe(1)
    expect(summary.nodeCount).toBe(1)
    expect(summary.prodCount).toBe(1)
    expect(summary.devCount).toBe(1)
    expect(summary.healthyCount).toBe(1)
    expect(summary.unknownCount).toBe(1)
    expect(summary.needsAttention.map(row => row.id)).toEqual(['d'])
    expect(groupNodes(summary.needsAttention)[0]?.name).toBe('laptop')
  })

  it('filters rows by operator query', () => {
    const customers = groupCustomers([
      env({ id: '1', status: 'healthy', type: 'PROD' }),
      env({
        id: '2',
        status: 'healthy',
        type: 'PROD',
        customer: {
          id: 'cust-2',
          slug: 'strategic-insights',
          displayName: 'Strategic Insights Consulting, LLC',
          timezone: 'America/Denver',
          adminEmail: 'admin@si.local',
        },
      }),
    ])
    expect(filterByQuery(customers, 'strategic', row => `${row.displayName} ${row.slug}`)).toHaveLength(1)
  })
})
