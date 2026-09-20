import { useDb } from '../../../database'
import { AccountLifecycleError, reactivateProductInstance } from '../../../services/account-lifecycle'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Product instance id required.' })
  }
  try {
    const productInstance = await reactivateProductInstance(useDb(), id)
    return { productInstance }
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
