export const SEEDED_SOURCES = [
  { code: 'referral', name: 'Referral' },
  { code: 'website_organic', name: 'Website / Organic' },
  { code: 'facebook', name: 'Facebook' },
  { code: 'instagram', name: 'Instagram' },
  { code: 'google', name: 'Google' },
  { code: 'email', name: 'Email' },
  { code: 'cold_outreach', name: 'Cold Outreach' },
  { code: 'networking_event', name: 'Networking / Event' },
  { code: 'existing_customer', name: 'Existing Customer' },
  { code: 'partner', name: 'Partner' },
  { code: 'other', name: 'Other' },
] as const

export const WEBSITE_ORGANIC_CODE = 'website_organic'
export const OTHER_SOURCE_CODE = 'other'

export const CAMPAIGN_STATUSES = ['draft', 'active', 'completed', 'archived'] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}

export const COMPANY_LIFECYCLES = ['prospect', 'customer', 'former_customer'] as const
export type CompanyLifecycle = (typeof COMPANY_LIFECYCLES)[number]

export const COMPANY_LIFECYCLE_LABELS: Record<CompanyLifecycle, string> = {
  prospect: 'Prospect',
  customer: 'Customer',
  former_customer: 'Former Customer',
}

export const OFFER_PRICING_TYPES = ['one_time', 'monthly'] as const
export type OfferPricingType = (typeof OFFER_PRICING_TYPES)[number]

export const OFFER_PRICING_TYPE_LABELS: Record<OfferPricingType, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
}

export const INTAKE_FIELD_IDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'companyName',
  'message',
] as const
export type IntakeFieldId = (typeof INTAKE_FIELD_IDS)[number]

export const REQUIRED_INTAKE_FIELD_IDS = ['firstName', 'lastName', 'email'] as const

export const PUBLIC_INTAKE_SETTING_KEY = 'sales.public_intake'
export const PUBLIC_INTAKE_HONEYPOT_FIELD = 'website'

export const REPORT_RANGE_PRESETS = [
  'this_month',
  'last_month',
  'last_30_days',
  'this_quarter',
  'this_year',
  'custom',
] as const
export type ReportRangePreset = (typeof REPORT_RANGE_PRESETS)[number]

export function isCampaignStatus(value: string): value is CampaignStatus {
  return (CAMPAIGN_STATUSES as readonly string[]).includes(value)
}

export function campaignStatusLabel(status: string) {
  return isCampaignStatus(status) ? CAMPAIGN_STATUS_LABELS[status] : status
}

export function isCompanyLifecycle(value: string): value is CompanyLifecycle {
  return (COMPANY_LIFECYCLES as readonly string[]).includes(value)
}

export function companyLifecycleLabel(lifecycle: string) {
  return isCompanyLifecycle(lifecycle) ? COMPANY_LIFECYCLE_LABELS[lifecycle] : lifecycle
}

export function isOfferPricingType(value: string): value is OfferPricingType {
  return (OFFER_PRICING_TYPES as readonly string[]).includes(value)
}

export function offerPricingTypeLabel(type: string) {
  return isOfferPricingType(type) ? OFFER_PRICING_TYPE_LABELS[type] : type
}

export function isIntakeFieldId(value: string): value is IntakeFieldId {
  return (INTAKE_FIELD_IDS as readonly string[]).includes(value)
}

export function sourceRequiresDetail(code: string | null | undefined) {
  return code === OTHER_SOURCE_CODE
}

export function lineOneTimeCents(pricingType: string, quantity: number, unitPriceCents: number) {
  if (pricingType !== 'one_time') {
    return 0
  }
  return quantity * unitPriceCents
}

export function lineMrrCents(pricingType: string, quantity: number, unitPriceCents: number) {
  if (pricingType !== 'monthly') {
    return 0
  }
  return quantity * unitPriceCents
}
