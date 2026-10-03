import { useDb } from '../../../database'
import { listQaRuns } from '../../../services/qa'

export default defineEventHandler(async (event) => {
  const raw = Number.parseInt(String(getQuery(event).limit || '50'), 10)
  return { runs: await listQaRuns(useDb(), Number.isFinite(raw) ? raw : 50) }
})
