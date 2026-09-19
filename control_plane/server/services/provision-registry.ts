import { and, eq } from 'drizzle-orm'
import type { Database } from '../database'
import { customers, environments, hostingNodes, productInstances } from '../database/schema'
import { createStableId } from '../../shared/utils/ids'
import { backfillInstanceId, isProductId, requireProduct, UNASSIGNED_INDUSTRY, type ProductId } from '../products/catalog'
import {
  DEFAULT_TIMEZONE,
  allocateHostPorts,
  assertProvisionSlug,
  defaultEnvironmentPair,
  extraEnvironmentNames,
  accessUrlForPort,
  healthUrlForPort,
  type NonProdEnvironmentType,
} from './provision-contract'
import { listRegisteredEnvironments } from './registry'
import { renderProvisionedEnv, writeInitialAccessFile, writeProvisionedEnvFile, generateInitialAccessPassword } from './provision-env'

export class ProvisionError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function assertOneProdPerInstance(db: Database, productInstanceId: string, type: string) {
  if (type !== 'PROD') {
    return
  }
  const rows = await db.select({ type: environments.type }).from(environments)
    .where(eq(environments.productInstanceId, productInstanceId))
  if (rows.some(row => row.type === 'PROD')) {
    throw new ProvisionError('A product instance may have only one PROD environment.')
  }
}

/** @deprecated C2: one PROD is per product instance. Prefer assertOneProdPerInstance. */
export async function assertOneProdPerCustomer(db: Database, customerId: string, type: string) {
  if (type !== 'PROD') {
    return
  }
  const rows = await db.select({ type: environments.type }).from(environments).where(eq(environments.customerId, customerId))
  if (rows.some(row => row.type === 'PROD')) {
    throw new ProvisionError('A customer may have only one PROD environment.')
  }
}

type NamedEnvironment = {
  type: string
  displayName: string
  slug: string
  containerName: string
  composeProject: string
  composeFile: string
  sqliteVolume: string
  assetsVolume: string
  isolationMarker: string
  expectedImage: string
}

export async function insertNamedEnvironment(db: Database, input: {
  customer: { id: string, displayName: string, adminEmail: string, timezone: string }
  productInstanceId: string
  productId: ProductId
  nodeId: string
  names: NamedEnvironment
  hostPort: number
  filesRoot?: string
  now?: string
  authPassword?: string
}) {
  await assertOneProdPerInstance(db, input.productInstanceId, input.names.type)
  const [slugHit] = await db.select().from(environments).where(eq(environments.slug, input.names.slug)).limit(1)
  if (slugHit) {
    throw new ProvisionError(`Environment slug ${input.names.slug} is already in use.`)
  }
  const now = input.now ?? new Date().toISOString()
  const id = createStableId()
  const envFile = `data/provisioned/${id}.env`
  const product = requireProduct(input.productId)
  await db.insert(environments).values({
    id,
    customerId: input.customer.id,
    productInstanceId: input.productInstanceId,
    hostingNodeId: input.nodeId,
    type: input.names.type,
    displayName: input.names.displayName,
    slug: input.names.slug,
    containerName: input.names.containerName,
    composeProject: input.names.composeProject,
    composeFile: input.names.composeFile,
    envFileLocal: envFile,
    envFileExample: envFile,
    healthUrl: healthUrlForPort(input.hostPort),
    accessUrl: accessUrlForPort(input.hostPort),
    sqliteVolume: input.names.sqliteVolume,
    assetsVolume: input.names.assetsVolume,
    expectedImage: input.names.expectedImage,
    isolationMarker: input.names.isolationMarker,
    hostPort: input.hostPort,
    lifecycleStatus: 'provisioning',
    createdAt: now,
  })
  const rendered = renderProvisionedEnv({
    composeProject: input.names.composeProject,
    containerName: input.names.containerName,
    hostPort: input.hostPort,
    sqliteVolume: input.names.sqliteVolume,
    assetsVolume: input.names.assetsVolume,
    expectedImage: input.names.expectedImage,
    type: input.names.type,
    displayName: input.customer.displayName,
    adminEmail: input.customer.adminEmail,
    timezone: input.customer.timezone,
    authPassword: input.authPassword,
    product,
  })
  writeProvisionedEnvFile(envFile, rendered.contents, input.filesRoot)
  writeInitialAccessFile(envFile, {
    username: rendered.username,
    password: rendered.authPassword,
    email: input.customer.adminEmail,
  }, input.filesRoot)
  return {
    id,
    slug: input.names.slug,
    type: input.names.type,
    hostPort: input.hostPort,
    envFileLocal: envFile,
    initialUsername: rendered.username,
    initialPassword: rendered.authPassword,
  }
}

export function usedHostPorts(rows: { hostPort?: number, healthUrl: string }[]) {
  return rows.map((row) => {
    if (row.hostPort && row.hostPort > 0) {
      return row.hostPort
    }
    const match = row.healthUrl.match(/:(\d+)/)
    return match ? Number(match[1]) : 0
  }).filter(port => port > 0)
}

function assertAdminEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (!email.includes('@') || !email.includes('.')) {
    throw new ProvisionError('Admin email is required.')
  }
  return email
}

