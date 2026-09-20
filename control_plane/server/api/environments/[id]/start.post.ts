import { useDb } from '../../../database'
import { startRegisteredEnvironment } from '../../../services/docker-relaunch'
import { observeRegisteredEnvironments } from '../../../services/observe'
import { recordOperatorEvent } from '../../../services/operator-events'
import { getRegisteredEnvironment } from '../../../services/registry'
import { isRetryableLifecycle } from '../../../../shared/utils/provision'
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
  const retired = retiredRuntimeMessage(row.lifecycleStatus, 'started')
  if (retired) {
    throw createError({ statusCode: 409, statusMessage: retired })
  }
  if (isRetryableLifecycle(row.lifecycleStatus)) {
    throw createError({ statusCode: 409, statusMessage: 'Retry provision before starting this environment.' })
  }
  const inactive = inactiveAccountMessage(row.customer.status, row.productInstance.status)
  if (inactive) {
    throw createError({ statusCode: 409, statusMessage: inactive })
  }
  const start = startRegisteredEnvironment(row)
  await recordOperatorEvent(useDb(), {
    action: 'environment.start',
    summary: `Started ${row.slug}.`,
    customerId: row.customer.id,
    productInstanceId: row.productInstance.id,
    environmentId: row.id,
  })
  return {
    start,
    lifecycleStatus: row.lifecycleStatus,
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(useDb()),
  }
})
