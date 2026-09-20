import { useDb } from '../../../database'
import { relaunchRegisteredEnvironment } from '../../../services/docker-relaunch'
import { observeRegisteredEnvironments } from '../../../services/observe'
import { recordOperatorEvent } from '../../../services/operator-events'
import { getRegisteredEnvironment } from '../../../services/registry'
import { inactiveAccountMessage, retiredRuntimeMessage } from '../../../../shared/utils/lifecycle'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const row = await getRegisteredEnvironment(useDb(), id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Environment not registered.' })
  }
  const retired = retiredRuntimeMessage(row.lifecycleStatus, 'relaunched')
  if (retired) {
    throw createError({ statusCode: 409, statusMessage: retired })
  }
  const inactive = inactiveAccountMessage(row.customer.status, row.productInstance.status)
  if (inactive) {
    throw createError({ statusCode: 409, statusMessage: inactive })
  }
  const relaunch = relaunchRegisteredEnvironment(row)
  await recordOperatorEvent(useDb(), {
    action: 'environment.relaunch',
    summary: `Relaunched ${row.slug}.`,
    customerId: row.customer.id,
    productInstanceId: row.productInstance.id,
    environmentId: row.id,
  })
  return {
    relaunch,
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(useDb()),
  }
})
