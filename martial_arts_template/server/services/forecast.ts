import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { householdPricingRules, leadLines, leads } from '../database/schema'
import { DomainError } from './errors'
import { isTerminalLineStatus } from './lead-lines'

export interface LineForecast {
  leadLineId: number
  firstName: string
  programId: number
  offeringId: number | null
  standardMonthlyCents: number | null
  forecastMonthlyCents: number
  enrollmentCents: number
  overridden: boolean
  discountReason: string | null
  includedInForecast: boolean
}

function emptyLineForecast(
  line: { id: number, firstName: string, programId: number, discountReason: string | null },
  includedInForecast: boolean,
): LineForecast {
  return {
    leadLineId: line.id,
    firstName: line.firstName,
    programId: line.programId,
    offeringId: null,
    standardMonthlyCents: null,
    forecastMonthlyCents: 0,
    enrollmentCents: 0,
    overridden: false,
    discountReason: line.discountReason,
    includedInForecast,
  }
}

/** Active pipeline Forecast MRR: open LeadLines only. JOINED and LOST contribute $0. */
export async function forecastHousehold(db: Database, leadId: number) {
  const [lead] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) {
    throw new DomainError('Lead not found.', 404)
  }

  const lines = await db.query.leadLines.findMany({
    where: eq(leadLines.leadId, leadId),
    with: { membershipOffering: true, program: true },
  })

  const rules = await db.select().from(householdPricingRules)
  const ruleByProgram = new Map(rules.filter(rule => rule.active).map(rule => [rule.programId, rule]))

  const priced = lines.filter(line => line.membershipOfferingId || line.monthlyOverrideCents != null)
  const pricedIds = new Set(priced.map(line => line.id))
  const byProgram = new Map<number, typeof priced>()
  for (const line of priced) {
    const group = byProgram.get(line.programId) ?? []
    group.push(line)
    byProgram.set(line.programId, group)
  }

  const lineForecasts: LineForecast[] = []
  for (const [programId, group] of byProgram) {
    const ordered = [...group].sort((a, b) => a.id - b.id)
    const rule = ruleByProgram.get(programId)
    ordered.forEach((line, index) => {
      const includedInForecast = !isTerminalLineStatus(line.status)
      const offering = line.membershipOffering
      const standard = offering?.monthlyCents
        ?? (index === 0 ? rule?.firstMonthlyCents : rule?.additionalMonthlyCents)
        ?? 0
      const householdPrice = rule
        ? (index === 0 ? rule.firstMonthlyCents : rule.additionalMonthlyCents)
        : standard
      const overridden = line.monthlyOverrideCents != null
      const openMonthly = overridden ? line.monthlyOverrideCents! : householdPrice
      lineForecasts.push({
        leadLineId: line.id,
        firstName: line.firstName,
        programId: line.programId,
        offeringId: line.membershipOfferingId,
        standardMonthlyCents: standard,
        forecastMonthlyCents: includedInForecast ? openMonthly : 0,
        enrollmentCents: includedInForecast ? (offering?.enrollmentCents ?? 0) : 0,
        overridden,
        discountReason: line.discountReason,
        includedInForecast,
      })
    })
  }

  const unpricedOpen = lines
    .filter(line => !isTerminalLineStatus(line.status) && !pricedIds.has(line.id))
    .map(line => emptyLineForecast(line, true))
  const unpricedTerminal = lines
    .filter(line => isTerminalLineStatus(line.status) && !pricedIds.has(line.id))
    .map(line => emptyLineForecast(line, false))

  const all = [...lineForecasts, ...unpricedOpen, ...unpricedTerminal].sort((a, b) => a.leadLineId - b.leadLineId)
  return {
    leadId,
    monthlyCents: all.reduce((sum, line) => sum + line.forecastMonthlyCents, 0),
    enrollmentCents: all.reduce((sum, line) => sum + line.enrollmentCents, 0),
    lines: all,
  }
}
