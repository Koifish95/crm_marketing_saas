import { defineEventHandler } from 'h3'
import { useDb } from '../database'
import { listHouseholdPricingRules } from '../services/catalog'
import { requireCrmAccessUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  return listHouseholdPricingRules(useDb())
})
