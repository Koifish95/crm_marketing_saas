import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { appSettings, compensationAttributionHistory, compensationEarned, membershipOfferings, programs, users } from '../../server/database/schema'
import { upsertMembershipOffering } from '../../server/services/catalog'
import { createCampaign } from '../../server/services/campaigns'
import {
  assignCompensationAttribution,
  getCompensationAttribution,
  maybeEstablishSystemCompensation,
  snapshotCompensationEarned,
} from '../../server/services/compensation'
import { convertLeadLine } from '../../server/services/conversion'
import { updateLeadLine } from '../../server/services/lead-lines'
import { createLead } from '../../server/services/leads'
import { updateTrackedAcquisitionOwner } from '../../server/services/app-settings'
import { hashStaffPassword } from '../../server/services/password'
import { COMPENSATION_BPS_KEY } from '../../shared/utils/compensation'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

function actorFrom(row: { id: number, email: string, displayName: string, role: string }) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as 'ADMIN',
    mustChangePassword: false,
  }
}

async function insertStaff(
  db: Awaited<ReturnType<typeof openTestDatabase>>['db'],
  input: { email: string, username: string, displayName: string, role?: 'ADMIN' | 'STAFF' },
) {
  const now = new Date(utcNowMs())
  const [row] = await db.insert(users).values({
    email: input.email,
    username: input.username,
    displayName: input.displayName,
    role: input.role ?? 'STAFF',
    active: true,
    passwordHash: await hashStaffPassword('staff-password'),
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  }).returning()
  return row!
}

describe('M9 compensation attribution', () => {
  it('leaves staff leads unassigned and snapshots 50% at JOINED without rewriting later price edits', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult!.id))
      const household = await createLead(testDb.db, {
        firstName: 'Dana',
        phone: '8015554400',
        programId: adult!.id,
        source: 'WALK_IN',
      }, actor)
      const lineId = household.lines[0]!.id
      await updateLeadLine(testDb.db, lineId, { membershipOfferingId: offering!.id })
      expect(await getCompensationAttribution(testDb.db, lineId)).toBeUndefined()
      const conversion = await convertLeadLine(testDb.db, lineId, {}, actor)
      let earned = await testDb.db.select().from(compensationEarned)
      expect(earned).toHaveLength(0)

      await assignCompensationAttribution(testDb.db, lineId, {
        creditedUserId: admin!.id,
        reason: 'Correcting walk-in that came from Scott’s campaign.',
      }, actor)
      await snapshotCompensationEarned(testDb.db, conversion.id)
      earned = await testDb.db.select().from(compensationEarned)
      expect(earned).toHaveLength(1)
      expect(earned[0]!.amountCents).toBe(Math.round((conversion.monthlyCents * 5000) / 10_000))
      expect(earned[0]!.basisBps).toBe(5000)
      expect(earned[0]!.paymentStatus).toBe('UNPAID')

      await upsertMembershipOffering(testDb.db, {
        id: offering!.id,
        name: offering!.name,
        programId: offering!.programId,
        monthlyCents: 25000,
        enrollmentCents: offering!.enrollmentCents,
        active: true,
      })
      await testDb.db.update(appSettings).set({
        value: '2500',
        updatedAt: new Date(utcNowMs()),
      }).where(eq(appSettings.key, COMPENSATION_BPS_KEY))
      await snapshotCompensationEarned(testDb.db, conversion.id)
      const [stored] = await testDb.db.select().from(compensationEarned).where(eq(compensationEarned.id, earned[0]!.id))
      expect(stored?.amountCents).toBe(earned[0]!.amountCents)
      expect(stored?.basisBps).toBe(5000)
      const history = await testDb.db.select().from(compensationAttributionHistory).where(eq(compensationAttributionHistory.leadLineId, lineId))
      expect(history.some(row => row.reason?.includes('Correcting'))).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('credits generated tracking-link evidence to the configured owner, not the Campaign owner', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const campaignOwner = await insertStaff(testDb.db, {
        email: 'campaign-owner@local',
        username: 'campaign-owner',
        displayName: 'Campaign Owner',
      })
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      await updateTrackedAcquisitionOwner(testDb.db, admin!.id, actor)
      const campaign = await createCampaign(testDb.db, {
        name: 'Scott Open House',
        status: 'ACTIVE',
        ownerUserId: campaignOwner.id,
      })
      const household = await createLead(testDb.db, {
        firstName: 'Reese',
        phone: '8015554401',
        programId: adult!.id,
        source: 'WEBSITE',
        campaignId: campaign.id,
      }, actor)
      const lineId = household.lines[0]!.id
      const first = await maybeEstablishSystemCompensation(testDb.db, lineId, {
        campaignId: campaign.id,
        campaignTrackingLinkId: campaign.trackingLinks[0]!.id,
      })
      expect(first?.creditedUserId).toBe(admin!.id)
      expect(first?.creditedUserId).not.toBe(campaignOwner.id)
      expect(first?.origin).toBe('SYSTEM')
      expect(first?.method).toBe('TRACKING_LINK')
      expect(first?.eligibility).toBe('ELIGIBLE')
      await assignCompensationAttribution(testDb.db, lineId, {
        creditedUserId: null,
        reason: 'Not Scott’s acquisition.',
        eligibility: 'INELIGIBLE',
      }, actor)
      const again = await maybeEstablishSystemCompensation(testDb.db, lineId, {
        campaignId: campaign.id,
      })
      expect(again?.eligibility).toBe('INELIGIBLE')
      expect(again?.creditedUserId).toBeNull()
    } finally {
      await testDb.close()
    }
  })

  it('leaves campaign or event evidence without a generated tracking link unassigned', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      await updateTrackedAcquisitionOwner(testDb.db, admin!.id, actor)
      const campaign = await createCampaign(testDb.db, {
        name: 'Owner Should Not Get Credit',
        status: 'ACTIVE',
        ownerUserId: admin!.id,
      })
      const household = await createLead(testDb.db, {
        firstName: 'Walkin',
        phone: '8015554402',
        programId: adult!.id,
        source: 'WALK_IN',
        campaignId: campaign.id,
      }, actor)
      const lineId = household.lines[0]!.id
      const established = await maybeEstablishSystemCompensation(testDb.db, lineId, {
        campaignId: campaign.id,
      })
      expect(established?.creditedUserId).toBeNull()
      expect(established?.eligibility).toBe('UNASSIGNED')
      expect(established?.method).toBe('CAMPAIGN')
      expect(established?.origin).toBe('SYSTEM')
      expect(established?.campaignId).toBe(campaign.id)
    } finally {
      await testDb.close()
    }
  })

  it('leaves generated tracking-link credit unassigned until an administrator configures the owner', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      const campaign = await createCampaign(testDb.db, {
        name: 'Unset Owner Campaign',
        status: 'ACTIVE',
        ownerUserId: admin!.id,
      })
      const household = await createLead(testDb.db, {
        firstName: 'Pending',
        phone: '8015554403',
        programId: adult!.id,
        source: 'WEBSITE',
        campaignId: campaign.id,
      }, actor)
      const established = await maybeEstablishSystemCompensation(testDb.db, household.lines[0]!.id, {
        campaignId: campaign.id,
        campaignTrackingLinkId: campaign.trackingLinks[0]!.id,
      })
      expect(established?.creditedUserId).toBeNull()
      expect(established?.eligibility).toBe('UNASSIGNED')
      expect(established?.method).toBe('TRACKING_LINK')
    } finally {
      await testDb.close()
    }
  })
})
