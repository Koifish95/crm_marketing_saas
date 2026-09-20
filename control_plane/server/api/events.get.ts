import { useDb } from '../database'
import { listOperatorEvents } from '../services/operator-events'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const customerId = typeof query.customerId === 'string' ? query.customerId : undefined
  const environmentId = typeof query.environmentId === 'string' ? query.environmentId : undefined
  const limit = Number.parseInt(String(query.limit || '50'), 10)
  return {
    events: await listOperatorEvents(useDb(), {
      customerId,
      environmentId,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
    }),
  }
})
