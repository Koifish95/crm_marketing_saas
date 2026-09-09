import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateProgramSchema } from '../../../../shared/schemas/program'
import { useDb } from '../../../database'
import { updateProgram } from '../../../services/catalog'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid program id.' })
  }
  const parsed = updateProgramSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid program.' })
  }
  try {
    return await updateProgram(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
