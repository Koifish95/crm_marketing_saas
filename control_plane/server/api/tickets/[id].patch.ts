import { createError } from 'h3'
import { ticketUpdateSchema } from '../../../shared/schemas/ticketing'
import { useDb } from '../../database'
import { updateTicket } from '../../services/tickets'

export default defineEventHandler(async (event) => {
  const parsed = ticketUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Invalid update.' })
  return updateTicket(useDb(), getRouterParam(event, 'id') || '', parsed.data)
})
