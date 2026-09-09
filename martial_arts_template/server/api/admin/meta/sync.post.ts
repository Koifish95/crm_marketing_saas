import { defineEventHandler } from 'h3'
import { useDb } from '../../../database'
import { syncMetaData } from '../../../services/meta'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  try {
    return await syncMetaData(useDb(), user)
  } catch (error) {
    throwDomain(error)
  }
})
