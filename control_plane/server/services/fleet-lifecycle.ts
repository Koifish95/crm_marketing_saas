import type { Database } from '../database'
import {
  planBulkLifecycle,
  type BulkLifecycleOutcome,
  type BulkLifecycleScope,
  type FleetEnvironment,
} from '../../shared/utils/fleet'
import { startRegisteredEnvironment, stopRegisteredEnvironment } from './docker-relaunch'
import { observeRegisteredEnvironments } from './observe'
import { listRegisteredEnvironments } from './registry'

export type BulkLifecycleResult = {
  id: string
  slug: string
  outcome: BulkLifecycleOutcome
  message: string
}

export async function runBulkLifecycle(
  db: Database,
  action: 'start' | 'stop',
  input: { scope: BulkLifecycleScope, ids?: string[] },
) {
  const registered = await listRegisteredEnvironments(db)
  const observed = await observeRegisteredEnvironments(db) as FleetEnvironment[]
  const planned = planBulkLifecycle({
    action,
    scope: input.scope,
    ids: input.ids,
    environments: observed,
  })
  const byId = new Map(registered.map(row => [row.id, row]))
  const results: BulkLifecycleResult[] = []
  for (const item of planned) {
    if (item.outcome !== 'run') {
      results.push({
        id: item.id,
        slug: item.slug,
        outcome: item.outcome,
        message: item.message,
      })
      continue
    }
    const row = byId.get(item.id)
    if (!row) {
      results.push({
        id: item.id,
        slug: item.slug,
        outcome: 'failed',
        message: 'Environment not registered.',
      })
      continue
    }
    try {
      if (action === 'start') {
        startRegisteredEnvironment(row)
        results.push({ id: row.id, slug: row.slug, outcome: 'ok', message: 'Started.' })
      } else {
        stopRegisteredEnvironment(row)
        results.push({ id: row.id, slug: row.slug, outcome: 'ok', message: 'Stopped.' })
      }
    } catch (error) {
      results.push({
        id: row.id,
        slug: row.slug,
        outcome: 'failed',
        message: error instanceof Error ? error.message : `${action} failed.`,
      })
    }
  }
  return {
    results,
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(db),
  }
}
