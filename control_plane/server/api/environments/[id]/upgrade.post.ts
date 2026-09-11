import { z } from 'zod'
import { useDb } from '../../../database'
import { FleetBackupError, upgradeRegisteredEnvironment } from '../../../services/fleet-backup'

const Body = z.object({
  expectedImage: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const parsed = Body.safeParse(await readBody(event).catch(() => ({})))
  try {
    return await upgradeRegisteredEnvironment(useDb(), id, parsed.success ? parsed.data.expectedImage : undefined)
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Upgrade failed.',
    })
  }
})
