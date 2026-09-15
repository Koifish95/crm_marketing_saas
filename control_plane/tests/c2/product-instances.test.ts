import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { customers, productInstances } from '../../server/database/schema'
import {
  MARTIAL_ARTS_PRODUCT,
  SALES_PRODUCT,
  backfillInstanceId,
  listCatalogProducts,
  requireProduct,
} from '../../server/products/catalog'
import {
  addProductInstance,
  createCustomerAccount,
} from '../../server/services/provision-registry'
import { listRegisteredEnvironments } from '../../server/services/registry'
import { imageBuildArgs, recordProvisionFailure, setLifecycleStatus } from '../../server/services/provision-runtime'
import { composeRootForEnvironment } from '../../server/services/docker-relaunch'
import { prodUpgradeBlocked } from '../../shared/utils/fleet-backup'
import { writeFleetBackupZip } from '../../server/services/fleet-backup-zip'
import { extractFleetBackupZip } from '../../server/services/fleet-backup-extract'
import { groupCustomers, summarizeFleet } from '../../shared/utils/fleet'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
})

async function openRegistry() {
  const root = join(tmpdir(), `c2-registry-${randomUUID()}`)
  mkdirSync(root, { recursive: true })
  roots.push(root)
  const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
  await migrateDatabase(url)
  await seedRegistry(url)
  return { url, root }
}

async function applySqlFile(client: ReturnType<typeof createClient>, file: string) {
  const sql = readFileSync(file, 'utf8')
  for (const statement of sql.split('--> statement-breakpoint')) {
    const trimmed = statement.trim()
    if (trimmed) {
      await client.execute(trimmed)
    }
  }
}

describe('C2 catalog', () => {
  it('lists Martial Arts and Sales only, with executable definition in CP code', () => {
    expect(listCatalogProducts()).toEqual([
      { id: 'martial-arts', displayName: 'Martial Arts' },
      { id: 'sales', displayName: 'Sales' },
    ])
    expect(MARTIAL_ARTS_PRODUCT.image).toBe('martial-arts-acquisition:s4')
    expect(MARTIAL_ARTS_PRODUCT.dockerfile).toBe('martial_arts_template/Dockerfile')
    expect(SALES_PRODUCT.image).toBe('crm-sales:c2')
    expect(SALES_PRODUCT.dockerfile).toBe('sales_template/Dockerfile')
    expect(SALES_PRODUCT.extraEnv.SALES_PROPOSALS_DIR).toBe('/app/data/uploads/proposals')
    expect(() => requireProduct('beauty')).toThrow(/Unknown product/)
    expect(imageBuildArgs(MARTIAL_ARTS_PRODUCT.image, MARTIAL_ARTS_PRODUCT.dockerfile)[4]).toBe('martial_arts_template/Dockerfile')
    expect(imageBuildArgs(SALES_PRODUCT.image, SALES_PRODUCT.dockerfile)[4]).toBe('sales_template/Dockerfile')
  })
})

