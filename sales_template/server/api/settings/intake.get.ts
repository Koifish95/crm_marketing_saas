import { defineEventHandler } from 'h3'
import { readPublicIntakeConfig } from '../../services/public-intake'
import { useDb } from '../../database'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  return readPublicIntakeConfig(useDb())
})
