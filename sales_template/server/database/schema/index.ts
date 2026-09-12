import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { OPPORTUNITY_STAGES } from '../../../shared/utils/pipeline'
import {
  appSettings,
  securityEvents,
  userRoleAccessRights,
  userRoleAssignments,
  userRoles,
  userTypeRoles,
  userTypes,
  users,
} from '@crm/core/server/database/schema'

export {
  appSettings,
  securityEvents,
  userRoleAccessRights,
  userRoleAssignments,
  userRoles,
  userTypeRoles,
  userTypes,
  users,
  OPPORTUNITY_STAGES,
}

export type { OpportunityStage, LeadStage, LossReason, ActivityType, ActivityStatus, NoteRecordKind } from '../../../shared/utils/pipeline'

export const salesAccounts = sqliteTable('sales_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_accounts_name_idx').on(table.name),
])

export const salesContacts = sqliteTable('sales_contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => salesAccounts.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  title: text('title'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_contacts_account_id_idx').on(table.accountId),
])

export const salesLeads = sqliteTable('sales_leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  reachabilityNote: text('reachability_note'),
  accountId: integer('account_id').references(() => salesAccounts.id),
  stage: text('stage').notNull().default('new'),
  ownerUserId: integer('owner_user_id').references(() => users.id),
  convertedAt: integer('converted_at', { mode: 'timestamp_ms' }),
  convertedAccountId: integer('converted_account_id').references(() => salesAccounts.id),
  convertedContactId: integer('converted_contact_id').references(() => salesContacts.id),
  convertedOpportunityId: integer('converted_opportunity_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_leads_stage_idx').on(table.stage),
  index('sales_leads_owner_user_id_idx').on(table.ownerUserId),
  index('sales_leads_account_id_idx').on(table.accountId),
])

export const salesOpportunities = sqliteTable('sales_opportunities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => salesAccounts.id),
  primaryContactId: integer('primary_contact_id').references(() => salesContacts.id),
  sourceLeadId: integer('source_lead_id').references(() => salesLeads.id),
  name: text('name').notNull(),
  amountCents: integer('amount_cents'),
  stage: text('stage').notNull().default('proposal_quote'),
  ownerUserId: integer('owner_user_id').references(() => users.id),
  lossReason: text('loss_reason'),
  lossNotes: text('loss_notes'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_opportunities_account_id_idx').on(table.accountId),
  index('sales_opportunities_stage_idx').on(table.stage),
  index('sales_opportunities_owner_user_id_idx').on(table.ownerUserId),
  index('sales_opportunities_source_lead_id_idx').on(table.sourceLeadId),
])

export const salesActivities = sqliteTable('sales_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').references(() => salesAccounts.id),
  contactId: integer('contact_id').references(() => salesContacts.id),
  opportunityId: integer('opportunity_id').references(() => salesOpportunities.id),
  leadId: integer('lead_id').references(() => salesLeads.id),
  ownerUserId: integer('owner_user_id').references(() => users.id),
  type: text('type').notNull().default('task'),
  status: text('status').notNull().default('open'),
  description: text('description').notNull(),
  notes: text('notes'),
  dueAt: integer('due_at', { mode: 'timestamp_ms' }),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_activities_account_id_idx').on(table.accountId),
  index('sales_activities_contact_id_idx').on(table.contactId),
  index('sales_activities_opportunity_id_idx').on(table.opportunityId),
  index('sales_activities_lead_id_idx').on(table.leadId),
  index('sales_activities_owner_user_id_idx').on(table.ownerUserId),
  index('sales_activities_status_idx').on(table.status),
])

export const salesNotes = sqliteTable('sales_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recordKind: text('record_kind').notNull(),
  recordId: integer('record_id').notNull(),
  body: text('body').notNull(),
  authorUserId: integer('author_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_notes_record_idx').on(table.recordKind, table.recordId),
])
