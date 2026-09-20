import { backupIsStale, isArchivedLifecycle, isRetiredLifecycle } from './lifecycle'
import type { FleetEnvironment, OperatorAlert } from './fleet'

export type EnvironmentListFilters = {
  query?: string
  customerId?: string
  productId?: string
  type?: string
  prodKind?: 'prod' | 'non-prod' | ''
  nodeId?: string
  runtime?: string
  lifecycle?: string
  health?: 'healthy' | 'unhealthy' | ''
  backup?: 'none' | 'stale' | 'offhost-missing' | ''
  release?: string
  includeArchived?: boolean
  sort?: EnvironmentSort
}

export type EnvironmentSort
  = | 'customer'
    | 'product'
    | 'environment'
    | 'type'
    | 'status'
    | 'health'
    | 'node'
    | 'release'
    | 'backup'
    | 'changed'

export function environmentSearchText(env: FleetEnvironment) {
  return [
    env.customer.displayName,
    env.customer.slug,
    env.productInstance?.displayName,
    env.productInstance?.productId,
    env.displayName,
    env.slug,
    env.publicHostname,
    env.node.name,
    env.expectedImage,
    env.releaseId,
    env.schemaVersion,
  ].filter(Boolean).join(' ')
}

export function matchesEnvironmentFilters(env: FleetEnvironment, filters: EnvironmentListFilters) {
  if (!filters.includeArchived && isArchivedLifecycle(env.lifecycleStatus)) {
    return false
  }
  if (filters.customerId && env.customer.id !== filters.customerId) {
    return false
  }
  if (filters.productId && env.productInstance?.productId !== filters.productId) {
    return false
  }
  if (filters.type && env.type !== filters.type) {
    return false
  }
  if (filters.prodKind === 'prod' && env.type !== 'PROD') {
    return false
  }
  if (filters.prodKind === 'non-prod' && env.type === 'PROD') {
    return false
  }
  if (filters.nodeId && env.node.id !== filters.nodeId) {
    return false
  }
  if (filters.runtime && env.runtime !== filters.runtime) {
    return false
  }
  if (filters.lifecycle && env.lifecycleStatus !== filters.lifecycle) {
    return false
  }
  if (filters.health === 'healthy' && env.status !== 'healthy') {
    return false
  }
  if (filters.health === 'unhealthy' && env.status !== 'unhealthy' && env.status !== 'unknown' && env.status !== 'missing') {
    return false
  }
  if (filters.release && env.expectedImage !== filters.release && env.releaseId !== filters.release) {
    return false
  }
  if (filters.backup === 'none' && env.lastBackup) {
    return false
  }
  if (filters.backup === 'stale' && !backupIsStale(env.lastBackup?.createdAt)) {
    return false
  }
  if (filters.backup === 'offhost-missing' && (env.type !== 'PROD' || env.lastBackup?.offhostPath)) {
    return false
  }
  const needle = (filters.query || '').trim().toLowerCase()
  if (needle && !environmentSearchText(env).toLowerCase().includes(needle)) {
    return false
  }
  return true
}

function backupTime(env: FleetEnvironment) {
  return Date.parse(env.lastBackup?.createdAt || '') || 0
}

export function sortEnvironments(rows: readonly FleetEnvironment[], sort: EnvironmentSort = 'customer') {
  const copy = [...rows]
  copy.sort((left, right) => {
    const byCustomer = left.customer.displayName.localeCompare(right.customer.displayName)
      || (left.productInstance?.displayName || '').localeCompare(right.productInstance?.displayName || '')
      || left.type.localeCompare(right.type)
    if (sort === 'product') {
      return (left.productInstance?.displayName || '').localeCompare(right.productInstance?.displayName || '') || byCustomer
    }
    if (sort === 'environment') {
      return left.displayName.localeCompare(right.displayName) || byCustomer
    }
    if (sort === 'type') {
      return left.type.localeCompare(right.type) || byCustomer
    }
    if (sort === 'status' || sort === 'health') {
      return left.status.localeCompare(right.status) || byCustomer
    }
    if (sort === 'node') {
      return left.node.name.localeCompare(right.node.name) || byCustomer
    }
    if (sort === 'release') {
      return (left.releaseId || left.expectedImage).localeCompare(right.releaseId || right.expectedImage) || byCustomer
    }
    if (sort === 'backup') {
      return backupTime(right) - backupTime(left) || byCustomer
    }
    if (sort === 'changed') {
      return left.slug.localeCompare(right.slug)
    }
    return byCustomer
  })
  return copy
}

