import { z } from 'zod'
import { useDb } from '../../../../database'
import { copyEnvironmentBackupOffhost, FleetBackupError, recordVerifiedOffhostRemote, summarizeBackup } from '../../../../services/fleet-backup'

const Body = z.object({
  destinationDir: z.string().optional(),
  remotePath: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'destinationDir or remotePath is required.' })
  }
  const destinationDir = parsed.data.destinationDir?.trim() || ''
  const remotePath = parsed.data.remotePath?.trim() || ''
  if (Boolean(destinationDir) === Boolean(remotePath)) {
    throw createError({ statusCode: 400, statusMessage: 'Provide a local destinationDir or a verified remotePath.' })
  }
  try {
    const backup = remotePath
      ? await recordVerifiedOffhostRemote(useDb(), id, remotePath)
      : await copyEnvironmentBackupOffhost(useDb(), id, destinationDir)
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
