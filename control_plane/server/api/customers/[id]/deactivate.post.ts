import { z } from 'zod'
import { useDb } from '../../../database'
import { AccountLifecycleError, deactivateCustomer } from '../../../services/account-lifecycle'

const Body = z.object({
  note: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Customer id required.' })
  }
  const parsed = Body.safeParse(await readBody(event) || {})
  try {
    const customer = await deactivateCustomer(useDb(), id, parsed.success ? parsed.data.note : undefined)
    return { customer }
  } catch (error) {
    if (error instanceof AccountLifecycleError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Deactivate failed.',
    })
  }
})
