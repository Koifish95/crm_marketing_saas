import { createError, defineEventHandler, readBody } from 'h3'
import { createMarketingTaskSchema } from '../../../../shared/schemas/marketing-task'
import { useDb } from '../../../database'
import { createMarketingTask } from '../../../services/marketing-tasks'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_MARKETING_TASKS')
  const parsed = createMarketingTaskSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid marketing task.' })
  }
  try {
    return await createMarketingTask(useDb(), parsed.data, actor)
  } catch (error) {
    throwDomain(error)
  }
})
