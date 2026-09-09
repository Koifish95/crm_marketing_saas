import type {
  AcquisitionEventStatus,
  AssetMarketingUse,
  CampaignStatus,
  ContentStatus,
  ExperienceLevel,
  FollowUpTaskStatus,
  LeadLineRelationship,
  LeadSource,
  LeadStatus,
  MarketingTaskType,
  TrialStatus,
  UserRole,
} from '../schemas/enums'
import type { FollowUpDueState } from './follow-up'

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  RESPONDED: 'Responded',
  TRIAL_SCHEDULED: 'Trial scheduled',
  TRIAL_ATTENDED: 'Trial attended',
  NO_SHOW: 'No-show',
  JOINED: 'Joined',
  LOST: 'Lost',
}

export const TRIAL_STATUS_LABELS: Record<TrialStatus, string> = {
  SCHEDULED: 'Scheduled',
  ATTENDED: 'Attended',
  NO_SHOW: 'No-show',
  CANCELLED: 'Cancelled',
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  WALK_IN: 'Walk-in',
  REFERRAL: 'Referral',
  WEBSITE: 'Website',
  PHONE: 'Phone',
  OTHER: 'Other',
}

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  NONE: 'New to jiu-jitsu',
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  UNKNOWN: 'Not sure',
}

export const TASK_STATUS_LABELS: Record<FollowUpTaskStatus, string> = {
  PENDING: 'Open',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const FOLLOW_UP_PURPOSE_LABELS: Record<string, string> = {
  INITIAL_SCHEDULE: 'Confirm intros',
  EVENT_FOLLOW_UP: 'Event follow-up',
  MANUAL: 'Follow-up call',
}

export function followUpPurposeLabel(purpose: string | null | undefined) {
  if (!purpose) {
    return 'Phone call'
  }
  return FOLLOW_UP_PURPOSE_LABELS[purpose] ?? 'Phone call'
}

export function statusHistoryNoteIsRedundant(note: string | null | undefined, toStatus: string) {
  if (!note?.trim()) {
    return true
  }
  const normalized = note.trim().replace(/\.+$/, '').toLowerCase()
  return normalized === leadStatusLabel(toStatus).toLowerCase()
}

export const DUE_STATE_LABELS: Record<FollowUpDueState, string> = {
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due today',
  UPCOMING: 'Upcoming',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
}

export const LINE_RELATIONSHIP_LABELS: Record<LeadLineRelationship, string> = {
  SELF: 'Self',
  CHILD: 'Child',
  SPOUSE: 'Spouse',
  OTHER: 'Other',
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const CAMPAIGN_STATUSES = Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]

export const USER_ROLES = Object.keys(ROLE_LABELS) as UserRole[]

export const SECURITY_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILURE: 'Sign-in failed',
  LOGOUT: 'Signed out',
  USER_CREATED: 'User created',
  USER_EDITED: 'User edited',
  USER_ACTIVATED: 'User reactivated',
  USER_DEACTIVATED: 'User deactivated',
  ROLE_CHANGED: 'Role changed',
  PASSWORD_RESET: 'Password reset',
  PASSWORD_CHANGE_REQUIRED: 'Password change required',
  PASSWORD_CHANGED: 'Password changed',
  SESSIONS_REVOKED: 'Sessions revoked',
  APP_RESTART: 'Application restart requested',
  APP_SHUTDOWN: 'Application shutdown requested',
  APP_SETTING_CHANGED: 'Application setting changed',
  USER_TYPE_CHANGED: 'User type changed',
  USER_ROLES_CHANGED: 'User roles changed',
  ACCESS_TYPE_ROLES_CHANGED: 'User Type roles changed',
  ACCESS_ROLE_RIGHTS_CHANGED: 'User Role access rights changed',
  ENVIRONMENT_BACKUP: 'Environment backup downloaded',
  ENVIRONMENT_RESTORE: 'Environment restored from backup',
}

export const SECURITY_RESULT_LABELS: Record<string, string> = {
  SUCCESS: 'Success',
  FAILURE: 'Failure',
  DENIED: 'Denied',
}

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]
export const LEAD_SOURCES = Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]

export const HOUSEHOLD_STATUS_FILTERS = [
  'ACTIVE',
  'ACTIVE_MIXED',
  'JOINED',
  'CLOSED_MIXED',
  'LOST',
] as const

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'muted'

export function leadStatusLabel(status: string) {
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status
}

export function leadStatusTone(status: string): BadgeTone {
  if (status === 'JOINED' || status === 'TRIAL_ATTENDED') {
    return 'success'
  }
  if (status === 'TRIAL_SCHEDULED' || status === 'RESPONDED' || status === 'CONTACTED') {
    return 'brand'
  }
  if (status === 'NO_SHOW') {
    return 'warning'
  }
  if (status === 'LOST') {
    return 'danger'
  }
  return 'neutral'
}

