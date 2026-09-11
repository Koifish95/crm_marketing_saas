import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { ZipFile } from 'yazl'
import {
  FLEET_BACKUP_MANIFEST,
  FLEET_BACKUP_README,
  FLEET_BACKUP_SQLITE_PREFIX,
  FLEET_BACKUP_UPLOADS_PREFIX,
  fleetBackupReadme,
} from '../../shared/utils/fleet-backup'

export type FleetBackupManifest = {
  version: 1
  customerId: string
  environmentId: string
  createdAt: string
  sqliteFilename: string
  files: string[]
}

function collectUploads(uploadsDir: string) {
  if (!existsSync(uploadsDir)) {
    return [] as { absolute: string, zipName: string }[]
  }
  const entries: { absolute: string, zipName: string }[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, name.name)
      if (name.isDirectory()) {
        walk(absolute)
        continue
      }
      const zipName = `${FLEET_BACKUP_UPLOADS_PREFIX}${relative(uploadsDir, absolute).replaceAll('\\', '/')}`
      entries.push({ absolute, zipName })
    }
  }
  walk(uploadsDir)
  return entries
}

export async function writeFleetBackupZip(input: {
  zipPath: string
  sqlitePath: string
  sqliteFilename: string
  uploadsDir: string
  customerId: string
  customerSlug: string
  customerDisplayName: string
  environmentId: string
  environmentSlug: string
  environmentDisplayName: string
  environmentType: string
  containerName: string
  timeZone: string
  createdAt: string
}) {
  mkdirSync(join(input.zipPath, '..'), { recursive: true })
  const uploads = collectUploads(input.uploadsDir)
  const files = [
    FLEET_BACKUP_MANIFEST,
    FLEET_BACKUP_README,
    `${FLEET_BACKUP_SQLITE_PREFIX}${input.sqliteFilename}`,
    ...uploads.map(row => row.zipName),
  ]
  const manifest: FleetBackupManifest = {
    version: 1,
    customerId: input.customerId,
    environmentId: input.environmentId,
    createdAt: input.createdAt,
    sqliteFilename: input.sqliteFilename,
    files,
  }
  const readme = fleetBackupReadme({
    customerDisplayName: input.customerDisplayName,
    customerSlug: input.customerSlug,
    customerId: input.customerId,
    environmentDisplayName: input.environmentDisplayName,
    environmentSlug: input.environmentSlug,
    environmentType: input.environmentType,
    environmentId: input.environmentId,
    createdAt: input.createdAt,
    timeZone: input.timeZone,
    containerName: input.containerName,
    sqliteFilename: input.sqliteFilename,
    zipFileName: basename(input.zipPath),
  })
  const zip = new ZipFile()
  zip.addBuffer(Buffer.from(JSON.stringify(manifest)), FLEET_BACKUP_MANIFEST)
  zip.addBuffer(Buffer.from(readme), FLEET_BACKUP_README)
  zip.addFile(input.sqlitePath, `${FLEET_BACKUP_SQLITE_PREFIX}${input.sqliteFilename}`)
  for (const upload of uploads) {
    zip.addFile(upload.absolute, upload.zipName)
  }
  zip.end()
  await pipeline(zip.outputStream, createWriteStream(input.zipPath))
  return {
    manifest,
    bytes: statSync(input.zipPath).size,
    zipPath: input.zipPath,
  }
}

export function readFleetBackupManifest(extractDir: string) {
  const raw = JSON.parse(readFileSync(join(extractDir, FLEET_BACKUP_MANIFEST), 'utf8')) as FleetBackupManifest
  if (raw.version !== 1 || !raw.environmentId || !raw.sqliteFilename) {
    throw new Error('Backup manifest is not a fleet environment zip.')
  }
  return raw
}
