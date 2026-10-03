import { ticketCategories, ticketPriorities, ticketSources, ticketStatuses } from '../../../shared/schemas/ticketing'
import { useDb } from '../../database'
import { listTickets } from '../../services/tickets'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const value = (name: string) => typeof query[name] === 'string' ? query[name] as string : undefined
  const number = (name: string, fallback: number) => {
    const parsed = Number.parseInt(value(name) || '', 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return {
    ...await listTickets(useDb(), {
      query: value('query'),
      status: value('status'),
      source: value('source'),
      category: value('category'),
      priority: value('priority'),
      productId: value('productId'),
      customerId: value('customerId'),
      assignee: value('assignee'),
      sort: value('sort') as 'updated' | 'created' | 'priority' | 'status' | undefined,
      direction: value('direction') as 'asc' | 'desc' | undefined,
      page: number('page', 1),
      pageSize: number('pageSize', 50),
    }),
    options: { statuses: ticketStatuses, sources: ticketSources, categories: ticketCategories, priorities: ticketPriorities },
  }
})
