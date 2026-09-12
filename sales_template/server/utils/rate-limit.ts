const buckets = new Map<string, number[]>()

export function allowPublicRequest(key: string, limit = 8, windowMs = 10 * 60_000) {
  const now = Date.now()
  const recent = (buckets.get(key) ?? []).filter(timestamp => now - timestamp < windowMs)
  if (recent.length >= limit) {
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  return true
}

export function resetPublicRateLimit() {
  buckets.clear()
}
