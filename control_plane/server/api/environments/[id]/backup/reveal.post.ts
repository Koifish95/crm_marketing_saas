import { z } from 'zod'
import { useDb } from '../../../../database'
import { FleetBackupError, revealEnvironmentBackup } from '../../../../services/fleet-backup'

const Body = z.object({
  backupId: z.string(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'backupId is required.' })
  }
  try {
    return await revealEnvironmentBackup(useDb(), id, parsed.data.backupId)
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Could not open the backup folder.',
    })
  }
})