describe('C2 backfill', () => {
  it('keeps lab-acme identities after migrate and seed', async () => {
    const { url } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const rows = await listRegisteredEnvironments(db)
      const lab = rows.filter(row => row.customer.slug === 'lab-acme')
      expect(lab.map(row => row.slug).sort()).toEqual(['lab-acme-dev', 'lab-acme-prod'])
      expect(lab.find(row => row.slug === 'lab-acme-prod')).toMatchObject({
        containerName: 'lab-acme-prod-app',
        sqliteVolume: 'lab-acme-prod-sqlite',
        assetsVolume: 'lab-acme-prod-assets',
        expectedImage: 'martial-arts-acquisition:s2',
        hostPort: 52040,
      })
      expect(lab.every(row => row.productInstance.productId === 'martial-arts')).toBe(true)
      const [account] = await db.select().from(customers)
      const instances = await db.select().from(productInstances)
      expect(instances.some(row => row.id === backfillInstanceId(account!.id))).toBe(true)
    } finally {
      client.close()
    }
  })

  it('attaches existing environment rows without renaming them', async () => {
    const root = join(tmpdir(), `c2-backfill-${randomUUID()}`)
    mkdirSync(root, { recursive: true })
    roots.push(root)
    const dbPath = join(root, 'control-plane.sqlite').replaceAll('\\', '/')
    const client = createClient({ url: `file:${dbPath}` })
    const migrations = join(process.cwd(), 'drizzle', 'migrations')
    try {
      await applySqlFile(client, join(migrations, '0000_yummy_blur.sql'))
      await applySqlFile(client, join(migrations, '0001_volatile_galactus.sql'))
      await applySqlFile(client, join(migrations, '0002_grey_fantastic_four.sql'))
      await applySqlFile(client, join(migrations, '0003_fleet_backups.sql'))
      await client.execute(`INSERT INTO hosting_nodes (id, name, kind, driver, created_at) VALUES ('node-1', 'laptop', 'laptop', 'local-docker', '2026-01-01T00:00:00.000Z')`)
      await client.execute(`INSERT INTO customers (id, slug, display_name, industry_template, timezone, admin_email, created_at) VALUES ('cust-si', 'strategic-insights', 'Strategic Insights Consulting, LLC', 'martial-arts', 'America/Denver', 'admin@si.local', '2026-01-01T00:00:00.000Z')`)
      await client.execute(`INSERT INTO environments (
        id, customer_id, hosting_node_id, type, display_name, slug, container_name, compose_project, compose_file,
        env_file_local, env_file_example, health_url, access_url, sqlite_volume, assets_volume, expected_image,
        isolation_marker, host_port, lifecycle_status, created_at
      ) VALUES (
        'env-prod', 'cust-si', 'node-1', 'PROD', 'PROD', 'strategic-insights-prod', 'strategic-insights-prod-app',
        'strategic-insights-prod', 'docker-compose.provisioned.yml', 'data/provisioned/prod.env', 'data/provisioned/prod.env',
        'http://127.0.0.1:52200/api/health', 'http://localhost:52200', 'strategic-insights-prod-sqlite',
        'strategic-insights-prod-assets', 'martial-arts-acquisition:s4', 'strategic-insights-prod-isolation',
        52200, 'ready', '2026-01-01T00:00:00.000Z'
      )`)
      await applySqlFile(client, join(migrations, '0004_product_instances.sql'))
      const instances = await client.execute('SELECT id, product_id, slug FROM product_instances')
      expect(instances.rows).toEqual([{
        id: 'cust-si-martial-arts',
        product_id: 'martial-arts',
        slug: 'strategic-insights',
      }])
      const envs = await client.execute('SELECT slug, container_name, sqlite_volume, assets_volume, expected_image, host_port, product_instance_id FROM environments')
      expect(envs.rows[0]).toMatchObject({
        slug: 'strategic-insights-prod',
        container_name: 'strategic-insights-prod-app',
        sqlite_volume: 'strategic-insights-prod-sqlite',
        assets_volume: 'strategic-insights-prod-assets',
        expected_image: 'martial-arts-acquisition:s4',
        host_port: 52200,
        product_instance_id: 'cust-si-martial-arts',
      })
    } finally {
      client.close()
    }
  })
})

describe('C2 multi-product account', () => {
  it('lets one disposable account own Martial Arts and Sales, each with PROD and DEV', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const account = await createCustomerAccount(db, {
        displayName: 'C2 Proof',
        slug: 'c2-proof',
        adminEmail: 'admin@c2-proof.local',
        filesRoot: root,
      })
      expect(account.environments).toHaveLength(0)
      const martialArts = await addProductInstance(db, account.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      const sales = await addProductInstance(db, account.customerId, {
        productId: 'sales',
        filesRoot: root,
      })
      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === account.customerId)
      expect(rows).toHaveLength(4)
      expect(rows.filter(row => row.productInstance.productId === 'martial-arts' && row.type === 'PROD')).toHaveLength(1)
      expect(rows.filter(row => row.productInstance.productId === 'sales' && row.type === 'PROD')).toHaveLength(1)
      expect(rows.find(row => row.slug === 'c2-proof-martial-arts-prod')?.expectedImage).toBe('martial-arts-acquisition:s4')
      expect(rows.find(row => row.slug === 'c2-proof-sales-prod')?.expectedImage).toBe('crm-sales:c2')
      expect(martialArts.environments.map(row => row.slug).sort()).toEqual([
        'c2-proof-martial-arts-dev',
        'c2-proof-martial-arts-prod',
      ])
      expect(sales.environments.map(row => row.slug).sort()).toEqual([
        'c2-proof-sales-dev',
        'c2-proof-sales-prod',
      ])
    } finally {
      client.close()
    }
  })

  it('keeps accounts with no environments visible and scopes PROD upgrade to the instance', () => {
    const summary = summarizeFleet([], [{
      id: 'acct-1',
      slug: 'c2-proof',
      displayName: 'C2 Proof',
      timezone: 'America/Denver',
      adminEmail: 'admin@c2-proof.local',
    }])
    expect(summary.customerCount).toBe(1)
    expect(summary.environmentCount).toBe(0)
    expect(groupCustomers([], summary.customers).length).toBe(1)

    const mixed = [
      { type: 'DEV', lifecycleStatus: 'ready', expectedImage: 'martial-arts-acquisition:s4' },
      { type: 'PROD', lifecycleStatus: 'ready', expectedImage: 'martial-arts-acquisition:s4' },
    ]
    const salesOnly = [
      { type: 'DEV', lifecycleStatus: 'ready', expectedImage: 'crm-sales:c2' },
      { type: 'PROD', lifecycleStatus: 'ready', expectedImage: 'crm-sales:c2' },
    ]
    expect(prodUpgradeBlocked(mixed, 'crm-sales:c2')).toBe(true)
    expect(prodUpgradeBlocked(salesOnly, 'crm-sales:c2')).toBe(false)
  })
})

