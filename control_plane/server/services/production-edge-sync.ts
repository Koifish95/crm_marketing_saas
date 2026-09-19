import type { HostingNodeKind } from './hosting-node'
import {
  generateProductionEdge,
  reloadProductionEdge,
  routesFromEnvironments,
  writeProductionEdge,
} from './production-edge'

export function generateProductionEdgeFilesFromRegistry(
  rows: readonly {
    type: string
    hostPort: number
    publicHostname?: string | null
    slug?: string
    lifecycleStatus?: string | null
    productInstance?: { productId?: string }
  }[],
  input: {
    kind?: HostingNodeKind
    edgeDir?: string
  } = {},
) {
  const routes = routesFromEnvironments(rows)
  writeProductionEdge({
    routes,
    kind: input.kind,
    edgeDir: input.edgeDir,
  })
  let reloaded = false
  let reason: string | undefined
  try {
    const reload = reloadProductionEdge(input.edgeDir)
    reloaded = reload.reloaded
    reason = 'reason' in reload ? reload.reason : undefined
  } catch (error) {
    reason = error instanceof Error ? error.message : 'nginx reload failed'
  }
  return {
    ...generateProductionEdge({ routes, kind: input.kind, edgeDir: input.edgeDir }),
    reloaded,
    reason,
  }
}
