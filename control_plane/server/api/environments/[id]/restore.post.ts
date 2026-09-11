import { z } from 'zod'
import { useDb } from '../../../database'
import { FleetBackupError, restoreRegisteredEnvironment } from '../../../services/fleet-backup'

const Body = z.object({
  confirm: z.boolean(),
  zipPath: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const parsed = Body.safeParse(await readBody(event).catch(() => ({})))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Confirm is required to restore.' })
  }
  try {
    return await restoreRegisteredEnvironment(useDb(), id, parsed.data.confirm, parsed.data.zipPath)
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Restore failed.',
    })
  }
})
