import { backupIsStale, isActiveStatus, isArchivedLifecycle } from './lifecycle'
import { instanceReleaseMismatch } from './operator-filters'
import type { FleetAccount, FleetEnvironment, FleetProductInstance } from './fleet'

export function buildOperatorReports(input: {
  environments: readonly FleetEnvironment[]
  customers: readonly FleetAccount[]
  productInstances?: readonly FleetProductInstance[]
  diskWarning?: string | null
}) {
  const environments = input.environments
  const customers = input.customers
  const activeCustomers = customers.filter(row => isActiveStatus(row.status))
  const inactiveCustomers = customers.filter(row => !isActiveStatus(row.status))
  const instances = input.productInstances || []
  const activeInstances = instances.filter(row => isActiveStatus(row.status))
  const byProduct = new Map<string, number>()
  for (const instance of instances) {
    byProduct.set(instance.productId, (byProduct.get(instance.productId) || 0) + 1)
  }
  const envsByProduct = new Map<string, number>()
  const envsByType = new Map<string, number>()
  const envsByRelease = new Map<string, number>()
  const envsByImage = new Map<string, number>()
  const envsBySchema = new Map<string, number>()
  for (const env of environments) {
    const productId = env.productInstance?.productId || 'unknown'
    envsByProduct.set(productId, (envsByProduct.get(productId) || 0) + 1)
    envsByType.set(env.type, (envsByType.get(env.type) || 0) + 1)
    const release = env.releaseId || 'unknown'
    envsByRelease.set(release, (envsByRelease.get(release) || 0) + 1)
    envsByImage.set(env.expectedImage, (envsByImage.get(env.expectedImage) || 0) + 1)
    const schema = env.schemaVersion || 'unknown'
    envsBySchema.set(schema, (envsBySchema.get(schema) || 0) + 1)
  }
  const mismatches = []
  const grouped = new Map<string, FleetEnvironment[]>()
  for (const env of environments) {
    const key = env.productInstance?.id || env.customer.id
    grouped.set(key, [...(grouped.get(key) || []), env])
  }
  for (const instanceEnvs of grouped.values()) {
    const mismatch = instanceReleaseMismatch(instanceEnvs)
    if (mismatch) {
      mismatches.push({
        customer: mismatch.prod.customer.displayName,
        product: mismatch.prod.productInstance?.displayName,
        prod: mismatch.prodMark,
        dev: mismatch.devMark,
        environmentId: mismatch.prod.id,
      })
    }
  }
  const noBackup = environments.filter(env => env.lifecycleStatus === 'ready' && !env.lastBackup)
  const staleBackup = environments.filter(env => env.lifecycleStatus === 'ready' && env.lastBackup && backupIsStale(env.lastBackup.createdAt))
  const prodMissingOffhost = environments.filter(env => (
    env.type === 'PROD' && env.lifecycleStatus === 'ready' && env.lastBackup && !env.lastBackup.offhostPath
  ))
  const ports = environments
    .filter(env => !isArchivedLifecycle(env.lifecycleStatus))
    .map(env => ({
      customer: env.customer.displayName,
      environment: env.displayName,
      type: env.type,
      hostPort: env.hostPort,
      node: env.node.name,
    }))
    .sort((left, right) => (left.hostPort || 0) - (right.hostPort || 0))

  return {
    customers: {
      total: customers.length,
      active: activeCustomers.length,
      inactive: inactiveCustomers.length,
    },
    productInstances: {
      total: instances.length,
      active: activeInstances.length,
      inactive: instances.length - activeInstances.length,
      byProduct: [...byProduct.entries()].map(([productId, count]) => ({ productId, count })),
    },
    environments: {
      total: environments.length,
      byType: [...envsByType.entries()].map(([type, count]) => ({ type, count })),
      byProduct: [...envsByProduct.entries()].map(([productId, count]) => ({ productId, count })),
      running: environments.filter(env => env.runtime === 'running').length,
      stopped: environments.filter(env => env.status === 'stopped').length,
      unhealthy: environments.filter(env => env.status === 'unhealthy').length,
      failed: environments.filter(env => env.lifecycleStatus === 'failed').length,
      decommissioned: environments.filter(env => env.lifecycleStatus === 'decommissioned').length,
      archived: environments.filter(env => env.lifecycleStatus === 'archived').length,
    },
    releases: {
      byRelease: [...envsByRelease.entries()].map(([releaseId, count]) => ({ releaseId, count })),
      byImage: [...envsByImage.entries()].map(([image, count]) => ({ image, count })),
      bySchema: [...envsBySchema.entries()].map(([schemaVersion, count]) => ({ schemaVersion, count })),
      mismatches,
    },
    backups: {
      none: noBackup.map(env => ({ id: env.id, headline: env.headline })),
      stale: staleBackup.map(env => ({
        id: env.id,
        headline: env.headline,
        createdAt: env.lastBackup?.createdAt,
      })),
      prodMissingOffhost: prodMissingOffhost.map(env => ({ id: env.id, headline: env.headline })),
    },
    hosting: {
      ports,
      diskWarning: input.diskWarning || null,
    },
    gaps: [
      'Historical uptime percentages are not collected.',
      'Live TLS certificate expiry is not probed from the Control Plane.',
      'Container CPU/memory telemetry is not collected.',
    ],
  }
}
