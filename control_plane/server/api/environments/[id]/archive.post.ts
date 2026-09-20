import { z } from 'zod'
import { useDb } from '../../../database'
import { ArchiveError, archiveAndDeleteEnvironment } from '../../../services/archive'
import { observeRegisteredEnvironments } from '../../../services/observe'

const Body = z.object({
  confirmSlug: z.string(),
  confirmPhrase: z.string(),
  destinationDir: z.string().optional(),
  skipOffhost: z.boolean().optional(),
  note: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'confirmSlug and confirmPhrase are required.' })
  }
  try {
    const archive = await archiveAndDeleteEnvironment(useDb(), id, parsed.data)
    return {
      archive,
      checkedAt: new Date().toISOString(),
      environments: await observeRegisteredEnvironments(useDb()),
    }
  } catch (error) {
    if (error instanceof ArchiveError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Archive & Delete failed.',
    })
  }
})
