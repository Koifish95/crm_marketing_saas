import { defineEventHandler, getQuery, setHeader } from 'h3'
import { useDb } from '../../../database'
import { exportCustomerRecords, householdsToCsv } from '../../../services/data-export'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const format = String(getQuery(event).format || 'json')
  const payload = await exportCustomerRecords(useDb())
  if (format === 'csv') {
    setHeader(event, 'content-type', 'text/csv; charset=utf-8')
    setHeader(event, 'content-disposition', 'attachment; filename="martial-arts-customer-export.csv"')
    return householdsToCsv(payload.households)
  }
  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="martial-arts-customer-export.json"')
  return payload
})
