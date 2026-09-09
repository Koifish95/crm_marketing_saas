import { createError, defineEventHandler, readBody } from 'h3'
import { createHouseholdLeadSchema, createLeadSchema } from '../../../shared/schemas/lead'
import { useDb } from '../../database'
import { createLead } from '../../services/leads'
import { createStaffHousehold } from '../../services/staff-household'
import { throwDomain } from '../../utils/api'
import { requireCrmWriteUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const body = await readBody(event)
  if (body && typeof body === 'object' && Array.isArray((body as { members?: unknown }).members)) {
    const parsed = createHouseholdLeadSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid household.' })
    }
    try {
      const created = await createStaffHousehold(useDb(), parsed.data, user)
      return created.lead
    } catch (error) {
      throwDomain(error)
    }
  }

  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid lead.' })
  }
  try {
    return await createLead(useDb(), parsed.data, user)
  } catch (error) {
    throwDomain(error)
  }
})
