import { eq } from 'drizzle-orm'
import { expect } from 'vitest'
import {
  membershipOfferings,
  programs,
  users,
} from '../../../server/database/schema'
import { listLostReasons } from '../../../server/services/catalog'
import { completeFollowUpTask } from '../../../server/services/follow-up'
import { convertLeadLine, markLeadLineLost } from '../../../server/services/conversion'
import { listPublicSlots } from '../../../server/services/availability'
import type { SessionUser } from '../../../server/services/authorization'
import { addLeadLineToHousehold, householdIsClosed, updateLeadLine } from '../../../server/services/lead-lines'
import {
  createLead,
  getLead,
  scheduleTrialFromSlot,
} from '../../../server/services/leads'
import { bookPublicHousehold } from '../../../server/services/public-trial'
import { householdDisplayStatus } from '../../../shared/utils/labels'
import { followUpDueAt } from '../../../shared/utils/follow-up'
import type { openTestDatabase } from '../../helpers/db'

export const SCENARIO_NOW = Date.parse('2026-08-31T21:00:00.000Z')

export type TestDb = Awaited<ReturnType<typeof openTestDatabase>>
export type AppDb = TestDb['db']
export type Household = Awaited<ReturnType<typeof getLead>>
export type LeadLine = NonNullable<Household['lines']>[number]
export type TrialRow = NonNullable<LeadLine['trials']>[number]
export type FollowUpRow = NonNullable<Household['followUpTasks']>[number]

let phoneSeq = 0

export function nextPhone() {
  phoneSeq += 1
  return `801556${String(phoneSeq).padStart(4, '0')}`
}

export async function programId(db: AppDb, code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

export async function offeringFor(db: AppDb, programIdValue: number) {
  const [row] = await db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, programIdValue))
  return row!
}

export async function adminActor(db: AppDb): Promise<SessionUser> {
  const [admin] = await db.select().from(users).where(eq(users.username, 'admin'))
  return {
    id: admin!.id,
    email: admin!.email,
    displayName: admin!.displayName,
    role: 'ADMIN',
    mustChangePassword: false,
  }
}

export function lineByRelationship(lead: Household, relationship: string) {
  return (lead.lines ?? []).find(line => line.relationship === relationship)
}

export function lineByName(lead: Household, firstName: string) {
  return (lead.lines ?? []).find(line => line.firstName === firstName)
}

export function trialsFor(line: LeadLine | undefined) {
  return line?.trials ?? []
}

export function scheduledTrials(line: LeadLine | undefined) {
  return trialsFor(line).filter(trial => trial.status === 'SCHEDULED')
}

export function pendingInitialTasks(lead: Household) {
  return (lead.followUpTasks ?? []).filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')
}

export function completedInitialTasks(lead: Household) {
  return (lead.followUpTasks ?? []).filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'COMPLETED')
}

export function activeConversions(line: LeadLine | undefined) {
  return (line?.conversions ?? []).filter(row => !row.reversedAt)
}

export function openLostOutcomes(line: LeadLine | undefined) {
  return (line?.lostOutcomes ?? []).filter(row => !row.reopenedAt)
}

export function householdStatus(lead: Household) {
  return householdDisplayStatus({
    status: lead.status,
    closedAt: lead.closedAt,
    lines: lead.lines ?? [],
  })
}

export function expectHouseholdStatus(lead: Household, key: string, label?: string) {
  const display = householdStatus(lead)
  expect(display.key).toBe(key)
  if (label) {
    expect(display.label).toBe(label)
  }
}

export function expectPendingInitialCount(lead: Household, count: number) {
  expect(pendingInitialTasks(lead)).toHaveLength(count)
}

export async function adultSlot(db: AppDb, nowMs = SCENARIO_NOW, date = '2026-08-31') {
  const slots = await listPublicSlots(db, { programCode: 'ADULT_BJJ', nowMs })
  return slots.find(slot => slot.date === date && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)
    ?? slots.find(slot => slot.date === date)
    ?? slots[0]!
}

export async function adultNoGiSlot(db: AppDb, nowMs = SCENARIO_NOW) {
  const slots = await listPublicSlots(db, { programCode: 'ADULT_BJJ', nowMs })
  return slots.find(slot => slot.date === '2026-09-01' && slot.name.includes('No-Gi') && slot.startMinute === 18 * 60)
    ?? slots.find(slot => slot.date === '2026-09-01')
    ?? slots[1]!
}

export async function kidsSlot(db: AppDb, age: number, nowMs = SCENARIO_NOW, date?: string) {
  const slots = await listPublicSlots(db, { programCode: 'KIDS_BJJ', age, nowMs })
  if (date) {
    return slots.find(slot => slot.date === date) ?? slots[0]!
  }
  return slots[0]!
}

export async function createSingleAdultHousehold(db: AppDb, input?: {
  firstName?: string
  lastName?: string
  phone?: string
  source?: 'WALK_IN' | 'INSTAGRAM' | 'PHONE' | 'WEBSITE' | 'REFERRAL'
  campaignId?: number
}) {
  const adult = await programId(db, 'ADULT_BJJ')
  return createLead(db, {
    firstName: input?.firstName ?? 'Alex',
    lastName: input?.lastName ?? 'Adult',
    phone: input?.phone ?? nextPhone(),
    programId: adult,
    source: input?.source ?? 'WALK_IN',
    campaignId: input?.campaignId,
  })
}

