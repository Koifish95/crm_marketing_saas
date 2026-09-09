import type { Database } from '../database'
import {
  campaigns,
  conversions,
  followUpTasks,
  leadLineLostOutcomes,
  leadLines,
  leads,
  lostReasons,
  membershipOfferings,
  programs,
  trials,
  users,
} from '../database/schema'
import { followUpDashboard } from './follow-up'
import { denverYmd, utcNowMs } from '../../shared/utils/time'
import type { ReportExportKind, ReportFilters } from '../../shared/schemas/report'
import { DomainError } from './errors'
import { metaPerformanceReport } from './meta'

/**
 * Reporting formulas (America/Denver calendar dates, inclusive):
 *
 * Households = unique LeadHeaders whose createdAt falls in the range.
 * Prospective members = unique LeadLines whose createdAt falls in the range.
 * Trial scheduled = unique cohort lines with at least one Trial row.
 * Trial attended = unique cohort lines with at least one ATTENDED Trial.
 * Converted (funnel) = unique cohort lines with an active (not reversed) Conversion.
 * Period conversions / MRR = Conversions whose joinedAt falls in the range.
 * Reschedules do not add people: funnel denominators are unique LeadLine ids.
 */
export const REPORT_FORMULAS = {
  households: 'LeadHeaders created in the Denver date range.',
  prospectiveMembers: 'Unique LeadLines created in the range. Reschedules do not add people.',
  trialScheduled: 'Unique cohort LeadLines with at least one Trial row of any status.',
  trialAttended: 'Unique cohort LeadLines with at least one ATTENDED Trial.',
  converted: 'Unique cohort LeadLines with an active Conversion (reversedAt is null).',
  lineToTrialRate: 'trialScheduled / prospectiveMembers',
  scheduledToAttendedRate: 'trialAttended / trialScheduled',
  attendedToJoinedRate: 'converted / trialAttended',
  lineToJoinedRate: 'converted / prospectiveMembers',
  periodMrr: 'Conversion Snapshot MRR: sum of conversion.monthlyCents for active conversions with joinedAt in range. Not pipeline Forecast MRR and not cash collected.',
  periodEnrollment: 'Sum of conversion.enrollmentCents for those same conversions.',
  money: 'Snapshot integer USD cents. Not cash collected.',
  timeToFirstTrial: 'LeadHeader.createdAt to earliest Trial.scheduledAt, household clock.',
  timeToConversion: 'LeadHeader.createdAt to Conversion.joinedAt, household clock.',
  attendedToConversion: 'Earliest ATTENDED Trial.updatedAt for the line to Conversion.joinedAt.',
} as const

function inRange(utcMs: number, fromYmd: string, toYmd: string) {
  const day = denverYmd(utcMs)
  return day >= fromYmd && day <= toYmd
}

function rate(numerator: number, denominator: number) {
  if (!denominator) {
    return 0
  }
  return Math.round((numerator / denominator) * 1000) / 1000
}

function median(values: number[]) {
  if (!values.length) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2) {
    return sorted[mid]!
  }
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

function msToDays(ms: number) {
  return Math.round((ms / 86_400_000) * 10) / 10
}

function bump(
  map: Map<string, Record<string, number | string | null>>,
  key: string,
  seed: Record<string, number | string | null>,
  fields: Record<string, number>,
) {
  const current = map.get(key) ?? { ...seed }
  for (const [field, amount] of Object.entries(fields)) {
    current[field] = Number(current[field] ?? 0) + amount
  }
  map.set(key, current)
}

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) {
    return ''
  }
  const headers = Object.keys(rows[0]!)
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value)
    if (/[",\n]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`
    }
    return text
  }
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => escape(row[header])).join(',')),
  ].join('\n')
}

export function currentMonthReportFilters(nowMs = utcNowMs()): ReportFilters {
  const ymd = denverYmd(nowMs)
  const fromYmd = `${ymd.slice(0, 7)}-01`
  const [year, month] = fromYmd.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate()
  return {
    fromYmd,
    toYmd: `${ymd.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`,
  }
}

