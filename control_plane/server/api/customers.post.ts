import { z } from 'zod'
import { useDb } from '../database'
import { ProvisionError, createCustomerWithDefaultEnvironments } from '../services/provision-registry'

const Body = z.object({
  displayName: z.string(),
  slug: z.string(),
  timezone: z.string().optional(),
  adminEmail: z.string(),
})

export default defineEventHandler(async (event) => {
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Display name, slug, and admin email are required.' })
  }
  try {
    return await createCustomerWithDefaultEnvironments(useDb(), parsed.data)
  } catch (error) {
    if (error instanceof ProvisionError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw error
  }
})
