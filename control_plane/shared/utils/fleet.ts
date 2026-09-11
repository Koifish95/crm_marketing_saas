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
