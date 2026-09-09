import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { hasPublishedIntroAvailability } from '../../services/availability'

export default defineEventHandler(async () => {
  return { published: await hasPublishedIntroAvailability(useDb()) }
})
