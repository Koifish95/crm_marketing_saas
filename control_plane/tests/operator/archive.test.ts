import { describe, expect, it } from 'vitest'
import { ARCHIVE_CONFIRM_PHRASE, archiveConfirmationError, backupIsStale, inactiveAccountMessage, isActiveStatus } from '../../shared/utils/lifecycle'
import { archiveEnvironmentGuard } from '../../server/services/archive'
import { volumeRemoveArgs, assertOwnedVolumeName } from '../../server/services/docker-relaunch'
import { environmentBackupGuard, environmentRestoreGuard } from '../../shared/utils/fleet-backup'

const row = {
  slug: 'c2-qa-test-sales-training',
  customer: { slug: 'c2-qa-test' },
  lifecycleStatus: 'ready',
  sqliteVolume: 'c2-qa-test-sales-training-sqlite',
  assetsVolume: 'c2-qa-test-sales-training-assets',
}

describe('archive guards', () => {
  it('requires exact slug and phrase', () => {
    expect(archiveConfirmationError({ slug: 'x', confirmSlug: 'y', confirmPhrase: ARCHIVE_CONFIRM_PHRASE })).toMatch(/slug/)
    expect(archiveConfirmationError({ slug: 'x', confirmSlug: 'x', confirmPhrase: 'delete' })).toMatch(/ARCHIVE AND DELETE/)
    expect(archiveConfirmationError({ slug: 'x', confirmSlug: 'x', confirmPhrase: ARCHIVE_CONFIRM_PHRASE })).toBeNull()
  })

  it('refuses lab-acme, reserved names, provisioning, and PROD skip-offhost', () => {
    expect(archiveEnvironmentGuard({
      ...row,
      slug: 'lab-acme-prod',
      customer: { slug: 'lab-acme' },
    }, { confirmSlug: 'lab-acme-prod', confirmPhrase: ARCHIVE_CONFIRM_PHRASE, destinationDir: 'C:/tmp' })?.statusCode).toBe(409)

    expect(archiveEnvironmentGuard({
      ...row,
      sqliteVolume: 'webhosting_renzo_sqlite',
    }, { confirmSlug: row.slug, confirmPhrase: ARCHIVE_CONFIRM_PHRASE, skipOffhost: true })?.statusCode).toBe(403)

    expect(archiveEnvironmentGuard({
      ...row,
      lifecycleStatus: 'provisioning',
    }, { confirmSlug: row.slug, confirmPhrase: ARCHIVE_CONFIRM_PHRASE, skipOffhost: true })?.statusCode).toBe(409)

    expect(archiveEnvironmentGuard(row, {
      confirmSlug: row.slug,
      confirmPhrase: ARCHIVE_CONFIRM_PHRASE,
      skipOffhost: true,
      type: 'PROD',
    })?.statusMessage).toMatch(/PROD cannot skip/)

    expect(archiveEnvironmentGuard(row, {
      confirmSlug: row.slug,
      confirmPhrase: ARCHIVE_CONFIRM_PHRASE,
      skipOffhost: true,
      type: 'TRAINING',
    })).toBeNull()
  })

  it('removes only exact owned volume names and never prune/-v', () => {
    expect(volumeRemoveArgs('c2-qa-test-sales-training-sqlite')).toEqual(['volume', 'rm', 'c2-qa-test-sales-training-sqlite'])
    expect(() => volumeRemoveArgs('renzo-prod-sqlite')).toThrow(/reserved|Refusing/i)
    expect(() => assertOwnedVolumeName('other-sqlite', ['c2-qa-test-sales-training-sqlite'])).toThrow(/Exact registered/)
  })

  it('allows backup of decommissioned volumes but not archived, and refuses restore of both', () => {
    expect(environmentBackupGuard({ lifecycleStatus: 'decommissioned' })).toBeNull()
    expect(environmentBackupGuard({ lifecycleStatus: 'archived' })?.statusCode).toBe(409)
    expect(environmentRestoreGuard({ lifecycleStatus: 'decommissioned' })?.statusCode).toBe(409)
    expect(environmentRestoreGuard({ lifecycleStatus: 'archived' })?.statusCode).toBe(409)
    expect(isActiveStatus('inactive')).toBe(false)
    expect(backupIsStale(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString())).toBe(true)
    expect(inactiveAccountMessage('inactive', 'active')).toMatch(/customer/)
    expect(inactiveAccountMessage('active', 'inactive')).toMatch(/product instance/)
    expect(inactiveAccountMessage('active', 'active')).toBeNull()
  })
})
