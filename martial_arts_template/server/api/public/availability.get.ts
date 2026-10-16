import { createError, defineEventHandler, getQuery } from 'h3'
import { publicAvailabilityQuerySchema } from '../../../shared/schemas/intro'
import { useDb } from '../../database'
import { notePublicAvailability } from '../../services/acquisition-funnel'
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
  const db = useDb()
  try {
    const slots = await listPublicSlots(db, {
      programCode: parsed.data.program,
      age: parsed.data.age,
    })
    await notePublicAvailability(db, event, {
      program: parsed.data.program,
      age: parsed.data.age,
      outcome: slots.length ? 'AVAILABLE' : 'EMPTY',
      resultCount: slots.length,
    })
    return slots
  } catch (error) {
    await notePublicAvailability(db, event, {
      program: parsed.data.program,
      age: parsed.data.age,
      outcome: 'ERROR',
      resultCount: 0,
    })
    throwDomain(error)
  }
})
