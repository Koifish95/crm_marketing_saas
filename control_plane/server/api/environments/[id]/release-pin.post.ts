import { useDb } from '../../../database'
import { FleetBackupError, publishRunningIdentity } from '../../../services/fleet-backup'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  try {
    return await publishRunningIdentity(useDb(), id)
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Release pin failed.',
    })
  }
})
