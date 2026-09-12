import { and, desc, eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import {
  salesAccounts,
  salesActivities,
  salesContacts,
  salesLeads,
  salesNotes,
  salesOpportunities,
  users,
} from '../database/schema'
import {
  isActivityStatus,
  isActivityType,
  isLeadStage,
  isLossReason,
  isNoteRecordKind,
  isOpportunityStage,
  splitDisplayName,
  type ActivityStatus,
  type ActivityType,
  type LeadStage,
  type LossReason,
  type NoteRecordKind,
  type OpportunityStage,
} from '../../shared/utils/pipeline'
import { activityQueueBucket, type ActivityQueueBucket } from '../../shared/utils/queue'
import { utcNowMs } from '../../shared/utils/time'

function now() {
  return new Date(utcNowMs())
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

async function requireAccount(db: Database, accountId: number) {
  const [row] = await db.select().from(salesAccounts).where(eq(salesAccounts.id, accountId)).limit(1)
  if (!row) {
    throw new DomainError('Company not found.', 404)
  }
  return row
}

async function requireContact(db: Database, contactId: number) {
  const [row] = await db.select().from(salesContacts).where(eq(salesContacts.id, contactId)).limit(1)
  if (!row) {
    throw new DomainError('Contact not found.', 404)
  }
  return row
}

async function requireOwner(db: Database, userId: number) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row || !row.active) {
    throw new DomainError('Owner not found.', 400)
  }
  return row
}

export async function listAssignees(db: Database) {
  const rows = await db.select({
    id: users.id,
    displayName: users.displayName,
    username: users.username,
    role: users.role,
    active: users.active,
  }).from(users).orderBy(users.displayName)
  return rows.filter(row => row.active)
}

export async function listCompanies(db: Database, filters: { search?: string, active?: boolean } = {}) {
  const rows = await db.select().from(salesAccounts).orderBy(salesAccounts.name)
  return rows.filter((row) => {
    if (filters.active != null && row.active !== filters.active) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!row.name.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })
}

export async function getCompany(db: Database, id: number) {
  return requireAccount(db, id)
}