export async function createCustomerAccount(db: Database, input: {
  displayName: string
  slug: string
  timezone?: string
  adminEmail: string
  filesRoot?: string
}) {
  const displayName = input.displayName.trim()
  if (!displayName) {
    throw new ProvisionError('Display name is required.')
  }
  const slug = assertProvisionSlug(input.slug)
  const timezone = input.timezone?.trim() || DEFAULT_TIMEZONE
  const adminEmail = assertAdminEmail(input.adminEmail)

  const [existing] = await db.select().from(customers).where(eq(customers.slug, slug)).limit(1)
  if (existing) {
    const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === existing.id)
    return {
      customerId: existing.id,
      slug: existing.slug,
      displayName: existing.displayName,
      resumed: true,
      environments: rows.map(row => ({
        id: row.id,
        slug: row.slug,
        type: row.type,
        hostPort: row.hostPort,
        envFileLocal: row.envFileLocal,
      })),
    }
  }

  const now = new Date().toISOString()
  const customerId = createStableId()
  await db.insert(customers).values({
    id: customerId,
    slug,
    displayName,
    industryTemplate: UNASSIGNED_INDUSTRY,
    timezone,
    adminEmail,
    createdAt: now,
  })

  return { customerId, slug, displayName, resumed: false, environments: [] as const }
}

/** C2: creating a customer no longer provisions environments. */
export const createCustomerWithDefaultEnvironments = createCustomerAccount

async function requireLaptopNode(db: Database) {
  const [node] = await db.select().from(hostingNodes).where(eq(hostingNodes.name, 'laptop')).limit(1)
  if (!node) {
    throw new ProvisionError('Laptop hosting node is not registered.', 500)
  }
  return node
}

export async function addProductInstance(db: Database, customerId: string, input: {
  productId: string
  displayName?: string
  filesRoot?: string
}) {
  if (!isProductId(input.productId)) {
    throw new ProvisionError('Select Martial Arts or Sales.')
  }
  const product = requireProduct(input.productId)
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!customer) {
    throw new ProvisionError('Customer not found.', 404)
  }
  const [duplicate] = await db.select().from(productInstances).where(
    and(eq(productInstances.customerId, customerId), eq(productInstances.productId, product.id)),
  ).limit(1)
  if (duplicate) {
    throw new ProvisionError(`${product.displayName} is already on this account.`, 409)
  }
  const [anyInstance] = await db.select().from(productInstances)
    .where(eq(productInstances.customerId, customerId))
    .limit(1)
  const node = await requireLaptopNode(db)
  const registered = await listRegisteredEnvironments(db)
  const ports = allocateHostPorts(usedHostPorts(registered.map(row => ({
    hostPort: row.hostPort,
    healthUrl: row.healthUrl,
  }))))
  const now = new Date().toISOString()
  const instanceId = product.id === 'martial-arts' && !anyInstance
    ? backfillInstanceId(customerId)
    : createStableId()
  const displayName = input.displayName?.trim() || product.displayName
  await db.insert(productInstances).values({
    id: instanceId,
    customerId,
    productId: product.id,
    displayName,
    slug: product.id,
    createdAt: now,
  })
  if (product.id === 'martial-arts' && customer.industryTemplate === UNASSIGNED_INDUSTRY) {
    await db.update(customers)
      .set({ industryTemplate: product.id })
      .where(eq(customers.id, customerId))
  }

  const created: {
    id: string
    slug: string
    type: string
    hostPort: number
    envFileLocal: string
    initialUsername: string
    initialPassword: string
  }[] = []
  const authPassword = generateInitialAccessPassword()
  for (const names of defaultEnvironmentPair(customer.slug, product.id)) {
    created.push(await insertNamedEnvironment(db, {
      customer: {
        id: customer.id,
        displayName: customer.displayName,
        adminEmail: customer.adminEmail,
        timezone: customer.timezone,
      },
      productInstanceId: instanceId,
      productId: product.id,
      nodeId: node.id,
      names,
      hostPort: ports[created.length] as number,
      filesRoot: input.filesRoot,
      now,
      authPassword,
    }))
  }

  return {
    customerId,
    productInstanceId: instanceId,
    productId: product.id,
    displayName,
    initialUsername: 'admin',
    initialPassword: authPassword,
    environments: created,
  }
}

export async function addExtraNonProdEnvironment(db: Database, productInstanceId: string, input: {
  type: NonProdEnvironmentType
  displayName: string
  filesRoot?: string
}) {
  if ((input.type as string) === 'PROD') {
    throw new ProvisionError('Extra environments must be non-PROD.')
  }
  const [instance] = await db.select().from(productInstances).where(eq(productInstances.id, productInstanceId)).limit(1)
  if (!instance) {
    throw new ProvisionError('Product instance not found.', 404)
  }
  if (!isProductId(instance.productId)) {
    throw new ProvisionError('Product instance has an unknown product.', 500)
  }
  const [customer] = await db.select().from(customers).where(eq(customers.id, instance.customerId)).limit(1)
  if (!customer) {
    throw new ProvisionError('Customer not found.', 404)
  }
  const node = await requireLaptopNode(db)
  let names
  try {
    names = extraEnvironmentNames(customer.slug, instance.productId, input.type, input.displayName)
  } catch (error) {
    throw new ProvisionError(error instanceof Error ? error.message : 'Invalid extra environment.')
  }
  const registered = await listRegisteredEnvironments(db)
  const ports = allocateHostPorts(usedHostPorts(registered.map(row => ({
    hostPort: row.hostPort,
    healthUrl: row.healthUrl,
  }))), 1)
  return insertNamedEnvironment(db, {
    customer: {
      id: customer.id,
      displayName: customer.displayName,
      adminEmail: customer.adminEmail,
      timezone: customer.timezone,
    },
    productInstanceId: instance.id,
    productId: instance.productId,
    nodeId: node.id,
    names,
    hostPort: ports[0] as number,
    filesRoot: input.filesRoot,
  })
}
