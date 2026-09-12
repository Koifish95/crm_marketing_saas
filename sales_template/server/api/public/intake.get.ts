import { defineEventHandler } from 'h3'
import { publicIntakePresentation, readPublicIntakeConfig } from '../../services/public-intake'
import { useDb } from '../../database'

export default defineEventHandler(async () => {
  const config = await readPublicIntakeConfig(useDb())
  return publicIntakePresentation(config)
})
