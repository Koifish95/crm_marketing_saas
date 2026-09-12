import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

export type Database = ReturnType<typeof drizzle<typeof schema>>

let database: Database | undefined

export function sqliteFilePath(url: string): string | null {
  if (!url.startsWith('file:')) {
    return null
  }

  const withoutProtocol = url.slice('file:'.length)
  if (withoutProtocol.startsWith('//')) {
    return withoutProtocol.replace(/^\/\/\//, '/')
  }

  return withoutProtocol
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? 'file:./data/app.sqlite'
}

export function createDb(databaseUrl = getDatabaseUrl()) {
  const filePath = sqliteFilePath(databaseUrl)
  if (filePath) {
    mkdirSync(dirname(filePath), { recursive: true })
  }

  const client = createClient({ url: databaseUrl })
  const db = drizzle(client, { schema })
  return { client, db }
}

export function useDb() {
  if (!database) {
    database = createDb().db
  }

  return database
}

export function setUseDbForTests(db: Database | undefined) {
  database = db
}
