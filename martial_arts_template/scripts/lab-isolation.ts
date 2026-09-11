import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { getDatabaseUrl, sqliteFilePath } from '../server/database'
import { uploadsDirectory } from '../server/services/assets'
import { restampIsolationFiles, restampIsolationSetting } from '../server/services/environment-backup'
import { loadLocalEnv } from '../server/utils/load-env'
import {
  APP_ENV_ISOLATION_MARKERS,
  isolationMarkerFileName,
  readAppEnv,
  type AppEnv,
} from '@crm/core/shared/utils/app-env'

export const LAB_SLUGS = ['lab-acme-prod', 'lab-acme-dev'] as const
export type LabSlug = (typeof LAB_SLUGS)[number]

export function isLabSlug(value: string): value is LabSlug {
  return (LAB_SLUGS as readonly string[]).includes(value)
}

export async function stampLabIsolation(input: {
  databaseUrl: string
  assetUploadDir: string
  appEnv: AppEnv
}) {
  const sqlitePath = sqliteFilePath(input.databaseUrl)
  if (!sqlitePath) {
    throw new Error(`DATABASE_URL must be a file: SQLite path. Got ${input.databaseUrl}`)
  }
  process.env.ASSET_UPLOAD_DIR = input.assetUploadDir
  await restampIsolationSetting(sqlitePath, input.appEnv)
  restampIsolationFiles(input.assetUploadDir, input.appEnv)
  return {
    appEnv: input.appEnv,
    marker: APP_ENV_ISOLATION_MARKERS[input.appEnv],
    sqlitePath,
    uploadMarker: isolationMarkerFileName(input.appEnv),
  }
}

export async function readLabIsolation(input: {
  databaseUrl: string
  assetUploadDir: string
  appEnv: AppEnv
}) {
  const sqlitePath = sqliteFilePath(input.databaseUrl)
  if (!sqlitePath) {
    throw new Error(`DATABASE_URL must be a file: SQLite path. Got ${input.databaseUrl}`)
  }
  const client = createClient({ url: input.databaseUrl })
  try {
    const result = await client.execute('SELECT value FROM app_settings WHERE key = \'m10a.isolation\'')
    const dbMarker = String(result.rows[0]?.value ?? '')
    const fileName = isolationMarkerFileName(input.appEnv)
    const filePath = join(input.assetUploadDir, fileName)
    const fileMarker = existsSync(filePath) ? readFileSync(filePath, 'utf8').trim() : ''
    return { appEnv: input.appEnv, dbMarker, fileMarker, fileName, sqlitePath }
  } finally {
    client.close()
  }
}

const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/lab-isolation.ts')
if (invoked) {
  loadLocalEnv()
  const command = process.argv[2] || 'stamp'
  const appEnv = readAppEnv()
  const input = {
    databaseUrl: getDatabaseUrl(),
    assetUploadDir: uploadsDirectory(),
    appEnv,
  }
  const run = command === 'get' ? readLabIsolation(input) : stampLabIsolation(input)
  run.then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
