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

export type { OpportunityStage } from '../../../shared/utils/pipeline'

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

export const salesOpportunities = sqliteTable('sales_opportunities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => salesAccounts.id),
  primaryContactId: integer('primary_contact_id').references(() => salesContacts.id),
  name: text('name').notNull(),
  amountCents: integer('amount_cents'),
  stage: text('stage').notNull().default('open'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_opportunities_account_id_idx').on(table.accountId),
  index('sales_opportunities_stage_idx').on(table.stage),
])

export const salesActivities = sqliteTable('sales_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').references(() => salesAccounts.id),
  contactId: integer('contact_id').references(() => salesContacts.id),
  opportunityId: integer('opportunity_id').references(() => salesOpportunities.id),
  description: text('description').notNull(),
  dueAt: integer('due_at', { mode: 'timestamp_ms' }),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_activities_account_id_idx').on(table.accountId),
  index('sales_activities_contact_id_idx').on(table.contactId),
  index('sales_activities_opportunity_id_idx').on(table.opportunityId),
])
