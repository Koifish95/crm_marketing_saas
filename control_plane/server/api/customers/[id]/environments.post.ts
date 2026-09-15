import { z } from 'zod'
import { useDb } from '../../../database'
import { ProvisionError, addExtraNonProdEnvironment } from '../../../services/provision-registry'
import { startBackgroundProvision } from '../../../services/provision-runtime'
import { NON_PROD_TYPES } from '../../../services/provision-contract'
import { productInstances } from '../../../database/schema'
import { eq } from 'drizzle-orm'

const Body = z.object({
  productInstanceId: z.string(),
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
    throw createError({ statusCode: 400, statusMessage: 'Product instance, non-PROD type, and display name are required.' })
  }
  const db = useDb()
  const [instance] = await db.select().from(productInstances).where(eq(productInstances.id, parsed.data.productInstanceId)).limit(1)
  if (!instance || instance.customerId !== id) {
    throw createError({ statusCode: 404, statusMessage: 'Product instance not found.' })
  }
  try {
    const created = await addExtraNonProdEnvironment(db, parsed.data.productInstanceId, {
      type: parsed.data.type,
      displayName: parsed.data.displayName,
    })
    const provision = startBackgroundProvision(db, id, undefined, [created.id], parsed.data.productInstanceId)
    return { customerId: id, environment: created, ...provision }
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
