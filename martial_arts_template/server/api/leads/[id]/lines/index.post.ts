import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { createLeadLineSchema } from '../../../../../shared/schemas/lead'
import { useDb } from '../../../../database'
import { addLeadLineToHousehold } from '../../../../services/lead-lines'
import { getLead } from '../../../../services/leads'
import { throwDomain } from '../../../../utils/api'
import { requireCrmWriteUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  const parsed = createLeadLineSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid prospective member.' })
  }
  try {
    await addLeadLineToHousehold(useDb(), id, parsed.data, user)
    return await getLead(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
