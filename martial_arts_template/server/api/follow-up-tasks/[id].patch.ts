import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { patchFollowUpTaskSchema } from '../../../shared/schemas/follow-up-task'
import { useDb } from '../../database'
import { assignFollowUpTask, cancelFollowUpTask, completeFollowUpTask } from '../../services/follow-up'
import { throwDomain } from '../../utils/api'
import { requireCrmWriteUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid follow-up task id.' })
  }
  const parsed = patchFollowUpTaskSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid follow-up update.' })
  }

  try {
    if (parsed.data.action === 'complete') {
      if (!parsed.data.outcome) {
        throw createError({ statusCode: 400, message: 'A call outcome is required to complete this task.' })
      }
      return await completeFollowUpTask(useDb(), id, {
        outcome: parsed.data.outcome,
        notes: parsed.data.notes,
      }, user)
    }
    if (parsed.data.action === 'cancel') {
      return await cancelFollowUpTask(useDb(), id, { notes: parsed.data.notes })
    }
    if (parsed.data.assignedUserId === undefined) {
      throw createError({ statusCode: 400, message: 'Choose a staff member or unassign the task.' })
    }
    return await assignFollowUpTask(useDb(), id, parsed.data.assignedUserId)
  } catch (error) {
    throwDomain(error)
  }
})
