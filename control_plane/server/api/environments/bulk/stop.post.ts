import { z } from 'zod'
import { useDb } from '../../../database'
import { runBulkLifecycle } from '../../../services/fleet-lifecycle'

const Body = z.object({
  scope: z.enum(['selected', 'all']),
  ids: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'scope is required.' })
  }
  if (parsed.data.scope === 'selected' && !parsed.data.ids?.length) {
    throw createError({ statusCode: 400, statusMessage: 'ids are required for selected scope.' })
  }
  return await runBulkLifecycle(useDb(), 'stop', parsed.data)
})
