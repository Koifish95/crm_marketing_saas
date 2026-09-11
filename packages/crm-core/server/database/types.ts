import type { LibSQLDatabase } from 'drizzle-orm/libsql'

export type AppDatabase = LibSQLDatabase<Record<string, unknown>>
