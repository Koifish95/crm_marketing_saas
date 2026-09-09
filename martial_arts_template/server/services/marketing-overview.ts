import { desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import {
  campaignMetaMaps,
  campaigns,
  contentItems,
  contentPublications,
  conversions,
  leadLines,
  leads,
  metaCampaigns,
  metaDailyMetrics,
  trials,
} from '../database/schema'
import { addCalendarDays, denverYmd, utcNowMs } from '../../shared/utils/time'
import { listMarketingTasks } from './marketing-tasks'
import { DomainError } from './errors'

const AREAS = [
  { to: '/marketing/campaigns', title: 'Campaigns', description: 'Marketing Campaign planning and tracking links.' },
  { to: '/marketing/tasks', title: 'Tasks', description: 'Marketing work queue. Separate from Lead Follow-up.' },
  { to: '/marketing/content', title: 'Content', description: 'Content planning, approval, and publication history.' },
  { to: '/marketing/assets', title: 'Assets', description: 'Asset library and marketing-use status.' },
  { to: '/marketing/events', title: 'Events', description: 'Acquisition Events, sessions, and registrations.' },
  { to: '/marketing/compensation', title: 'Compensation', description: 'Compensation Attribution ledger. Not accounting.' },
]

function inHorizon(utcMs: number, today: string, until: string) {
  const day = denverYmd(utcMs)
  return day >= today && day <= until
}

const PERFORMANCE_NOTES = {
  meta: 'Meta-reported numbers come from stored Marketing API metrics for explicitly mapped campaigns. Names are never matched automatically.',
  crm: 'Internal CRM outcomes are household, registration, and Trial counts in this app.',
  attributed: 'Deterministically attributed outcomes use the LeadHeader campaign captured at acquisition. Funnel people are unique LeadLines.',
}

type OutcomeCampaign = { id: number, name: string, budgetCents: number | null }
type OutcomeContext = {
  maps: Array<{ campaignId: number, metaCampaignId: number }>
  metrics: Array<{ entityType: string, entityExternalId: string, spendCents: number }>
  storedMeta: Array<{ id: number, externalId: string, name: string }>
  headerRows: Array<{ id: number, campaignId: number | null }>
  lineRows: Array<{ id: number, leadId: number, status: string }>
  trialRows: Array<{ id: number, leadLineId: number | null, status: string }>
  conversionRows: Array<{ id: number, leadLineId: number, reversedAt: Date | null, monthlyCents: number }>
  eventRows: Array<{ campaignId: number | null, registrations: Array<{ id: number }> }>
}

function campaignOutcome(campaign: OutcomeCampaign, ctx: OutcomeContext) {
  const mappedMeta = ctx.storedMeta.filter(meta => ctx.maps.some(map => map.campaignId === campaign.id && map.metaCampaignId === meta.id))
  const externals = mappedMeta.map(row => row.externalId)
  const metaSpendCents = ctx.metrics
    .filter(row => row.entityType === 'CAMPAIGN' && externals.includes(row.entityExternalId))
    .reduce((sum, row) => sum + row.spendCents, 0)
  const householdIds = new Set(ctx.headerRows.filter(lead => lead.campaignId === campaign.id).map(lead => lead.id))
  const people = ctx.lineRows.filter(line => householdIds.has(line.leadId))
  const personIds = new Set(people.map(line => line.id))
  const trialsScheduled = people.filter(line => ctx.trialRows.some(trial => trial.leadLineId === line.id)).length
  const trialsAttended = people.filter(line => ctx.trialRows.some(trial => trial.leadLineId === line.id && trial.status === 'ATTENDED')).length
  const joined = people.filter(line => ctx.conversionRows.some(row => row.leadLineId === line.id && !row.reversedAt)).length
  const mrr = ctx.conversionRows
    .filter(row => personIds.has(row.leadLineId) && !row.reversedAt)
    .reduce((sum, row) => sum + row.monthlyCents, 0)
  const eventRegistrationCount = ctx.eventRows
    .filter(event => event.campaignId === campaign.id)
    .reduce((sum, event) => sum + event.registrations.length, 0)
  return {
    id: campaign.id,
    name: campaign.name,
    plannedBudgetCents: campaign.budgetCents,
    plannedBudgetSource: 'internal_crm' as const,
    metaSpendCents,
    metaSpendSource: 'meta_reported' as const,
    mapped: mappedMeta.length > 0,
    mappedMetaCampaigns: mappedMeta.map(row => ({
      id: row.id,
      name: row.name,
      externalId: row.externalId,
    })),
    attributed: {
      source: 'deterministically_attributed' as const,
      households: householdIds.size,
      prospectiveMembers: people.length,
      trialsScheduled,
      trialsAttended,
      joined,
      acquiredMrrCents: mrr,
    },
    eventRegistrationCount,
    eventRegistrationSource: 'internal_crm' as const,
  }
}

async function loadOutcomeContext(db: Database): Promise<OutcomeContext> {
  const [maps, metrics, storedMeta, headerRows, lineRows, trialRows, conversionRows, eventRows] = await Promise.all([
    db.select().from(campaignMetaMaps),
    db.select().from(metaDailyMetrics),
    db.select({ id: metaCampaigns.id, externalId: metaCampaigns.externalId, name: metaCampaigns.name }).from(metaCampaigns),
    db.select({ id: leads.id, campaignId: leads.campaignId }).from(leads),
    db.select({ id: leadLines.id, leadId: leadLines.leadId, status: leadLines.status }).from(leadLines),
    db.select({ id: trials.id, leadLineId: trials.leadLineId, status: trials.status }).from(trials),
    db.select({
      id: conversions.id,
      leadLineId: conversions.leadLineId,
      reversedAt: conversions.reversedAt,
      monthlyCents: conversions.monthlyCents,
    }).from(conversions),
    db.query.acquisitionEvents.findMany({
      columns: { campaignId: true },
      with: { registrations: { columns: { id: true } } },
    }),
  ])
  return { maps, metrics, storedMeta, headerRows, lineRows, trialRows, conversionRows, eventRows }
}

export async function getCampaignPerformance(db: Database, campaignId: number) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1)
  if (!campaign) {
    throw new DomainError('Campaign not found.', 404)
  }
  const ctx = await loadOutcomeContext(db)
  return {
    ...campaignOutcome(campaign, ctx),
    notes: PERFORMANCE_NOTES,
  }
}

