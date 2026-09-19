export function normalizePublicHostname(raw: string) {
  return raw.trim().toLowerCase().replace(/\.$/, '')
}

export function assertPublicHostname(raw: string) {
  const hostname = normalizePublicHostname(raw)
  if (!hostname) {
    throw new Error('Public hostname is required.')
  }
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
    throw new Error('Use a real DNS hostname, not localhost.')
  }
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(hostname)) {
    throw new Error('Hostname must be a DNS name with at least one dot (e.g. ma-test.example.com).')
  }
  return hostname
}

export function publicOriginForHostname(hostname: string) {
  return `https://${assertPublicHostname(hostname)}`
}

export function accessUrlForEnvironment(input: {
  hostPort: number
  publicHostname?: string | null
}) {
  if (input.publicHostname) {
    return publicOriginForHostname(input.publicHostname)
  }
  return `http://localhost:${input.hostPort}`
}
