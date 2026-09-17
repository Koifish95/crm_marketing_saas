import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { userRoles, users } from '../../server/database/schema'
import { assignExtraUserRoles } from '../../server/services/access-rights'
import { createManagedUser } from '../../server/services/users'
import { createCampaign } from '../../server/services/campaigns'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { openTestDatabase } from '../helpers/db'
import createAssetRoute from '../../server/api/marketing/assets/index.post'

let currentActor: SessionUser | null = null
let server: Server | undefined

afterEach(async () => {
  currentActor = null
  setUseDbForTests(undefined)
  if (!server) {
    return
  }
  const closing = server
  server = undefined
  await new Promise<void>((resolve, reject) => {
    closing.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
})

async function start(testDb: Awaited<ReturnType<typeof openTestDatabase>>) {
  setUseDbForTests(testDb.db)
  const app = createApp()
  const router = createRouter()
  router.post('/api/marketing/assets', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return createAssetRoute(event)
  }))
  app.use(router)
  server = createServer(toNodeListener(app))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return `http://127.0.0.1:${port}`
}

function asUser(row: { id: number, email: string, displayName: string, role: string }): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as SessionUser['role'],
    mustChangePassword: false,
  }
}

async function readyUser(
  db: Awaited<ReturnType<typeof openTestDatabase>>['db'],
  input: { displayName: string, email: string, role: 'ADMIN' | 'STAFF' | 'VIEWER' },
) {
  const created = await createManagedUser(db, input)
  await db.update(users).set({
    mustChangePassword: false,
    updatedAt: new Date(utcNowMs()),
  }).where(eq(users.id, created.id))
  return created
}

async function postAsset(base: string, body?: FormData) {
  const response = await fetch(`${base}/api/marketing/assets`, {
    method: 'POST',
    body,
  })
  const text = await response.text()
  try {
    return { status: response.status, body: JSON.parse(text) as Record<string, unknown> }
  } catch {
    return { status: response.status, body: text }
  }
}

describe('M9 asset upload HTTP', () => {
  it('enforces MANAGE_ASSETS and creates one asset per valid file', async () => {
    const testDb = await openTestDatabase()
    const dir = mkdtempSync(join(tmpdir(), 'ma-assets-http-'))
    process.env.ASSET_UPLOAD_DIR = dir
    try {
      const base = await start(testDb)
      const [admin] = await testDb.db.select().from(users)
      const staff = await readyUser(testDb.db, {
        displayName: 'Staff uploader',
        email: 'staff.assets@example.com',
        role: 'STAFF',
      })
      const campaign = await createCampaign(testDb.db, { name: 'September Campaign' })

      currentActor = null
      expect((await postAsset(base)).status).toBe(401)

      currentActor = asUser(staff)
      const missingFile = await postAsset(base, new FormData())
      expect(missingFile.status).toBe(403)

      currentActor = asUser(admin!)
      const empty = await postAsset(base, new FormData())
      expect(empty.status).toBe(400)

      const body = new FormData()
      body.append('file', new File(['gym-floor'], 'photo-1.jpg', { type: 'image/jpeg' }))
      body.append('displayName', 'Gym floor')
      body.append('campaignId', String(campaign.id))
      const created = await postAsset(base, body)
      expect(created.status).toBe(200)
      const asset = created.body as {
        id: number
        displayName: string
        originalFilename: string
        marketingUseStatus: string
        uploadedByUserId: number
        campaignId: number | null
      }
      expect(asset.displayName).toBe('Gym floor')
      expect(asset.originalFilename).toBe('photo-1.jpg')
      expect(asset.marketingUseStatus).toBe('UNKNOWN')
      expect(asset.uploadedByUserId).toBe(admin!.id)
      expect(asset.campaignId).toBe(campaign.id)

      const [assetRole] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'ASSET_MANAGER'))
      await assignExtraUserRoles(testDb.db, asUser(admin!), staff.id, [assetRole!.id])
      currentActor = asUser(staff)
      const staffBody = new FormData()
      staffBody.append('file', new File(['clip'], 'video-1.mp4', { type: 'video/mp4' }))
      const staffCreated = await postAsset(base, staffBody)
      expect(staffCreated.status).toBe(200)
      expect((staffCreated.body as { originalFilename: string }).originalFilename).toBe('video-1.mp4')
      expect((staffCreated.body as { displayName: string }).displayName).toBe('video-1.mp4')
      expect((staffCreated.body as { marketingUseStatus: string }).marketingUseStatus).toBe('UNKNOWN')
      expect((staffCreated.body as { uploadedByUserId: number }).uploadedByUserId).toBe(staff.id)
    } finally {
      await testDb.close()
      rmSync(dir, { recursive: true, force: true })
      delete process.env.ASSET_UPLOAD_DIR
    }
  })
})
