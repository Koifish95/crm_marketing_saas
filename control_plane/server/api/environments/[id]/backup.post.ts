import { useDb } from '../../../database'
import { backupRegisteredEnvironment, FleetBackupError, summarizeBackup } from '../../../services/fleet-backup'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  try {
    const backup = await backupRegisteredEnvironment(useDb(), id)
    return { backup: summarizeBackup(backup) }
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Backup failed.',
    })
  }
})
