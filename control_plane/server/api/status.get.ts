import { useDb } from '../database'
import { observeRegisteredEnvironments } from '../services/observe'

export default defineEventHandler(async () => {
  return {
    checkedAt: new Date().toISOString(),
    environments: await observeRegisteredEnvironments(useDb()),
  }
})
