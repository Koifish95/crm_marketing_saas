import { defineEventHandler } from 'h3'
import { useDb } from '../../../database'
import { listAccessCatalog } from '../../../services/access-rights'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  try {
    return await listAccessCatalog(useDb())
  } catch (error) {
    throwDomain(error)
  }
})
