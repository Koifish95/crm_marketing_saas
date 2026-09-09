import { createError, defineEventHandler, getQuery } from 'h3'
import { listFollowUpTasksQuerySchema } from '../../../shared/schemas/follow-up-task'
import { useDb } from '../../database'
import { listFollowUpTasks } from '../../services/follow-up'
import { throwDomain } from '../../utils/api'
import { requireCrmAccessUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  const parsed = listFollowUpTasksQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid follow-up filters.' })
  }
  try {
    return await listFollowUpTasks(useDb(), parsed.data.view)
  } catch (error) {
    throwDomain(error)
  }
})
