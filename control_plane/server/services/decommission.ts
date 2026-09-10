import type { Database } from '../database'
import { decommissionRegisteredEnvironment } from './docker-relaunch'
import { setLifecycleStatus } from './provision-runtime'
import { getRegisteredEnvironment, listRegisteredEnvironments } from './registry'

export class DecommissionError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function decommissionEnvironment(db: Database, id: string, filesRoot?: string) {
  const row = await getRegisteredEnvironment(db, id)
  if (!row) {
    throw new DecommissionError('Environment not registered.', 404)
  }
  if (row.lifecycleStatus === 'decommissioned') {
    return { id: row.id, slug: row.slug, lifecycleStatus: 'decommissioned' as const, args: [] as string[] }
  }
  const result = decommissionRegisteredEnvironment({
    slug: row.slug,
    composeFile: row.composeFile,
    envFileLocal: row.envFileLocal,
    envFileExample: row.envFileExample,
    composeProject: row.composeProject,
    filesRoot,
  })
  await setLifecycleStatus(db, row.id, 'decommissioned')
  return {
    id: row.id,
    slug: row.slug,
    lifecycleStatus: 'decommissioned' as const,
    args: result.args,
  }
}

export async function decommissionCustomer(db: Database, customerId: string, filesRoot?: string) {
  const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === customerId)
  if (rows.length === 0) {
    throw new DecommissionError('Customer has no environments.', 404)
  }
  const environments = []
  for (const row of rows) {
    environments.push(await decommissionEnvironment(db, row.id, filesRoot))
  }
  return { customerId, environments }
}
