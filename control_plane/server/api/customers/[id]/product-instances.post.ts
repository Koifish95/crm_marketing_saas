import { z } from 'zod'
import { useDb } from '../../../database'
import { ProvisionError, addProductInstance } from '../../../services/provision-registry'
import { startBackgroundProvision } from '../../../services/provision-runtime'

const Body = z.object({
  productId: z.string(),
  displayName: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Customer id required.' })
  }
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Select a product.' })
  }
  try {
    const created = await addProductInstance(useDb(), id, parsed.data)
    const provision = startBackgroundProvision(
      useDb(),
      id,
      undefined,
      created.environments.map(row => row.id),
      created.productInstanceId,
    )
    return { ...created, ...provision }
  } catch (error) {
    if (error instanceof ProvisionError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Add product failed.',
    })
  }
})
