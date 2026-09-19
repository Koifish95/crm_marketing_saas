import { createError, defineEventHandler, readBody } from 'h3'
import { useDb } from '../../../database'
import { importLeadsFromCsv, leadImportTemplateCsv } from '../../../services/lead-import'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const body = await readBody(event) as { csv?: string, template?: boolean } | null
  if (body?.template) {
    return { csv: leadImportTemplateCsv() }
  }
  if (!body?.csv || typeof body.csv !== 'string') {
    throw createError({ statusCode: 400, message: 'Provide csv text.' })
  }
  try {
    return await importLeadsFromCsv(useDb(), body.csv, actor)
  } catch (error) {
    throwDomain(error)
  }
})
