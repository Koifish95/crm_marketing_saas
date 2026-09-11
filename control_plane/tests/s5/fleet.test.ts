import { describe, expect, it } from 'vitest'
import {
  allVisibleSelected,
  filterByQuery,
  filterEnvironments,
  formatBulkNotice,
  groupCustomers,
  groupNodes,
  isStartableEnvironment,
  isStoppableEnvironment,
  planBulkLifecycle,
  summarizeFleet,
  toggleVisibleSelection,
  worstStatus,
  type FleetEnvironment,
} from '../../shared/utils/fleet'

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
    expect(summary.missingCount).toBe(0)
    expect(summary.needsAttention.map(row => row.id)).toEqual(['d'])
    expect(groupNodes(summary.needsAttention)[0]?.name).toBe('laptop')
  })

  it('treats missing as distinct from stopped and includes it in needs-attention', () => {
    expect(worstStatus(['stopped', 'missing'])).toBe('missing')
    const summary = summarizeFleet([
      env({ id: 'p', status: 'stopped', type: 'PROD' }),
      env({ id: 'd', status: 'missing', type: 'DEV' }),
    ])
    expect(summary.stoppedCount).toBe(1)
    expect(summary.missingCount).toBe(1)
    expect(summary.needsAttention.map(row => row.id)).toEqual(['d'])
    expect(summarizeFleet([
      env({ id: 'gone', status: 'missing', type: 'DEV', lifecycleStatus: 'decommissioned' }),
    ]).needsAttention).toEqual([])
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
    expect(filterByQuery(customers, '   ', row => row.displayName)).toHaveLength(2)
  })

  it('treats an empty fleet as zeros with no invented attention rows', () => {
    const summary = summarizeFleet([])
    expect(summary.customerCount).toBe(0)
    expect(summary.environmentCount).toBe(0)
    expect(summary.nodeCount).toBe(0)
    expect(summary.needsAttention).toEqual([])
    expect(worstStatus([])).toBe('unknown')
  })

  it('keeps client-side index filters usable beyond a handful of rows', () => {
    const rows = Array.from({ length: 12 }, (_, index) => env({
      id: `env-${index}`,
      status: index % 4 === 0 ? 'unhealthy' : 'healthy',
      type: index % 2 === 0 ? 'PROD' : 'DEV',
      customer: {
        id: `cust-${index}`,
        slug: `shop-${index}`,
        displayName: `Shop ${index}`,
        timezone: 'America/Denver',
        adminEmail: `admin@shop-${index}.local`,
      },
    }))
    const summary = summarizeFleet(rows)
    expect(summary.customerCount).toBe(12)
    expect(summary.unhealthyCount).toBe(3)
    expect(filterEnvironments(rows, '', 'DEV')).toHaveLength(6)
    expect(filterEnvironments(rows, 'Shop 11', '')).toHaveLength(1)
    expect(filterEnvironments(rows, 'missing', 'PROD')).toHaveLength(0)
  })
})

describe('fleet lifecycle eligibility', () => {
  it('starts only stopped registered rows and never missing, unknown, or retryable', () => {
    expect(isStartableEnvironment(env({ id: 's', status: 'stopped', type: 'DEV', runtime: 'exited' }))).toBe(true)
    expect(isStartableEnvironment(env({ id: 'h', status: 'healthy', type: 'PROD' }))).toBe(false)
    expect(isStartableEnvironment(env({ id: 'm', status: 'missing', type: 'DEV', runtime: 'missing' }))).toBe(false)
    expect(isStartableEnvironment(env({ id: 'u', status: 'unknown', type: 'DEV', runtime: 'unknown' }))).toBe(false)
    expect(isStartableEnvironment(env({
      id: 'd',
      status: 'stopped',
      type: 'DEV',
      lifecycleStatus: 'decommissioned',
    }))).toBe(false)
    expect(isStartableEnvironment(env({
      id: 'p',
      status: 'stopped',
      type: 'DEV',
      lifecycleStatus: 'provisioning',
    }))).toBe(false)
    expect(isStartableEnvironment(env({
      id: 'f',
      status: 'stopped',
      type: 'DEV',
      lifecycleStatus: 'failed',
    }))).toBe(false)
  })

  it('stops running healthy or unhealthy rows and skips stopped, missing, unknown, and decommissioned', () => {
    expect(isStoppableEnvironment(env({ id: 'h', status: 'healthy', type: 'PROD', runtime: 'running' }))).toBe(true)
    expect(isStoppableEnvironment(env({ id: 'u', status: 'unhealthy', type: 'DEV', runtime: 'running' }))).toBe(true)
    expect(isStoppableEnvironment(env({ id: 's', status: 'stopped', type: 'DEV', runtime: 'exited' }))).toBe(false)
    expect(isStoppableEnvironment(env({ id: 'm', status: 'missing', type: 'DEV', runtime: 'missing' }))).toBe(false)
    expect(isStoppableEnvironment(env({ id: 'k', status: 'unknown', type: 'DEV', runtime: 'unknown' }))).toBe(false)
    expect(isStoppableEnvironment(env({
      id: 'd',
      status: 'healthy',
      type: 'PROD',
      lifecycleStatus: 'decommissioned',
    }))).toBe(false)
  })
})

