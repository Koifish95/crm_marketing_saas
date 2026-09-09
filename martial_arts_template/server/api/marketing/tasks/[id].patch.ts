import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateMarketingTaskSchema } from '../../../../shared/schemas/marketing-task'
import { useDb } from '../../../database'
import { updateMarketingTask } from '../../../services/marketing-tasks'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_MARKETING_TASKS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid marketing task.' })
  }
  const parsed = updateMarketingTaskSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid marketing task.' })
  }
  try {
    return await updateMarketingTask(useDb(), id, parsed.data, actor)
  } catch (error) {
    throwDomain(error)
  }
})
