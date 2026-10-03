import { createError } from 'h3'
import { ticketCommentSchema } from '../../../../shared/schemas/ticketing'
import { useDb } from '../../../database'
import { addTicketComment } from '../../../services/tickets'

export default defineEventHandler(async (event) => {
  const parsed = ticketCommentSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Invalid comment.' })
  return { comment: await addTicketComment(useDb(), getRouterParam(event, 'id') || '', parsed.data) }
})
