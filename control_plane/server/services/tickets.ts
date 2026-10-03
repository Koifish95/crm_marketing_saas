import { and, asc, count, desc, eq, like, or, type SQL } from 'drizzle-orm'
import { createError } from 'h3'
import type { Database } from '../database'
import {
  customers,
  environments,
  findingTicketLinks,
  productInstances,
  qaEvidence,
  qaFindings,
  qaRuns,
  ticketActivity,
  ticketAttachments,
  ticketComments,
  ticketRelations,
  tickets,
} from '../database/schema'
import { createStableId } from '../../shared/utils/ids'
import type { TicketCreateInput, TicketUpdateInput } from '../../shared/schemas/ticketing'

const transitions: Record<string, string[]> = {
  NEW: ['TRIAGED', 'REJECTED'],
  TRIAGED: ['NEW', 'READY', 'REJECTED'],
  READY: ['TRIAGED', 'IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['READY', 'REVIEW'],
  REVIEW: ['IN_PROGRESS', 'TESTING', 'DONE'],
  TESTING: ['IN_PROGRESS', 'REVIEW', 'DONE'],
  DONE: ['IN_PROGRESS'],
  REJECTED: ['TRIAGED'],
}

function json(value: unknown) {
  return value === undefined ? null : JSON.stringify(value)
}

function parseJson(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function recordActivity(db: Database, ticketId: string, action: string, actor: string, detail?: unknown) {
  await db.insert(ticketActivity).values({
    id: createStableId(),
    ticketId,
    action,
    actor,
    detail: json(detail),
    createdAt: new Date().toISOString(),
  })
}

async function assertReferences(db: Database, input: Pick<TicketCreateInput, 'customerId' | 'productInstanceId' | 'environmentId'>) {
  if (input.customerId) {
    const [row] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, input.customerId)).limit(1)
    if (!row) throw createError({ statusCode: 400, statusMessage: 'Unknown customer.' })
  }
  if (input.productInstanceId) {
    const [row] = await db.select().from(productInstances).where(eq(productInstances.id, input.productInstanceId)).limit(1)
    if (!row) throw createError({ statusCode: 400, statusMessage: 'Unknown product instance.' })
    if (input.customerId && row.customerId !== input.customerId) {
      throw createError({ statusCode: 400, statusMessage: 'Product instance does not belong to the customer.' })
    }
  }
  if (input.environmentId) {
    const [row] = await db.select().from(environments).where(eq(environments.id, input.environmentId)).limit(1)
    if (!row) throw createError({ statusCode: 400, statusMessage: 'Unknown environment.' })
    if (input.customerId && row.customerId !== input.customerId) {
      throw createError({ statusCode: 400, statusMessage: 'Environment does not belong to the customer.' })
    }
    if (input.productInstanceId && row.productInstanceId !== input.productInstanceId) {
      throw createError({ statusCode: 400, statusMessage: 'Environment does not belong to the product instance.' })
    }
  }
}

