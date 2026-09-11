import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { environmentBackups } from '../../server/database/schema'
import { listRegisteredEnvironments } from '../../server/services/registry'
import {
  environmentBackupGuard,
  findSqliteFilename,
  fleetBackupFileName,
  fleetBackupReadme,
  fleetBackupRelativeDir,
  formatBackupCreatedAt,
  formatBackupSize,
  FLEET_BACKUP_README,
  FLEET_BACKUP_RETENTION_DAYS,
  prodUpgradeBlocked,
  resolveFleetBackupFileName,
} from '../../shared/utils/fleet-backup'
import { extractFleetBackupZip, extractedSqliteDir } from '../../server/services/fleet-backup-extract'
import {
  assertRevealableZipPath,
  FleetBackupError,
  isPathInsideBackupRoot,
  revealBackupCommand,
  revealEnvironmentBackup,
} from '../../server/services/fleet-backup'
import { readFleetBackupManifest, writeFleetBackupZip } from '../../server/services/fleet-backup-zip'

describe('S6 fleet backup contract', () => {
  it('keys zips by customer and environment slugs and retains 14 days', () => {
    expect(FLEET_BACKUP_RETENTION_DAYS).toBe(14)
    expect(fleetBackupRelativeDir('lab-acme', 'lab-acme-dev')).toBe('data/backups/lab-acme/lab-acme-dev')
    expect(fleetBackupFileName(
      'lab-acme',
      'lab-acme-dev',
      '2026-09-11T19:22:46.544Z',
      'America/Denver',
    )).toBe('lab-acme_lab-acme-dev_2026-09-11_132246.zip')
    expect(resolveFleetBackupFileName(
      'lab-acme',
      'lab-acme-dev',
      '2026-09-11T19:22:46.544Z',
      'America/Denver',
      () => true,
    )).toBe('lab-acme_lab-acme-dev_2026-09-11_132246544.zip')
  })

  it('formats last backup time and size for operators', () => {
    expect(formatBackupCreatedAt('2026-09-11T19:22:46.544Z', 'America/Denver')).toMatch(/Sep 11, 2026/)
    expect(formatBackupCreatedAt('2026-09-11T19:22:46.544Z', 'America/Denver')).toMatch(/1:22:46 PM/)
    expect(formatBackupSize(22642)).toBe('0.000023 GB (22 KB)')
    expect(formatBackupSize(1_240_000_000)).toBe('1.24 GB')
  })

  it('writes a human-readable BACKUP.md without changing manifest v1', () => {
    const md = fleetBackupReadme({
      customerDisplayName: 'Acme BJJ',
      customerSlug: 'lab-acme',
      customerId: 'cust-1',
      environmentDisplayName: 'DEV',
      environmentSlug: 'lab-acme-dev',
      environmentType: 'DEV',
      environmentId: 'env-1',
      createdAt: '2026-09-11T19:22:46.544Z',
      timeZone: 'America/Denver',
      containerName: 'lab-acme-dev-app',
      sqliteFilename: 'crm.sqlite',
      zipFileName: 'lab-acme_lab-acme-dev_2026-09-11_132246.zip',
    })
    expect(md).toContain('Acme BJJ')
    expect(md).toContain('lab-acme-dev')
    expect(md).toContain('cust-1')
    expect(md).toContain('env-1')
    expect(md).toContain('2026-09-11T19:22:46.544Z')
  })

  it('opens Explorer on the stored zip path', () => {
    const zip = 'C:\\backups\\lab-acme_lab-acme-dev_2026-09-11_132246.zip'
    expect(revealBackupCommand('win32', zip)).toEqual({
      command: 'explorer.exe',
      args: [`/select,${zip}`],
    })
  })

  it('refuses zip paths outside data/backups and missing files', () => {
    const root = join(tmpdir(), `fleet-reveal-${randomUUID()}`)
    mkdirSync(join(root, 'data', 'backups', 'lab-acme', 'lab-acme-dev'), { recursive: true })
    const inside = join(root, 'data', 'backups', 'lab-acme', 'lab-acme-dev', 'lab-acme_lab-acme-dev_2026-09-11_132246.zip')
    writeFileSync(inside, 'zip')
    expect(isPathInsideBackupRoot(inside, root)).toBe(true)
    expect(isPathInsideBackupRoot(join(root, 'outside.zip'), root)).toBe(false)
    expect(isPathInsideBackupRoot(join(root, 'data', 'backups', '..', 'escape.zip'), root)).toBe(false)
    expect(assertRevealableZipPath(inside, root)).toBe(inside)
    expect(() => assertRevealableZipPath(join(root, 'outside.zip'), root)).toThrow(FleetBackupError)
    const missing = join(root, 'data', 'backups', 'lab-acme', 'lab-acme-dev', 'gone.zip')
    try {
      assertRevealableZipPath(missing, root)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(FleetBackupError)
      expect((error as FleetBackupError).statusCode).toBe(404)
    }
    rmSync(root, { recursive: true, force: true })
  })

  it('reveals only a backup id registered to that environment', async () => {
    const root = join(tmpdir(), `fleet-reveal-db-${randomUUID()}`)
    mkdirSync(join(root, 'data', 'backups', 'lab-acme', 'lab-acme-dev'), { recursive: true })
    const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
    await migrateDatabase(url)
    await seedRegistry(url)
    const { client, db } = createDb(url)
    const rows = await listRegisteredEnvironments(db)
    const dev = rows.find(row => row.slug === 'lab-acme-dev')
    const prod = rows.find(row => row.slug === 'lab-acme-prod')
    expect(dev && prod).toBeTruthy()
    const zipPath = join(root, 'data', 'backups', 'lab-acme', 'lab-acme-dev', 'lab-acme_lab-acme-dev_2026-09-11_132246.zip')
    writeFileSync(zipPath, 'zip')
    const backupId = randomUUID()
    await db.insert(environmentBackups).values({
      id: backupId,
      environmentId: dev!.id,
      customerId: dev!.customer.id,
      createdAt: '2026-09-11T19:22:46.544Z',
      bytes: 12,
      zipPath,
      sqliteFilename: 'crm.sqlite',
      offhostPath: null,
      offhostCopiedAt: null,
      previousExpectedImage: dev!.expectedImage,
    })
    const opened: string[] = []
    const revealed = await revealEnvironmentBackup(db, dev!.id, backupId, {
      filesRoot: root,
      open: (path) => {
        opened.push(path)
        return revealBackupCommand('win32', path)
      },
    })
    expect(opened).toEqual([zipPath])
    expect(revealed.backupId).toBe(backupId)
    await expect(revealEnvironmentBackup(db, prod!.id, backupId, {
      filesRoot: root,
      open: () => revealBackupCommand('win32', zipPath),
    })).rejects.toMatchObject({ statusCode: 404 })
    client.close()
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // sqlite unlock can lag on Windows
    }
  })

  it('refuses decommissioned environments and finds sqlite filenames', () => {
    expect(environmentBackupGuard(null)?.statusCode).toBe(404)
    expect(environmentBackupGuard({ lifecycleStatus: 'decommissioned' })?.statusCode).toBe(409)
    expect(environmentBackupGuard({ lifecycleStatus: 'ready' })).toBeNull()
    expect(findSqliteFilename(['crm.sqlite', 'uploads'])).toBe('crm.sqlite')
    expect(findSqliteFilename(['app.sqlite'])).toBe('app.sqlite')
    expect(() => findSqliteFilename(['readme.txt'])).toThrow(/SQLite/)
  })

  it('blocks PROD upgrade until non-PROD matches unless Acme lab', () => {
    const rows = [
      { type: 'PROD', lifecycleStatus: 'ready', expectedImage: 'martial-arts-acquisition:s4' },
      { type: 'DEV', lifecycleStatus: 'ready', expectedImage: 'martial-arts-acquisition:s4' },
    ]
    expect(prodUpgradeBlocked(rows, 'martial-arts-acquisition:s6')).toBe(true)
    expect(prodUpgradeBlocked(rows, 'martial-arts-acquisition:s4')).toBe(false)
    expect(prodUpgradeBlocked(rows, 'martial-arts-acquisition:s6', true)).toBe(false)
    expect(prodUpgradeBlocked(
      [{ type: 'PROD', lifecycleStatus: 'ready', expectedImage: 'x' }],
      'y',
    )).toBe(false)
  })

  it('writes and reads a fleet zip with environment identity', async () => {
    const root = join(tmpdir(), `fleet-zip-${randomUUID()}`)
    mkdirSync(join(root, 'sqlite'), { recursive: true })
    mkdirSync(join(root, 'uploads'), { recursive: true })
    writeFileSync(join(root, 'sqlite', 'crm.sqlite'), 'sqlite-bytes')
    writeFileSync(join(root, 'uploads', 'note.txt'), 'hi')
    const zipPath = join(root, 'lab-acme_lab-acme-dev_2026-09-11_132246.zip')
    await writeFleetBackupZip({
      zipPath,
      sqlitePath: join(root, 'sqlite', 'crm.sqlite'),
      sqliteFilename: 'crm.sqlite',
      uploadsDir: join(root, 'uploads'),
      customerId: 'cust-1',
      customerSlug: 'lab-acme',
      customerDisplayName: 'Acme BJJ',
      environmentId: 'env-1',
      environmentSlug: 'lab-acme-dev',
      environmentDisplayName: 'DEV',
      environmentType: 'DEV',
      containerName: 'lab-acme-dev-app',
      timeZone: 'America/Denver',
      createdAt: '2026-09-11T19:22:46.544Z',
    })
    const extractDir = join(root, 'out')
    await extractFleetBackupZip(zipPath, extractDir)
    const manifest = readFleetBackupManifest(extractDir)
    expect(manifest.version).toBe(1)
    expect(manifest.environmentId).toBe('env-1')
    expect(manifest.sqliteFilename).toBe('crm.sqlite')
    expect(manifest.files).toContain(FLEET_BACKUP_README)
    expect(extractedSqliteDir(extractDir)).toContain('sqlite')
    const readme = readFileSync(join(extractDir, FLEET_BACKUP_README), 'utf8')
    expect(readme).toContain('Acme BJJ')
    expect(readme).toContain('lab-acme-dev')
    expect(readme).toContain('env-1')
  })
})