export async function createCompany(db: Database, input: { name: string, notes?: string, active?: boolean }) {
  const createdAt = now()
  await db.insert(salesAccounts).values({
    name: input.name.trim(),
    notes: blankToNull(input.notes),
    active: input.active ?? true,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesAccounts)
    .where(and(eq(salesAccounts.name, input.name.trim()), eq(salesAccounts.createdAt, createdAt)))
    .orderBy(desc(salesAccounts.id))
    .limit(1)
  return created!
}

export async function updateCompany(db: Database, id: number, input: {
  name?: string
  notes?: string | null
  active?: boolean
}) {
  await requireAccount(db, id)
  const patch: Partial<typeof salesAccounts.$inferInsert> = { updatedAt: now() }
  if (input.name !== undefined) {
    patch.name = input.name.trim()
  }
  if (input.notes !== undefined) {
    patch.notes = blankToNull(input.notes)
  }
  if (input.active !== undefined) {
    patch.active = input.active
  }
  await db.update(salesAccounts).set(patch).where(eq(salesAccounts.id, id))
  return requireAccount(db, id)
}

export async function listContacts(db: Database, filters: { search?: string, accountId?: number } = {}) {
  const rows = await db.select().from(salesContacts).orderBy(salesContacts.lastName, salesContacts.firstName)
  return rows.filter((row) => {
    if (filters.accountId != null && row.accountId !== filters.accountId) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${row.firstName} ${row.lastName} ${row.email ?? ''} ${row.phone ?? ''}`.toLowerCase()
      if (!hay.includes(q)) {
        return false
      }
    }
    return true
  })
}

export async function getContact(db: Database, id: number) {
  return requireContact(db, id)
}

export async function createContact(db: Database, input: {
  accountId: number
  firstName: string
  lastName: string
  email?: string
  phone?: string
  title?: string
}) {
  await requireAccount(db, input.accountId)
  const createdAt = now()
  await db.insert(salesContacts).values({
    accountId: input.accountId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: blankToNull(input.email),
    phone: blankToNull(input.phone),
    title: blankToNull(input.title),
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesContacts)
    .where(and(eq(salesContacts.accountId, input.accountId), eq(salesContacts.createdAt, createdAt)))
    .orderBy(desc(salesContacts.id))
    .limit(1)
  return created!
}

export async function updateContact(db: Database, id: number, input: {
  accountId?: number
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  title?: string | null
}) {
  await requireContact(db, id)
  if (input.accountId != null) {
    await requireAccount(db, input.accountId)
  }
  const patch: Partial<typeof salesContacts.$inferInsert> = { updatedAt: now() }
  if (input.accountId !== undefined) {
    patch.accountId = input.accountId
  }
  if (input.firstName !== undefined) {
    patch.firstName = input.firstName.trim()
  }
  if (input.lastName !== undefined) {
    patch.lastName = input.lastName.trim()
  }
  if (input.email !== undefined) {
    patch.email = blankToNull(input.email)
  }
  if (input.phone !== undefined) {
    patch.phone = blankToNull(input.phone)
  }
  if (input.title !== undefined) {
    patch.title = blankToNull(input.title)
  }
  await db.update(salesContacts).set(patch).where(eq(salesContacts.id, id))
  return requireContact(db, id)
}

function assertLeadIdentity(input: {
  displayName?: string | null
  email?: string | null
  phone?: string | null
  reachabilityNote?: string | null
}) {
  const displayName = input.displayName?.trim()
  if (!displayName) {
    throw new DomainError('A Lead needs a display name.')
  }
  if (!blankToNull(input.email) && !blankToNull(input.phone) && !blankToNull(input.reachabilityNote)) {
    throw new DomainError('A Lead needs a phone, email, or reachability note.')
  }
  return displayName
}

export async function listLeads(db: Database, filters: {
  search?: string
  stage?: string
  ownerUserId?: number
  mine?: number
} = {}) {
  const rows = await db.select().from(salesLeads).orderBy(desc(salesLeads.updatedAt))
  return rows.filter((row) => {
    if (filters.stage && row.stage !== filters.stage) {
      return false
    }
    const owner = filters.mine ?? filters.ownerUserId
    if (owner != null && row.ownerUserId !== owner) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${row.displayName} ${row.email ?? ''} ${row.phone ?? ''}`.toLowerCase()
      if (!hay.includes(q)) {
        return false
      }
    }
    return true
  })
}

