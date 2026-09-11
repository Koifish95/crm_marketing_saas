export const FLEET_BACKUP_RETENTION_DAYS = 14
export const FLEET_BACKUP_MANIFEST = 'manifest.json'
export const FLEET_BACKUP_SQLITE_PREFIX = 'sqlite/'
export const FLEET_BACKUP_UPLOADS_PREFIX = 'uploads/'

export function fleetBackupRelativeDir(customerId: string, environmentId: string) {
  return `data/backups/${customerId}/${environmentId}`
}

export function fleetBackupFileName(environmentId: string, createdAt: string) {
  const stamp = createdAt.replaceAll(':', '').replaceAll('.', '').replaceAll('-', '')
  return `${environmentId}-${stamp}.zip`
}

export function isSafeBackupName(value: string) {
  return /^[a-z0-9][a-z0-9-]{2,62}$/i.test(value)
}

export function assertSafeVolumeName(name: string) {
  const blob = name.toLowerCase()
  if (blob.includes('renzo') || blob.includes('webhosting')) {
    throw new Error(`Refusing volume ${name}.`)
  }
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/i.test(name)) {
    throw new Error(`Refusing volume ${name}.`)
  }
}

export function environmentBackupGuard(row: { lifecycleStatus: string } | null) {
  if (!row) {
    return { statusCode: 404, statusMessage: 'Environment not registered.' }
  }
  if (row.lifecycleStatus === 'decommissioned') {
    return { statusCode: 409, statusMessage: 'Decommissioned environments cannot be backed up or restored.' }
  }
  return null
}

export function findSqliteFilename(names: readonly string[]) {
  if (names.includes('crm.sqlite')) {
    return 'crm.sqlite'
  }
  if (names.includes('app.sqlite')) {
    return 'app.sqlite'
  }
  const sqlite = names.filter(name => name.endsWith('.sqlite'))
  const only = sqlite[0]
  if (sqlite.length === 1 && only) {
    return only
  }
  throw new Error('Snapshot is missing a single SQLite file.')
}

export function prodUpgradeBlocked(
  environments: readonly { type: string, lifecycleStatus?: string, expectedImage: string }[],
  targetImage: string,
  isAcmeLab = false,
) {
  if (isAcmeLab) {
    return false
  }
  const nonProd = environments.filter(env => (
    env.type !== 'PROD' && env.lifecycleStatus !== 'decommissioned'
  ))
  if (nonProd.length === 0) {
    return false
  }
  return nonProd.some(env => env.expectedImage !== targetImage)
}

export type FleetBackupSummary = {
  id: string
  createdAt: string
  bytes: number
  zipPath: string
  offhostPath?: string | null
  offhostCopiedAt?: string | null
}
