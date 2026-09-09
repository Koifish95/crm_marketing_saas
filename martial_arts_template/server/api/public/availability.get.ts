import { publicAvailabilityQuerySchema } from '../../../shared/schemas/intro'
import { useDb } from '../../database'
import { listPublicSlots } from '../../services/availability'
import { throwDomain } from '../../utils/api'

export default defineEventHandler(async (event) => {
  const parsed = publicAvailabilityQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid availability request.' })
  }
  if (parsed.data.program === 'KIDS_BJJ' && parsed.data.age == null) {
    return []
  }
  try {
    return await listPublicSlots(useDb(), {
      programCode: parsed.data.program,
      age: parsed.data.age,
    })
  } catch (error) {
    throwDomain(error)
  }
})
