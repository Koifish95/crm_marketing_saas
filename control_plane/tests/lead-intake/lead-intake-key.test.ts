import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { eq } from 'drizzle-orm'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { environments, operatorEvents } from '../../server/database/schema'
import { renderProvisionedEnv, readEnvValue } from '../../server/services/provision-env'
import { MARTIAL_ARTS_PRODUCT, SALES_PRODUCT } from '../../server/products/catalog'
import { addProductInstance, createCustomerAccount } from '../../server/services/provision-registry'
import { revealLeadIntakeKey, rotateLeadIntakeKey, FleetBackupError } from '../../server/services/fleet-backup'
import { setLifecycleStatus } from '../../server/services/provision-runtime'
import { recordOperatorEvent } from '../../server/services/operator-events'
import { dockerFailureMessage } from '../../server/services/docker-relaunch'
import {
  generateLeadIntakeKey,
  pendingRevealPath,
  redactDeep,
  redactLeadIntakeKey,
  withLeadIntakeKeyBackfill,
} from '../../server/services/lead-intake-key'

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return { ...actual, spawnSync: vi.fn(() => ({ status: 0, stdout: '', stderr: '' })) }
})

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

const base = {
  composeProject: 'top-tier-prod',
  containerName: 'top-tier-prod-app',
  hostPort: 52230,
  sqliteVolume: 'top-tier-prod-sqlite',
  assetsVolume: 'top-tier-prod-assets',
  expectedImage: 'crm-sales:c2',
  type: 'PROD',
  displayName: 'Top Tier Hauling',
  adminEmail: 'admin@top-tier.local',
  timezone: 'America/Denver',
  sessionPassword: 'test-session-password-32-characters',
}

async function openSalesEnvironment(productId: 'sales' | 'martial-arts' = 'sales') {
  const root = join(tmpdir(), `lead-intake-${randomUUID()}`)
  mkdirSync(root, { recursive: true })
  roots.push(root)
  const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
  await migrateDatabase(url)
  await seedRegistry(url)
  const { client, db } = createDb(url)
  const customer = await createCustomerAccount(db, {
    displayName: 'Top Tier Hauling',
    slug: 'top-tier',
    adminEmail: 'admin@top-tier.local',
    filesRoot: root,
  })
  const added = await addProductInstance(db, customer.customerId, { productId, filesRoot: root })
  const created = added.environments[0]!
  const envPath = join(root, created.envFileLocal)
  // Fleet services resolve relative env paths against the process cwd; pin this one.
  await db.update(environments).set({ envFileLocal: envPath, envFileExample: envPath }).where(eq(environments.id, created.id))
  return { client, db, envPath, id: created.id }
}

describe('lead intake key generation', () => {
  it('is at least 32 random bytes and unique', () => {
    const a = generateLeadIntakeKey()
    expect(Buffer.from(a, 'base64url').length).toBeGreaterThanOrEqual(32)
    expect(generateLeadIntakeKey()).not.toBe(a)
  })

  it('is written to a Sales env file at provision and not to Martial Arts', () => {
    const sales = renderProvisionedEnv({ ...base, product: SALES_PRODUCT })
    expect(readEnvValue(sales.contents, 'LEAD_INTAKE_KEY').length).toBeGreaterThanOrEqual(43)
    const ma = renderProvisionedEnv({ ...base, expectedImage: 'martial-arts-acquisition:s4', product: MARTIAL_ARTS_PRODUCT })
    expect(ma.contents).not.toContain('LEAD_INTAKE_KEY')
    expect(ma.hasLeadIntakeKey).toBe(false)
  })

  it('passes the setting through the Sales compose file', () => {
    const compose = readFileSync(join(__dirname, '../../../sales_template/docker-compose.provisioned.yml'), 'utf8')
    expect(compose).toContain('LEAD_INTAKE_KEY: ${LEAD_INTAKE_KEY:-}')
    const ma = readFileSync(join(__dirname, '../../../martial_arts_template/docker-compose.provisioned.yml'), 'utf8')
    expect(ma).not.toContain('LEAD_INTAKE_KEY')
  })
})

describe('upgrade backfill', () => {
  it('never overwrites an existing key', () => {
    const env = renderProvisionedEnv({ ...base, product: SALES_PRODUCT }).contents
    const result = withLeadIntakeKeyBackfill(env)
    expect(result.created).toBe(false)
    expect(result.contents).toBe(env)
  })

  it('adds a key when missing and keeps the rest of the file', () => {
    const env = 'HOST_PORT="52230"\nRELEASE_ID="abc"\n'
    const result = withLeadIntakeKeyBackfill(env)
    expect(result.created).toBe(true)
    expect(readEnvValue(result.contents, 'LEAD_INTAKE_KEY').length).toBeGreaterThanOrEqual(43)
    expect(result.contents).toContain('HOST_PORT="52230"')
  })
})