export async function getLead(db: Database, id: number) {
  const [row] = await db.select().from(salesLeads).where(eq(salesLeads.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Lead not found.', 404)
  }
  return row
}

export async function createLead(db: Database, input: {
  displayName: string
  email?: string
  phone?: string
  reachabilityNote?: string
  accountId?: number
  ownerUserId: number
  stage?: Exclude<LeadStage, 'converted'>
}) {
  const displayName = assertLeadIdentity(input)
  await requireOwner(db, input.ownerUserId)
  if (input.accountId) {
    await requireAccount(db, input.accountId)
  }
  const stage = input.stage ?? 'new'
  if (!isLeadStage(stage)) {
    throw new DomainError('Unknown Lead stage.')
  }
  const createdAt = now()
  await db.insert(salesLeads).values({
    displayName,
    email: blankToNull(input.email),
    phone: blankToNull(input.phone),
    reachabilityNote: blankToNull(input.reachabilityNote),
    accountId: input.accountId ?? null,
    stage,
    ownerUserId: input.ownerUserId,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesLeads)
    .where(and(eq(salesLeads.displayName, displayName), eq(salesLeads.createdAt, createdAt)))
    .orderBy(desc(salesLeads.id))
    .limit(1)
  return created!
}

export async function updateLead(db: Database, id: number, input: {
  displayName?: string
  email?: string | null
  phone?: string | null
  reachabilityNote?: string | null
  accountId?: number | null
  ownerUserId?: number
  stage?: Exclude<LeadStage, 'converted'>
}) {
  const current = await getLead(db, id)
  if (current.stage === 'converted' && input.stage) {
    throw new DomainError('Converted Leads stay Converted. They remain visible as history.')
  }
  if (input.ownerUserId != null) {
    await requireOwner(db, input.ownerUserId)
  }
  if (input.accountId) {
    await requireAccount(db, input.accountId)
  }
  const next = {
    displayName: input.displayName ?? current.displayName,
    email: input.email === undefined ? current.email : blankToNull(input.email),
    phone: input.phone === undefined ? current.phone : blankToNull(input.phone),
    reachabilityNote: input.reachabilityNote === undefined ? current.reachabilityNote : blankToNull(input.reachabilityNote),
  }
  assertLeadIdentity(next)
  const patch: Partial<typeof salesLeads.$inferInsert> = { updatedAt: now() }
  if (input.displayName !== undefined) {
    patch.displayName = input.displayName.trim()
  }
  if (input.email !== undefined) {
    patch.email = blankToNull(input.email)
  }
  if (input.phone !== undefined) {
    patch.phone = blankToNull(input.phone)
  }
  if (input.reachabilityNote !== undefined) {
    patch.reachabilityNote = blankToNull(input.reachabilityNote)
  }
  if (input.accountId !== undefined) {
    patch.accountId = input.accountId
  }
  if (input.ownerUserId !== undefined) {
    patch.ownerUserId = input.ownerUserId
  }
  if (input.stage !== undefined) {
    patch.stage = input.stage
  }
  await db.update(salesLeads).set(patch).where(eq(salesLeads.id, id))
  return getLead(db, id)
}

export async function convertLead(db: Database, id: number, actorUserId: number) {
  const lead = await getLead(db, id)
  if (lead.stage === 'converted') {
    throw new DomainError('This Lead is already converted.')
  }
  await requireOwner(db, actorUserId)
  const ownerUserId = lead.ownerUserId ?? actorUserId

  let account = lead.accountId ? await requireAccount(db, lead.accountId) : null
  if (!account) {
    account = await createCompany(db, { name: lead.displayName })
  }

  let contact = null
  if (lead.email) {
    const matches = await listContacts(db, { accountId: account.id })
    contact = matches.find(row => row.email && row.email.toLowerCase() === lead.email!.toLowerCase()) ?? null
  }
  if (!contact) {
    const names = splitDisplayName(lead.displayName)
    contact = await createContact(db, {
      accountId: account.id,
      firstName: names.firstName,
      lastName: names.lastName,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
    })
  }

  const opportunity = await createOpportunity(db, {
    accountId: account.id,
    primaryContactId: contact.id,
    name: lead.displayName,
    ownerUserId,
    sourceLeadId: lead.id,
  })

  const convertedAt = now()
  await db.update(salesLeads).set({
    stage: 'converted',
    convertedAt,
    convertedAccountId: account.id,
    convertedContactId: contact.id,
    convertedOpportunityId: opportunity.id,
    accountId: account.id,
    updatedAt: convertedAt,
  }).where(eq(salesLeads.id, id))

  return {
    lead: await getLead(db, id),
    company: account,
    contact,
    opportunity,
  }
}

export async function listOpportunities(db: Database, filters: {
  search?: string
  accountId?: number
  stage?: string
  ownerUserId?: number
} = {}) {
  const rows = await db.select().from(salesOpportunities).orderBy(desc(salesOpportunities.updatedAt))
  return rows.filter((row) => {
    if (filters.accountId != null && row.accountId !== filters.accountId) {
      return false
    }
    if (filters.stage && row.stage !== filters.stage) {
      return false
    }
    if (filters.ownerUserId != null && row.ownerUserId !== filters.ownerUserId) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!row.name.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })
}

export async function getOpportunity(db: Database, id: number) {
  const [row] = await db.select().from(salesOpportunities).where(eq(salesOpportunities.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Opportunity not found.', 404)
  }
  return row
}

async function assertContactBelongsToAccount(db: Database, contactId: number | null | undefined, accountId: number) {
  if (contactId == null) {
    return
  }
  const contact = await requireContact(db, contactId)
  if (contact.accountId !== accountId) {
    throw new DomainError('Contact must belong to the same company.')
  }
}

export async function createOpportunity(db: Database, input: {
  accountId: number
  primaryContactId?: number
  name: string
  amountCents?: number
  stage?: OpportunityStage
  notes?: string
  ownerUserId: number
  sourceLeadId?: number
}) {
  await requireAccount(db, input.accountId)
  await requireOwner(db, input.ownerUserId)
  await assertContactBelongsToAccount(db, input.primaryContactId, input.accountId)
  const stage = input.stage ?? 'proposal_quote'
  if (stage === 'won' || stage === 'lost') {
    throw new DomainError('Mark Won or Lost with the dedicated action.')
  }
  if (!isOpportunityStage(stage)) {
    throw new DomainError('Unknown pipeline stage.')
  }
  const createdAt = now()
  await db.insert(salesOpportunities).values({
    accountId: input.accountId,
    primaryContactId: input.primaryContactId ?? null,
    sourceLeadId: input.sourceLeadId ?? null,
    name: input.name.trim(),
    amountCents: input.amountCents ?? null,
    stage,
    ownerUserId: input.ownerUserId,
    notes: blankToNull(input.notes),
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesOpportunities)
    .where(and(eq(salesOpportunities.accountId, input.accountId), eq(salesOpportunities.createdAt, createdAt)))
    .orderBy(desc(salesOpportunities.id))
    .limit(1)
  return created!
}

export async function updateOpportunity(db: Database, id: number, input: {
  accountId?: number
  primaryContactId?: number | null
  name?: string
  amountCents?: number | null
  stage?: OpportunityStage
  notes?: string | null
  ownerUserId?: number
}) {
  const current = await getOpportunity(db, id)
  if ((current.stage === 'won' || current.stage === 'lost') && input.stage && input.stage !== current.stage) {
    throw new DomainError('Won and Lost are terminal. Use Reopen first.')
  }
  if (input.stage === 'won' || input.stage === 'lost') {
    throw new DomainError('Mark Won or Lost with the dedicated action.')
  }
  const accountId = input.accountId ?? current.accountId
  if (input.accountId != null) {
    await requireAccount(db, input.accountId)
  }
  if (input.ownerUserId != null) {
    await requireOwner(db, input.ownerUserId)
  }
  const contactId = input.primaryContactId === undefined ? current.primaryContactId : input.primaryContactId
  await assertContactBelongsToAccount(db, contactId, accountId)
  if (input.stage && !isOpportunityStage(input.stage)) {
    throw new DomainError('Unknown pipeline stage.')
  }
  const patch: Partial<typeof salesOpportunities.$inferInsert> = { updatedAt: now() }
  if (input.accountId !== undefined) {
    patch.accountId = input.accountId
  }
  if (input.primaryContactId !== undefined) {
    patch.primaryContactId = input.primaryContactId
  }
  if (input.name !== undefined) {
    patch.name = input.name.trim()
  }
  if (input.amountCents !== undefined) {
    patch.amountCents = input.amountCents
  }
  if (input.stage !== undefined) {
    patch.stage = input.stage
  }
  if (input.notes !== undefined) {
    patch.notes = blankToNull(input.notes)
  }
  if (input.ownerUserId !== undefined) {
    patch.ownerUserId = input.ownerUserId
  }
  await db.update(salesOpportunities).set(patch).where(eq(salesOpportunities.id, id))
  return getOpportunity(db, id)
}

export async function markOpportunityWon(db: Database, id: number) {
  const current = await getOpportunity(db, id)
  if (current.stage === 'won') {
    return current
  }
  if (current.stage === 'lost') {
    throw new DomainError('Won and Lost are terminal. Use Reopen first.')
  }
  await db.update(salesOpportunities).set({
    stage: 'won',
    lossReason: null,
    lossNotes: null,
    updatedAt: now(),
  }).where(eq(salesOpportunities.id, id))
  return getOpportunity(db, id)
}

export async function markOpportunityLost(db: Database, id: number, input: { lossReason: string, lossNotes?: string }) {
  const current = await getOpportunity(db, id)
  if (current.stage === 'lost') {
    return current
  }
  if (current.stage === 'won') {
    throw new DomainError('Won and Lost are terminal. Use Reopen first.')
  }
  if (!isLossReason(input.lossReason)) {
    throw new DomainError('Choose a loss reason.')
  }
  const notes = blankToNull(input.lossNotes)
  if (input.lossReason === 'other' && !notes) {
    throw new DomainError('Other requires explanatory text.')
  }
  await db.update(salesOpportunities).set({
    stage: 'lost',
    lossReason: input.lossReason as LossReason,
    lossNotes: notes,
    updatedAt: now(),
  }).where(eq(salesOpportunities.id, id))
  return getOpportunity(db, id)
}

export async function reopenOpportunity(db: Database, id: number) {
  const current = await getOpportunity(db, id)
  if (current.stage !== 'won' && current.stage !== 'lost') {
    throw new DomainError('Only Won or Lost Opportunities can be reopened.')
  }
  await db.update(salesOpportunities).set({
    stage: 'decision',
    lossReason: null,
    lossNotes: null,
    updatedAt: now(),
  }).where(eq(salesOpportunities.id, id))
  return getOpportunity(db, id)
}

export async function listActivities(db: Database, filters: {
  accountId?: number
  contactId?: number
  opportunityId?: number
  leadId?: number
  ownerUserId?: number
  openOnly?: boolean
  queue?: ActivityQueueBucket
  nowMs?: number
} = {}) {
  const rows = await db.select().from(salesActivities).orderBy(desc(salesActivities.createdAt))
  const nowMs = filters.nowMs ?? utcNowMs()
  return rows.filter((row) => {
    if (filters.accountId != null && row.accountId !== filters.accountId) {
      return false
    }
    if (filters.contactId != null && row.contactId !== filters.contactId) {
      return false
    }
    if (filters.opportunityId != null && row.opportunityId !== filters.opportunityId) {
      return false
    }
    if (filters.leadId != null && row.leadId !== filters.leadId) {
      return false
    }
    if (filters.ownerUserId != null && row.ownerUserId !== filters.ownerUserId) {
      return false
    }
    if (filters.openOnly && row.status !== 'open') {
      return false
    }
    if (filters.queue) {
      const bucket = activityQueueBucket({
        status: row.status,
        dueAt: row.dueAt,
        nowMs,
      })
      if (filters.queue === 'open') {
        return row.status === 'open'
      }
      return bucket === filters.queue
    }
    return true
  })
}

export async function getActivity(db: Database, id: number) {
  const [row] = await db.select().from(salesActivities).where(eq(salesActivities.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Activity not found.', 404)
  }
  return row
}

export async function createActivity(db: Database, input: {
  accountId?: number
  contactId?: number
  opportunityId?: number
  leadId?: number
  ownerUserId: number
  type?: ActivityType
  description: string
  notes?: string
  dueAt?: number
}) {
  if (!input.accountId && !input.contactId && !input.opportunityId && !input.leadId) {
    throw new DomainError('Attach this activity to a lead, company, contact, or opportunity.')
  }
  await requireOwner(db, input.ownerUserId)
  let accountId = input.accountId ?? null
  if (input.opportunityId) {
    const opportunity = await getOpportunity(db, input.opportunityId)
    accountId = accountId ?? opportunity.accountId
  }
  if (input.contactId) {
    const contact = await requireContact(db, input.contactId)
    accountId = accountId ?? contact.accountId
  }
  if (input.leadId) {
    await getLead(db, input.leadId)
  }
  if (accountId) {
    await requireAccount(db, accountId)
  }
  const type = input.type ?? 'task'
  if (!isActivityType(type)) {
    throw new DomainError('Unknown activity type.')
  }
  const createdAt = now()
  await db.insert(salesActivities).values({
    accountId,
    contactId: input.contactId ?? null,
    opportunityId: input.opportunityId ?? null,
    leadId: input.leadId ?? null,
    ownerUserId: input.ownerUserId,
    type,
    status: 'open',
    description: input.description.trim(),
    notes: blankToNull(input.notes),
    dueAt: input.dueAt ? new Date(input.dueAt) : null,
    completedAt: null,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesActivities)
    .where(eq(salesActivities.createdAt, createdAt))
    .orderBy(desc(salesActivities.id))
    .limit(1)
  return created!
}

export async function updateActivity(db: Database, id: number, input: {
  description?: string
  notes?: string | null
  dueAt?: number | null
  type?: ActivityType
  status?: ActivityStatus
  ownerUserId?: number
  completed?: boolean
  leadId?: number | null
  opportunityId?: number | null
}) {
  const current = await getActivity(db, id)
  if (input.ownerUserId != null) {
    await requireOwner(db, input.ownerUserId)
  }
  if (input.leadId) {
    await getLead(db, input.leadId)
  }
  if (input.opportunityId) {
    await getOpportunity(db, input.opportunityId)
  }
  if (input.type && !isActivityType(input.type)) {
    throw new DomainError('Unknown activity type.')
  }
  if (input.status && !isActivityStatus(input.status)) {
    throw new DomainError('Unknown activity status.')
  }
  const patch: Partial<typeof salesActivities.$inferInsert> = { updatedAt: now() }
  if (input.description !== undefined) {
    patch.description = input.description.trim()
  }
  if (input.notes !== undefined) {
    patch.notes = blankToNull(input.notes)
  }
  if (input.dueAt !== undefined) {
    patch.dueAt = input.dueAt == null ? null : new Date(input.dueAt)
  }
  if (input.type !== undefined) {
    patch.type = input.type
  }
  if (input.ownerUserId !== undefined) {
    patch.ownerUserId = input.ownerUserId
  }
  if (input.leadId !== undefined) {
    patch.leadId = input.leadId
  }
  if (input.opportunityId !== undefined) {
    patch.opportunityId = input.opportunityId
  }
  if (input.completed === true || input.status === 'completed') {
    patch.status = 'completed'
    patch.completedAt = current.completedAt ?? now()
  } else if (input.completed === false) {
    patch.status = 'open'
    patch.completedAt = null
  } else if (input.status === 'cancelled') {
    patch.status = 'cancelled'
  } else if (input.status === 'open') {
    patch.status = 'open'
    patch.completedAt = null
  }
  await db.update(salesActivities).set(patch).where(eq(salesActivities.id, id))
  return getActivity(db, id)
}

async function assertNoteRecord(db: Database, kind: NoteRecordKind, recordId: number) {
  if (kind === 'lead') {
    await getLead(db, recordId)
  } else if (kind === 'company') {
    await requireAccount(db, recordId)
  } else if (kind === 'contact') {
    await requireContact(db, recordId)
  } else {
    await getOpportunity(db, recordId)
  }
}

export async function listNotes(db: Database, recordKind: string, recordId: number) {
  if (!isNoteRecordKind(recordKind)) {
    throw new DomainError('Unknown history record.')
  }
  await assertNoteRecord(db, recordKind, recordId)
  return db.select().from(salesNotes)
    .where(and(eq(salesNotes.recordKind, recordKind), eq(salesNotes.recordId, recordId)))
    .orderBy(desc(salesNotes.createdAt))
}

export async function createNote(db: Database, input: {
  recordKind: string
  recordId: number
  body: string
  authorUserId: number
}) {
  if (!isNoteRecordKind(input.recordKind)) {
    throw new DomainError('Unknown history record.')
  }
  await requireOwner(db, input.authorUserId)
  await assertNoteRecord(db, input.recordKind, input.recordId)
  const body = input.body.trim()
  if (!body) {
    throw new DomainError('History notes cannot be empty.')
  }
  const createdAt = now()
  await db.insert(salesNotes).values({
    recordKind: input.recordKind,
    recordId: input.recordId,
    body,
    authorUserId: input.authorUserId,
    createdAt,
  })
  const [created] = await db.select().from(salesNotes)
    .where(and(eq(salesNotes.recordKind, input.recordKind), eq(salesNotes.createdAt, createdAt)))
    .orderBy(desc(salesNotes.id))
    .limit(1)
  return created!
}

export async function dashboardCounts(db: Database) {
  const companies = await db.select().from(salesAccounts)
  const contacts = await db.select().from(salesContacts)
  const opportunities = await db.select().from(salesOpportunities)
  const openActivities = await db.select().from(salesActivities).where(eq(salesActivities.status, 'open'))
  return {
    companies: companies.length,
    contacts: contacts.length,
    openOpportunities: opportunities.filter(row => row.stage !== 'won' && row.stage !== 'lost').length,
    wonOpportunities: opportunities.filter(row => row.stage === 'won').length,
    lostOpportunities: opportunities.filter(row => row.stage === 'lost').length,
    openActivities: openActivities.length,
  }
}
