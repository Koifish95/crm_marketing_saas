import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { migrateDatabase } from '../../server/database/migrate'
import { seedDatabase } from '../../drizzle/seed'
import { APP_ENV_ISOLATION_MARKERS, isolationMarkerFileName } from '../../shared/utils/app-env'
import { readLabIsolation, stampLabIsolation } from '../../scripts/lab-isolation'

const original = {
  NUXT_AUTH_PASSWORD: process.env.NUXT_AUTH_PASSWORD,
  NUXT_AUTH_USERNAME: process.env.NUXT_AUTH_USERNAME,
  NUXT_AUTH_EMAIL: process.env.NUXT_AUTH_EMAIL,
}

afterEach(() => {
  if (original.NUXT_AUTH_PASSWORD === undefined) {
    delete process.env.NUXT_AUTH_PASSWORD
  } else {
    process.env.NUXT_AUTH_PASSWORD = original.NUXT_AUTH_PASSWORD
  }
  if (original.NUXT_AUTH_USERNAME === undefined) {
    delete process.env.NUXT_AUTH_USERNAME
  } else {
    process.env.NUXT_AUTH_USERNAME = original.NUXT_AUTH_USERNAME
  }
  if (original.NUXT_AUTH_EMAIL === undefined) {
    delete process.env.NUXT_AUTH_EMAIL
  } else {
    process.env.NUXT_AUTH_EMAIL = original.NUXT_AUTH_EMAIL
  }
})

async function prepareRoot(label: string, password: string) {
  const root = join(tmpdir(), `s2-${label}-${randomUUID()}`)
  const sqlitePath = join(root, 'sqlite', 'crm.sqlite')
  const uploads = join(root, 'uploads')
  mkdirSync(join(root, 'sqlite'), { recursive: true })
  mkdirSync(uploads, { recursive: true })
  process.env.NUXT_AUTH_USERNAME = 'admin'
  process.env.NUXT_AUTH_EMAIL = `admin@${label}.local`
  process.env.NUXT_AUTH_PASSWORD = password
  const url = `file:${sqlitePath.replaceAll('\\', '/')}`
  await migrateDatabase(url)
  await seedDatabase(url)
  return { root, sqlitePath, uploads, url }
}

describe('S2 lab isolation naming', () => {
  it('stamps distinct prod and dev markers that do not leak across roots', async () => {
    const prod = await prepareRoot('lab-acme-prod', 'prod-admin-password')
    const dev = await prepareRoot('lab-acme-dev', 'dev-admin-password')
    try {
      await stampLabIsolation({
        databaseUrl: prod.url,
        assetUploadDir: prod.uploads,
        appEnv: 'production',
      })
      await stampLabIsolation({
        databaseUrl: dev.url,
        assetUploadDir: dev.uploads,
        appEnv: 'dev',
      })

      const prodRead = await readLabIsolation({
        databaseUrl: prod.url,
        assetUploadDir: prod.uploads,
        appEnv: 'production',
      })
      const devRead = await readLabIsolation({
        databaseUrl: dev.url,
        assetUploadDir: dev.uploads,
        appEnv: 'dev',
      })

      expect(prodRead.dbMarker).toBe(APP_ENV_ISOLATION_MARKERS.production)
      expect(devRead.dbMarker).toBe(APP_ENV_ISOLATION_MARKERS.dev)
      expect(prodRead.dbMarker).not.toBe(devRead.dbMarker)
      expect(prodRead.fileMarker).toBe(APP_ENV_ISOLATION_MARKERS.production)
      expect(devRead.fileMarker).toBe(APP_ENV_ISOLATION_MARKERS.dev)
      expect(existsSync(join(prod.uploads, isolationMarkerFileName('dev')))).toBe(false)
      expect(existsSync(join(dev.uploads, isolationMarkerFileName('production')))).toBe(false)

      writeFileSync(join(prod.uploads, 'keep-prod.txt'), 'prod-only')
      writeFileSync(join(dev.uploads, 'keep-dev.txt'), 'dev-only')
      expect(readFileSync(join(prod.uploads, 'keep-prod.txt'), 'utf8')).toBe('prod-only')
      expect(readFileSync(join(dev.uploads, 'keep-dev.txt'), 'utf8')).toBe('dev-only')
      expect(existsSync(join(prod.sqlitePath))).toBe(true)
      expect(existsSync(join(dev.sqlitePath))).toBe(true)
    } finally {
      for (const root of [prod.root, dev.root]) {
        try {
          rmSync(root, { recursive: true, force: true })
        } catch {
          // Windows may keep a libsql lock briefly.
        }
      }
    }
  })
})
