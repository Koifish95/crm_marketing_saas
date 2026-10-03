import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
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

export type { OpportunityStage, LeadStage, LossReason, ActivityType, ActivityStatus, ActivityOutcome, NoteRecordKind } from '../../../shared/utils/pipeline'

export const salesAccounts = sqliteTable('sales_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  notes: text('notes'),
  website: text('website'),
  phone: text('phone'),
  city: text('city'),
  state: text('state'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  lifecycle: text('lifecycle').notNull().default('prospect'),
  doNotContact: integer('do_not_contact', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_accounts_name_idx').on(table.name),
  index('sales_accounts_lifecycle_idx').on(table.lifecycle),
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

export const salesSources = sqliteTable('sales_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_sources_code_unique').on(table.code),
])

export const salesCampaigns = sqliteTable('sales_campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'),
  startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
  endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
  budgetCents: integer('budget_cents'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_campaigns_status_idx').on(table.status),
])

export const salesTrackingLinks = sqliteTable('sales_tracking_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => salesCampaigns.id),
  sourceId: integer('source_id').notNull().references(() => salesSources.id),
  label: text('label').notNull(),
  token: text('token').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  clickCount: integer('click_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_tracking_links_token_unique').on(table.token),
  index('sales_tracking_links_campaign_id_idx').on(table.campaignId),
  index('sales_tracking_links_source_id_idx').on(table.sourceId),
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
  sourceId: integer('source_id').references(() => salesSources.id),
  campaignId: integer('campaign_id').references(() => salesCampaigns.id),
  sourceDetail: text('source_detail'),
  sourceName: text('source_name'),
  campaignName: text('campaign_name'),
  capturedSourceId: integer('captured_source_id').references(() => salesSources.id),
  capturedCampaignId: integer('captured_campaign_id').references(() => salesCampaigns.id),
  capturedTrackingLinkId: integer('captured_tracking_link_id').references(() => salesTrackingLinks.id),
  capturedAt: integer('captured_at', { mode: 'timestamp_ms' }),
  capturedSourceName: text('captured_source_name'),
  capturedCampaignName: text('captured_campaign_name'),
  capturedTrackingLinkLabel: text('captured_tracking_link_label'),
  intakeCompanyName: text('intake_company_name'),
  possibleDuplicateLeadId: integer('possible_duplicate_lead_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_leads_stage_idx').on(table.stage),
  index('sales_leads_owner_user_id_idx').on(table.ownerUserId),
  index('sales_leads_account_id_idx').on(table.accountId),
  index('sales_leads_source_id_idx').on(table.sourceId),
  index('sales_leads_campaign_id_idx').on(table.campaignId),
  index('sales_leads_captured_tracking_link_id_idx').on(table.capturedTrackingLinkId),
])

export const salesOpportunities = sqliteTable('sales_opportunities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => salesAccounts.id),
  primaryContactId: integer('primary_contact_id').references(() => salesContacts.id),
  sourceLeadId: integer('source_lead_id').references(() => salesLeads.id),
  name: text('name').notNull(),
  amountCents: integer('amount_cents'),
  mrrCents: integer('mrr_cents'),
  stage: text('stage').notNull().default('working'),
  ownerUserId: integer('owner_user_id').references(() => users.id),
  lossReason: text('loss_reason'),
  lossNotes: text('loss_notes'),
  notes: text('notes'),
  wonAt: integer('won_at', { mode: 'timestamp_ms' }),
  lostAt: integer('lost_at', { mode: 'timestamp_ms' }),
  sourceId: integer('source_id').references(() => salesSources.id),
  campaignId: integer('campaign_id').references(() => salesCampaigns.id),
  sourceDetail: text('source_detail'),
  sourceName: text('source_name'),
  campaignName: text('campaign_name'),
  capturedSourceId: integer('captured_source_id').references(() => salesSources.id),
  capturedCampaignId: integer('captured_campaign_id').references(() => salesCampaigns.id),
  capturedTrackingLinkId: integer('captured_tracking_link_id').references(() => salesTrackingLinks.id),
  capturedAt: integer('captured_at', { mode: 'timestamp_ms' }),
  capturedSourceName: text('captured_source_name'),
  capturedCampaignName: text('captured_campaign_name'),
  capturedTrackingLinkLabel: text('captured_tracking_link_label'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_opportunities_account_id_idx').on(table.accountId),
  index('sales_opportunities_stage_idx').on(table.stage),
  index('sales_opportunities_owner_user_id_idx').on(table.ownerUserId),
  index('sales_opportunities_source_lead_id_idx').on(table.sourceLeadId),
  index('sales_opportunities_source_id_idx').on(table.sourceId),
  index('sales_opportunities_campaign_id_idx').on(table.campaignId),
  index('sales_opportunities_won_at_idx').on(table.wonAt),
  index('sales_opportunities_lost_at_idx').on(table.lostAt),
])

