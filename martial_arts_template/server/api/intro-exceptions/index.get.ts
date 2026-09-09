import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { listIntroExceptions } from '../../services/availability'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  return listIntroExceptions(useDb())
})
