import { useDb } from '../../../database'
import { stopRegisteredEnvironment } from '../../../services/docker-relaunch'
import { observeRegisteredEnvironments } from '../../../services/observe'
import { recordOperatorEvent } from '../../../services/operator-events'
import { getRegisteredEnvironment } from '../../../services/registry'
import { retiredRuntimeMessage } from '../../../../shared/utils/lifecycle'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const row = await getRegisteredEnvironment(useDb(), id)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Environment not registered.' })
  }
  const retired = retiredRuntimeMessage(row.lifecycleStatus, 'stopped')
  if (retired) {
    throw createError({ statusCode: 409, statusMessage: retired })
  }
  const stop = stopRegisteredEnvironment(row)
  await recordOperatorEvent(useDb(), {
    action: 'environment.stop',
    summary: `Stopped ${row.slug}.`,
    customerId: row.customer.id,
    productInstanceId: row.productInstance.id,
    environmentId: row.id,
  })
  return {
    stop,
    lifecycleStatus: row.lifecycleStatus,
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(useDb()),
  }
})