export const salesOffers = sqliteTable('sales_offers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  pricingType: text('pricing_type').notNull(),
  defaultUnitPriceCents: integer('default_unit_price_cents').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_offers_active_idx').on(table.active),
])

export const salesOpportunityLines = sqliteTable('sales_opportunity_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  opportunityId: integer('opportunity_id').notNull().references(() => salesOpportunities.id),
  offerId: integer('offer_id').references(() => salesOffers.id),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  pricingType: text('pricing_type').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_opportunity_lines_opportunity_id_idx').on(table.opportunityId),
])

export const salesPublicSubmissions = sqliteTable('sales_public_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idempotencyKey: text('idempotency_key').notNull(),
  leadId: integer('lead_id').notNull().references(() => salesLeads.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_public_submissions_key_unique').on(table.idempotencyKey),
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
  outcome: text('outcome'),
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

export const salesProposals = sqliteTable('sales_proposals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  opportunityId: integer('opportunity_id').notNull().references(() => salesOpportunities.id),
  proposalNumber: text('proposal_number').notNull(),
  currentRevisionId: integer('current_revision_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_proposals_opportunity_id_unique').on(table.opportunityId),
  uniqueIndex('sales_proposals_proposal_number_unique').on(table.proposalNumber),
])

export const salesProposalRevisions = sqliteTable('sales_proposal_revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  proposalId: integer('proposal_id').notNull().references(() => salesProposals.id),
  revision: integer('revision').notNull().default(1),
  status: text('status').notNull().default('draft'),
  title: text('title').notNull(),
  intro: text('intro'),
  terms: text('terms'),
  notes: text('notes'),
  validThrough: text('valid_through'),
  issuedAt: integer('issued_at', { mode: 'timestamp_ms' }),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
  declinedAt: integer('declined_at', { mode: 'timestamp_ms' }),
  recipientContactId: integer('recipient_contact_id').references(() => salesContacts.id),
  recipientFirstName: text('recipient_first_name'),
  recipientLastName: text('recipient_last_name'),
  recipientTitle: text('recipient_title'),
  recipientEmail: text('recipient_email'),
  recipientPhone: text('recipient_phone'),
  companyName: text('company_name'),
  letterheadName: text('letterhead_name'),
  letterheadAddress: text('letterhead_address'),
  letterheadPhone: text('letterhead_phone'),
  letterheadEmail: text('letterhead_email'),
  letterheadWebsite: text('letterhead_website'),
  letterheadFooter: text('letterhead_footer'),
  letterheadLogoPath: text('letterhead_logo_path'),
  amountCents: integer('amount_cents').notNull().default(0),
  mrrCents: integer('mrr_cents').notNull().default(0),
  generatedPdfPath: text('generated_pdf_path'),
  signedPdfPath: text('signed_pdf_path'),
  signedPdfOriginalName: text('signed_pdf_original_name'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_proposal_revisions_proposal_revision_unique').on(table.proposalId, table.revision),
  index('sales_proposal_revisions_proposal_id_idx').on(table.proposalId),
  index('sales_proposal_revisions_status_idx').on(table.status),
])

export const salesProposalLines = sqliteTable('sales_proposal_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  revisionId: integer('revision_id').notNull().references(() => salesProposalRevisions.id),
  offerId: integer('offer_id').references(() => salesOffers.id),
  offerName: text('offer_name'),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  pricingType: text('pricing_type').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('sales_proposal_lines_revision_id_idx').on(table.revisionId),
])

