import { defineEventHandler } from 'h3'
import { useDb } from '../database'
import { listActiveStaffUsers } from '../services/follow-up'
import { requireCrmAccessUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  return listActiveStaffUsers(useDb())
})
