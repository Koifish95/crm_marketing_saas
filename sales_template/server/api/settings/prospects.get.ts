import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { readProspectDeskConfig, toPublicProspectDeskConfig } from '../../services/prospect-desk-settings'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  return toPublicProspectDeskConfig(await readProspectDeskConfig(useDb()))
})
