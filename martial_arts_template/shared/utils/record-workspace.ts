export type QueryValue = string | number | null | undefined | Array<string | number | null | undefined>

export type QueryRecord = Record<string, QueryValue>

export function mergeRouteQuery(query: QueryRecord, patch: QueryRecord): Record<string, string> {
  const merged: QueryRecord = { ...query, ...patch }
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(merged)) {
    const text = firstQueryValue(value)
    if (text) {
      next[key] = text
    }
  }
  return next
}

export function firstQueryValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) {
    return firstQueryValue(value[0])
  }
  if (value == null) {
    return undefined
  }
  const text = String(value).trim()
  return text || undefined
}

export function adjacentRecordIds(ids: number[], currentId: number) {
  const index = ids.indexOf(currentId)
  if (index < 0) {
    return { previousId: null as number | null, nextId: null as number | null, index: -1 }
  }
  return {
    previousId: index > 0 ? ids[index - 1]! : null,
    nextId: index < ids.length - 1 ? ids[index + 1]! : null,
    index,
  }
}

export function filterRecordsByLabel<T extends { label: string }>(records: T[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return records
  }
  return records.filter(record => record.label.toLowerCase().includes(needle))
}
