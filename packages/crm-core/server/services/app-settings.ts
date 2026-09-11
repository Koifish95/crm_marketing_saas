import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../database/types'
import { appSettings } from '../database/schema'
import { utcNowMs } from '../../lib/clock'

export async function readAppSetting(db: AppDatabase, key: string) {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)
  return row
}

export async function upsertAppSetting(
  db: AppDatabase,
  key: string,
  value: string,
  actorUserId: number | null,
  nowMs = utcNowMs(),
) {
  const existing = await readAppSetting(db, key)
  const stamp = new Date(nowMs)
  if (existing) {
    await db.update(appSettings)
      .set({
        value,
        updatedAt: stamp,
        updatedByUserId: actorUserId,
      })
      .where(eq(appSettings.key, key))
    return
  }
  await db.insert(appSettings).values({
    key,
    value,
    updatedAt: stamp,
    updatedByUserId: actorUserId,
  })
}

export async function ensureAppSettings(
  db: AppDatabase,
  defaults: ReadonlyArray<{ key: string, value: string }>,
  nowMs = utcNowMs(),
) {
  const stamp = new Date(nowMs)
  for (const item of defaults) {
    const existing = await readAppSetting(db, item.key)
    if (existing) {
      continue
    }
    await db.insert(appSettings).values({
      key: item.key,
      value: item.value,
      updatedAt: stamp,
      updatedByUserId: null,
    }).onConflictDoNothing()
  }
}
