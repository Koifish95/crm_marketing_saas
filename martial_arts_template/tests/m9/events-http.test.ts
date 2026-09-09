import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { users } from '../../server/database/schema'
import { createManagedUser } from '../../server/services/users'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { openTestDatabase } from '../helpers/db'
import processEvent from '../../server/api/marketing/events/[id]/process.post'

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
  router.post('/api/marketing/events/:id/process', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return processEvent(event)
  }))
  app.use(router)
  server = createServer(toNodeListener(app))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return `http://127.0.0.1:${port}`
}

describe('M9 event process HTTP', () => {
  it('denies batch process to STAFF without PROCESS_EVENT_REGISTRATIONS', async () => {
    const testDb = await openTestDatabase()
    try {
      const base = await start(testDb)
      const staff = await createManagedUser(testDb.db, {
        displayName: 'Staff',
        email: 'staff.events@example.com',
        role: 'STAFF',
      })
      await testDb.db.update(users).set({
        mustChangePassword: false,
        updatedAt: new Date(utcNowMs()),
      }).where(eq(users.id, staff.id))
      currentActor = {
        id: staff.id,
        email: staff.email,
        displayName: staff.displayName,
        role: 'STAFF',
        mustChangePassword: false,
      }
      const response = await fetch(`${base}/api/marketing/events/1/process`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      expect(response.status).toBe(403)
    } finally {
      await testDb.close()
    }
  })
})
