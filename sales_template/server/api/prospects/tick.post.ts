import { DomainError } from '@crm/core/server/services/errors'
import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { readProspectDeskConfig } from '../../services/prospect-desk-settings'
import { runProspectTick } from '../../services/prospect-outreach'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  try {
    const db = useDb()
    const config = await readProspectDeskConfig(db)
    if (!config.enabled) {
      throw new DomainError('Prospect desk is off.', 404)
    }
    return await runProspectTick(db)
  } catch (error) {
    throwDomain(error)
  }
})
