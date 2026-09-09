import { defineEventHandler } from 'h3'
import { useDb } from '../database'
import { listPrograms } from '../services/leads'
import { requireCrmAccessUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  return listPrograms(useDb())
})
