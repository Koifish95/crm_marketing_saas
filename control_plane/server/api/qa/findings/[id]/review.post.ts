import { createError } from 'h3'
import { findingReviewSchema } from '../../../../../shared/schemas/ticketing'
import { useDb } from '../../../../database'
import { reviewFinding } from '../../../../services/qa'

export default defineEventHandler(async (event) => {
  const parsed = findingReviewSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Invalid review.' })
  return reviewFinding(useDb(), getRouterParam(event, 'id') || '', parsed.data)
})
