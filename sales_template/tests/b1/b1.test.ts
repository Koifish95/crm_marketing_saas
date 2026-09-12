import { afterEach, describe, expect, it } from 'vitest'
import { isPublicPath } from '../../server/services/authorization'
import {
  createCampaign,
  createSource,
  createTrackingLink,
  listSources,
  recordTrackingClick,
  resolveActiveTrackingLink,
  updateSource,
  websiteOrganicSource,
} from '../../server/services/acquisition'
import {
  addOpportunityLine,
  createOffer,
  listOpportunityLines,
} from '../../server/services/commercial'
import {
  readPublicIntakeConfig,
  submitPublicIntake,
  writePublicIntakeConfig,
} from '../../server/services/public-intake'
import { salesDashboard } from '../../server/services/reporting'
import {
  convertLead,
  createCompany,
  createLead,
  createOpportunity,
  getCompany,
  getOpportunity,
  listLeads,
  markOpportunityLost,
  markOpportunityWon,
  reopenOpportunity,
  updateLead,
} from '../../server/services/sales'
import { users } from '../../server/database/schema'
import { openTestDatabase } from '../helpers/db'
import { OTHER_SOURCE_CODE, lineMrrCents } from '../../shared/utils/catalog'
import { resetPublicRateLimit } from '../../server/utils/rate-limit'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  resetPublicRateLimit()
  await dbHandle?.close()
  dbHandle = undefined
})

async function ownerId() {
  const [admin] = await dbHandle!.db.select().from(users).limit(1)
  return admin!.id
}

