import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { customers, productInstances } from '../database/schema'
import { ACCOUNT_ACTIVE, ACCOUNT_INACTIVE } from '../../shared/utils/lifecycle'
import { listRegisteredEnvironments } from './registry'
import { stopRegisteredEnvironment } from './docker-relaunch'
import { recordOperatorEvent } from './operator-events'

export class AccountLifecycleError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

async function stopInstanceEnvironments(db: Database, productInstanceId: string) {
  const rows = (await listRegisteredEnvironments(db)).filter(row => (
    row.productInstance.id === productInstanceId
    && row.lifecycleStatus !== 'decommissioned'
    && row.lifecycleStatus !== 'archived'
    && row.lifecycleStatus !== 'provisioning'
    && row.lifecycleStatus !== 'failed'
  ))
  const stopped: string[] = []
  for (const row of rows) {
    try {
      stopRegisteredEnvironment(row)
      stopped.push(row.slug)
    } catch (error) {
      const text = error instanceof Error ? error.message : ''
      if (!/no such|not found|is not running/i.test(text)) {
        throw error
      }
    }
  }
  return stopped
}

export async function deactivateProductInstance(db: Database, id: string, note?: string) {
  const [row] = await db.select().from(productInstances).where(eq(productInstances.id, id)).limit(1)
  if (!row) {
    throw new AccountLifecycleError('Product instance not found.', 404)
  }
  if (row.status === ACCOUNT_INACTIVE) {
    return row
  }
  const stopped = await stopInstanceEnvironments(db, id)
  const now = new Date().toISOString()
  await db.update(productInstances).set({
    status: ACCOUNT_INACTIVE,
    deactivatedAt: now,
    deactivatedNote: note?.trim() || null,
  }).where(eq(productInstances.id, id))
  await recordOperatorEvent(db, {
    action: 'product.deactivate',
    summary: `Deactivated product ${row.displayName}.`,
    customerId: row.customerId,
    productInstanceId: row.id,
    detail: { stopped, note: note?.trim() || null },
  })
  const [updated] = await db.select().from(productInstances).where(eq(productInstances.id, id)).limit(1)
  return updated
}

export async function reactivateProductInstance(db: Database, id: string) {
  const [row] = await db.select().from(productInstances).where(eq(productInstances.id, id)).limit(1)
  if (!row) {
    throw new AccountLifecycleError('Product instance not found.', 404)
  }
  const [customer] = await db.select().from(customers).where(eq(customers.id, row.customerId)).limit(1)
  if (customer?.status === ACCOUNT_INACTIVE) {
    throw new AccountLifecycleError('Reactivate the customer before reactivating this product.', 409)
  }
  if (row.status !== ACCOUNT_INACTIVE) {
    return row
  }
  const now = new Date().toISOString()
  await db.update(productInstances).set({
    status: ACCOUNT_ACTIVE,
    reactivatedAt: now,
  }).where(eq(productInstances.id, id))
  await recordOperatorEvent(db, {
    action: 'product.reactivate',
    summary: `Reactivated product ${row.displayName}.`,
    customerId: row.customerId,
    productInstanceId: row.id,
  })
  const [updated] = await db.select().from(productInstances).where(eq(productInstances.id, id)).limit(1)
  return updated
}

export async function deactivateCustomer(db: Database, id: string, note?: string) {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  if (!row) {
    throw new AccountLifecycleError('Customer not found.', 404)
  }
  if (row.status === ACCOUNT_INACTIVE) {
    return row
  }
  const instances = await db.select().from(productInstances).where(eq(productInstances.customerId, id))
  for (const instance of instances) {
    if (instance.status !== ACCOUNT_INACTIVE) {
      await deactivateProductInstance(db, instance.id, note)
    }
  }
  const now = new Date().toISOString()
  await db.update(customers).set({
    status: ACCOUNT_INACTIVE,
    deactivatedAt: now,
    deactivatedNote: note?.trim() || null,
  }).where(eq(customers.id, id))
  await recordOperatorEvent(db, {
    action: 'customer.deactivate',
    summary: `Deactivated customer ${row.displayName}.`,
    customerId: row.id,
    detail: { note: note?.trim() || null },
  })
  const [updated] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  return updated
}

export async function reactivateCustomer(db: Database, id: string) {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  if (!row) {
    throw new AccountLifecycleError('Customer not found.', 404)
  }
  if (row.status !== ACCOUNT_INACTIVE) {
    return row
  }
  const now = new Date().toISOString()
  await db.update(customers).set({
    status: ACCOUNT_ACTIVE,
    reactivatedAt: now,
  }).where(eq(customers.id, id))
  const instances = await db.select().from(productInstances).where(eq(productInstances.customerId, id))
  for (const instance of instances) {
    if (instance.status === ACCOUNT_INACTIVE) {
      await db.update(productInstances).set({
        status: ACCOUNT_ACTIVE,
        reactivatedAt: now,
      }).where(eq(productInstances.id, instance.id))
    }
  }
  await recordOperatorEvent(db, {
    action: 'customer.reactivate',
    summary: `Reactivated customer ${row.displayName}.`,
    customerId: row.id,
  })
  const [updated] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  return updated
}
