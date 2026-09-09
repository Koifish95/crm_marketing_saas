import { useDb } from '../database'
import { environmentHeadline, listRegisteredEnvironments } from '../services/registry'

export default defineEventHandler(async () => {
  const rows = await listRegisteredEnvironments(useDb())
  return {
    environments: rows
      .sort((left, right) => left.type.localeCompare(right.type) * -1)
      .map(row => ({
        id: row.id,
        headline: environmentHeadline({
          customerDisplayName: row.customer.displayName,
          type: row.type,
        }),
        customer: row.customer,
        node: row.node,
        type: row.type,
        displayName: row.displayName,
        slug: row.slug,
        containerName: row.containerName,
        healthUrl: row.healthUrl,
        accessUrl: row.accessUrl,
        expectedImage: row.expectedImage,
        sqliteVolume: row.sqliteVolume,
        assetsVolume: row.assetsVolume,
      })),
  }
})
