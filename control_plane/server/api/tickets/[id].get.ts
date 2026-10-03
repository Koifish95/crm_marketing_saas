import { createError } from 'h3'
import { useDb } from '../../database'
import { getTicketDetail } from '../../services/tickets'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const ticket = await getTicketDetail(useDb(), id)
  if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' })
  return ticket
})
