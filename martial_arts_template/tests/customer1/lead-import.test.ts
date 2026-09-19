import { describe, expect, it } from 'vitest'
import { users } from '../../server/database/schema'
import { importLeadsFromCsv, leadImportTemplateCsv, parseLeadImportCsv } from '../../server/services/lead-import'
import { exportCustomerRecords } from '../../server/services/data-export'
import { createAsset } from '../../server/services/assets'
import { openTestDatabase } from '../helpers/db'
import { DomainError } from '../../server/services/errors'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('Customer #1 import, export, and upload safety', () => {
  it('rejects invalid CSV rows and imports a valid household with reconciliation counts', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      const invalid = await importLeadsFromCsv(testDb.db, 'guardianFirstName,source,memberFirstName,programCode\n,,,,\nPat,NOT_A_SOURCE,Pat,NOPE\n', actor)
      expect(invalid.importedHouseholds).toBe(0)
      expect(invalid.errors.length).toBeGreaterThan(0)

      const result = await importLeadsFromCsv(testDb.db, leadImportTemplateCsv(), actor)
      expect(result.importedHouseholds).toBe(1)
      expect(result.importedMembers).toBe(2)
      expect(result.leadIds).toHaveLength(1)
      const exported = await exportCustomerRecords(testDb.db)
      expect(exported.counts.households).toBeGreaterThanOrEqual(1)
      expect(exported.counts.members).toBeGreaterThanOrEqual(2)
    } finally {
      await testDb.close()
    }
  })

  it('parses required import columns', () => {
    expect(() => parseLeadImportCsv('name\nPat')).toThrow(/missing required column/)
  })

  it('rejects oversized or disallowed uploads', async () => {
    const testDb = await openTestDatabase()
    const dir = mkdtempSync(join(tmpdir(), 'ma-upload-'))
    process.env.ASSET_UPLOAD_DIR = dir
    process.env.ASSET_UPLOAD_MAX_BYTES = '16'
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      await expect(createAsset(testDb.db, {
        displayName: 'too big',
        originalFilename: 'big.jpg',
        mediaType: 'image/jpeg',
        bytes: Buffer.alloc(32),
      }, actor)).rejects.toBeInstanceOf(DomainError)
      await expect(createAsset(testDb.db, {
        displayName: 'exe',
        originalFilename: 'payload.exe',
        mediaType: 'application/x-msdownload',
        bytes: Buffer.from('MZ'),
      }, actor)).rejects.toMatchObject({ message: expect.stringContaining('Unsupported file type') })
    } finally {
      await testDb.close()
      rmSync(dir, { recursive: true, force: true })
      delete process.env.ASSET_UPLOAD_DIR
      delete process.env.ASSET_UPLOAD_MAX_BYTES
    }
  })
})
