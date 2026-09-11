export type CombinedStatus = 'healthy' | 'stopped' | 'missing' | 'unhealthy' | 'unknown'

export type FleetEnvironment = {
  id: string
  status: CombinedStatus
  headline: string
  type: string
  displayName: string
  slug: string
  containerName: string
  composeFile: string
  composeProject?: string
  envFileLocal: string
  envFileExample: string
  healthUrl: string
  accessUrl: string
  hostPort?: number
  lifecycleStatus?: string
  expectedImage: string
  sqliteVolume: string
  assetsVolume: string
  isolationMarker: string
  runtime: string
  healthOk: boolean
  healthError?: string
  lastBackup?: {
    id: string
    createdAt: string
    bytes: number
    zipPath: string
    offhostPath?: string | null
    offhostCopiedAt?: string | null
  } | null
  customer: {
    id: string
    slug: string
    displayName: string
    timezone: string
    adminEmail: string
  }
  node: {
    id: string
    name: string
    kind: string
    driver: string
  }
}

export type FleetStatusResponse = {
  checkedAt: string
  environments: FleetEnvironment[]
}

const STATUS_RANK: Record<CombinedStatus, number> = {
  unhealthy: 5,
  unknown: 4,
  missing: 3,
  stopped: 2,
  healthy: 1,
}

export function worstStatus(statuses: readonly CombinedStatus[]): CombinedStatus {
  if (statuses.length === 0) {
    return 'unknown'
  }
  return statuses.reduce((worst, status) => (
    STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst
  ))
}

export function needsAttention(env: FleetEnvironment) {
  if (env.lifecycleStatus === 'decommissioned') {
    return false
  }
  return env.status === 'unhealthy' || env.status === 'unknown' || env.status === 'missing'
}

