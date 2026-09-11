import { registerAccessRights } from '@crm/core/shared/utils/permission-catalog'
import type { AccessRight } from '../schemas/enums'

export const ACCESS_RIGHTS: readonly AccessRight[] = [
  'VIEW_MARKETING',
  'MANAGE_CAMPAIGNS',
  'MANAGE_MARKETING_TASKS',
  'MANAGE_CONTENT',
  'APPROVE_CONTENT',
  'MANAGE_ASSETS',
  'MANAGE_ACQUISITION_EVENTS',
  'PROCESS_EVENT_REGISTRATIONS',
  'VIEW_MARKETING_REPORTS',
  'MANAGE_MARKETING_CONFIGURATION',
  'MANAGE_COMPENSATION_ATTRIBUTION',
] as const

export const ACCESS_RIGHT_LABELS: Record<AccessRight, string> = {
  VIEW_MARKETING: 'View Marketing',
  MANAGE_CAMPAIGNS: 'Manage campaigns',
  MANAGE_MARKETING_TASKS: 'Manage marketing tasks',
  MANAGE_CONTENT: 'Manage content',
  APPROVE_CONTENT: 'Approve content',
  MANAGE_ASSETS: 'Manage assets',
  MANAGE_ACQUISITION_EVENTS: 'Manage acquisition events',
  PROCESS_EVENT_REGISTRATIONS: 'Process event registrations',
  VIEW_MARKETING_REPORTS: 'View marketing reports',
  MANAGE_MARKETING_CONFIGURATION: 'Manage marketing configuration',
  MANAGE_COMPENSATION_ATTRIBUTION: 'Manage compensation attribution',
}

export const ACCESS_RIGHT_DESCRIPTIONS: Record<AccessRight, string> = {
  VIEW_MARKETING: 'Open the Marketing area and see campaigns, tasks, content, assets, and events.',
  MANAGE_CAMPAIGNS: 'Create and update Marketing Campaigns, owners, collaborators, and tracking links.',
  MANAGE_MARKETING_TASKS: 'Create, assign, and complete Marketing Tasks.',
  MANAGE_CONTENT: 'Create and edit Content Items and record publication.',
  APPROVE_CONTENT: 'Approve Content Items when review is required.',
  MANAGE_ASSETS: 'Upload, classify, archive, and attach marketing assets.',
  MANAGE_ACQUISITION_EVENTS: 'Create Events, Sessions, and manage registration settings.',
  PROCESS_EVENT_REGISTRATIONS: 'Review and run the Event batch that creates or matches Leads.',
  VIEW_MARKETING_REPORTS: 'See Marketing reports, campaign outcomes, and the compensation ledger.',
  MANAGE_MARKETING_CONFIGURATION: 'Change Marketing configuration that is not already ADMIN-only.',
  MANAGE_COMPENSATION_ATTRIBUTION: 'Assign or correct compensation credit and payment state.',
}

export const SEEDED_USER_TYPE_CODES = ['ADMINISTRATOR', 'STAFF', 'VIEWER'] as const
export const SEEDED_USER_ROLE_CODES = [
  'MARKETING_VIEWER',
  'CAMPAIGN_MANAGER',
  'MARKETING_TASK_MANAGER',
  'CONTENT_MANAGER',
  'CONTENT_APPROVER',
  'ASSET_MANAGER',
  'EVENT_MANAGER',
  'EVENT_PROCESSOR',
  'MARKETING_CONFIGURATOR',
  'COMPENSATION_ADMIN',
] as const

export const SEEDED_USER_ROLES: Array<{
  code: (typeof SEEDED_USER_ROLE_CODES)[number]
  name: string
  description: string
}> = [
  { code: 'MARKETING_VIEWER', name: 'Marketing viewer', description: 'See the Marketing area and reports.' },
  { code: 'CAMPAIGN_MANAGER', name: 'Campaign manager', description: 'Plan and update Marketing Campaigns.' },
  { code: 'MARKETING_TASK_MANAGER', name: 'Marketing task manager', description: 'Create and complete Marketing Tasks.' },
  { code: 'CONTENT_MANAGER', name: 'Content manager', description: 'Plan and record marketing content.' },
  { code: 'CONTENT_APPROVER', name: 'Content approver', description: 'Approve content when review is required.' },
  { code: 'ASSET_MANAGER', name: 'Asset manager', description: 'Upload and classify marketing assets.' },
  { code: 'EVENT_MANAGER', name: 'Event manager', description: 'Create Acquisition Events and Sessions.' },
  { code: 'EVENT_PROCESSOR', name: 'Event processor', description: 'Run the Event registration batch into Leads.' },
  { code: 'MARKETING_CONFIGURATOR', name: 'Marketing configurator', description: 'Change Marketing configuration.' },
  { code: 'COMPENSATION_ADMIN', name: 'Compensation admin', description: 'Assign and correct compensation credit.' },
]

export const SEEDED_USER_ROLE_RIGHTS: Record<(typeof SEEDED_USER_ROLE_CODES)[number], AccessRight[]> = {
  MARKETING_VIEWER: ['VIEW_MARKETING', 'VIEW_MARKETING_REPORTS'],
  CAMPAIGN_MANAGER: ['VIEW_MARKETING', 'MANAGE_CAMPAIGNS'],
  MARKETING_TASK_MANAGER: ['VIEW_MARKETING', 'MANAGE_MARKETING_TASKS'],
  CONTENT_MANAGER: ['VIEW_MARKETING', 'MANAGE_CONTENT'],
  CONTENT_APPROVER: ['VIEW_MARKETING', 'APPROVE_CONTENT'],
  ASSET_MANAGER: ['VIEW_MARKETING', 'MANAGE_ASSETS'],
  EVENT_MANAGER: ['VIEW_MARKETING', 'MANAGE_ACQUISITION_EVENTS'],
  EVENT_PROCESSOR: ['VIEW_MARKETING', 'PROCESS_EVENT_REGISTRATIONS'],
  MARKETING_CONFIGURATOR: ['VIEW_MARKETING', 'MANAGE_MARKETING_CONFIGURATION'],
  COMPENSATION_ADMIN: ['VIEW_MARKETING', 'VIEW_MARKETING_REPORTS', 'MANAGE_COMPENSATION_ATTRIBUTION'],
}

export function accessRightLabel(right: string) {
  return ACCESS_RIGHT_LABELS[right as AccessRight] ?? right
}

export function hasAccessRight(rights: readonly string[], needed: AccessRight) {
  return rights.includes(needed)
}

registerAccessRights(ACCESS_RIGHTS.map(code => ({
  code,
  label: ACCESS_RIGHT_LABELS[code],
  description: ACCESS_RIGHT_DESCRIPTIONS[code],
})))
