import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FleetEnvironment } from '../../shared/utils/fleet'
import { startCommand, stopCommand } from '../../server/services/docker-relaunch'

const { startOrder, startRegisteredEnvironment, stopRegisteredEnvironment, observe, list } = vi.hoisted(() => {
  const startOrder: string[] = []
  return {
    startOrder,
    startRegisteredEnvironment: vi.fn((row: { slug: string }) => {
      startOrder.push(`start:${row.slug}`)
      if (row.slug.includes('fail')) {
        throw new Error(`${row.slug} boom`)
      }
      return { slug: row.slug, args: ['compose', 'start', 'app'], stdout: '' }
    }),
    stopRegisteredEnvironment: vi.fn((row: { slug: string }) => {
      startOrder.push(`stop:${row.slug}`)
      return { slug: row.slug, args: ['compose', 'stop', 'app'], stdout: '' }
    }),
    observe: vi.fn(),
    list: vi.fn(),
  }
})

vi.mock('../../server/services/docker-relaunch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/services/docker-relaunch')>()
  return {
    ...actual,
    startRegisteredEnvironment,
    stopRegisteredEnvironment,
  }
})

vi.mock('../../server/services/observe', () => ({
  observeRegisteredEnvironments: (...args: unknown[]) => observe(...args),
}))

vi.mock('../../server/services/registry', () => ({
  listRegisteredEnvironments: (...args: unknown[]) => list(...args),
}))

function env(partial: Partial<FleetEnvironment> & Pick<FleetEnvironment, 'id' | 'status' | 'type' | 'slug'>): FleetEnvironment {
  return {
    headline: `${partial.slug} · ${partial.type}`,
    displayName: partial.type,
    containerName: `${partial.slug}-app`,
    composeFile: 'docker-compose.provisioned.yml',
    envFileLocal: 'data/provisioned/x.env',
    envFileExample: 'data/provisioned/x.env',
    healthUrl: 'http://127.0.0.1:52200/api/health',
    accessUrl: 'http://localhost:52200',
    expectedImage: 'martial-arts-acquisition:s4',
    sqliteVolume: `${partial.slug}-sqlite`,
    assetsVolume: `${partial.slug}-assets`,
    isolationMarker: `${partial.slug}-isolation`,
    runtime: partial.status === 'healthy' || partial.status === 'unhealthy' ? 'running' : 'exited',
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

describe('bulk start/stop command contract', () => {
  const input = {
    slug: 'lab-acme-dev',
    composeFile: 'docker-compose.lab-acme-dev.yml',
    envFileLocal: '.env.lab-acme-dev',
    envFileExample: '.env.lab-acme-dev.example',
    composeProject: 'lab-acme-dev',
    root: 'C:/tmp/missing-template',
  }

  it('starts and stops with compose app only, never recreate, -v, down, prune, or rm', () => {
    const start = startCommand(input)
    const stop = stopCommand(input)
    expect(start.args.slice(-2)).toEqual(['start', 'app'])
    expect(stop.args.slice(-2)).toEqual(['stop', 'app'])
    for (const args of [start.args, stop.args]) {
      expect(args.join(' ')).not.toMatch(/-v|prune|down|\brm\b|force-recreate/)
      expect(args.join(' ')).not.toMatch(/sqlite|assets|isolation/)
      expect(args).toContain('lab-acme-dev')
      expect(args).not.toContain('lab-acme-prod')
    }
  })
})

describe('runBulkLifecycle', () => {
  beforeEach(() => {
    startOrder.splice(0)
    startRegisteredEnvironment.mockClear()
    stopRegisteredEnvironment.mockClear()
    observe.mockReset()
    list.mockReset()
  })

  it('runs eligible starts sequentially, keeps going after a failure, and observes after the loop', async () => {
    const rows = [
      env({ id: 'a', status: 'stopped', type: 'DEV', slug: 'acme-a' }),
      env({ id: 'b', status: 'stopped', type: 'DEV', slug: 'acme-fail' }),
      env({ id: 'c', status: 'stopped', type: 'DEV', slug: 'acme-c' }),
      env({ id: 'd', status: 'healthy', type: 'PROD', slug: 'acme-prod' }),
    ]
    list.mockResolvedValue(rows)
    observe
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(rows.map(row => (
        row.id === 'a' || row.id === 'c'
          ? { ...row, status: 'healthy', runtime: 'running' }
          : row
      )))

    const { runBulkLifecycle } = await import('../../server/services/fleet-lifecycle')
    const result = await runBulkLifecycle({} as never, 'start', {
      scope: 'selected',
      ids: ['missing-id', 'a', 'b', 'c', 'd'],
    })

    expect(startOrder).toEqual(['start:acme-a', 'start:acme-fail', 'start:acme-c'])
    expect(startRegisteredEnvironment).toHaveBeenCalledTimes(3)
    expect(result.results.map(row => [row.id, row.outcome])).toEqual([
      ['missing-id', 'failed'],
      ['a', 'ok'],
      ['b', 'failed'],
      ['c', 'ok'],
      ['d', 'skipped'],
    ])
    expect(result.results.find(row => row.id === 'b')?.message).toMatch(/boom/)
    expect(observe).toHaveBeenCalledTimes(2)
    expect(result.environments.find(row => row.id === 'a')?.status).toBe('healthy')
  })

  it('Start All ignores client ids and only starts eligible registered rows', async () => {
    const rows = [
      env({ id: 'a', status: 'stopped', type: 'DEV', slug: 'acme-a' }),
      env({ id: 'd', status: 'healthy', type: 'PROD', slug: 'acme-prod' }),
      env({
        id: 'gone',
        status: 'stopped',
        type: 'DEV',
        slug: 'acme-gone',
        lifecycleStatus: 'decommissioned',
      }),
    ]
    list.mockResolvedValue(rows)
    observe.mockResolvedValue(rows)

    const { runBulkLifecycle } = await import('../../server/services/fleet-lifecycle')
    const result = await runBulkLifecycle({} as never, 'start', {
      scope: 'all',
      ids: ['d'],
    })

    expect(startOrder).toEqual(['start:acme-a'])
    expect(result.results.map(row => row.id)).toEqual(['a'])
    expect(stopRegisteredEnvironment).not.toHaveBeenCalled()
  })
})
