import { z } from 'zod'
import { useDb } from '../../../../database'
import { copyEnvironmentBackupOffhost, FleetBackupError, summarizeBackup } from '../../../../services/fleet-backup'

const Body = z.object({
  destinationDir: z.string(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'destinationDir is required.' })
  }
  try {
    const backup = await copyEnvironmentBackupOffhost(useDb(), id, parsed.data.destinationDir)
    return { backup: summarizeBackup(backup) }
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Off-host copy failed.',
    })
  }
})
