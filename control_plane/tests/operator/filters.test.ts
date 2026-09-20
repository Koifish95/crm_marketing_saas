import { describe, expect, it } from 'vitest'
import { filterAndSortEnvironments, environmentAttention } from '../../shared/utils/operator-filters'
import { buildOperatorReports } from '../../shared/utils/operator-reports'
import type { FleetEnvironment } from '../../shared/utils/fleet'

function env(partial: Partial<FleetEnvironment> & Pick<FleetEnvironment, 'id' | 'status' | 'type'>): FleetEnvironment {
  return {
    headline: `${partial.customer?.displayName || 'Acme'} · ${partial.type}`,
    displayName: partial.displayName || partial.type,
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
    runtime: partial.runtime || 'stopped',
    healthOk: partial.status === 'healthy',
    customer: {
      id: 'cust-1',
      slug: 'acme',
      displayName: 'Acme BJJ',
      timezone: 'America/Denver',
      adminEmail: 'admin@acme.local',
    },
    productInstance: {
      id: 'inst-1',
      productId: 'martial-arts',
      displayName: 'Martial Arts',
      slug: 'martial-arts',
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

describe('operator filters and reports', () => {
  const rows = [
    env({ id: 'p', status: 'healthy', type: 'PROD', runtime: 'running', lifecycleStatus: 'ready', releaseId: 'aaa' }),
    env({
      id: 'd',
      status: 'stopped',
      type: 'DEV',
      lifecycleStatus: 'ready',
      releaseId: 'bbb',
      lastBackup: {
        id: 'b1',
        createdAt: new Date().toISOString(),
        bytes: 10,
        zipPath: 'x.zip',
      },
    }),
    env({ id: 'gone', status: 'missing', type: 'TRAINING', lifecycleStatus: 'archived', slug: 'acme-training' }),
  ]

  it('hides archived by default and can search product/hostname', () => {
    expect(filterAndSortEnvironments(rows).map(row => row.id)).toEqual(['d', 'p'])
    expect(filterAndSortEnvironments(rows, { includeArchived: true, lifecycle: 'archived' })).toHaveLength(1)
    expect(filterAndSortEnvironments(rows, { query: 'martial' }).length).toBe(2)
    expect(filterAndSortEnvironments(rows, { prodKind: 'non-prod', includeArchived: true }).map(row => row.type)).toEqual(['DEV', 'TRAINING'])
  })

  it('builds truthful reports without inventing uptime', () => {
    const reports = buildOperatorReports({
      environments: rows,
      customers: [{
        id: 'cust-1',
        slug: 'acme',
        displayName: 'Acme BJJ',
        timezone: 'America/Denver',
        adminEmail: 'admin@acme.local',
        status: 'active',
      }],
      productInstances: [{
        id: 'inst-1',
        customerId: 'cust-1',
        productId: 'martial-arts',
        displayName: 'Martial Arts',
        slug: 'martial-arts',
        status: 'active',
      }],
    })
    expect(reports.environments.archived).toBe(1)
    expect(reports.releases.mismatches[0]?.prod).toBe('aaa')
    expect(reports.gaps.some(gap => /uptime/i.test(gap))).toBe(true)
    const prodAlerts = environmentAttention(rows[0]!, rows)
    expect(prodAlerts.some(alert => alert.kind === 'release')).toBe(true)
    expect(prodAlerts.some(alert => alert.kind === 'backup')).toBe(true)
  })
})
