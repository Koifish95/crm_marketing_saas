import { useDb } from '../../../database'
import { relaunchRegisteredEnvironment } from '../../../services/docker-relaunch'
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
    throw createError({ statusCode: 409, statusMessage: 'Decommissioned environments cannot be relaunched.' })
  }
  const relaunch = relaunchRegisteredEnvironment(row)
  return {
    relaunch,
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(useDb()),
  }
})
