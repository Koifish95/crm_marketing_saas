import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { environmentBackups } from '../../server/database/schema'
import {
  addProductInstance,
  createCustomerAccount,
} from '../../server/services/provision-registry'
import { listRegisteredEnvironments } from '../../server/services/registry'
import {
  assertBackupMatchesSource,
  FleetBackupError,
  listRestorableBackups,
  resolveRestoreRequest,
  restoreComposeArgs,
  restoreRegisteredEnvironment,
} from '../../server/services/fleet-backup'
import { extractFleetBackupZip } from '../../server/services/fleet-backup-extract'
import { writeFleetBackupZip } from '../../server/services/fleet-backup-zip'
import { restoreBackupPolicy } from '../../shared/utils/fleet-backup'
import { setLifecycleStatus } from '../../server/services/provision-runtime'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // sqlite unlock can lag on Windows
    }
  }
})

async function openRegistry() {
  const root = join(tmpdir(), `c2-restore-${randomUUID()}`)
  mkdirSync(join(root, 'data', 'backups'), { recursive: true })
  roots.push(root)
  const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
  await migrateDatabase(url)
  await seedRegistry(url)
  const { client, db } = createDb(url)
  return { url, root, client, db }
}

async function insertBackup(input: {
  db: ReturnType<typeof createDb>['db']
  root: string
  env: Awaited<ReturnType<typeof listRegisteredEnvironments>>[number]
  createdAt: string
  bytes?: number
  missing?: boolean
}) {
  const dir = join(input.root, 'data', 'backups', input.env.customer.slug, input.env.slug)
  mkdirSync(dir, { recursive: true })
  const zipPath = join(dir, `${input.env.customer.slug}_${input.env.slug}_${input.createdAt.replace(/[:.]/g, '')}.zip`)
  if (!input.missing) {
    writeFileSync(zipPath, `backup-${input.createdAt}`)
  }
  const id = randomUUID()
  await input.db.insert(environmentBackups).values({
    id,
    environmentId: input.env.id,
    customerId: input.env.customer.id,
    createdAt: input.createdAt,
    bytes: input.bytes ?? 42,
    zipPath,
    sqliteFilename: 'crm.sqlite',
    offhostPath: null,
    offhostCopiedAt: null,
    previousExpectedImage: input.env.expectedImage,
  })
  return { id, zipPath }
}

describe('C2 restore policy', () => {
  it('rejects cross-product and cross-customer restore', () => {
    const salesProd = {
      customerId: 'c2',
      productInstanceId: 'sales',
      environmentId: 'sales-prod',
      type: 'PROD',
    }
    const salesDev = {
      customerId: 'c2',
      productInstanceId: 'sales',
      environmentId: 'sales-dev',
      type: 'DEV',
    }
    const maDev = {
      customerId: 'c2',
      productInstanceId: 'ma',
      environmentId: 'ma-dev',
      type: 'DEV',
    }
    const otherDev = {
      customerId: 'si',
      productInstanceId: 'sales',
      environmentId: 'si-dev',
      type: 'DEV',
    }
    expect(restoreBackupPolicy(salesProd, salesDev)).toMatchObject({ allowed: true, kind: 'copy-down' })
    expect(restoreBackupPolicy(salesProd, maDev).allowed).toBe(false)
    expect(restoreBackupPolicy(salesProd, maDev).reason).toMatch(/product instance/)
    expect(restoreBackupPolicy(salesProd, otherDev).allowed).toBe(false)
    expect(restoreBackupPolicy(salesProd, otherDev).reason).toMatch(/customer account/)
  })
})

