import { useDb } from '../../../database'
import { getRegisteredEnvironment } from '../../../services/registry'
import { environmentProvisionGuard, provisionCustomerEnvironments } from '../../../services/provision-runtime'

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
  try {
    const environments = await provisionCustomerEnvironments(useDb(), row!.customer.id, undefined, [id])
    if (environments.every(item => item.status === 'failed')) {
      throw createError({ statusCode: 500, statusMessage: environments[0]?.error || 'Provision failed.' })
    }
    return { environmentId: id, customerId: row!.customer.id, environments }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Provision failed.',
    })
  }
})