export async function getMarketingOverview(db: Database, nowMs = utcNowMs()) {
  const today = denverYmd(nowMs)
  const until = addCalendarDays(today, 14)

  const [campaignRows, taskRows, contentRows, publicationRows, eventRows, maps, metrics, storedMeta, headerRows, lineRows, trialRows, conversionRows] = await Promise.all([
    db.select().from(campaigns),
    listMarketingTasks(db, 'all', nowMs),
    db.select().from(contentItems),
    db.select().from(contentPublications).orderBy(desc(contentPublications.publishedAt)),
    db.query.acquisitionEvents.findMany({
      with: {
        sessions: true,
        registrations: { with: { lines: true } },
      },
    }),
    db.select().from(campaignMetaMaps),
    db.select().from(metaDailyMetrics),
    db.select({ id: metaCampaigns.id, externalId: metaCampaigns.externalId, name: metaCampaigns.name }).from(metaCampaigns),
    db.select({ id: leads.id, campaignId: leads.campaignId }).from(leads),
    db.select({ id: leadLines.id, leadId: leadLines.leadId, status: leadLines.status }).from(leadLines),
    db.select({ id: trials.id, leadLineId: trials.leadLineId, status: trials.status }).from(trials),
    db.select({
      id: conversions.id,
      leadLineId: conversions.leadLineId,
      reversedAt: conversions.reversedAt,
      monthlyCents: conversions.monthlyCents,
    }).from(conversions),
  ])

  const activeCampaigns = campaignRows.filter(row => row.status === 'ACTIVE')
  const approachingCampaigns = campaignRows.filter((row) => {
    if (row.status === 'CANCELLED' || row.status === 'COMPLETED') {
      return false
    }
    const start = row.startsAt ? inHorizon(row.startsAt.getTime(), today, until) : false
    const end = row.endsAt ? inHorizon(row.endsAt.getTime(), today, until) : false
    return start || end
  })

  const overdueTasks = taskRows.filter(row => row.status === 'PENDING' && row.dueState === 'OVERDUE')
  const dueTodayTasks = taskRows.filter(row => row.status === 'PENDING' && row.dueState === 'DUE_TODAY')
  const upcomingTasks = taskRows.filter(row => row.status === 'PENDING' && row.dueState === 'UPCOMING')
  const assetRequests = taskRows.filter(row => row.status === 'PENDING' && row.type === 'ASSET_REQUEST')

  const upcomingEvents = eventRows.filter((event) => {
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      return false
    }
    return event.sessions.some(session => denverYmd(session.startsAt.getTime()) >= today)
  })

  const campaignOutcomes = activeCampaigns.map(campaign => campaignOutcome(campaign, {
    maps,
    metrics,
    storedMeta,
    headerRows,
    lineRows,
    trialRows,
    conversionRows,
    eventRows,
  }))

  return {
    ready: true,
    generatedAt: new Date(nowMs).toISOString(),
    notes: PERFORMANCE_NOTES,
    areas: AREAS,
    activeCampaigns: activeCampaigns.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      budgetCents: row.budgetCents,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    })),
    approachingCampaigns: approachingCampaigns.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    })),
    tasks: {
      overdue: overdueTasks.length,
      dueToday: dueTodayTasks.length,
      upcoming: upcomingTasks.length,
      assetRequests: assetRequests.length,
    },
    content: {
      needingAssets: contentRows.filter(row => row.status === 'NEEDS_ASSETS').length,
      needingReview: contentRows.filter(row => row.status === 'NEEDS_REVIEW').length,
      readyToPublish: contentRows.filter(row => row.status === 'READY_TO_PUBLISH').length,
      upcomingPublications: contentRows
        .filter(row => row.plannedPublishAt && inHorizon(row.plannedPublishAt.getTime(), today, until) && row.status !== 'PUBLISHED' && row.status !== 'CANCELLED')
        .map(row => ({ id: row.id, title: row.title, plannedPublishAt: row.plannedPublishAt })),
      recentPublications: publicationRows.slice(0, 8).map(row => ({
        id: row.id,
        channel: row.channel,
        publishedAt: row.publishedAt,
        publicUrl: row.publicUrl,
      })),
    },
    events: upcomingEvents.map(event => ({
      id: event.id,
      title: event.title,
      status: event.status,
      registrationCount: event.registrations.length,
      participantCount: event.registrations.reduce((sum, registration) => sum + registration.lines.length, 0),
    })),
    campaignOutcomes,
  }
}