function headerMatches(lead: { source: string | null, campaignId: number | null }, filters: ReportFilters) {
  if (filters.source && lead.source !== filters.source) {
    return false
  }
  if (filters.campaignId && lead.campaignId !== filters.campaignId) {
    return false
  }
  return true
}

export async function acquisitionReport(db: Database, filters: ReportFilters) {
  const [headerRows, lineRows, trialRows, conversionRows, lostRows, lostReasonRows, programRows, campaignRows, offeringRows, taskRows, userRows] = await Promise.all([
    db.select().from(leads),
    db.select().from(leadLines),
    db.select().from(trials),
    db.select().from(conversions),
    db.select().from(leadLineLostOutcomes),
    db.select().from(lostReasons),
    db.select().from(programs),
    db.select().from(campaigns),
    db.select().from(membershipOfferings),
    db.select().from(followUpTasks),
    db.select().from(users),
  ])

  const headerById = new Map(headerRows.map(row => [row.id, row]))
  const programById = new Map(programRows.map(row => [row.id, row]))
  const campaignById = new Map(campaignRows.map(row => [row.id, row]))
  const offeringById = new Map(offeringRows.map(row => [row.id, row]))
  const reasonById = new Map(lostReasonRows.map(row => [row.id, row]))
  const userById = new Map(userRows.map(row => [row.id, row]))

  const households = headerRows.filter((lead) => {
    return inRange(lead.createdAt.getTime(), filters.fromYmd, filters.toYmd) && headerMatches(lead, filters)
  })

  const cohortLines = lineRows.filter((line) => {
    if (!inRange(line.createdAt.getTime(), filters.fromYmd, filters.toYmd)) {
      return false
    }
    if (filters.programId && line.programId !== filters.programId) {
      return false
    }
    const header = headerById.get(line.leadId)
    if (!header || !headerMatches(header, filters)) {
      return false
    }
    return true
  })
  const cohortLineIds = new Set(cohortLines.map(line => line.id))

  const trialsByLine = new Map<number, typeof trialRows>()
  let noShowCount = 0
  let cancelledCount = 0
  for (const trial of trialRows) {
    if (!trial.leadLineId || !cohortLineIds.has(trial.leadLineId)) {
      continue
    }
    const group = trialsByLine.get(trial.leadLineId) ?? []
    group.push(trial)
    trialsByLine.set(trial.leadLineId, group)
    if (trial.status === 'NO_SHOW') {
      noShowCount += 1
    }
    if (trial.status === 'CANCELLED') {
      cancelledCount += 1
    }
  }

  const scheduledLineIds = new Set<number>()
  const attendedLineIds = new Set<number>()
  let linesWithMultipleTrials = 0
  for (const [lineId, group] of trialsByLine) {
    scheduledLineIds.add(lineId)
    if (group.some(trial => trial.status === 'ATTENDED')) {
      attendedLineIds.add(lineId)
    }
    if (group.length > 1) {
      linesWithMultipleTrials += 1
    }
  }

  const activeConversions = conversionRows.filter(row => !row.reversedAt)
  const convertedLineIds = new Set(
    activeConversions.filter(row => cohortLineIds.has(row.leadLineId)).map(row => row.leadLineId),
  )

  const periodConversions = activeConversions.filter((row) => {
    if (!inRange(row.joinedAt.getTime(), filters.fromYmd, filters.toYmd)) {
      return false
    }
    if (filters.programId && row.programId !== filters.programId) {
      return false
    }
    const header = headerById.get(row.leadId)
    if (!header || !headerMatches(header, filters)) {
      return false
    }
    return true
  })

  const lostInRange = lostRows.filter((row) => {
    if (!inRange(row.createdAt.getTime(), filters.fromYmd, filters.toYmd)) {
      return false
    }
    const line = lineRows.find(item => item.id === row.leadLineId)
    if (!line) {
      return false
    }
    if (filters.programId && line.programId !== filters.programId) {
      return false
    }
    const header = headerById.get(line.leadId)
    return Boolean(header && headerMatches(header, filters))
  })

  const prospectiveMembers = cohortLines.length
  const trialScheduled = scheduledLineIds.size
  const trialAttended = attendedLineIds.size
  const converted = convertedLineIds.size
  const newMrrCents = periodConversions.reduce((sum, row) => sum + row.monthlyCents, 0)
  const enrollmentCents = periodConversions.reduce((sum, row) => sum + row.enrollmentCents, 0)
  const overrideConversions = periodConversions.filter(row => row.overridden)
  const overrideMrrCents = overrideConversions.reduce((sum, row) => sum + row.monthlyCents, 0)

  const bySource = new Map<string, Record<string, number | string | null>>()
  const byProgram = new Map<string, Record<string, number | string | null>>()
  const byCampaign = new Map<string, Record<string, number | string | null>>()
  const byOffering = new Map<string, Record<string, number | string | null>>()
  const byLostReason = new Map<string, Record<string, number | string | null>>()

  for (const lead of households) {
    const sourceKey = lead.source || 'unattributed'
    bump(bySource, sourceKey, { key: sourceKey, label: sourceKey, households: 0, prospectiveMembers: 0, converted: 0, newMrrCents: 0 }, { households: 1 })
    const campaignKey = lead.campaignId == null ? 'unattributed' : String(lead.campaignId)
    bump(byCampaign, campaignKey, {
      key: campaignKey,
      label: lead.campaignId == null ? 'unattributed' : (campaignById.get(lead.campaignId)?.name ?? `Campaign ${lead.campaignId}`),
      campaignId: lead.campaignId,
      households: 0,
      prospectiveMembers: 0,
      converted: 0,
      newMrrCents: 0,
    }, { households: 1 })
  }

  for (const line of cohortLines) {
    const header = headerById.get(line.leadId)
    const sourceKey = header?.source || 'unattributed'
    bump(bySource, sourceKey, { key: sourceKey, label: sourceKey, households: 0, prospectiveMembers: 0, converted: 0, newMrrCents: 0 }, { prospectiveMembers: 1 })
    const programKey = String(line.programId)
    bump(byProgram, programKey, {
      key: programKey,
      programId: line.programId,
      label: programById.get(line.programId)?.name ?? `Program ${line.programId}`,
      prospectiveMembers: 0,
      converted: 0,
      newMrrCents: 0,
    }, { prospectiveMembers: 1 })
    const campaignKey = header?.campaignId == null ? 'unattributed' : String(header.campaignId)
    bump(byCampaign, campaignKey, {
      key: campaignKey,
      label: header?.campaignId == null ? 'unattributed' : (campaignById.get(header.campaignId)?.name ?? `Campaign ${header.campaignId}`),
      campaignId: header?.campaignId ?? null,
      households: 0,
      prospectiveMembers: 0,
      converted: 0,
      newMrrCents: 0,
    }, { prospectiveMembers: 1 })
    if (convertedLineIds.has(line.id)) {
      bump(bySource, sourceKey, { key: sourceKey, label: sourceKey, households: 0, prospectiveMembers: 0, converted: 0, newMrrCents: 0 }, { converted: 1 })
      bump(byProgram, programKey, {
        key: programKey,
        programId: line.programId,
        label: programById.get(line.programId)?.name ?? `Program ${line.programId}`,
        prospectiveMembers: 0,
        converted: 0,
        newMrrCents: 0,
      }, { converted: 1 })
      bump(byCampaign, campaignKey, {
        key: campaignKey,
        label: header?.campaignId == null ? 'unattributed' : (campaignById.get(header.campaignId)?.name ?? `Campaign ${header.campaignId}`),
        campaignId: header?.campaignId ?? null,
        households: 0,
        prospectiveMembers: 0,
        converted: 0,
        newMrrCents: 0,
      }, { converted: 1 })
    }
  }

  for (const row of periodConversions) {
    const header = headerById.get(row.leadId)
    const sourceKey = header?.source || 'unattributed'
    bump(bySource, sourceKey, { key: sourceKey, label: sourceKey, households: 0, prospectiveMembers: 0, converted: 0, newMrrCents: 0 }, { newMrrCents: row.monthlyCents })
    const programKey = String(row.programId)
    bump(byProgram, programKey, {
      key: programKey,
      programId: row.programId,
      label: programById.get(row.programId)?.name ?? `Program ${row.programId}`,
      prospectiveMembers: 0,
      converted: 0,
      newMrrCents: 0,
    }, { newMrrCents: row.monthlyCents })
    const campaignKey = header?.campaignId == null ? 'unattributed' : String(header.campaignId)
    bump(byCampaign, campaignKey, {
      key: campaignKey,
      label: header?.campaignId == null ? 'unattributed' : (campaignById.get(header.campaignId)?.name ?? `Campaign ${header.campaignId}`),
      campaignId: header?.campaignId ?? null,
      households: 0,
      prospectiveMembers: 0,
      converted: 0,
      newMrrCents: 0,
    }, { newMrrCents: row.monthlyCents })
    const offeringKey = row.membershipOfferingId == null ? 'unattributed' : String(row.membershipOfferingId)
    bump(byOffering, offeringKey, {
      key: offeringKey,
      offeringId: row.membershipOfferingId,
      label: row.offeringName || offeringById.get(row.membershipOfferingId ?? -1)?.name || 'unattributed',
      conversions: 0,
      newMrrCents: 0,
      enrollmentCents: 0,
    }, { conversions: 1, newMrrCents: row.monthlyCents, enrollmentCents: row.enrollmentCents })
  }

  for (const row of lostInRange) {
    const reason = reasonById.get(row.lostReasonId)
    const key = String(row.lostReasonId)
    bump(byLostReason, key, {
      key,
      lostReasonId: row.lostReasonId,
      label: reason?.name ?? 'unattributed',
      count: 0,
      reopened: 0,
    }, { count: 1, reopened: row.reopenedAt ? 1 : 0 })
  }

  const firstTrialMs: number[] = []
  const headerToConversionMs: number[] = []
  const attendedToConversionMs: number[] = []
  for (const row of periodConversions) {
    const header = headerById.get(row.leadId)
    if (header) {
      headerToConversionMs.push(row.joinedAt.getTime() - header.createdAt.getTime())
    }
    const lineTrials = trialRows.filter(trial => trial.leadLineId === row.leadLineId)
    const firstTrial = [...lineTrials].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]
    if (header && firstTrial) {
      firstTrialMs.push(firstTrial.scheduledAt.getTime() - header.createdAt.getTime())
    }
    const firstAttended = [...lineTrials.filter(trial => trial.status === 'ATTENDED')]
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())[0]
    if (firstAttended) {
      attendedToConversionMs.push(row.joinedAt.getTime() - firstAttended.updatedAt.getTime())
    }
  }

  const followUpNow = utcNowMs()
  const queue = await followUpDashboard(db, followUpNow)
  const tasksInRange = taskRows.filter(task => inRange(task.createdAt.getTime(), filters.fromYmd, filters.toYmd))
  const completedInRange = taskRows.filter(task => task.completedAt && inRange(task.completedAt.getTime(), filters.fromYmd, filters.toYmd))
  const byStaff = new Map<string, Record<string, number | string | null>>()
  const byOutcome = new Map<string, Record<string, number | string | null>>()
  for (const task of completedInRange) {
    const staffKey = task.completedByUserId == null ? 'unattributed' : String(task.completedByUserId)
    bump(byStaff, staffKey, {
      key: staffKey,
      userId: task.completedByUserId,
      label: task.completedByUserId == null ? 'unattributed' : (userById.get(task.completedByUserId)?.displayName ?? `User ${task.completedByUserId}`),
      completed: 0,
    }, { completed: 1 })
    const outcomeKey = task.outcome || 'unattributed'
    bump(byOutcome, outcomeKey, { key: outcomeKey, label: outcomeKey, count: 0 }, { count: 1 })
  }

  const createdCompleted = tasksInRange.filter(task => task.status === 'COMPLETED').length
  const createdClosed = tasksInRange.filter(task => task.status === 'COMPLETED' || task.status === 'CANCELLED').length

  return {
    filters,
    formulas: REPORT_FORMULAS,
    households: households.length,
    prospectiveMembers,
    funnel: {
      prospectiveMembers,
      trialScheduled,
      trialAttended,
      converted,
      lineToTrialRate: rate(trialScheduled, prospectiveMembers),
      scheduledToAttendedRate: rate(trialAttended, trialScheduled),
      attendedToJoinedRate: rate(converted, trialAttended),
      lineToJoinedRate: rate(converted, prospectiveMembers),
    },
    trialActivity: {
      noShowCount,
      cancelledCount,
      linesWithMultipleTrials,
    },
    conversions: {
      count: periodConversions.length,
      funnelConverted: converted,
      newMrrCents,
      enrollmentCents,
      averageMrrCents: periodConversions.length ? Math.round(newMrrCents / periodConversions.length) : 0,
      overriddenCount: overrideConversions.length,
      overrideMrrCents,
    },
    lost: {
      count: lostInRange.length,
      reopened: lostInRange.filter(row => row.reopenedAt).length,
      rate: rate(lostInRange.length, prospectiveMembers),
      byReason: [...byLostReason.values()],
    },
    followUp: {
      overdueOpen: queue.overdue,
      createdInRange: tasksInRange.length,
      completedInRange: completedInRange.length,
      completionRate: rate(createdCompleted, createdClosed),
      byStaff: [...byStaff.values()],
      byOutcome: [...byOutcome.values()],
    },
    timing: {
      medianDaysInquiryToFirstTrial: median(firstTrialMs.map(msToDays)),
      medianDaysInquiryToConversion: median(headerToConversionMs.map(msToDays)),
      medianDaysAttendedToConversion: median(attendedToConversionMs.map(msToDays)),
      clocks: 'Household createdAt for inquiry. Line Trial.scheduledAt / updatedAt and Conversion.joinedAt for later events.',
    },
    groupings: {
      bySource: [...bySource.values()],
      byProgram: [...byProgram.values()],
      byCampaign: [...byCampaign.values()],
      byOffering: [...byOffering.values()],
    },
  }
}

