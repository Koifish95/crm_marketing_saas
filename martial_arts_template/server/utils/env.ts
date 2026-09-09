import { z } from 'zod'
import { readAppEnv } from '../../shared/utils/app-env'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  APP_ENV: z.enum(['dev', 'stage', 'production']).optional(),
  DATABASE_URL: z.string().min(1).default('file:./data/app.sqlite'),
  NUXT_SESSION_PASSWORD: z.string().min(32).optional(),
  NUXT_AUTH_EMAIL: z.string().min(1).optional(),
  NUXT_AUTH_USERNAME: z.string().min(1).optional(),
  NUXT_AUTH_PASSWORD: z.string().min(1).optional(),
  NUXT_AUTH_RESET_PASSWORD: z.enum(['true', 'false']).optional(),
  NUXT_AUTH_MUST_CHANGE_PASSWORD: z.enum(['true', 'false']).optional(),
})

export function getServerEnv() {
  const config = useRuntimeConfig()
  readAppEnv()
  const parsed = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env.APP_ENV?.trim() || undefined,
    DATABASE_URL: process.env.DATABASE_URL ?? config.databaseUrl,
    NUXT_SESSION_PASSWORD: process.env.NUXT_SESSION_PASSWORD,
  })

  if (parsed.NODE_ENV === 'production' && !parsed.NUXT_SESSION_PASSWORD) {
    throw new Error('NUXT_SESSION_PASSWORD is required in production and must be at least 32 characters.')
  }

  return parsed
}