export function filterAndSortEnvironments(
  environments: readonly FleetEnvironment[],
  filters: EnvironmentListFilters = {},
) {
  return sortEnvironments(
    environments.filter(env => matchesEnvironmentFilters(env, filters)),
    filters.sort || 'customer',
  )
}

export function instanceReleaseMismatch(instanceEnvs: readonly FleetEnvironment[]) {
  const prod = instanceEnvs.find(env => env.type === 'PROD' && !isRetiredLifecycle(env.lifecycleStatus))
  const dev = instanceEnvs.find(env => env.type === 'DEV' && !isRetiredLifecycle(env.lifecycleStatus))
  if (!prod || !dev) {
    return null
  }
  const prodMark = prod.releaseId || prod.expectedImage
  const devMark = dev.releaseId || dev.expectedImage
  if (prodMark === devMark) {
    return null
  }
  return { prod, dev, prodMark, devMark }
}

export type AttentionKind
  = | 'outage'
    | 'provision'
    | 'backup'
    | 'offhost'
    | 'release'
    | 'disk'

export function environmentAttention(env: FleetEnvironment, instanceEnvs: readonly FleetEnvironment[] = []): OperatorAlert[] {
  if (isArchivedLifecycle(env.lifecycleStatus)) {
    return []
  }
  const alerts: OperatorAlert[] = []
  if (env.lifecycleStatus === 'failed') {
    alerts.push({
      kind: 'provision',
      environmentId: env.id,
      message: `${env.headline} provisioning failed.`,
    })
  } else if (env.lifecycleStatus !== 'decommissioned' && env.lifecycleStatus !== 'provisioning') {
    if (env.status === 'unhealthy' || env.status === 'unknown' || env.status === 'missing') {
      alerts.push({
        kind: 'outage',
        environmentId: env.id,
        message: `${env.headline} is ${env.status}.`,
      })
    }
  }
  if (env.lifecycleStatus === 'ready' && !env.lastBackup) {
    alerts.push({
      kind: 'backup',
      environmentId: env.id,
      message: `${env.headline} has no Control Plane backup.`,
    })
  } else if (env.lifecycleStatus === 'ready' && backupIsStale(env.lastBackup?.createdAt)) {
    alerts.push({
      kind: 'backup',
      environmentId: env.id,
      message: `${env.headline} backup is older than 7 days (attention heuristic, not a retention policy).`,
    })
  }
  if (env.type === 'PROD' && env.lifecycleStatus === 'ready' && env.lastBackup && !env.lastBackup.offhostPath) {
    alerts.push({
      kind: 'offhost',
      environmentId: env.id,
      message: `${env.headline} has no recorded off-host backup copy.`,
    })
  }
  const mismatch = instanceReleaseMismatch(instanceEnvs.length ? instanceEnvs : [env])
  if (mismatch && env.id === mismatch.prod.id) {
    alerts.push({
      kind: 'release',
      environmentId: env.id,
      message: `${mismatch.prod.headline} release ${mismatch.prodMark} differs from DEV ${mismatch.devMark}.`,
    })
  }
  return alerts
}

export function customerSearchText(row: {
  displayName: string
  slug: string
  adminEmail?: string
  instances?: { displayName: string, productId: string }[]
}) {
  return [
    row.displayName,
    row.slug,
    row.adminEmail,
    ...(row.instances || []).flatMap(instance => [instance.displayName, instance.productId]),
  ].filter(Boolean).join(' ')
}
