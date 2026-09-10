import { useDb } from '../../../database'
import { DecommissionError, decommissionEnvironment } from '../../../services/decommission'
import { observeRegisteredEnvironments } from '../../../services/observe'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  try {
    const decommission = await decommissionEnvironment(useDb(), id)
    return {
      decommission,
      checkedAt: new Date().toISOString(),
      environments: await observeRegisteredEnvironments(useDb()),
    }
  } catch (error) {
    if (error instanceof DecommissionError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Decommission failed.',
    })
  }
})
