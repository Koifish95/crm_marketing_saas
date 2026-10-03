import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { readProspectDeskConfig } from '../../services/prospect-desk-settings'

export default defineEventHandler(async () => {
  const config = await readProspectDeskConfig(useDb())
  return { enabled: config.enabled }
})