describe('B1 commercial model and acquisition', () => {
  it('seeds controlled sources idempotently including Website / Organic and Other', async () => {
    dbHandle = await openTestDatabase()
    const first = await listSources(dbHandle.db)
    const second = await listSources(dbHandle.db)
    expect(first.map(row => row.code).sort()).toEqual(second.map(row => row.code).sort())
    expect(first.some(row => row.name === 'Website / Organic')).toBe(true)
    expect(first.some(row => row.code === OTHER_SOURCE_CODE)).toBe(true)
  })

  it('allows adding and deactivating a Source without deleting it', async () => {
    dbHandle = await openTestDatabase()
    const created = await createSource(dbHandle.db, { name: 'Podcast' })
    const deactivated = await updateSource(dbHandle.db, created.id, { active: false })
    expect(deactivated.active).toBe(false)
    const listed = await listSources(dbHandle.db)
    expect(listed.some(row => row.id === created.id)).toBe(true)
  })

  it('lets a campaign span multiple sources via many tracking links per pair', async () => {
    dbHandle = await openTestDatabase()
    const sources = await listSources(dbHandle.db, { active: true })
    const facebook = sources.find(row => row.code === 'facebook')!
    const instagram = sources.find(row => row.code === 'instagram')!
    const campaign = await createCampaign(dbHandle.db, { name: 'September Managed IT', status: 'active' })
    const one = await createTrackingLink(dbHandle.db, {
      campaignId: campaign.id,
      sourceId: facebook.id,
      label: 'Facebook ad A',
    })
    const two = await createTrackingLink(dbHandle.db, {
      campaignId: campaign.id,
      sourceId: facebook.id,
      label: 'Facebook ad B',
    })
    const three = await createTrackingLink(dbHandle.db, {
      campaignId: campaign.id,
      sourceId: instagram.id,
      label: 'Instagram bio',
    })
    expect(one.token).not.toBe(two.token)
    expect(one.campaignId).toBe(three.campaignId)
    expect(one.sourceId).not.toBe(three.sourceId)
    expect(campaign).not.toHaveProperty('primarySourceId')
  })

  it('404s unknown and inactive tracking tokens without exposing a campaign', async () => {
    dbHandle = await openTestDatabase()
    await expect(resolveActiveTrackingLink(dbHandle.db, 'no-such-token')).rejects.toThrow(/not available/)
    const sources = await listSources(dbHandle.db, { active: true })
    const campaign = await createCampaign(dbHandle.db, { name: 'Quiet' })
    const link = await createTrackingLink(dbHandle.db, {
      campaignId: campaign.id,
      sourceId: sources[0]!.id,
      label: 'Off',
    })
    const { updateTrackingLink } = await import('../../server/services/acquisition')
    await updateTrackingLink(dbHandle.db, link.id, { active: false })
    await expect(resolveActiveTrackingLink(dbHandle.db, link.token)).rejects.toThrow(/not available/)
  })

  it('counts clicks on successful token resolution', async () => {
    dbHandle = await openTestDatabase()
    const sources = await listSources(dbHandle.db, { active: true })
    const campaign = await createCampaign(dbHandle.db, { name: 'Clicks' })
    const link = await createTrackingLink(dbHandle.db, {
      campaignId: campaign.id,
      sourceId: sources[0]!.id,
      label: 'Click me',
    })
    const after = await recordTrackingClick(dbHandle.db, link.token)
    expect(after.clickCount).toBe(1)
  })

  it('keeps captured attribution immutable while current attribution can be corrected', async () => {
    dbHandle = await openTestDatabase()
    const sources = await listSources(dbHandle.db, { active: true })
    const facebook = sources.find(row => row.code === 'facebook')!
    const referral = sources.find(row => row.code === 'referral')!
    const campaign = await createCampaign(dbHandle.db, { name: 'Launch' })
    const lead = await createLead(dbHandle.db, {
      displayName: 'Pat Lee',
      email: 'pat@example.com',
      ownerUserId: await ownerId(),
      sourceId: facebook.id,
      campaignId: campaign.id,
    })
    expect(lead.capturedSourceId).toBe(facebook.id)
    const corrected = await updateLead(dbHandle.db, lead.id, { sourceId: referral.id }, await ownerId())
    expect(corrected.sourceId).toBe(referral.id)
    expect(corrected.capturedSourceId).toBe(facebook.id)
    expect(corrected.campaignId).toBe(campaign.id)
  })

  it('copies attribution onto the Opportunity at convert', async () => {
    dbHandle = await openTestDatabase()
    const organic = await websiteOrganicSource(dbHandle.db)
    const lead = await createLead(dbHandle.db, {
      displayName: 'Jordan Convert',
      email: 'jordan-convert@example.com',
      ownerUserId: await ownerId(),
      sourceId: organic.id,
      intakeCompanyName: 'Convert Co',
    })
    const result = await convertLead(dbHandle.db, lead.id, await ownerId())
    expect(result.company.name).toBe('Convert Co')
    expect(result.opportunity.sourceId).toBe(organic.id)
    expect(result.opportunity.sourceLeadId).toBe(lead.id)
    expect(result.opportunity.capturedSourceId).toBe(organic.id)
  })

  it('replays public double-submit and warns staff on a genuine repeat', async () => {
    dbHandle = await openTestDatabase()
    await writePublicIntakeConfig(dbHandle.db, { enabled: true }, await ownerId())
    const first = await submitPublicIntake(dbHandle.db, {
      idempotencyKey: 'same-key-12345678',
      values: { firstName: 'Avery', lastName: 'Stone', email: 'avery@example.com' },
    })
    const replay = await submitPublicIntake(dbHandle.db, {
      idempotencyKey: 'same-key-12345678',
      values: { firstName: 'Avery', lastName: 'Stone', email: 'avery@example.com' },
    })
    expect(first.replay).toBe(false)
    expect(replay.replay).toBe(true)
    const second = await submitPublicIntake(dbHandle.db, {
      idempotencyKey: 'other-key-12345678',
      values: { firstName: 'Avery', lastName: 'Stone', email: 'avery@example.com' },
    })
    expect(second.replay).toBe(false)
    const leads = await listLeads(dbHandle.db, { search: 'Avery' })
    expect(leads).toHaveLength(2)
    expect(leads.some(row => row.possibleDuplicateLeadId != null)).toBe(true)
  })

  it('attributes untracked intake to Website / Organic and tracked intake to the link', async () => {
    dbHandle = await openTestDatabase()
    await writePublicIntakeConfig(dbHandle.db, { enabled: true }, await ownerId())
    await submitPublicIntake(dbHandle.db, {
      idempotencyKey: 'untracked-12345678',
      values: { firstName: 'Sam', lastName: 'Organic', email: 'sam-organic@example.com' },
    })
    const organic = await websiteOrganicSource(dbHandle.db)
    const untracked = (await listLeads(dbHandle.db, { search: 'Sam Organic' }))[0]!
    expect(untracked.sourceId).toBe(organic.id)
    expect(untracked.capturedTrackingLinkId).toBeNull()

    const facebook = (await listSources(dbHandle.db)).find(row => row.code === 'facebook')!
    const campaign = await createCampaign(dbHandle.db, { name: 'Ads' })
    const link = await createTrackingLink(dbHandle.db, {
      campaignId: campaign.id,
      sourceId: facebook.id,
      label: 'FB ad',
    })
    await submitPublicIntake(dbHandle.db, {
      token: link.token,
      idempotencyKey: 'tracked-12345678',
      values: { firstName: 'Riley', lastName: 'Tracked', email: 'riley-tracked@example.com' },
    })
    const tracked = (await listLeads(dbHandle.db, { search: 'Riley Tracked' }))[0]!
    expect(tracked.sourceId).toBe(facebook.id)
    expect(tracked.campaignId).toBe(campaign.id)
    expect(tracked.capturedTrackingLinkId).toBe(link.id)
  })

  it('does not create a lead when public intake is disabled or the honeypot is filled', async () => {
    dbHandle = await openTestDatabase()
    const config = await readPublicIntakeConfig(dbHandle.db)
    expect(config.enabled).toBe(false)
    await expect(submitPublicIntake(dbHandle.db, {
      idempotencyKey: 'disabled-12345678',
      values: { firstName: 'No', lastName: 'Thanks', email: 'no@example.com' },
    })).rejects.toThrow(/not accepting|unavailable/i)
    await writePublicIntakeConfig(dbHandle.db, { enabled: true }, await ownerId())
    const honey = await submitPublicIntake(dbHandle.db, {
      idempotencyKey: 'honey-12345678',
      honeypot: 'http://spam.test',
      values: { firstName: 'Bot', lastName: 'Net', email: 'bot@example.com' },
    })
    expect(honey.ignored).toBe(true)
    const bots = await listLeads(dbHandle.db, { search: 'Bot Net' })
    expect(bots).toHaveLength(0)
  })

  it('calculates MRR as quantity × monthly unit price and migrates amount cents into a line', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Line Co' })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      name: 'Legacy amount',
      amountCents: 1200000,
      ownerUserId: await ownerId(),
    })
    const lines = await listOpportunityLines(dbHandle.db, opportunity.id)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.pricingType).toBe('one_time')
    expect(lines[0]?.unitPriceCents).toBe(1200000)
    const offer = await createOffer(dbHandle.db, {
      name: 'Managed devices',
      pricingType: 'monthly',
      defaultUnitPriceCents: 5000,
    })
    await addOpportunityLine(dbHandle.db, {
      opportunityId: opportunity.id,
      offerId: offer.id,
      quantity: 10,
    })
    const refreshed = await getOpportunity(dbHandle.db, opportunity.id)
    expect(refreshed.mrrCents).toBe(50_000)
    expect(lineMrrCents('monthly', 10, 5000)).toBe(50_000)
    expect(refreshed.amountCents).toBe(1_200_000)
  })

  it('sets won_at / lost_at, promotes Prospect to Customer, and clears timestamps on Reopen', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Lifecycle Co' })
    expect(company.lifecycle).toBe('prospect')
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      name: 'Close me',
      ownerUserId: await ownerId(),
    })
    const won = await markOpportunityWon(dbHandle.db, opportunity.id)
    expect(won.wonAt).not.toBeNull()
    expect(won.lostAt).toBeNull()
    expect((await getCompany(dbHandle.db, company.id)).lifecycle).toBe('customer')
    const reopened = await reopenOpportunity(dbHandle.db, opportunity.id)
    expect(reopened.wonAt).toBeNull()
    const lost = await markOpportunityLost(dbHandle.db, opportunity.id, { lossReason: 'budget' })
    expect(lost.lostAt).not.toBeNull()
    expect((await getCompany(dbHandle.db, company.id)).lifecycle).toBe('customer')
  })

  it('reports current pipeline without a creation-date filter and Won by won_at', async () => {
    dbHandle = await openTestDatabase()
    const report = await salesDashboard(dbHandle.db, { preset: 'this_year' })
    expect(report.current.openPipelineOneTimeCents).toBeGreaterThan(0)
    expect(report.period.wonCount).toBe(0)
    expect(isPublicPath('/inquire')).toBe(true)
    expect(isPublicPath('/t/abc')).toBe(true)
    expect(isPublicPath('/api/public/intake')).toBe(true)
    expect(isPublicPath('/leads')).toBe(false)
  })
})
