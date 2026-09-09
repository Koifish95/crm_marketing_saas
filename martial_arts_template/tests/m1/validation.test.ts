import { describe, expect, it } from 'vitest'
import { createCampaignSchema } from '../../shared/schemas/campaign'
import { createFollowUpTaskSchema } from '../../shared/schemas/follow-up-task'
import { createLeadSchema, updateLeadSchema } from '../../shared/schemas/lead'
import { experienceLevelSchema, leadSourceSchema, leadStatusSchema } from '../../shared/schemas/enums'
import { createProgramSchema } from '../../shared/schemas/program'
import { createTrialSchema, rescheduleTrialSchema, staffCreateTrialSchema } from '../../shared/schemas/trial'

describe('Zod domain schemas', () => {
  it('requires phone or email on create', () => {
    const missing = createLeadSchema.safeParse({
      firstName: 'Pat',
      programId: 1,
      source: 'WALK_IN',
    })
    expect(missing.success).toBe(false)

    const phoneOnly = createLeadSchema.safeParse({
      firstName: 'Pat',
      phone: '8015550111',
      programId: 1,
      source: 'WALK_IN',
    })
    expect(phoneOnly.success).toBe(true)
  })

  it('accepts guardian/participant fields and rejects bad experience/source/status', () => {
    const kids = createLeadSchema.safeParse({
      firstName: 'Taylor',
      lastName: 'Guardian',
      phone: '8015550122',
      programId: 2,
      source: 'INSTAGRAM',
      experienceLevel: 'BEGINNER',
      participantFirstName: 'Avery',
      participantAge: 7,
      guardianRelationship: 'parent',
    })
    expect(kids.success).toBe(true)

    expect(experienceLevelSchema.safeParse('EXPERT').success).toBe(false)
    expect(leadSourceSchema.safeParse('TIKTOK').success).toBe(false)
    expect(leadStatusSchema.safeParse('QUALIFIED').success).toBe(false)
  })

  it('allows partial lead updates without wiping contact requirements', () => {
    const statusOnly = updateLeadSchema.safeParse({ status: 'CONTACTED' })
    expect(statusOnly.success).toBe(true)

    const emailOnlyContact = updateLeadSchema.safeParse({
      firstName: 'Pat',
      phone: null,
      email: 'pat@example.com',
    })
    expect(emailOnlyContact.success).toBe(true)
  })

  it('validates trial, campaign, and follow-up payloads', () => {
    expect(createTrialSchema.safeParse({
      leadId: 1,
      scheduledAt: new Date(),
    }).success).toBe(true)

    expect(staffCreateTrialSchema.safeParse({
      scheduledAt: new Date(),
    }).success).toBe(false)

    expect(staffCreateTrialSchema.safeParse({
      slotId: 'rule:1:2026-08-31',
    }).success).toBe(true)

    expect(rescheduleTrialSchema.safeParse({
      scheduledAt: new Date(),
    }).success).toBe(false)

    expect(rescheduleTrialSchema.safeParse({
      slotId: 'rule:1:2026-08-31',
    }).success).toBe(true)

    expect(createCampaignSchema.safeParse({
      name: 'Fall',
      slug: 'Fall',
    }).success).toBe(false)

    expect(createCampaignSchema.safeParse({
      name: 'Fall',
      slug: 'fall-intro',
    }).success).toBe(true)

    expect(createFollowUpTaskSchema.safeParse({
      leadId: 1,
      dueAt: new Date(),
      type: 'SMS',
    }).success).toBe(false)

    expect(createFollowUpTaskSchema.safeParse({
      leadId: 1,
      dueAt: new Date(),
    }).success).toBe(true)

    expect(createProgramSchema.safeParse({
      code: 'ADULT_BJJ',
      name: 'Adult BJJ',
    }).success).toBe(true)
  })
})
