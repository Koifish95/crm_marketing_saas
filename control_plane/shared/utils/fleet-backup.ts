export const FLEET_BACKUP_RETENTION_DAYS = 14
export const FLEET_BACKUP_MANIFEST = 'manifest.json'
export const FLEET_BACKUP_README = 'BACKUP.md'
export const FLEET_BACKUP_SQLITE_PREFIX = 'sqlite/'
export const FLEET_BACKUP_UPLOADS_PREFIX = 'uploads/'

function assertBackupSlug(value: string, label: string) {
  if (!isSafeBackupName(value)) {
    throw new Error(`Refusing ${label} ${value}.`)
  }
}

function formatPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find(part => part.type === type)?.value || ''
}

export function fleetBackupLocalStamp(createdAt: string, timeZone: string, includeMs = false) {
  const date = new Date(createdAt)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const stamp = [
    formatPart(parts, 'year'),
    '-',
    formatPart(parts, 'month'),
    '-',
    formatPart(parts, 'day'),
    '_',
    formatPart(parts, 'hour'),
    formatPart(parts, 'minute'),
    formatPart(parts, 'second'),
  ].join('')
  if (!includeMs) {
    return stamp
  }
  return `${stamp}${String(date.getUTCMilliseconds()).padStart(3, '0')}`
}

export function fleetBackupRelativeDir(customerSlug: string, environmentSlug: string) {
  assertBackupSlug(customerSlug, 'customer slug')
  assertBackupSlug(environmentSlug, 'environment slug')
  return `data/backups/${customerSlug}/${environmentSlug}`
}

export function fleetBackupFileName(
  customerSlug: string,
  environmentSlug: string,
  createdAt: string,
  timeZone: string,
  includeMs = false,
) {
  assertBackupSlug(customerSlug, 'customer slug')
  assertBackupSlug(environmentSlug, 'environment slug')
  const stamp = fleetBackupLocalStamp(createdAt, timeZone, includeMs)
  return `${customerSlug}_${environmentSlug}_${stamp}.zip`
}

export function resolveFleetBackupFileName(
  customerSlug: string,
  environmentSlug: string,
  createdAt: string,
  timeZone: string,
  exists: (name: string) => boolean,
) {
  const name = fleetBackupFileName(customerSlug, environmentSlug, createdAt, timeZone)
  if (!exists(name)) {
    return name
  }
  return fleetBackupFileName(customerSlug, environmentSlug, createdAt, timeZone, true)
}

export function formatBackupCreatedAt(createdAt: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(createdAt))
}

function trimZeros(value: string) {
  return value.replace(/\.?0+$/, '')
}

function formatCompactBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const kb = bytes / 1024
  if (kb < 1024) {
    return `${kb >= 10 ? Math.round(kb) : trimZeros(kb.toFixed(1))} KB`
  }
  const mb = kb / 1024
  return `${trimZeros(mb.toFixed(mb >= 10 ? 0 : 1))} MB`
}

export function backupZipFileName(zipPath: string) {
  return zipPath.split(/[/\\]/).pop() || zipPath
}

export function existingBackupFileMessage(action: 'Backup' | 'Off-host copy', _fileName?: string) {
  return `${action} not created: a backup with this filename already exists.`
}

export function formatBackupCreatedNotice(backup: { zipPath: string, createdAt: string }) {
  return `Backup created. ${backupZipFileName(backup.zipPath)} · ${backup.createdAt} · ${backup.zipPath}`
}

export function formatOffhostCopyNotice(backup: { zipPath: string, offhostPath?: string | null }) {
  return `Off-host copy finished. ${backupZipFileName(backup.zipPath)} is at ${backup.offhostPath}.`
}

export function formatBackupSize(bytes: number) {
  const gb = bytes / 1e9
  const gbText = `${trimZeros(gb >= 0.01 ? gb.toFixed(3) : gb.toFixed(6))} GB`
  if (gb < 0.01) {
    return `${gbText} (${formatCompactBytes(bytes)})`
  }
  return gbText
}

export function fleetBackupReadme(input: {
  customerDisplayName: string
  customerSlug: string
  customerId: string
  environmentDisplayName: string
  environmentSlug: string
  environmentType: string
  environmentId: string
  createdAt: string
  timeZone: string
  containerName: string
  sqliteFilename: string
  zipFileName: string
}) {
  return [
    '# Fleet backup',
    '',
    `- Customer: ${input.customerDisplayName} (\`${input.customerSlug}\`)`,
    `- Customer ID: ${input.customerId}`,
    `- Environment: ${input.environmentDisplayName} (\`${input.environmentSlug}\`)`,
    `- Environment ID: ${input.environmentId}`,
    `- Type: ${input.environmentType}`,
    `- Created: ${formatBackupCreatedAt(input.createdAt, input.timeZone)}`,
    `- Created UTC: ${input.createdAt}`,
    `- Time zone: ${input.timeZone}`,
    `- Container: ${input.containerName}`,
    `- SQLite file: ${input.sqliteFilename}`,
    `- Zip file: ${input.zipFileName}`,
    '',
  ].join('\n')
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