export function trialStatusLabel(status: string) {
  return TRIAL_STATUS_LABELS[status as TrialStatus] ?? status
}

export function trialStatusTone(status: string): BadgeTone {
  if (status === 'ATTENDED') {
    return 'success'
  }
  if (status === 'SCHEDULED') {
    return 'brand'
  }
  if (status === 'NO_SHOW') {
    return 'warning'
  }
  if (status === 'CANCELLED') {
    return 'muted'
  }
  return 'neutral'
}

export function sourceLabel(source: string) {
  return LEAD_SOURCE_LABELS[source as LeadSource] ?? source
}

export function experienceLabel(level: string) {
  return EXPERIENCE_LABELS[level as ExperienceLevel] ?? level
}

export function taskStatusLabel(status: string) {
  return TASK_STATUS_LABELS[status as FollowUpTaskStatus] ?? status
}

export function dueStateLabel(state: string | null | undefined) {
  if (!state) {
    return null
  }
  return DUE_STATE_LABELS[state as FollowUpDueState] ?? state
}

export function dueStateTone(state: string | null | undefined): BadgeTone {
  if (state === 'OVERDUE') {
    return 'danger'
  }
  if (state === 'DUE_TODAY') {
    return 'warning'
  }
  if (state === 'UPCOMING') {
    return 'brand'
  }
  return 'neutral'
}

export function roleLabel(role: string) {
  return ROLE_LABELS[role as UserRole] ?? role
}

export function campaignStatusLabel(status: string) {
  return CAMPAIGN_STATUS_LABELS[status as CampaignStatus] ?? status
}

export function campaignStatusTone(status: string): BadgeTone {
  if (status === 'ACTIVE') {
    return 'success'
  }
  if (status === 'PLANNED') {
    return 'brand'
  }
  if (status === 'CANCELLED') {
    return 'danger'
  }
  return 'muted'
}

export function campaignKindLabel(kind: string) {
  if (kind === 'PAID') {
    return 'Paid'
  }
  return 'Organic'
}

export const MARKETING_TASK_TYPE_LABELS: Record<MarketingTaskType, string> = {
  ASSET_REQUEST: 'Request assets',
  DRAFT_CAPTION: 'Draft caption',
  PREPARE_CREATIVE: 'Prepare creative',
  CREATE_TRACKING_LINK: 'Create tracking link',
  REVIEW: 'Review',
  PUBLISH: 'Publish (manual)',
  REVIEW_PERFORMANCE: 'Review performance',
  WEEKLY_SUMMARY: 'Weekly summary',
  OTHER: 'Other',
}

export const MARKETING_TASK_TYPES = Object.keys(MARKETING_TASK_TYPE_LABELS) as MarketingTaskType[]

export function marketingTaskTypeLabel(type: string) {
  return MARKETING_TASK_TYPE_LABELS[type as MarketingTaskType] ?? type
}

export function marketingTaskStatusTone(status: string): BadgeTone {
  if (status === 'COMPLETED') {
    return 'success'
  }
  if (status === 'CANCELLED') {
    return 'danger'
  }
  return 'neutral'
}

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  IDEA: 'Idea',
  NEEDS_ASSETS: 'Needs assets',
  DRAFT: 'Draft',
  NEEDS_REVIEW: 'Needs review',
  APPROVED: 'Approved',
  READY_TO_PUBLISH: 'Ready to publish',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
}

export function contentStatusLabel(status: string) {
  return CONTENT_STATUS_LABELS[status as ContentStatus] ?? status
}

export function contentStatusTone(status: string): BadgeTone {
  if (status === 'PUBLISHED') {
    return 'success'
  }
  if (status === 'READY_TO_PUBLISH' || status === 'APPROVED') {
    return 'brand'
  }
  if (status === 'NEEDS_REVIEW' || status === 'NEEDS_ASSETS') {
    return 'warning'
  }
  if (status === 'CANCELLED') {
    return 'danger'
  }
  return 'muted'
}

export const ASSET_USE_LABELS: Record<AssetMarketingUse, string> = {
  UNKNOWN: 'Unknown',
  APPROVED: 'Approved',
  RESTRICTED: 'Restricted',
  DO_NOT_USE: 'Do not use',
}

export function assetUseLabel(status: string) {
  return ASSET_USE_LABELS[status as AssetMarketingUse] ?? status.replaceAll('_', ' ')
}

export function assetUseTone(status: string): BadgeTone {
  if (status === 'APPROVED') {
    return 'success'
  }
  if (status === 'DO_NOT_USE') {
    return 'danger'
  }
  if (status === 'RESTRICTED') {
    return 'warning'
  }
  return 'neutral'
}

export function contentChannelLabel(channel: string) {
  if (channel === 'FACEBOOK') {
    return 'Facebook'
  }
  if (channel === 'INSTAGRAM') {
    return 'Instagram'
  }
  return 'Other'
}

