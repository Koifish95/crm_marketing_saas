import { createError, defineEventHandler, readBody } from 'h3'
import { createContentItemSchema } from '../../../../shared/schemas/content'
import { useDb } from '../../../database'
import { createContentItem } from '../../../services/content'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_CONTENT')
  const parsed = createContentItemSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid content.' })
  }
  try {
    return await createContentItem(useDb(), parsed.data, actor)
  } catch (error) {
    throwDomain(error)
  }
})
