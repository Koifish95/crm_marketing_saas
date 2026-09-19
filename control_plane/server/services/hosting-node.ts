import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { hostingNodes } from '../database/schema'
import { createStableId } from '../../shared/utils/ids'

export const HOSTING_NODE_KINDS = ['laptop', 'vps'] as const
export type HostingNodeKind = typeof HOSTING_NODE_KINDS[number]

export const HOSTING_NODE_DRIVER = 'local-docker'

export type HostingNodeSpec = {
  name: string
  kind: HostingNodeKind
  driver: typeof HOSTING_NODE_DRIVER
}

export function localHostingNodeSpec(): HostingNodeSpec {
  const name = (process.env.HOSTING_NODE_NAME || 'laptop').trim() || 'laptop'
  const rawKind = (process.env.HOSTING_NODE_KIND || (name === 'laptop' ? 'laptop' : 'vps')).trim()
  const kind: HostingNodeKind = rawKind === 'vps' ? 'vps' : 'laptop'
  return {
    name,
    kind,
    driver: HOSTING_NODE_DRIVER,
  }
}

export function edgeProxyMode(kind: HostingNodeKind = localHostingNodeSpec().kind) {
  const raw = (process.env.EDGE_PROXY_MODE || '').trim()
  if (raw === 'host-network' || raw === 'docker-desktop') {
    return raw
  }
  return kind === 'vps' ? 'host-network' : 'docker-desktop'
}

export async function ensureHostingNode(db: Database, spec: HostingNodeSpec = localHostingNodeSpec()) {
  const [existing] = await db.select().from(hostingNodes).where(eq(hostingNodes.name, spec.name)).limit(1)
  if (existing) {
    return existing
  }
  const row = {
    id: createStableId(),
    name: spec.name,
    kind: spec.kind,
    driver: spec.driver,
    createdAt: new Date().toISOString(),
  }
  await db.insert(hostingNodes).values(row)
  return row
}

export async function requireLocalHostingNode(db: Database) {
  return ensureHostingNode(db)
}