describe('C2 compose cwd and Sales backup path', () => {
  it('uses the Sales template directory for Sales compose', () => {
    const cwd = composeRootForEnvironment({
      composeFile: 'docker-compose.provisioned.yml',
      productInstance: { productId: 'sales' },
    })
    expect(cwd.replaceAll('\\', '/')).toMatch(/sales_template$/)
    const ma = composeRootForEnvironment({
      composeFile: 'docker-compose.provisioned.yml',
      productInstance: { productId: 'martial-arts' },
    })
    expect(ma.replaceAll('\\', '/')).toMatch(/martial_arts_template$/)
  })

  it('includes proposal PDFs that live under the uploads volume', async () => {
    const root = join(tmpdir(), `c2-zip-${randomUUID()}`)
    mkdirSync(join(root, 'sqlite'), { recursive: true })
    mkdirSync(join(root, 'uploads', 'proposals', '1', '1'), { recursive: true })
    writeFileSync(join(root, 'sqlite', 'crm.sqlite'), 'sqlite-bytes')
    writeFileSync(join(root, 'uploads', 'proposals', '1', '1', 'generated.pdf'), '%PDF-1.4')
    const zipPath = join(root, 'c2-proof_c2-proof-sales-prod_2026-09-14_190000.zip')
    await writeFleetBackupZip({
      zipPath,
      sqlitePath: join(root, 'sqlite', 'crm.sqlite'),
      sqliteFilename: 'crm.sqlite',
      uploadsDir: join(root, 'uploads'),
      customerId: 'cust-1',
      customerSlug: 'c2-proof',
      customerDisplayName: 'C2 Proof',
      environmentId: 'env-sales-prod',
      environmentSlug: 'c2-proof-sales-prod',
      environmentDisplayName: 'PROD',
      environmentType: 'PROD',
      containerName: 'c2-proof-sales-prod-app',
      timeZone: 'America/Denver',
      createdAt: '2026-09-14T19:00:00.000Z',
    })
    const extractDir = join(root, 'extract')
    await extractFleetBackupZip(zipPath, extractDir)
    expect(readFileSync(join(extractDir, 'uploads', 'proposals', '1', '1', 'generated.pdf'), 'utf8')).toBe('%PDF-1.4')
  })
})

describe('C2 QA remediation', () => {
  it('keeps a failed Sales instance visible and unique, and retry does not insert another pair', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const account = await createCustomerAccount(db, {
        displayName: 'C2 QA Test',
        slug: 'c2-qa-test',
        adminEmail: 'admin@c2-qa.local',
        filesRoot: root,
      })
      expect(account.environments).toHaveLength(0)
      await addProductInstance(db, account.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      const sales = await addProductInstance(db, account.customerId, {
        productId: 'sales',
        filesRoot: root,
      })
      for (const row of sales.environments) {
        await recordProvisionFailure(db, row, 'Local image build failed.')
      }
      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === account.customerId)
      const salesRows = rows.filter(row => row.productInstance.productId === 'sales')
      expect(salesRows).toHaveLength(2)
      expect(salesRows.every(row => row.lifecycleStatus === 'failed')).toBe(true)
      expect(salesRows.every(row => row.provisionError === 'Local image build failed.')).toBe(true)
      expect(salesRows.every(row => row.expectedImage === 'crm-sales:c2')).toBe(true)
      expect(rows.filter(row => row.type === 'PROD')).toHaveLength(2)
      const instances = (await db.select().from(productInstances)).filter(row => row.customerId === account.customerId)
      expect(instances.map(row => row.productId).sort()).toEqual(['martial-arts', 'sales'])
      await expect(addProductInstance(db, account.customerId, {
        productId: 'sales',
        filesRoot: root,
      })).rejects.toThrow(/already on this account/)
      await setLifecycleStatus(db, salesRows[0]!.id, 'provisioning')
      const retried = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === account.customerId)
      expect(retried.filter(row => row.productInstance.productId === 'sales')).toHaveLength(2)
      expect(retried.filter(row => row.type === 'PROD')).toHaveLength(2)
      expect(retried.find(row => row.id === salesRows[0]!.id)?.lifecycleStatus).toBe('provisioning')
      expect(retried.find(row => row.id === salesRows[0]!.id)?.provisionError).toBeNull()
    } finally {
      client.close()
    }
  })
})