export const salesProspects = sqliteTable('sales_prospects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  website: text('website'),
  domainKey: text('domain_key'),
  city: text('city'),
  state: text('state'),
  discipline: text('discipline'),
  email: text('email'),
  phone: text('phone'),
  phoneKey: text('phone_key'),
  locationKey: text('location_key'),
  status: text('status').notNull().default('review'),
  priority: text('priority').notNull().default('normal'),
  lane: text('lane').notNull().default('national'),
  possibleDuplicateProspectId: integer('possible_duplicate_prospect_id'),
  salesAccountId: integer('sales_account_id').references(() => salesAccounts.id),
  salesContactId: integer('sales_contact_id').references(() => salesContacts.id),
  salesOpportunityId: integer('sales_opportunity_id').references(() => salesOpportunities.id),
  notes: text('notes'),
  outreachStatus: text('outreach_status').notNull().default('none'),
  nextTouchAt: integer('next_touch_at', { mode: 'timestamp_ms' }),
  sequenceStartedAt: integer('sequence_started_at', { mode: 'timestamp_ms' }),
  emailSourceUrl: text('email_source_url'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_prospects_domain_key_unique').on(table.domainKey),
  uniqueIndex('sales_prospects_location_key_unique').on(table.locationKey),
  index('sales_prospects_status_idx').on(table.status),
  index('sales_prospects_state_idx').on(table.state),
  index('sales_prospects_phone_key_idx').on(table.phoneKey),
  index('sales_prospects_sales_account_id_idx').on(table.salesAccountId),
  index('sales_prospects_outreach_status_idx').on(table.outreachStatus),
])

export const salesProspectObservations = sqliteTable('sales_prospect_observations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prospectId: integer('prospect_id').notNull().references(() => salesProspects.id),
  source: text('source').notNull(),
  externalId: text('external_id').notNull(),
  query: text('query'),
  sourceUrl: text('source_url'),
  rawRef: text('raw_ref'),
  discoveredAt: integer('discovered_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_prospect_observations_source_external_unique').on(table.source, table.externalId),
  index('sales_prospect_observations_prospect_id_idx').on(table.prospectId),
])

export const salesProspectMessages = sqliteTable('sales_prospect_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prospectId: integer('prospect_id').notNull().references(() => salesProspects.id),
  step: integer('step').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  delivery: text('delivery').notNull().default('queued'),
  providerMessageId: text('provider_message_id'),
  openToken: text('open_token'),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
  bouncedAt: integer('bounced_at', { mode: 'timestamp_ms' }),
  openedAt: integer('opened_at', { mode: 'timestamp_ms' }),
  replyExcerpt: text('reply_excerpt'),
  replyAt: integer('reply_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('sales_prospect_messages_prospect_step_unique').on(table.prospectId, table.step),
  uniqueIndex('sales_prospect_messages_open_token_unique').on(table.openToken),
  index('sales_prospect_messages_provider_message_id_idx').on(table.providerMessageId),
  index('sales_prospect_messages_sent_at_idx').on(table.sentAt),
])

export const salesProspectRuns = sqliteTable('sales_prospect_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stateCode: text('state_code').notNull(),
  status: text('status').notNull(),
  storedCount: integer('stored_count').notNull().default(0),
  rejectedCount: integer('rejected_count').notNull().default(0),
  detail: text('detail'),
  error: text('error'),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
}, table => [
  index('sales_prospect_runs_status_idx').on(table.status),
])
