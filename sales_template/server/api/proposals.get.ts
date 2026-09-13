import { defineEventHandler } from 'h3'
import { listProposalSummaries } from '../services/proposals'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  try {
    return await listProposalSummaries(useDb())
  } catch (error) {
    throwDomain(error)
  }
})
