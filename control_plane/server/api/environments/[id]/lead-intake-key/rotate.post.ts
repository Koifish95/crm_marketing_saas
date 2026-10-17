import { useDb } from '../../../../database'
import { FleetBackupError, rotateLeadIntakeKey } from '../../../../services/fleet-backup'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return await rotateLeadIntakeKey(useDb(), id)
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({ statusCode: 500, statusMessage: 'Lead intake key request failed.' })
  }
})