export const EVENT_STATUS_LABELS: Record<AcquisitionEventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function eventStatusLabel(status: string) {
  return EVENT_STATUS_LABELS[status as AcquisitionEventStatus] ?? status
}

export function eventStatusTone(status: string): BadgeTone {
  if (status === 'PUBLISHED') {
    return 'success'
  }
  if (status === 'DRAFT') {
    return 'muted'
  }
  if (status === 'COMPLETED') {
    return 'brand'
  }
  return 'danger'
}

export function lineRelationshipLabel(relationship: string) {
  return LINE_RELATIONSHIP_LABELS[relationship as LeadLineRelationship] ?? relationship
}

export function householdDisplayStatus(lead: {
  status: string
  closedAt?: string | Date | null
  lines?: Array<{ status: string }>
}) {
  const lines = lead.lines ?? []
  const active = lines.filter(line => line.status !== 'JOINED' && line.status !== 'LOST')
  const joined = lines.filter(line => line.status === 'JOINED')
  const lost = lines.filter(line => line.status === 'LOST')
  if (!lines.length) {
    return {
      key: lead.status,
      label: leadStatusLabel(lead.status),
      tone: leadStatusTone(lead.status),
      kind: 'operational' as const,
    }
  }
  if (!active.length && joined.length && lost.length) {
    return {
      key: 'CLOSED_MIXED',
      label: 'Closed · mixed outcomes',
      tone: 'warning' as const,
      kind: 'derived' as const,
    }
  }
  if (!active.length && joined.length === lines.length) {
    return { key: 'JOINED', label: 'Joined', tone: 'success' as const, kind: 'derived' as const }
  }
  if (!active.length && lost.length === lines.length) {
    return { key: 'LOST', label: 'Lost', tone: 'danger' as const, kind: 'derived' as const }
  }
  if (joined.length || lost.length) {
    return {
      key: 'ACTIVE_MIXED',
      label: 'Active · mixed outcomes',
      tone: 'brand' as const,
      kind: 'derived' as const,
    }
  }
  return {
    key: 'ACTIVE',
    label: 'Active',
    tone: 'brand' as const,
    kind: 'derived' as const,
  }
}

export function householdStatusFilterLabel(key: string) {
  if (key === 'ACTIVE') {
    return 'Active'
  }
  if (key === 'ACTIVE_MIXED') {
    return 'Active · mixed outcomes'
  }
  if (key === 'CLOSED_MIXED') {
    return 'Closed · mixed outcomes'
  }
  return leadStatusLabel(key)
}

export function householdProgramSummary(
  lines: Array<{ program?: { name?: string } | null }>,
  fallback?: { name?: string } | null,
) {
  const names: string[] = []
  for (const line of lines) {
    const name = line.program?.name
    if (name && !names.includes(name)) {
      names.push(name)
    }
  }
  if (!names.length && fallback?.name) {
    return fallback.name
  }
  if (names.length > 2) {
    return `Mixed (${names.length})`
  }
  return names.join(', ')
}

export function householdProspectLabel(count: number) {
  return count === 1 ? '1 prospect' : `${count} prospects`
}

export function securityActionLabel(action: string) {
  return SECURITY_ACTION_LABELS[action] ?? action
}

export function securityResultLabel(result: string) {
  return SECURITY_RESULT_LABELS[result] ?? result
}

export function personName(
  person: { firstName?: string | null, lastName?: string | null } | null | undefined,
  fallback = 'Lead',
) {
  if (!person) {
    return fallback
  }
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ')
  return name || fallback
}

export const CONTACT_MATCH_KIND_LABELS: Record<'PHONE' | 'EMAIL' | 'BOTH', string> = {
  PHONE: 'phone',
  EMAIL: 'email',
  BOTH: 'phone and email',
}

export function contactMatchKindLabel(kind: string | null | undefined) {
  if (kind === 'PHONE' || kind === 'EMAIL' || kind === 'BOTH') {
    return CONTACT_MATCH_KIND_LABELS[kind]
  }
  return 'contact'
}

export function nextHouseholdIntro(
  lead: {
    trials?: Array<{
      status: string
      scheduledAt: string | Date
      leadLineId?: number | null
    }>
    lines?: Array<{ id: number, firstName: string, lastName?: string | null }>
  },
  nowMs: number,
) {
  const upcoming = (lead.trials ?? [])
    .filter(trial => trial.status === 'SCHEDULED' && new Date(trial.scheduledAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
  if (!upcoming) {
    return null
  }
  const line = upcoming.leadLineId != null
    ? (lead.lines ?? []).find(item => item.id === upcoming.leadLineId)
    : undefined
  return {
    scheduledAt: upcoming.scheduledAt,
    personName: line ? personName(line, '') : null,
  }
}
