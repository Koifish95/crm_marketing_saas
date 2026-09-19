import { eq } from 'drizzle-orm'
import { createStableId } from '../../shared/utils/ids'
import { backfillInstanceId } from '../products/catalog'
import { createDb, getDatabaseUrl } from './index'
import { customers, environments, hostingNodes, productInstances } from './schema'
import { EXPECTED_IMAGE, LAB_CUSTOMER_SLUG, LAB_ENVIRONMENTS, LAB_NODE_NAME } from './lab-seed'
import { ensureHostingNode, localHostingNodeSpec } from '../services/hosting-node'

export async function seedRegistry(databaseUrl = getDatabaseUrl()) {
  const { client, db } = createDb(databaseUrl)
  const now = new Date().toISOString()
  try {
    await client.execute('PRAGMA foreign_keys = ON')

    const [existingLabNode] = await db.select().from(hostingNodes).where(eq(hostingNodes.name, LAB_NODE_NAME)).limit(1)
    const labNodeId = existingLabNode?.id ?? createStableId()
    if (!existingLabNode) {
      await db.insert(hostingNodes).values({
        id: labNodeId,
        name: LAB_NODE_NAME,
        kind: 'laptop',
        driver: 'local-docker',
        createdAt: now,
      })
    }

    const localNode = await ensureHostingNode(db, localHostingNodeSpec())

    if (process.env.SKIP_LAB_SEED === 'true') {
      return { customerId: null, nodeId: localNode.id, productInstanceId: null }
    }

    const [existingCustomer] = await db.select().from(customers).where(eq(customers.slug, LAB_CUSTOMER_SLUG)).limit(1)
    const customerId = existingCustomer?.id ?? createStableId()
    if (!existingCustomer) {
      await db.insert(customers).values({
        id: customerId,
        slug: LAB_CUSTOMER_SLUG,
        displayName: 'Acme BJJ',
        industryTemplate: 'martial-arts',
        timezone: 'America/Denver',
        adminEmail: 'admin@lab-acme.local',
        createdAt: now,
      })
    }

    const instanceId = backfillInstanceId(customerId)
    const [existingInstance] = await db.select().from(productInstances).where(eq(productInstances.id, instanceId)).limit(1)
    if (!existingInstance) {
      await db.insert(productInstances).values({
        id: instanceId,
        customerId,
        productId: 'martial-arts',
        displayName: existingCustomer?.displayName ?? 'Acme BJJ',
        slug: LAB_CUSTOMER_SLUG,
        createdAt: existingCustomer?.createdAt ?? now,
      })
    }

    for (const env of LAB_ENVIRONMENTS) {
      const [existing] = await db.select().from(environments).where(eq(environments.slug, env.slug)).limit(1)
      if (existing) {
        continue
      }
      await db.insert(environments).values({
        id: createStableId(),
        customerId,
        productInstanceId: instanceId,
        hostingNodeId: labNodeId,
        type: env.type,
        displayName: env.displayName,
        slug: env.slug,
        containerName: env.containerName,
        composeProject: env.composeProject,
        composeFile: env.composeFile,
        envFileLocal: env.envFileLocal,
        envFileExample: env.envFileExample,
        healthUrl: env.healthUrl,
        accessUrl: env.accessUrl,
        sqliteVolume: env.sqliteVolume,
        assetsVolume: env.assetsVolume,
        expectedImage: EXPECTED_IMAGE,
        isolationMarker: env.isolationMarker,
        hostPort: env.hostPort,
        lifecycleStatus: 'ready',
        createdAt: now,
      })
    }

    return { customerId, nodeId: labNodeId, productInstanceId: instanceId }
  } finally {
    client.close()
  }
}

const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('/server/database/seed.ts')
if (invoked) {
  seedRegistry().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
