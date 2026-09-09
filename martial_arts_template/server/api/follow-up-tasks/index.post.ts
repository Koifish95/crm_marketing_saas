import { createError, defineEventHandler, readBody } from 'h3'
import { createFollowUpTaskSchema } from '../../../shared/schemas/follow-up-task'
import { useDb } from '../../database'
import { createManualFollowUpTask } from '../../services/follow-up'
import { throwDomain } from '../../utils/api'
import { requireCrmWriteUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmWriteUser(event)
  const parsed = createFollowUpTaskSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid follow-up task.' })
  }
  try {
    return await createManualFollowUpTask(useDb(), {
      leadId: parsed.data.leadId,
      trialId: parsed.data.trialId,
      dueAt: parsed.data.dueAt,
      assignedUserId: parsed.data.assignedUserId,
      notes: parsed.data.notes,
      leadLineIds: parsed.data.leadLineIds,
    })
  } catch (error) {
    throwDomain(error)
  }
})
