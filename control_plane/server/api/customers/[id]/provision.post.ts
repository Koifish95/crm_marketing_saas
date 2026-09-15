import { useDb } from '../../../database'
import { startBackgroundProvision } from '../../../services/provision-runtime'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Customer id required.' })
  }
  const provision = startBackgroundProvision(useDb(), id)
  return { customerId: id, ...provision }
})