export type AcquisitionReport = Awaited<ReturnType<typeof acquisitionReport>>

function stripCents<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripCents(item)) as T
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key.endsWith('Cents') || key === 'periodMrr' || key === 'periodEnrollment' || key === 'money') {
        continue
      }
      output[key] = stripCents(nested)
    }
    return output as T
  }
  return value
}

export function presentAcquisitionReport(report: AcquisitionReport, includeFinancial: boolean) {
  if (includeFinancial) {
    return { ...report, includeFinancial: true as const }
  }
  const stripped = stripCents(report)
  return { ...stripped, includeFinancial: false as const }
}

export async function reportCsv(
  db: Database,
  filters: ReportFilters,
  kind: ReportExportKind,
  includeFinancial: boolean,
) {
  const [headerRows, lineRows, conversionRows, campaignRows, programRows] = await Promise.all([
    db.select().from(leads),
    db.select().from(leadLines),
    db.select().from(conversions),
    db.select().from(campaigns),
    db.select().from(programs),
  ])
  const headerById = new Map(headerRows.map(row => [row.id, row]))
  const programById = new Map(programRows.map(row => [row.id, row]))
  const campaignById = new Map(campaignRows.map(row => [row.id, row]))

  if (kind === 'leads') {
    const rows = lineRows.filter((line) => {
      if (!inRange(line.createdAt.getTime(), filters.fromYmd, filters.toYmd)) {
        return false
      }
      if (filters.programId && line.programId !== filters.programId) {
        return false
      }
      const header = headerById.get(line.leadId)
      if (!header || !headerMatches(header, filters)) {
        return false
      }
      return true
    }).map((line) => {
      const header = headerById.get(line.leadId)!
      return {
        householdId: header.id,
        householdName: `${header.firstName} ${header.lastName ?? ''}`.trim(),
        source: header.source || 'unattributed',
        campaign: header.campaignId == null ? 'unattributed' : (campaignById.get(header.campaignId)?.name ?? header.campaignId),
        leadLineId: line.id,
        person: `${line.firstName} ${line.lastName ?? ''}`.trim(),
        relationship: line.relationship,
        program: programById.get(line.programId)?.name ?? line.programId,
        status: line.status,
        createdYmd: denverYmd(line.createdAt.getTime()),
      }
    })
    return toCsv(rows)
  }

  if (kind === 'conversions') {
    const rows = conversionRows.filter((row) => {
      if (row.reversedAt) {
        return false
      }
      if (!inRange(row.joinedAt.getTime(), filters.fromYmd, filters.toYmd)) {
        return false
      }
      if (filters.programId && row.programId !== filters.programId) {
        return false
      }
      const header = headerById.get(row.leadId)
      if (!header || !headerMatches(header, filters)) {
        return false
      }
      return true
    }).map((row) => {
      const header = headerById.get(row.leadId)
      const line = lineRows.find(item => item.id === row.leadLineId)
      const base: Record<string, string | number | null> = {
        conversionId: row.id,
        householdId: row.leadId,
        leadLineId: row.leadLineId,
        person: line ? `${line.firstName} ${line.lastName ?? ''}`.trim() : '',
        source: header?.source || 'unattributed',
        campaign: header?.campaignId == null ? 'unattributed' : (campaignById.get(header.campaignId)?.name ?? header.campaignId),
        program: programById.get(row.programId)?.name ?? row.programId,
        offeringName: row.offeringName || 'unattributed',
        joinedYmd: denverYmd(row.joinedAt.getTime()),
        overridden: row.overridden ? 'yes' : 'no',
      }
      if (includeFinancial) {
        base.monthlyCents = row.monthlyCents
        base.enrollmentCents = row.enrollmentCents
      }
      return base
    })
    return toCsv(rows)
  }

  if (kind === 'meta') {
    if (!includeFinancial) {
      throw new DomainError('Only an admin can export Meta performance.', 403)
    }
    const meta = await metaPerformanceReport(db, filters)
    return toCsv(meta.campaigns.map(row => ({
      metaCampaign: row.name,
      externalId: row.externalId,
      status: row.status ?? '',
      mappedInternal: row.mapped.map(item => item.name).join('; ') || 'unmapped',
      spendCents: row.metaReported.spendCents,
      impressions: row.metaReported.impressions,
      clicks: row.metaReported.clicks,
      metaLeads: row.metaReported.leadsCount,
      households: row.internalMapped.households,
      conversions: row.internalMapped.conversions,
      newMrrCents: row.internalMapped.newMrrCents,
    })))
  }

  const report = await acquisitionReport(db, filters)
  const presented = presentAcquisitionReport(report, includeFinancial)
  const rows = presented.groupings.byCampaign.map((row) => {
    const base: Record<string, string | number | null> = {
      campaign: String(row.label ?? 'unattributed'),
      households: Number(row.households ?? 0),
      prospectiveMembers: Number(row.prospectiveMembers ?? 0),
      converted: Number(row.converted ?? 0),
    }
    if (includeFinancial && 'newMrrCents' in row) {
      base.newMrrCents = Number(row.newMrrCents ?? 0)
    }
    return base
  })
  return toCsv(rows)
}
