import { and, desc, eq, isNull } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import {
  salesAccounts,
  salesActivities,
  salesContacts,
  salesOpportunities,
} from '../database/schema'
import { isOpportunityStage, type OpportunityStage } from '../../shared/utils/pipeline'
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

export async function listOpportunities(db: Database, filters: { search?: string, accountId?: number, stage?: string } = {}) {
  const rows = await db.select().from(salesOpportunities).orderBy(desc(salesOpportunities.updatedAt))
  return rows.filter((row) => {
    if (filters.accountId != null && row.accountId !== filters.accountId) {
      return false
    }
    if (filters.stage && row.stage !== filters.stage) {
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
}) {
  await requireAccount(db, input.accountId)
  await assertContactBelongsToAccount(db, input.primaryContactId, input.accountId)
  const createdAt = now()
  await db.insert(salesOpportunities).values({
    accountId: input.accountId,
    primaryContactId: input.primaryContactId ?? null,
    name: input.name.trim(),
    amountCents: input.amountCents ?? null,
    stage: input.stage ?? 'open',
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
}) {
  const current = await getOpportunity(db, id)
  const accountId = input.accountId ?? current.accountId
  if (input.accountId != null) {
    await requireAccount(db, input.accountId)
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
  await db.update(salesOpportunities).set(patch).where(eq(salesOpportunities.id, id))
  return getOpportunity(db, id)
}

export async function listActivities(db: Database, filters: {
  accountId?: number
  contactId?: number
  opportunityId?: number
  openOnly?: boolean
} = {}) {
  const rows = await db.select().from(salesActivities).orderBy(desc(salesActivities.createdAt))
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
    if (filters.openOnly && row.completedAt) {
      return false
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
  description: string
  dueAt?: number
}) {
  if (!input.accountId && !input.contactId && !input.opportunityId) {
    throw new DomainError('Attach this activity to a company, contact, or opportunity.')
  }
  let accountId = input.accountId ?? null
  if (input.opportunityId) {
    const opportunity = await getOpportunity(db, input.opportunityId)
    accountId = accountId ?? opportunity.accountId
  }
  if (input.contactId) {
    const contact = await requireContact(db, input.contactId)
    accountId = accountId ?? contact.accountId
  }
  if (accountId) {
    await requireAccount(db, accountId)
  }
  const createdAt = now()
  await db.insert(salesActivities).values({
    accountId,
    contactId: input.contactId ?? null,
    opportunityId: input.opportunityId ?? null,
    description: input.description.trim(),
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
  dueAt?: number | null
  completed?: boolean
}) {
  const current = await getActivity(db, id)
  const patch: Partial<typeof salesActivities.$inferInsert> = { updatedAt: now() }
  if (input.description !== undefined) {
    patch.description = input.description.trim()
  }
  if (input.dueAt !== undefined) {
    patch.dueAt = input.dueAt == null ? null : new Date(input.dueAt)
  }
  if (input.completed === true && !current.completedAt) {
    patch.completedAt = now()
  }
  if (input.completed === false) {
    patch.completedAt = null
  }
  await db.update(salesActivities).set(patch).where(eq(salesActivities.id, id))
  return getActivity(db, id)
}

export async function dashboardCounts(db: Database) {
  const companies = await db.select().from(salesAccounts)
  const contacts = await db.select().from(salesContacts)
  const opportunities = await db.select().from(salesOpportunities)
  const openActivities = await db.select().from(salesActivities).where(isNull(salesActivities.completedAt))
  return {
    companies: companies.length,
    contacts: contacts.length,
    openOpportunities: opportunities.filter(row => row.stage !== 'won' && row.stage !== 'lost').length,
    wonOpportunities: opportunities.filter(row => row.stage === 'won').length,
    lostOpportunities: opportunities.filter(row => row.stage === 'lost').length,
    openActivities: openActivities.length,
  }
}
