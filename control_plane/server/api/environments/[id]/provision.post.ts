import { useDb } from '../../../database'
import { getRegisteredEnvironment } from '../../../services/registry'
import { environmentProvisionGuard, startBackgroundProvision } from '../../../services/provision-runtime'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const row = await getRegisteredEnvironment(useDb(), id)
  const guard = environmentProvisionGuard(row)
  if (guard) {
    throw createError(guard)
  }
  const provision = startBackgroundProvision(useDb(), row!.customer.id, undefined, [id])
  return { environmentId: id, customerId: row!.customer.id, ...provision }
})
