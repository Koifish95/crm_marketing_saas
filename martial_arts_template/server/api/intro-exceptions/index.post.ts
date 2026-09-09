import { createError, defineEventHandler, readBody } from 'h3'
import { introExceptionSchema } from '../../../shared/schemas/intro'
import { useDb } from '../../database'
import { createIntroException } from '../../services/availability'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const parsed = introExceptionSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid exception.' })
  }
  try {
    return await createIntroException(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
