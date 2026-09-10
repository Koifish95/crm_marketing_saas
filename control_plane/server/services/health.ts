export type CombinedStatus = 'healthy' | 'stopped' | 'missing' | 'unhealthy' | 'unknown'

export type HealthProbe = {
  ok: boolean
  database?: string
  error?: string
}

const HEALTH_TIMEOUT_MS = 4000

export function assertRegisteredHealthUrl(url: string, registered: readonly string[]) {
  if (!registered.includes(url) || !url.startsWith('http://127.0.0.1:')) {
    throw new Error(`Refusing health probe for ${url}. Registered loopback URLs only.`)
  }
}

export function parseHealthBody(status: number, body: unknown): HealthProbe {
  if (status !== 200 || !body || typeof body !== 'object') {
    return { ok: false, error: `HTTP ${status}` }
  }
  const record = body as { ok?: unknown, database?: unknown }
  const ok = record.ok === true && record.database === 'reachable'
  return {
    ok,
    database: typeof record.database === 'string' ? record.database : undefined,
    error: ok ? undefined : 'health body was not ok + reachable',
  }
}

export function combineStatus(runtime: 'running' | 'stopped' | 'missing' | 'unknown', healthOk: boolean | null): CombinedStatus {
  if (runtime === 'unknown') {
    return 'unknown'
  }
  if (runtime === 'missing') {
    return 'missing'
  }
  if (runtime !== 'running') {
    return 'stopped'
  }
  if (healthOk === true) {
    return 'healthy'
  }
  return 'unhealthy'
}

export async function probeRegisteredHealth(url: string, registered: readonly string[]): Promise<HealthProbe> {
  assertRegisteredHealthUrl(url, registered)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    const body = await response.json().catch(() => null)
    return parseHealthBody(response.status, body)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'health probe failed',
    }
  } finally {
    clearTimeout(timer)
  }
}