export function groupCustomers(environments: readonly FleetEnvironment[]) {
  const byId = new Map<string, {
    id: string
    slug: string
    displayName: string
    timezone: string
    adminEmail: string
    environments: FleetEnvironment[]
  }>()
  for (const env of environments) {
    const existing = byId.get(env.customer.id)
    if (existing) {
      existing.environments.push(env)
      continue
    }
    byId.set(env.customer.id, {
      ...env.customer,
      environments: [env],
    })
  }
  return [...byId.values()]
    .map(customer => ({
      ...customer,
      environmentCount: customer.environments.length,
      prod: customer.environments.find(env => env.type === 'PROD') ?? null,
      dev: customer.environments.find(env => env.slug === `${customer.slug}-dev`)
        ?? customer.environments.find(env => env.type === 'DEV') ?? null,
      overall: worstStatus(customer.environments.map(env => env.status)),
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
}

export function groupNodes(environments: readonly FleetEnvironment[]) {
  const byId = new Map<string, {
    id: string
    name: string
    kind: string
    driver: string
    environments: FleetEnvironment[]
  }>()
  for (const env of environments) {
    const existing = byId.get(env.node.id)
    if (existing) {
      existing.environments.push(env)
      continue
    }
    byId.set(env.node.id, {
      ...env.node,
      environments: [env],
    })
  }
  return [...byId.values()]
    .map(node => ({
      ...node,
      environmentCount: node.environments.length,
      overall: worstStatus(node.environments.map(env => env.status)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function summarizeFleet(environments: readonly FleetEnvironment[]) {
  const customers = groupCustomers(environments)
  const nodes = groupNodes(environments)
  const byStatus = (status: CombinedStatus) => environments.filter(env => env.status === status).length
  return {
    customerCount: customers.length,
    environmentCount: environments.length,
    prodCount: environments.filter(env => env.type === 'PROD').length,
    devCount: environments.filter(env => env.type === 'DEV').length,
    healthyCount: byStatus('healthy'),
    unhealthyCount: byStatus('unhealthy'),
    stoppedCount: byStatus('stopped'),
    missingCount: byStatus('missing'),
    unknownCount: byStatus('unknown'),
    nodeCount: nodes.length,
    needsAttention: environments.filter(needsAttention),
    customers,
    nodes,
  }
}

export function filterByQuery<T>(rows: readonly T[], query: string, text: (row: T) => string) {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return [...rows]
  }
  return rows.filter(row => text(row).toLowerCase().includes(needle))
}

export function filterEnvironments(
  environments: readonly FleetEnvironment[],
  query: string,
  typeFilter = '',
) {
  const typed = typeFilter
    ? environments.filter(env => env.type === typeFilter)
    : environments
  return filterByQuery(
    typed,
    query,
    env => `${env.customer.displayName} ${env.slug} ${env.type} ${env.node.name}`,
  )
}

export function findById<T extends { id: string }>(rows: readonly T[], id: string) {
  return rows.find(row => row.id === id) ?? null
}

export function isBlockedLifecycle(lifecycleStatus?: string) {
  return lifecycleStatus === 'decommissioned'
    || lifecycleStatus === 'provisioning'
    || lifecycleStatus === 'failed'
}

export function isStartableEnvironment(env: { status: CombinedStatus, lifecycleStatus?: string }) {
  if (isBlockedLifecycle(env.lifecycleStatus)) {
    return false
  }
  return env.status === 'stopped'
}

export function isStoppableEnvironment(env: { status: CombinedStatus, runtime?: string, lifecycleStatus?: string }) {
  if (env.lifecycleStatus === 'decommissioned') {
    return false
  }
  if (env.runtime === 'running') {
    return true
  }
  return env.status === 'healthy' || env.status === 'unhealthy'
}

export type BulkLifecycleScope = 'selected' | 'all'
export type BulkLifecycleOutcome = 'ok' | 'skipped' | 'failed'
export type BulkLifecyclePlanItem = {
  id: string
  slug: string
  outcome: 'run' | BulkLifecycleOutcome
  message: string
}

export function planBulkLifecycle(input: {
  action: 'start' | 'stop'
  scope: BulkLifecycleScope
  ids?: readonly string[]
  environments: readonly FleetEnvironment[]
}): BulkLifecyclePlanItem[] {
  const eligible = input.action === 'start' ? isStartableEnvironment : isStoppableEnvironment
  const verb = input.action === 'start' ? 'start' : 'stop'
  if (input.scope === 'all') {
    return input.environments
      .filter(env => eligible(env))
      .map(env => ({ id: env.id, slug: env.slug, outcome: 'run' as const, message: '' }))
  }
  const planned: BulkLifecyclePlanItem[] = []
  for (const id of [...new Set(input.ids || [])]) {
    const env = findById(input.environments, id)
    if (!env) {
      planned.push({ id, slug: id, outcome: 'failed', message: 'Environment not registered.' })
      continue
    }
    if (env.lifecycleStatus === 'decommissioned') {
      planned.push({
        id,
        slug: env.slug,
        outcome: 'failed',
        message: `Decommissioned environments cannot be ${verb === 'start' ? 'started' : 'stopped'}.`,
      })
      continue
    }
    if (!eligible(env)) {
      planned.push({ id, slug: env.slug, outcome: 'skipped', message: `Not eligible to ${verb}.` })
      continue
    }
    planned.push({ id, slug: env.slug, outcome: 'run', message: '' })
  }
  return planned
}

export function toggleVisibleSelection(
  selected: readonly string[],
  visibleIds: readonly string[],
  checked: boolean,
) {
  const visible = new Set(visibleIds)
  if (checked) {
    return [...new Set([...selected, ...visibleIds])]
  }
  return selected.filter(id => !visible.has(id))
}

export function allVisibleSelected(selected: readonly string[], visibleIds: readonly string[]) {
  return visibleIds.length > 0 && visibleIds.every(id => selected.includes(id))
}

export function formatBulkNotice(
  action: 'start' | 'stop',
  results: readonly { outcome: string, slug?: string, id?: string, message?: string }[],
) {
  const verb = action === 'start' ? 'started' : 'stopped'
  const ok = results.filter(row => row.outcome === 'ok').length
  const skipped = results.filter(row => row.outcome === 'skipped').length
  const failed = results.filter(row => row.outcome === 'failed')
  const first = failed[0]
  const detail = first ? ` — ${first.slug || first.id}: ${first.message || 'failed'}` : ''
  return `${ok} ${verb}, ${skipped} skipped, ${failed.length} failed${detail}`
}

export const FLEET_STATUS_KEY = 'fleet-status'
export const FLEET_HEALTH_POLL_MS = 3000
export const FLEET_HEALTH_POLL_ATTEMPTS = 20

export function shouldReuseFleetStatusCache(cause?: string) {
  return cause === 'initial'
}

export function fleetStatusCachedData(
  key: string,
  payload: Record<string, unknown> | undefined,
  staticData?: Record<string, unknown>,
) {
  return payload?.[key] ?? staticData?.[key]
}

export async function pollFleetUntilHealthy(input: {
  isHealthy: () => boolean
  refresh: () => Promise<void>
  sleep?: (ms: number) => Promise<void>
  attempts?: number
  delayMs?: number
}) {
  if (input.isHealthy()) {
    return 'healthy' as const
  }
  const attempts = input.attempts ?? FLEET_HEALTH_POLL_ATTEMPTS
  const delayMs = input.delayMs ?? FLEET_HEALTH_POLL_MS
  const sleep = input.sleep ?? ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)))
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(delayMs)
    await input.refresh()
    if (input.isHealthy()) {
      return 'healthy' as const
    }
  }
  return 'timeout' as const
}
