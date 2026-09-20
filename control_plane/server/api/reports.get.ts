import { useDb } from '../database'
import { observeRegisteredEnvironments } from '../services/observe'
import { listCustomers, listProductInstances } from '../services/registry'
import { buildOperatorReports } from '../../shared/utils/operator-reports'
import { operatorAlerts } from '../../shared/utils/fleet'
import { statfs } from 'node:fs/promises'

async function controlPlaneDiskWarning() {
  try {
    const stats = await statfs(process.cwd())
    const totalBytes = Number(stats.blocks) * Number(stats.bsize)
    const freeBytes = Number(stats.bavail) * Number(stats.bsize)
    const freeRatio = totalBytes > 0 ? freeBytes / totalBytes : 1
    if (freeRatio < 0.15) {
      return `Control Plane host free disk is ${Math.round(freeRatio * 100)}%.`
    }
    if (freeBytes < 2 * 1024 * 1024 * 1024) {
      return 'Control Plane host free disk is below 2 GB.'
    }
    return null
  } catch {
    return 'Control Plane disk status is unavailable.'
  }
}

export default defineEventHandler(async () => {
  const db = useDb()
  const environments = await observeRegisteredEnvironments(db)
  const customers = await listCustomers(db)
  const productInstances = await listProductInstances(db)
  const diskWarning = await controlPlaneDiskWarning()
  return {
    checkedAt: new Date().toISOString(),
    reports: buildOperatorReports({
      environments,
      customers,
      productInstances,
      diskWarning,
    }),
    alerts: operatorAlerts(environments, diskWarning),
  }
})