describe('environments selection', () => {
  it('header-selects only currently visible ids and can uncheck just those', () => {
    expect(toggleVisibleSelection(['hidden'], ['a', 'b'], true)).toEqual(['hidden', 'a', 'b'])
    expect(toggleVisibleSelection(['hidden', 'a', 'b'], ['a', 'b'], false)).toEqual(['hidden'])
    expect(allVisibleSelected(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(allVisibleSelected(['a'], ['a', 'b'])).toBe(false)
    expect(allVisibleSelected([], [])).toBe(false)
  })

  it('does not keep invisible ids when the operator starts from an empty selection after a filter change', () => {
    expect(toggleVisibleSelection([], ['visible-only'], true)).toEqual(['visible-only'])
    expect(allVisibleSelected(['stale-hidden'], ['visible-only'])).toBe(false)
  })
})

describe('bulk lifecycle plan', () => {
  const rows = [
    env({ id: 'run-start', status: 'stopped', type: 'DEV', slug: 'acme-dev', runtime: 'exited' }),
    env({ id: 'run-stop', status: 'healthy', type: 'PROD', slug: 'acme-prod', runtime: 'running' }),
    env({ id: 'missing', status: 'missing', type: 'DEV', slug: 'acme-missing', runtime: 'missing' }),
    env({
      id: 'gone',
      status: 'stopped',
      type: 'DEV',
      slug: 'acme-gone',
      lifecycleStatus: 'decommissioned',
    }),
  ]

  it('Start All and Stop All use eligible registry rows, not a client id list', () => {
    expect(planBulkLifecycle({
      action: 'start',
      scope: 'all',
      ids: ['run-stop'],
      environments: rows,
    }).map(row => row.id)).toEqual(['run-start'])
    expect(planBulkLifecycle({
      action: 'stop',
      scope: 'all',
      ids: ['run-start'],
      environments: rows,
    }).map(row => row.id)).toEqual(['run-stop'])
  })

  it('selected ids stay selected-only; unknown ids fail without aborting the rest', () => {
    const planned = planBulkLifecycle({
      action: 'start',
      scope: 'selected',
      ids: ['missing-id', 'run-start', 'gone', 'run-stop'],
      environments: rows,
    })
    expect(planned.map(row => [row.id, row.outcome])).toEqual([
      ['missing-id', 'failed'],
      ['run-start', 'run'],
      ['gone', 'failed'],
      ['run-stop', 'skipped'],
    ])
    expect(planned.find(row => row.id === 'missing-id')?.message).toMatch(/not registered/i)
    expect(planned.find(row => row.id === 'gone')?.message).toMatch(/decommissioned/i)
  })

  it('formats a partial-result banner with the first failure', () => {
    expect(formatBulkNotice('start', [
      { outcome: 'ok', slug: 'acme-dev' },
      { outcome: 'ok', slug: 'acme-uat' },
      { outcome: 'ok', slug: 'acme-stage' },
      { outcome: 'skipped', slug: 'acme-prod' },
      { outcome: 'failed', slug: 'Acme BJJ DEV', message: 'container gone' },
    ])).toBe('3 started, 1 skipped, 1 failed — Acme BJJ DEV: container gone')
  })
})
