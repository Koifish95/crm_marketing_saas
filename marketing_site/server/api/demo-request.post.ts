import { createError, defineEventHandler, readBody } from 'h3'
import { demoRequestSchema } from '~~/shared/demo-request'

export default defineEventHandler(async (event) => {
  const parsed = demoRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Check the demo request fields.' })
  }
  return { ok: true }
})
