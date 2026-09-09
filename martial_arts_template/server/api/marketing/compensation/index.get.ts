import { defineEventHandler } from 'h3'
import { useDb } from '../../../database'
import { listCompensationLedger } from '../../../services/compensation'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING_REPORTS')
  try {
    return await listCompensationLedger(useDb())
  } catch (error) {
    throwDomain(error)
  }
})
