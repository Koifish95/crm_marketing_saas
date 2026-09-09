import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { leadNotes, programs } from '../database/schema'
import type { LeadLineRelationship, LeadSource } from '../../shared/schemas/enums'
import { normalizePhone } from '../../shared/utils/phone'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import * as leadLines from './lead-lines'
import * as leadService from './leads'
import {
  claimSubmission,
  completeSubmission,
  loadSubmission,
  resolveIdempotencyKey,
  waitForCompletedSubmission,
} from './submissions'
import { runTransaction } from './tx'
import { isIdempotencyKeyConflict, isSqliteBusyError } from '../utils/db-errors'

export interface StaffHouseholdMemberInput {
  relationship: LeadLineRelationship
  firstName: string
  lastName?: string | null
  age?: number | null
  programId: number
  experienceLevel?: string
  notes?: string | null
}

export interface StaffHouseholdInput {
  firstName: string
  lastName?: string | null
  phone?: string | null
  email?: string | null
  source: LeadSource
  campaignId?: number
  notes?: string | null
  smsConsent?: boolean
  emailConsent?: boolean
  members: StaffHouseholdMemberInput[]
  idempotencyKey: string
}

interface StoredStaffHouseholdResult {
  kind: 'staff-household'
  leadId: number
}

function parseStaffStoredResult(row: { resultJson: string | null, leadId: number | null }): StoredStaffHouseholdResult | null {
  if (row.leadId && !row.resultJson) {
    return { kind: 'staff-household', leadId: row.leadId }
  }
  if (!row.resultJson) {
    return null
  }
  try {
    const parsed = JSON.parse(row.resultJson) as StoredStaffHouseholdResult
    if (parsed?.kind === 'staff-household' && parsed.leadId) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

async function replayStaffHousehold(db: Database, stored: StoredStaffHouseholdResult) {
  return {
    replayed: true as const,
    lead: await leadService.getLead(db, stored.leadId),
  }
}

async function resolveMemberProgram(db: Database, member: StaffHouseholdMemberInput) {
  const [program] = await db.select().from(programs).where(eq(programs.id, member.programId)).limit(1)
  if (!program) {
    throw new DomainError('Program not found.', 404)
  }
  if (program.code === 'KIDS_BJJ' && member.age == null) {
    throw new DomainError('Child age is required.')
  }
  return program
}

async function writeNewStaffHousehold(
  tx: Database,
  input: StaffHouseholdInput,
  actor: SessionUser | undefined,
  options: {
    phone: string | null
    idempotencyKey: string
    programs: Array<{ member: StaffHouseholdMemberInput, program: { id: number, code: string } }>
  },
) {
  await claimSubmission(tx, options.idempotencyKey)
  const firstProgramId = options.programs[0]!.program.id
  const selfMember = input.members.find(member => member.relationship === 'SELF')

  const header = await leadService.createLead(tx, {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: options.phone,
    email: input.email,
    programId: firstProgramId,
    experienceLevel: selfMember?.experienceLevel ?? 'UNKNOWN',
    source: input.source,
    campaignId: input.campaignId,
    smsConsent: input.smsConsent,
    emailConsent: input.emailConsent,
  }, actor, { skipDefaultLine: true })

  const matches = await leadService.findMatchingContactLeads(tx, {
    phone: options.phone,
    email: input.email,
    excludeId: header.id,
  })

  for (const item of options.programs) {
    const member = item.member
    await leadLines.insertLeadLine(tx, header.id, {
      relationship: member.relationship,
      firstName: member.relationship === 'SELF' ? input.firstName : member.firstName,
      lastName: member.relationship === 'SELF' ? (input.lastName ?? null) : (member.lastName ?? null),
      age: member.age ?? null,
      programId: item.program.id,
      experienceLevel: member.experienceLevel ?? 'UNKNOWN',
      notes: member.notes ?? null,
    }, actor)
  }

  if (matches.length) {
    await leadService.recordPossibleDuplicates(tx, header.id, matches)
  }

  const note = input.notes?.trim()
  if (note) {
    const now = new Date(utcNowMs())
    await tx.insert(leadNotes).values({
      leadId: header.id,
      body: note,
      createdByUserId: actor?.id,
      createdAt: now,
      updatedAt: now,
    })
  }

  await completeSubmission(tx, options.idempotencyKey, header.id, {
    kind: 'staff-household',
    leadId: header.id,
  } satisfies StoredStaffHouseholdResult)

  return {
    replayed: false as const,
    lead: await leadService.getLead(tx, header.id),
  }
}

export async function createStaffHousehold(
  db: Database,
  input: StaffHouseholdInput,
  actor?: SessionUser,
) {
  if (!input.members.length) {
    throw new DomainError('Add at least one prospective member.')
  }
  const selfCount = input.members.filter(member => member.relationship === 'SELF').length
  if (selfCount > 1) {
    throw new DomainError(leadLines.DUPLICATE_SELF_MESSAGE)
  }

  const phone = normalizePhone(input.phone) || null
  const email = input.email?.trim() || null
  if (!phone && !email) {
    throw new DomainError('A lead requires a phone number or an email address.')
  }

  const resolved: Array<{ member: StaffHouseholdMemberInput, program: { id: number, code: string } }> = []
  for (const member of input.members) {
    resolved.push({
      member,
      program: await resolveMemberProgram(db, member),
    })
  }

  const idempotencyKey = resolveIdempotencyKey(input.idempotencyKey, { required: true })
  const existing = await loadSubmission(db, idempotencyKey)
  const existingStored = existing ? parseStaffStoredResult(existing) : null
  if (existingStored) {
    return replayStaffHousehold(db, existingStored)
  }

  let lastError: unknown
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = await loadSubmission(db, idempotencyKey)
    const currentStored = current ? parseStaffStoredResult(current) : null
    if (currentStored) {
      return replayStaffHousehold(db, currentStored)
    }
    try {
      return await runTransaction(db, async (tx) => {
        return writeNewStaffHousehold(tx, input, actor, {
          phone,
          idempotencyKey,
          programs: resolved,
        })
      })
    } catch (error) {
      lastError = error
      if (isIdempotencyKeyConflict(error)) {
        const stored = await waitForCompletedSubmission(
          db,
          idempotencyKey,
          parseStaffStoredResult,
          'That household is still being saved. Please wait and try again.',
        )
        return replayStaffHousehold(db, stored)
      }
      if (isSqliteBusyError(error) && attempt < 7) {
        await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw lastError
}
