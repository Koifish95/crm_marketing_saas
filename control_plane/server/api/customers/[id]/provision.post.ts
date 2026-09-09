import { useDb } from '../../../database'
import { provisionCustomerEnvironments } from '../../../services/provision-runtime'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Customer id required.' })
  }
  try {
    const environments = await provisionCustomerEnvironments(useDb(), id)
    if (environments.every(row => row.status === 'failed')) {
      throw createError({ statusCode: 500, statusMessage: environments[0]?.error || 'Provision failed.' })
    }
    return { customerId: id, environments }
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