describe('C2 selectable backups and copy-down', () => {
  it('addresses a specific historical backup and allows same-product PROD → DEV', async () => {
    const { root, client, db } = await openRegistry()
    try {
      const account = await createCustomerAccount(db, {
        displayName: 'C2 QA Test',
        slug: 'c2-qa-test',
        adminEmail: 'admin@c2-qa.local',
        filesRoot: root,
      })
      const sales = await addProductInstance(db, account.customerId, {
        productId: 'sales',
        filesRoot: root,
      })
      for (const row of sales.environments) {
        await setLifecycleStatus(db, row.id, 'ready')
      }
      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === account.customerId)
      const prod = rows.find(row => row.type === 'PROD' && row.productInstance.productId === 'sales')
      const dev = rows.find(row => row.type === 'DEV' && row.productInstance.productId === 'sales')
      expect(prod && dev).toBeTruthy()
      const older = await insertBackup({
        db,
        root,
        env: prod!,
        createdAt: '2026-09-14T18:00:00.000Z',
        bytes: 100,
      })
      const newer = await insertBackup({
        db,
        root,
        env: prod!,
        createdAt: '2026-09-15T18:00:00.000Z',
        bytes: 200,
      })
      const listed = await listRestorableBackups(db, dev!.id, root)
      expect(listed.target.id).toBe(dev!.id)
      expect(listed.target.containerName).toBe(dev!.containerName)
      expect(listed.target.hostPort).toBe(dev!.hostPort)
      expect(listed.target.composeProject).toBe(dev!.composeProject)
      expect(listed.backups.map(row => row.id)).toEqual([newer.id, older.id])
      expect(listed.backups.every(row => row.kind === 'copy-down')).toBe(true)
      expect(listed.backups.every(row => row.source.environmentId === prod!.id)).toBe(true)
      const selected = await resolveRestoreRequest(db, dev!.id, older.id, root)
      expect(selected.backup.id).toBe(older.id)
      expect(selected.kind).toBe('copy-down')
      expect(selected.target.id).toBe(dev!.id)
      expect(selected.target.containerName).toBe(dev!.containerName)
      expect(selected.target.hostPort).toBe(dev!.hostPort)
      expect(selected.source.id).toBe(prod!.id)
      expect(selected.zipPath).toBe(older.zipPath)
      await expect(restoreRegisteredEnvironment(db, dev!.id, false, older.id, root)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/confirm/i),
      })
    } finally {
      client.close()
    }
  })

  it('allows same-environment PROD and DEV rollback', async () => {
    const { root, client, db } = await openRegistry()
    try {
      const account = await createCustomerAccount(db, {
        displayName: 'C2 QA Test',
        slug: 'c2-qa-test',
        adminEmail: 'admin@c2-qa.local',
        filesRoot: root,
      })
      const sales = await addProductInstance(db, account.customerId, {
        productId: 'sales',
        filesRoot: root,
      })
      for (const row of sales.environments) {
        await setLifecycleStatus(db, row.id, 'ready')
      }
      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === account.customerId)
      const prod = rows.find(row => row.type === 'PROD')!
      const dev = rows.find(row => row.type === 'DEV')!
      const prodBackup = await insertBackup({ db, root, env: prod, createdAt: '2026-09-15T10:00:00.000Z' })
      const devBackup = await insertBackup({ db, root, env: dev, createdAt: '2026-09-15T11:00:00.000Z' })
      await expect(resolveRestoreRequest(db, prod.id, prodBackup.id, root)).resolves.toMatchObject({
        kind: 'rollback',
        target: { id: prod.id },
      })
      await expect(resolveRestoreRequest(db, dev.id, devBackup.id, root)).resolves.toMatchObject({
        kind: 'rollback',
        target: { id: dev.id },
      })
    } finally {
      client.close()
    }
  })

  it('rejects DEV → PROD, cross-product, cross-customer, and missing backups', async () => {
    const { root, client, db } = await openRegistry()
    try {
      const qa = await createCustomerAccount(db, {
        displayName: 'C2 QA Test',
        slug: 'c2-qa-test',
        adminEmail: 'admin@c2-qa.local',
        filesRoot: root,
      })
      const other = await createCustomerAccount(db, {
        displayName: 'Strategic Insights',
        slug: 'si-copy-down',
        adminEmail: 'admin@si.local',
        filesRoot: root,
      })
      const sales = await addProductInstance(db, qa.customerId, {
        productId: 'sales',
        filesRoot: root,
      })
      const martial = await addProductInstance(db, qa.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      const otherSales = await addProductInstance(db, other.customerId, {
        productId: 'sales',
        filesRoot: root,
      })
      for (const row of [...sales.environments, ...martial.environments, ...otherSales.environments]) {
        await setLifecycleStatus(db, row.id, 'ready')
      }
      const rows = await listRegisteredEnvironments(db)
      const salesProd = rows.find(row => row.id === sales.environments.find(item => item.type === 'PROD')?.id)!
      const salesDev = rows.find(row => row.id === sales.environments.find(item => item.type === 'DEV')?.id)!
      const maDev = rows.find(row => row.id === martial.environments.find(item => item.type === 'DEV')?.id)!
      const otherDev = rows.find(row => row.id === otherSales.environments.find(item => item.type === 'DEV')?.id)!
      const salesProdBackup = await insertBackup({
        db,
        root,
        env: salesProd,
        createdAt: '2026-09-15T12:00:00.000Z',
      })
      const salesDevBackup = await insertBackup({
        db,
        root,
        env: salesDev,
        createdAt: '2026-09-15T12:30:00.000Z',
      })
      await expect(resolveRestoreRequest(db, salesProd.id, salesDevBackup.id, root)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/DEV backups cannot restore into PROD/),
      })
      await expect(resolveRestoreRequest(db, maDev.id, salesProdBackup.id, root)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/product instance/),
      })
      await expect(resolveRestoreRequest(db, otherDev.id, salesProdBackup.id, root)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/customer account/),
      })
      await expect(resolveRestoreRequest(db, salesDev.id, randomUUID(), root)).rejects.toMatchObject({
        statusCode: 404,
      })
      await expect(resolveRestoreRequest(db, salesDev.id, '', root)).rejects.toMatchObject({
        statusCode: 400,
      })
      const missing = await insertBackup({
        db,
        root,
        env: salesProd,
        createdAt: '2026-09-13T12:00:00.000Z',
        missing: true,
      })
      await expect(resolveRestoreRequest(db, salesDev.id, missing.id, root)).rejects.toMatchObject({
        statusCode: 404,
      })
      const listed = await listRestorableBackups(db, salesDev.id, root)
      expect(listed.backups.some(row => row.id === salesDevBackup.id)).toBe(true)
      expect(listed.backups.some(row => row.id === salesProdBackup.id && row.kind === 'copy-down')).toBe(true)
      expect(listed.backups.find(row => row.id === missing.id)?.available).toBe(false)
      expect(listed.backups.every(row => row.source.productInstanceId === salesProd.productInstance.id)).toBe(true)
    } finally {
      client.close()
    }
  })

  it('keeps Sales sqlite and proposal PDFs in the backup zip used for copy-down', async () => {
    const root = join(tmpdir(), `c2-sales-zip-${randomUUID()}`)
    mkdirSync(join(root, 'sqlite'), { recursive: true })
    mkdirSync(join(root, 'uploads', 'proposals', '1', '1'), { recursive: true })
    writeFileSync(join(root, 'sqlite', 'crm.sqlite'), 'sales-sqlite')
    writeFileSync(join(root, 'uploads', 'proposals', '1', '1', 'generated.pdf'), '%PDF-1.4 qa')
    const zipPath = join(root, 'c2-qa-test_c2-qa-test-sales-prod_2026-09-15_120000.zip')
    await writeFleetBackupZip({
      zipPath,
      sqlitePath: join(root, 'sqlite', 'crm.sqlite'),
      sqliteFilename: 'crm.sqlite',
      uploadsDir: join(root, 'uploads'),
      customerId: 'cust-1',
      customerSlug: 'c2-qa-test',
      customerDisplayName: 'C2 QA Test',
      environmentId: 'env-sales-prod',
      environmentSlug: 'c2-qa-test-sales-prod',
      environmentDisplayName: 'PROD',
      environmentType: 'PROD',
      containerName: 'c2-qa-test-sales-prod-app',
      timeZone: 'America/Denver',
      createdAt: '2026-09-15T18:00:00.000Z',
    })
    const extractDir = join(root, 'extract')
    await extractFleetBackupZip(zipPath, extractDir)
    expect(readFileSync(join(extractDir, 'sqlite', 'crm.sqlite'), 'utf8')).toBe('sales-sqlite')
    expect(readFileSync(join(extractDir, 'uploads', 'proposals', '1', '1', 'generated.pdf'), 'utf8')).toBe('%PDF-1.4 qa')
    expect(() => assertBackupMatchesSource(
      { environmentId: 'env-sales-prod', customerId: 'cust-1' },
      { id: 'env-sales-prod', customer: { id: 'cust-1' } },
    )).not.toThrow()
    try {
      assertBackupMatchesSource(
        { environmentId: 'env-sales-prod', customerId: 'cust-1' },
        { id: 'env-sales-dev', customer: { id: 'cust-1' } },
      )
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(FleetBackupError)
      expect((error as FleetBackupError).statusCode).toBe(409)
    }
    rmSync(root, { recursive: true, force: true })
  })

  it('does not introduce destructive volume-removal compose args', () => {
    const args = restoreComposeArgs({
      envFile: '.env.provisioned',
      composeFile: 'docker-compose.provisioned.yml',
      composeProject: 'c2-qa-test-sales-dev',
    })
    expect(args.join(' ')).not.toMatch(/(^|\s)(-v|--volumes|down|prune)(\s|$)/)
  })
})
