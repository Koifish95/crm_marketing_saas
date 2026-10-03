import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { resumeProspectSending } from '../../services/prospect-outreach'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  try {
    return await resumeProspectSending(useDb(), user.id)
  } catch (error) {
    throwDomain(error)
  }
})
