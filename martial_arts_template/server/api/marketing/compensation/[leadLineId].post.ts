import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { assignCompensationSchema } from '../../../../shared/schemas/compensation'
import { useDb } from '../../../database'
import { assignCompensationAttribution, snapshotCompensationEarned } from '../../../services/compensation'
import { conversions } from '../../../database/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_COMPENSATION_ATTRIBUTION')
  const leadLineId = Number(getRouterParam(event, 'leadLineId'))
  if (!Number.isInteger(leadLineId) || leadLineId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid prospective member.' })
  }
  const parsed = assignCompensationSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid assignment.' })
  }
  try {
    const attribution = await assignCompensationAttribution(useDb(), leadLineId, parsed.data, actor)
    const [active] = await useDb().select().from(conversions).where(and(
      eq(conversions.leadLineId, leadLineId),
      isNull(conversions.reversedAt),
    )).limit(1)
    if (active) {
      await snapshotCompensationEarned(useDb(), active.id)
    }
    return attribution
  } catch (error) {
    throwDomain(error)
  }
})
