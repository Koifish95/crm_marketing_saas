import { createError } from 'h3'
import { ticketCreateSchema } from '../../../shared/schemas/ticketing'
import { useDb } from '../../database'
import { createTicket } from '../../services/tickets'

export default defineEventHandler(async (event) => {
  const parsed = ticketCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Invalid ticket.' })
  return { ticket: await createTicket(useDb(), parsed.data) }
})
