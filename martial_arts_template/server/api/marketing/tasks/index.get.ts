import { createError, defineEventHandler, getQuery } from 'h3'
import { listMarketingTasksQuerySchema } from '../../../../shared/schemas/marketing-task'
import { useDb } from '../../../database'
import { listMarketingTasks } from '../../../services/marketing-tasks'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  const raw = getQuery(event)
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined),
  )
  const parsed = listMarketingTasksQuerySchema.safeParse(cleaned)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid marketing task filters.' })
  }
  try {
    return await listMarketingTasks(useDb(), parsed.data.view, undefined, { campaignId: parsed.data.campaignId })
  } catch (error) {
    throwDomain(error)
  }
})
