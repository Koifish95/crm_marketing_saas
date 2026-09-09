import { createError, defineEventHandler, readBody } from 'h3'
import { createProgramSchema } from '../../../../shared/schemas/program'
import { useDb } from '../../../database'
import { createProgram } from '../../../services/catalog'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const parsed = createProgramSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid program.' })
  }
  try {
    return await createProgram(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