export async function createGuardianChildHousehold(db: AppDb, input?: {
  guardianFirstName?: string
  childFirstName?: string
  age?: number
  phone?: string
}) {
  const kids = await programId(db, 'KIDS_BJJ')
  return createLead(db, {
    firstName: input?.guardianFirstName ?? 'Pat',
    lastName: 'Parent',
    phone: input?.phone ?? nextPhone(),
    programId: kids,
    source: 'INSTAGRAM',
    participantFirstName: input?.childFirstName ?? 'Sam',
    participantLastName: 'Kid',
    participantAge: input?.age ?? 8,
    guardianRelationship: 'parent',
  })
}

export async function createParentChildHousehold(db: AppDb, input?: {
  parentFirstName?: string
  childFirstName?: string
  childAge?: number
  phone?: string
  source?: 'WALK_IN' | 'INSTAGRAM' | 'PHONE' | 'WEBSITE' | 'REFERRAL'
}) {
  const adult = await programId(db, 'ADULT_BJJ')
  const kids = await programId(db, 'KIDS_BJJ')
  const household = await createLead(db, {
    firstName: input?.parentFirstName ?? 'Matt',
    lastName: 'Smith',
    phone: input?.phone ?? nextPhone(),
    programId: adult,
    source: input?.source ?? 'WALK_IN',
  })
  await addLeadLineToHousehold(db, household.id, {
    relationship: 'CHILD',
    firstName: input?.childFirstName ?? 'Sam',
    lastName: 'Smith',
    programId: kids,
    age: input?.childAge ?? 8,
  })
  return getLead(db, household.id)
}

export async function createTwoChildHousehold(db: AppDb, input?: {
  guardianFirstName?: string
  firstChild?: string
  secondChild?: string
  phone?: string
}) {
  const kids = await programId(db, 'KIDS_BJJ')
  const household = await createLead(db, {
    firstName: input?.guardianFirstName ?? 'Jordan',
    lastName: 'Guardian',
    phone: input?.phone ?? nextPhone(),
    programId: kids,
    source: 'WEBSITE',
    participantFirstName: input?.firstChild ?? 'Riley',
    participantAge: 8,
    guardianRelationship: 'parent',
  })
  await addLeadLineToHousehold(db, household.id, {
    relationship: 'CHILD',
    firstName: input?.secondChild ?? 'Quinn',
    programId: kids,
    age: 10,
  })
  return getLead(db, household.id)
}

export async function scheduleValidTrialForLine(
  db: AppDb,
  leadId: number,
  lineId: number,
  programCode: 'ADULT_BJJ' | 'KIDS_BJJ',
  options?: { nowMs?: number, age?: number, date?: string, slotId?: string },
) {
  const nowMs = options?.nowMs ?? SCENARIO_NOW
  const slotId = options?.slotId ?? (
    programCode === 'ADULT_BJJ'
      ? (await adultSlot(db, nowMs, options?.date)).id
      : (await kidsSlot(db, options?.age ?? 8, nowMs, options?.date)).id
  )
  return scheduleTrialFromSlot(db, leadId, { slotId, leadLineId: lineId }, undefined, { nowMs })
}

export async function assignDefaultOffering(db: AppDb, line: { id: number, programId: number }) {
  const offering = await offeringFor(db, line.programId)
  await updateLeadLine(db, line.id, { membershipOfferingId: offering.id })
  return offering
}

export async function convertHouseholdLine(db: AppDb, line: { id: number, programId: number }, actor?: SessionUser) {
  await assignDefaultOffering(db, line)
  return convertLeadLine(db, line.id, { note: 'Joined.' }, actor)
}

export async function markLineLost(db: AppDb, lineId: number, actor?: SessionUser) {
  const reasons = await listLostReasons(db, { activeOnly: true })
  return markLeadLineLost(db, lineId, { lostReasonId: reasons[0]!.id, note: 'Not a fit.' }, actor)
}

export async function completeHouseholdFollowUp(db: AppDb, lead: Household, actor: SessionUser) {
  const pending = pendingInitialTasks(lead)[0]
  if (!pending) {
    throw new Error('Expected a pending household confirmation task.')
  }
  await completeFollowUpTask(db, pending.id, { outcome: 'REACHED', notes: 'Confirmed intros.' }, actor)
  return getLead(db, lead.id)
}

export async function bookPublicParentChild(db: AppDb, input?: {
  parentName?: string
  childName?: string
  phone?: string
  sameDay?: boolean
  nowMs?: number
}) {
  const nowMs = input?.nowMs ?? SCENARIO_NOW
  const adult = await adultSlot(db, nowMs)
  const childSlot = input?.sameDay
    ? await kidsSlot(db, 8, nowMs, adult.date)
    : await kidsSlot(db, 8, nowMs)
  return bookPublicHousehold(db, {
    firstName: input?.parentName ?? 'Matt',
    lastName: 'Smith',
    phone: input?.phone ?? nextPhone(),
    members: [{
      relationship: 'SELF',
      firstName: input?.parentName ?? 'Matt',
      lastName: 'Smith',
      programCode: 'ADULT_BJJ',
      slotId: adult.id,
    }, {
      relationship: 'CHILD',
      firstName: input?.childName ?? 'Sam',
      lastName: 'Smith',
      age: 8,
      programCode: 'KIDS_BJJ',
      slotId: childSlot.id,
    }],
  }, { nowMs })
}

export function expectedFollowUpDue(nowMs = SCENARIO_NOW) {
  return followUpDueAt(nowMs)
}

export function householdClosed(lead: Household) {
  return householdIsClosed(lead.lines ?? [])
}

export { householdIsClosed }
