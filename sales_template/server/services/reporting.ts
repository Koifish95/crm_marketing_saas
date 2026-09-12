import type { Database } from '../database'
import {
  salesActivities,
  salesCampaigns,
  salesLeads,
  salesOpportunities,
  salesSources,
  salesTrackingLinks,
} from '../database/schema'
import { activityQueueBucket } from '../../shared/utils/queue'
import { inUtcRange, reportingRange, utcNowMs } from '../../shared/utils/time'

function ms(value: Date | number | null | undefined) {
  if (value == null) {
    return null
  }
  return value instanceof Date ? value.getTime() : value
}

export async function salesDashboard(db: Database, input: {
  preset?: string
  startYmd?: string
  endYmd?: string
  nowMs?: number
} = {}) {
  const nowMs = input.nowMs ?? utcNowMs()
  const preset = input.preset || 'this_month'
  const range = reportingRange(preset, nowMs, input.startYmd, input.endYmd)
  const leads = await db.select().from(salesLeads)
  const opportunities = await db.select().from(salesOpportunities)
  const activities = await db.select().from(salesActivities)
  const sources = await db.select().from(salesSources)
  const campaigns = await db.select().from(salesCampaigns)
  const links = await db.select().from(salesTrackingLinks)

  const openOpps = opportunities.filter(row => row.stage !== 'won' && row.stage !== 'lost')
  const wonInRange = opportunities.filter(row => row.stage === 'won' && inUtcRange(row.wonAt, range.startMs, range.endMs))
  const lostInRange = opportunities.filter(row => row.stage === 'lost' && inUtcRange(row.lostAt, range.startMs, range.endMs))
  const newLeads = leads.filter(row => inUtcRange(row.createdAt, range.startMs, range.endMs))
  const newOpps = opportunities.filter(row => inUtcRange(row.createdAt, range.startMs, range.endMs))
  const convertedFromLeads = newOpps.filter(row => row.sourceLeadId != null)
  const closedCount = wonInRange.length + lostInRange.length
  const winRate = closedCount === 0 ? null : wonInRange.length / closedCount
  const leadConversion = newLeads.length === 0 ? null : convertedFromLeads.length / newLeads.length

  const leadCounts = {
    new: leads.filter(row => row.stage === 'new').length,
    contacted: leads.filter(row => row.stage === 'contacted').length,
    qualified: leads.filter(row => row.stage === 'qualified').length,
    converted: leads.filter(row => row.stage === 'converted').length,
  }

  const activityCounts = {
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    open: 0,
  }
  for (const activity of activities) {
    const bucket = activityQueueBucket({
      status: activity.status,
      dueAt: activity.dueAt,
      nowMs,
    })
    if (activity.status === 'open') {
      activityCounts.open += 1
    }
    if (bucket === 'overdue') {
      activityCounts.overdue += 1
    }
    if (bucket === 'due_today') {
      activityCounts.dueToday += 1
    }
    if (bucket === 'upcoming') {
      activityCounts.upcoming += 1
    }
  }

  function sourcePerformance(sourceId: number | null, name: string) {
    const sourceLeads = leads.filter(row => (sourceId == null ? row.sourceId == null : row.sourceId === sourceId))
    const sourceOpps = opportunities.filter(row => (sourceId == null ? row.sourceId == null : row.sourceId === sourceId))
    const sourceWon = sourceOpps.filter(row => row.stage === 'won' && inUtcRange(row.wonAt, range.startMs, range.endMs))
    const sourceLost = sourceOpps.filter(row => row.stage === 'lost' && inUtcRange(row.lostAt, range.startMs, range.endMs))
    const sourceOpen = sourceOpps.filter(row => row.stage !== 'won' && row.stage !== 'lost')
    return {
      id: sourceId,
      name,
      leads: sourceLeads.length,
      newLeads: sourceLeads.filter(row => inUtcRange(row.createdAt, range.startMs, range.endMs)).length,
      opportunities: sourceOpps.length,
      openOneTimeCents: sourceOpen.reduce((sum, row) => sum + (row.amountCents ?? 0), 0),
      openMrrCents: sourceOpen.reduce((sum, row) => sum + (row.mrrCents ?? 0), 0),
      wonCount: sourceWon.length,
      lostCount: sourceLost.length,
      wonOneTimeCents: sourceWon.reduce((sum, row) => sum + (row.amountCents ?? 0), 0),
      wonMrrCents: sourceWon.reduce((sum, row) => sum + (row.mrrCents ?? 0), 0),
    }
  }

  function campaignPerformance(campaignId: number, name: string, budgetCents: number | null) {
    const campaignLeads = leads.filter(row => row.campaignId === campaignId)
    const campaignOpps = opportunities.filter(row => row.campaignId === campaignId)
    const campaignWon = campaignOpps.filter(row => row.stage === 'won' && inUtcRange(row.wonAt, range.startMs, range.endMs))
    const campaignLost = campaignOpps.filter(row => row.stage === 'lost' && inUtcRange(row.lostAt, range.startMs, range.endMs))
    const campaignOpen = campaignOpps.filter(row => row.stage !== 'won' && row.stage !== 'lost')
    const campaignLinks = links.filter(row => row.campaignId === campaignId)
    const clicks = campaignLinks.reduce((sum, row) => sum + row.clickCount, 0)
    const trackedLeads = campaignLeads.filter(row => row.capturedTrackingLinkId != null).length
    return {
      id: campaignId,
      name,
      budgetCents,
      clicks,
      leads: campaignLeads.length,
      clickToLead: clicks === 0 ? null : trackedLeads / clicks,
      opportunities: campaignOpps.length,
      openOneTimeCents: campaignOpen.reduce((sum, row) => sum + (row.amountCents ?? 0), 0),
      openMrrCents: campaignOpen.reduce((sum, row) => sum + (row.mrrCents ?? 0), 0),
      wonCount: campaignWon.length,
      lostCount: campaignLost.length,
      wonOneTimeCents: campaignWon.reduce((sum, row) => sum + (row.amountCents ?? 0), 0),
      wonMrrCents: campaignWon.reduce((sum, row) => sum + (row.mrrCents ?? 0), 0),
    }
  }

  const tracking = links.map((link) => {
    const linkedLeads = leads.filter(row => row.capturedTrackingLinkId === link.id)
    return {
      id: link.id,
      label: link.label,
      campaignId: link.campaignId,
      sourceId: link.sourceId,
      active: link.active,
      clicks: link.clickCount,
      leads: linkedLeads.length,
      clickToLead: link.clickCount === 0 ? null : linkedLeads.length / link.clickCount,
    }
  })

  return {
    range: {
      preset,
      startMs: range.startMs,
      endMs: range.endMs,
    },
    current: {
      openOpportunityCount: openOpps.length,
      openPipelineOneTimeCents: openOpps.reduce((sum, row) => sum + (row.amountCents ?? 0), 0),
      openPipelineMrrCents: openOpps.reduce((sum, row) => sum + (row.mrrCents ?? 0), 0),
      leadsByStage: leadCounts,
      activities: activityCounts,
    },
    period: {
      newLeads: newLeads.length,
      newOpportunities: newOpps.length,
      wonCount: wonInRange.length,
      lostCount: lostInRange.length,
      wonOneTimeCents: wonInRange.reduce((sum, row) => sum + (row.amountCents ?? 0), 0),
      wonMrrCents: wonInRange.reduce((sum, row) => sum + (row.mrrCents ?? 0), 0),
      winRate,
      leadToOpportunity: leadConversion,
    },
    sources: [
      ...sources.map(source => sourcePerformance(source.id, source.name)),
      sourcePerformance(null, 'Unattributed'),
    ],
    campaigns: campaigns.map(campaign => campaignPerformance(campaign.id, campaign.name, campaign.budgetCents)),
    trackingLinks: tracking,
  }
}

export { ms }