export async function createTicket(db: Database, input: TicketCreateInput, actor = 'Operator') {
  await assertReferences(db, input)
  const id = createStableId()
  const now = new Date().toISOString()
  const key = `TKT-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`
  const row = {
    id,
    key,
    title: input.title,
    description: input.description,
    source: input.source,
    category: input.category,
    status: 'NEW',
    priority: input.priority,
    severity: input.severity ?? null,
    assignee: input.assignee || null,
    customerId: input.customerId ?? null,
    productId: input.productId ?? null,
    productInstanceId: input.productInstanceId ?? null,
    environmentId: input.environmentId ?? null,
    resolution: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(tickets).values(row)
  await recordActivity(db, id, 'ticket.created', actor, { source: input.source })
  return row
}

export async function listTickets(db: Database, input: {
  query?: string
  status?: string
  source?: string
  category?: string
  priority?: string
  productId?: string
  customerId?: string
  assignee?: string
  sort?: 'updated' | 'created' | 'priority' | 'status'
  direction?: 'asc' | 'desc'
  page?: number
  pageSize?: number
} = {}) {
  const conditions: SQL[] = []
  if (input.query) {
    const term = `%${input.query.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
    conditions.push(or(like(tickets.title, term), like(tickets.key, term), like(tickets.description, term))!)
  }
  if (input.status) conditions.push(eq(tickets.status, input.status))
  if (input.source) conditions.push(eq(tickets.source, input.source))
  if (input.category) conditions.push(eq(tickets.category, input.category))
  if (input.priority) conditions.push(eq(tickets.priority, input.priority))
  if (input.productId) conditions.push(eq(tickets.productId, input.productId))
  if (input.customerId) conditions.push(eq(tickets.customerId, input.customerId))
  if (input.assignee) conditions.push(eq(tickets.assignee, input.assignee))
  const where = conditions.length ? and(...conditions) : undefined
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 100)
  const page = Math.max(input.page ?? 1, 1)
  const sortColumn = input.sort === 'created'
    ? tickets.createdAt
    : input.sort === 'priority'
      ? tickets.priority
      : input.sort === 'status'
        ? tickets.status
        : tickets.updatedAt
  const order = input.direction === 'asc' ? asc(sortColumn) : desc(sortColumn)
  const rows = await db.select({
    ticket: tickets,
    customerName: customers.displayName,
    instanceName: productInstances.displayName,
    environmentName: environments.displayName,
  }).from(tickets)
    .leftJoin(customers, eq(tickets.customerId, customers.id))
    .leftJoin(productInstances, eq(tickets.productInstanceId, productInstances.id))
    .leftJoin(environments, eq(tickets.environmentId, environments.id))
    .where(where)
    .orderBy(order, desc(tickets.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  const [totalRow] = await db.select({ value: count() }).from(tickets).where(where)
  return {
    tickets: rows.map(row => ({ ...row.ticket, customerName: row.customerName, instanceName: row.instanceName, environmentName: row.environmentName })),
    page,
    pageSize,
    total: totalRow?.value ?? 0,
  }
}

export async function getTicketDetail(db: Database, id: string) {
  const [ticket] = await db.select().from(tickets).where(or(eq(tickets.id, id), eq(tickets.key, id))).limit(1)
  if (!ticket) return null
  const [comments, activity, attachments, relations, findingLinks] = await Promise.all([
    db.select().from(ticketComments).where(eq(ticketComments.ticketId, ticket.id)).orderBy(asc(ticketComments.createdAt)),
    db.select().from(ticketActivity).where(eq(ticketActivity.ticketId, ticket.id)).orderBy(desc(ticketActivity.createdAt)),
    db.select({ attachment: ticketAttachments, evidence: qaEvidence }).from(ticketAttachments)
      .leftJoin(qaEvidence, eq(ticketAttachments.evidenceId, qaEvidence.id))
      .where(eq(ticketAttachments.ticketId, ticket.id)),
    db.select().from(ticketRelations).where(eq(ticketRelations.ticketId, ticket.id)),
    db.select({ link: findingTicketLinks, finding: qaFindings, run: qaRuns }).from(findingTicketLinks)
      .innerJoin(qaFindings, eq(findingTicketLinks.findingId, qaFindings.id))
      .innerJoin(qaRuns, eq(qaFindings.qaRunId, qaRuns.id))
      .where(eq(findingTicketLinks.ticketId, ticket.id)),
  ])
  return {
    ticket,
    comments,
    activity: activity.map(row => ({ ...row, detail: parseJson(row.detail) })),
    attachments: attachments.map(row => ({ ...row.attachment, evidence: row.evidence })),
    relations,
    findings: findingLinks.map(row => ({ ...row.finding, linkType: row.link.linkType, run: row.run })),
  }
}

export async function updateTicket(db: Database, id: string, input: TicketUpdateInput, actor = 'Operator') {
  const detail = await getTicketDetail(db, id)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' })
  const current = detail.ticket
  if (input.status && input.status !== current.status && !transitions[current.status]?.includes(input.status)) {
    throw createError({ statusCode: 409, statusMessage: `Cannot move ${current.status} to ${input.status}.` })
  }
  if ((input.status === 'DONE' || input.status === 'REJECTED') && !(input.resolution || current.resolution)) {
    throw createError({ statusCode: 400, statusMessage: 'Resolution is required for a terminal status.' })
  }
  const now = new Date().toISOString()
  const patch = {
    ...input,
    assignee: input.assignee === '' ? null : input.assignee,
    resolvedAt: input.status === 'DONE' || input.status === 'REJECTED'
      ? now
      : input.status
        ? null
        : current.resolvedAt,
    updatedAt: now,
  }
  await db.update(tickets).set(patch).where(eq(tickets.id, current.id))
  for (const [field, value] of Object.entries(input)) {
    if (value !== (current as Record<string, unknown>)[field]) {
      await recordActivity(db, current.id, `ticket.${field}_changed`, actor, { from: (current as Record<string, unknown>)[field], to: value })
    }
  }
  return (await getTicketDetail(db, current.id))!
}

export async function addTicketComment(db: Database, ticketId: string, input: {
  author: string
  body: string
  visibility: string
}) {
  const detail = await getTicketDetail(db, ticketId)
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' })
  const now = new Date().toISOString()
  const row = { id: createStableId(), ticketId: detail.ticket.id, ...input, createdAt: now, updatedAt: now }
  await db.insert(ticketComments).values(row)
  await db.update(tickets).set({ updatedAt: now }).where(eq(tickets.id, detail.ticket.id))
  await recordActivity(db, detail.ticket.id, 'ticket.comment_added', input.author, { visibility: input.visibility })
  return row
}

export async function attachEvidenceToTicket(db: Database, ticketId: string, evidenceId: string, label?: string) {
  const [evidence] = await db.select().from(qaEvidence).where(eq(qaEvidence.id, evidenceId)).limit(1)
  if (!evidence) throw createError({ statusCode: 404, statusMessage: 'Evidence not found.' })
  await db.insert(ticketAttachments).values({
    id: createStableId(),
    ticketId,
    evidenceId,
    label: label || evidence.fileName,
    externalUrl: null,
    createdAt: new Date().toISOString(),
  })
}

export function terminalTicketStatus(status: string) {
  return status === 'DONE' || status === 'REJECTED'
}
