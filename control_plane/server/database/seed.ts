import { eq } from 'drizzle-orm'
import { createStableId } from '../../shared/utils/ids'
import { createDb, getDatabaseUrl } from './index'
import { customers, environments, hostingNodes } from './schema'
import { EXPECTED_IMAGE, LAB_CUSTOMER_SLUG, LAB_ENVIRONMENTS, LAB_NODE_NAME } from './lab-seed'

export async function seedRegistry(databaseUrl = getDatabaseUrl()) {
  const { client, db } = createDb(databaseUrl)
  const now = new Date().toISOString()
  try {
    await client.execute('PRAGMA foreign_keys = ON')

    const [existingCustomer] = await db.select().from(customers).where(eq(customers.slug, LAB_CUSTOMER_SLUG)).limit(1)
    const customerId = existingCustomer?.id ?? createStableId()
    if (!existingCustomer) {
      await db.insert(customers).values({
        id: customerId,
        slug: LAB_CUSTOMER_SLUG,
        displayName: 'Acme BJJ',
        industryTemplate: 'martial-arts',
        createdAt: now,
      })
    }

    const [existingNode] = await db.select().from(hostingNodes).where(eq(hostingNodes.name, LAB_NODE_NAME)).limit(1)
    const nodeId = existingNode?.id ?? createStableId()
    if (!existingNode) {
      await db.insert(hostingNodes).values({
        id: nodeId,
        name: LAB_NODE_NAME,
        kind: 'laptop',
        driver: 'local-docker',
        createdAt: now,
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
        hostingNodeId: nodeId,
        type: env.type,
        displayName: env.displayName,
        slug: env.slug,
        containerName: env.containerName,
        composeProject: env.composeProject,
        composeFile: env.composeFile,
        envFileLocal: env.envFileLocal,
        envFileExample: env.envFileExample,
        healthUrl: env.healthUrl,
        sqliteVolume: env.sqliteVolume,
        assetsVolume: env.assetsVolume,
        expectedImage: EXPECTED_IMAGE,
        isolationMarker: env.isolationMarker,
        createdAt: now,
      })
    }

    return { customerId, nodeId }
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
