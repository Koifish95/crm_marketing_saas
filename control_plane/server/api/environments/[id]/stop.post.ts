import { useDb } from '../../../database'
import { stopRegisteredEnvironment } from '../../../services/docker-relaunch'
import { observeRegisteredEnvironments } from '../../../services/observe'
import { getRegisteredEnvironment } from '../../../services/registry'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const row = await getRegisteredEnvironment(useDb(), id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Environment not registered.' })
  }
  if (row.lifecycleStatus === 'decommissioned') {
    throw createError({ statusCode: 409, statusMessage: 'Decommissioned environments cannot be stopped.' })
  }
  const stop = stopRegisteredEnvironment(row)
  return {
    stop,
    lifecycleStatus: row.lifecycleStatus,
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(useDb()),
  }
})
