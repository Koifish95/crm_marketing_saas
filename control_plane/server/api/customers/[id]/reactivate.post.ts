import { useDb } from '../../../database'
import { AccountLifecycleError, reactivateCustomer } from '../../../services/account-lifecycle'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Customer id required.' })
  }
  try {
    const customer = await reactivateCustomer(useDb(), id)
    return { customer }
  } catch (error) {
    if (error instanceof AccountLifecycleError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Reactivate failed.',
    })
  }
})
