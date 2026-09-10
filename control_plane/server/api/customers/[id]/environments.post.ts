import { z } from 'zod'
import { useDb } from '../../../database'
import { ProvisionError, addExtraNonProdEnvironment } from '../../../services/provision-registry'
import { provisionCustomerEnvironments } from '../../../services/provision-runtime'
import { NON_PROD_TYPES } from '../../../services/provision-contract'

const Body = z.object({
  type: z.enum(NON_PROD_TYPES),
  displayName: z.string(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Customer id required.' })
  }
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Non-PROD type and display name are required.' })
  }
  try {
    const created = await addExtraNonProdEnvironment(useDb(), id, parsed.data)
    const results = await provisionCustomerEnvironments(useDb(), id, undefined, [created.id])
    return { customerId: id, environment: created, provision: results }
  } catch (error) {
    if (error instanceof ProvisionError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Extra environment failed.',
    })
  }
})