describe('reveal and rotate', () => {
  it('marks a provisioned Sales key pending and reveals it exactly once', async () => {
    const { client, db, envPath, id } = await openSalesEnvironment()
    try {
      // Provisioning wrote the env file relative to root; the helper repointed the row at it.
      expect(existsSync(envPath)).toBe(true)
      expect(existsSync(pendingRevealPath(envPath))).toBe(true)
      const stored = readEnvValue(readFileSync(envPath, 'utf8'), 'LEAD_INTAKE_KEY')
      const first = await revealLeadIntakeKey(db, id)
      expect(first.leadIntakeKey).toBe(stored)
      await expect(revealLeadIntakeKey(db, id)).rejects.toThrow(/already shown/)
      const events = JSON.stringify(await db.select().from(operatorEvents))
      expect(events).not.toContain(stored)
    } finally {
      client.close()
    }
  })

  it('rotation replaces the key, shows the new one once, and invalidates the old one', async () => {
    const { client, db, envPath, id } = await openSalesEnvironment()
    try {
      const oldKey = readEnvValue(readFileSync(envPath, 'utf8'), 'LEAD_INTAKE_KEY')
      const rotated = await rotateLeadIntakeKey(db, id)
      expect(rotated.leadIntakeKey).not.toBe(oldKey)
      expect(readEnvValue(readFileSync(envPath, 'utf8'), 'LEAD_INTAKE_KEY')).toBe(rotated.leadIntakeKey)
      // The rotation response is the one showing; nothing is left to reveal.
      await expect(revealLeadIntakeKey(db, id)).rejects.toThrow(/already shown/)
      const events = JSON.stringify(await db.select().from(operatorEvents))
      expect(events).not.toContain(rotated.leadIntakeKey)
      expect(events).not.toContain(oldKey)
    } finally {
      client.close()
    }
  })

  it('leaves Martial Arts environments untouched', async () => {
    const { client, db, envPath, id } = await openSalesEnvironment('martial-arts')
    try {
      const before = readFileSync(envPath, 'utf8')
      expect(before).not.toContain('LEAD_INTAKE_KEY')
      expect(existsSync(pendingRevealPath(envPath))).toBe(false)
      await expect(revealLeadIntakeKey(db, id)).rejects.toBeInstanceOf(FleetBackupError)
      await expect(rotateLeadIntakeKey(db, id)).rejects.toBeInstanceOf(FleetBackupError)
      expect(readFileSync(envPath, 'utf8')).toBe(before)
    } finally {
      client.close()
    }
  })
})

describe('redaction', () => {
  const key = 'k'.repeat(43)

  it('strips assignments and known values from text', () => {
    expect(redactLeadIntakeKey(`LEAD_INTAKE_KEY="${key}" failed`)).not.toContain(key)
    expect(redactLeadIntakeKey(`LEAD_INTAKE_KEY=${key}`)).not.toContain(key)
    expect(redactLeadIntakeKey(`bad value ${key}`, key)).not.toContain(key)
    expect(redactDeep({ a: { LEAD_INTAKE_KEY: key, leadIntakeKey: key, note: `LEAD_INTAKE_KEY=${key}` } })).not.toHaveProperty('a.LEAD_INTAKE_KEY', key)
    expect(JSON.stringify(redactDeep({ a: { leadIntakeKey: key, note: `LEAD_INTAKE_KEY=${key}` } }))).not.toContain(key)
  })

  it('redacts stored provision errors, operator events, and docker failures', async () => {
    const { client, db, id } = await openSalesEnvironment()
    try {
      await setLifecycleStatus(db, id, 'failed', `compose said LEAD_INTAKE_KEY="${key}"`)
      const [row] = await db.select().from(environments).where(eq(environments.id, id))
      expect(row?.provisionError).not.toContain(key)
      await recordOperatorEvent(db, { action: 'x', summary: `LEAD_INTAKE_KEY=${key}`, detail: { stderr: `LEAD_INTAKE_KEY=${key}`, leadIntakeKey: key } })
      expect(JSON.stringify(await db.select().from(operatorEvents))).not.toContain(key)
      const message = dockerFailureMessage({ status: 1, stderr: `LEAD_INTAKE_KEY=${key}`, stdout: '' } as never, 'fallback')
      expect(message).not.toContain(key)
    } finally {
      client.close()
    }
  })
})
