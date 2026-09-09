import { firstQueryValue, type QueryRecord } from './record-workspace'

export const LEAD_LIST_QUERY_KEYS = ['search', 'status', 'programId', 'source', 'campaignId'] as const

export function leadListQuery(query: QueryRecord): Record<string, string> {
  const next: Record<string, string> = {}
  for (const key of LEAD_LIST_QUERY_KEYS) {
    const value = firstQueryValue(query[key])
    if (value) {
      next[key] = value
    }
  }
  return next
}

export function leadStaffPath(leadId: number, query?: QueryRecord) {
  const filters = query ? leadListQuery(query) : {}
  const params = new URLSearchParams(filters)
  const suffix = params.toString()
  return suffix ? `/leads/${leadId}?${suffix}` : `/leads/${leadId}`
}
