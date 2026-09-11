import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  environmentBackupGuard,
  findSqliteFilename,
  fleetBackupFileName,
  fleetBackupRelativeDir,
  FLEET_BACKUP_RETENTION_DAYS,
  prodUpgradeBlocked,
} from '../../shared/utils/fleet-backup'
import { extractFleetBackupZip, extractedSqliteDir } from '../../server/services/fleet-backup-extract'
import { readFleetBackupManifest, writeFleetBackupZip } from '../../server/services/fleet-backup-zip'

describe('S6 fleet backup contract', () => {
  it('keys zips by customer and environment and retains 14 days', () => {
    expect(FLEET_BACKUP_RETENTION_DAYS).toBe(14)
    expect(fleetBackupRelativeDir('cust-1', 'env-1')).toBe('data/backups/cust-1/env-1')
    expect(fleetBackupFileName('env-1', '2026-09-10T12:00:00.000Z')).toContain('env-1-')
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
    const zipPath = join(root, 'backup.zip')
    await writeFleetBackupZip({
      zipPath,
      sqlitePath: join(root, 'sqlite', 'crm.sqlite'),
      sqliteFilename: 'crm.sqlite',
      uploadsDir: join(root, 'uploads'),
      customerId: 'cust-1',
      environmentId: 'env-1',
      createdAt: '2026-09-10T12:00:00.000Z',
    })
    const extractDir = join(root, 'out')
    await extractFleetBackupZip(zipPath, extractDir)
    const manifest = readFleetBackupManifest(extractDir)
    expect(manifest.environmentId).toBe('env-1')
    expect(manifest.sqliteFilename).toBe('crm.sqlite')
    expect(extractedSqliteDir(extractDir)).toContain('sqlite')
  })
})
