import { useDb } from '../database'
import { observeRegisteredEnvironments } from '../services/observe'
import { listCustomers, listProductInstances } from '../services/registry'

export default defineEventHandler(async () => {
  const db = useDb()
  return {
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(db),
    customers: (await listCustomers(db)).map(row => ({
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      timezone: row.timezone,
      adminEmail: row.adminEmail,
      industryTemplate: row.industryTemplate,
    })),
    productInstances: (await listProductInstances(db)).map(row => ({
      id: row.id,
      customerId: row.customerId,
      productId: row.productId,
      displayName: row.displayName,
      slug: row.slug,
    })),
  }
})
