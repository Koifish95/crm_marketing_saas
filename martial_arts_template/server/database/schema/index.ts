import { relations, sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
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
}

export const programs = sqliteTable('programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  seasonal: integer('seasonal', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('programs_code_unique').on(table.code),
])

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  channel: text('channel'),
  kind: text('kind').notNull().default('ORGANIC'),
  budgetCents: integer('budget_cents'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull().default('ACTIVE'),
  description: text('description'),
  objective: text('objective'),
  offer: text('offer'),
  targetAudience: text('target_audience'),
  notes: text('notes'),
  ownerUserId: integer('owner_user_id').references(() => users.id),
  startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
  endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
  actualStartsAt: integer('actual_starts_at', { mode: 'timestamp_ms' }),
  actualEndsAt: integer('actual_ends_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('campaigns_slug_unique').on(table.slug),
  index('campaigns_owner_user_id_idx').on(table.ownerUserId),
  index('campaigns_status_idx').on(table.status),
])

export const campaignTrackingLinks = sqliteTable('campaign_tracking_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id),
  code: text('code').notNull(),
  publicSlug: text('public_slug').notNull(),
  label: text('label').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  destinationPath: text('destination_path').notNull().default('/trial'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('campaign_tracking_links_code_unique').on(table.code),
  uniqueIndex('campaign_tracking_links_public_slug_unique').on(table.publicSlug),
  index('campaign_tracking_links_campaign_id_idx').on(table.campaignId),
])

export const campaignCollaborators = sqliteTable('campaign_collaborators', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('campaign_collaborators_pair_unique').on(table.campaignId, table.userId),
  index('campaign_collaborators_campaign_id_idx').on(table.campaignId),
])

export const campaignPrograms = sqliteTable('campaign_programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id),
  programId: integer('program_id').notNull().references(() => programs.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('campaign_programs_pair_unique').on(table.campaignId, table.programId),
  index('campaign_programs_campaign_id_idx').on(table.campaignId),
])

export const marketingTasks = sqliteTable('marketing_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  type: text('type').notNull().default('OTHER'),
  description: text('description'),
  status: text('status').notNull().default('PENDING'),
  dueAt: integer('due_at', { mode: 'timestamp_ms' }).notNull(),
  assigneeUserId: integer('assignee_user_id').references(() => users.id),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  contentItemId: integer('content_item_id'),
  assetId: integer('asset_id'),
  eventId: integer('event_id'),
  notes: text('notes'),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  completedByUserId: integer('completed_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('marketing_tasks_due_at_idx').on(table.dueAt),
  index('marketing_tasks_status_idx').on(table.status),
  index('marketing_tasks_campaign_id_idx').on(table.campaignId),
  index('marketing_tasks_assignee_user_id_idx').on(table.assigneeUserId),
])

export const contentItems = sqliteTable('content_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body'),
  status: text('status').notNull().default('IDEA'),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  publisherUserId: integer('publisher_user_id').references(() => users.id),
  approvalRequired: integer('approval_required', { mode: 'boolean' }).notNull().default(false),
  approvedByUserId: integer('approved_by_user_id').references(() => users.id),
  approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
  plannedPublishAt: integer('planned_publish_at', { mode: 'timestamp_ms' }),
  notes: text('notes'),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('content_items_campaign_id_idx').on(table.campaignId),
  index('content_items_status_idx').on(table.status),
])

export const contentItemChannels = sqliteTable('content_item_channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentItemId: integer('content_item_id').notNull().references(() => contentItems.id),
  channel: text('channel').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('content_item_channels_pair_unique').on(table.contentItemId, table.channel),
  index('content_item_channels_content_item_id_idx').on(table.contentItemId),
])

export const contentPublications = sqliteTable('content_publications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentItemId: integer('content_item_id').notNull().references(() => contentItems.id),
  channel: text('channel').notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),
  publicUrl: text('public_url'),
  externalPostId: text('external_post_id'),
  recordedByUserId: integer('recorded_by_user_id').references(() => users.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('content_publications_content_item_id_idx').on(table.contentItemId),
])

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  originalFilename: text('original_filename').notNull(),
  mediaType: text('media_type').notNull(),
  storagePath: text('storage_path').notNull(),
  description: text('description'),
  marketingUseStatus: text('marketing_use_status').notNull().default('UNKNOWN'),
  restrictionNote: text('restriction_note'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  uploadedByUserId: integer('uploaded_by_user_id').references(() => users.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  contentItemId: integer('content_item_id').references(() => contentItems.id),
  eventId: integer('event_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('assets_campaign_id_idx').on(table.campaignId),
  index('assets_marketing_use_status_idx').on(table.marketingUseStatus),
])

export const assetUsages = sqliteTable('asset_usages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id').notNull().references(() => assets.id),
  contentItemId: integer('content_item_id').references(() => contentItems.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  usageKind: text('usage_kind').notNull().default('ATTACHED'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('asset_usages_asset_id_idx').on(table.assetId),
  index('asset_usages_content_item_id_idx').on(table.contentItemId),
])

export const acquisitionEvents = sqliteTable('acquisition_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  status: text('status').notNull().default('DRAFT'),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  programId: integer('program_id').references(() => programs.id),
  registrationOpensAt: integer('registration_opens_at', { mode: 'timestamp_ms' }),
  registrationClosesAt: integer('registration_closes_at', { mode: 'timestamp_ms' }),
  registrationManuallyClosed: integer('registration_manually_closed', { mode: 'boolean' }).notNull().default(false),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('acquisition_events_slug_unique').on(table.slug),
  index('acquisition_events_status_idx').on(table.status),
  index('acquisition_events_campaign_id_idx').on(table.campaignId),
])

export const acquisitionEventSessions = sqliteTable('acquisition_event_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => acquisitionEvents.id),
  name: text('name').notNull(),
  startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
  programId: integer('program_id').references(() => programs.id),
  minAge: integer('min_age'),
  maxAge: integer('max_age'),
  capacity: integer('capacity'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('acquisition_event_sessions_event_id_idx').on(table.eventId),
  index('acquisition_event_sessions_starts_at_idx').on(table.startsAt),
])

export const acquisitionEventQuestions = sqliteTable('acquisition_event_questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => acquisitionEvents.id),
  prompt: text('prompt').notNull(),
  fieldType: text('field_type').notNull(),
  optionsJson: text('options_json'),
  required: integer('required', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('acquisition_event_questions_event_id_idx').on(table.eventId),
])

export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  phone: text('phone'),
  email: text('email'),
  programId: integer('program_id').notNull().references(() => programs.id),
  experienceLevel: text('experience_level').notNull().default('UNKNOWN'),
  source: text('source').notNull(),
  status: text('status').notNull().default('NEW'),
  participantFirstName: text('participant_first_name'),
  participantLastName: text('participant_last_name'),
  participantAge: integer('participant_age'),
  guardianRelationship: text('guardian_relationship'),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  campaignTrackingLinkId: integer('campaign_tracking_link_id').references(() => campaignTrackingLinks.id),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' }),
  monthlyRateCents: integer('monthly_rate_cents'),
  smsConsent: integer('sms_consent', { mode: 'boolean' }).notNull().default(false),
  smsConsentAt: integer('sms_consent_at', { mode: 'timestamp_ms' }),
  emailConsent: integer('email_consent', { mode: 'boolean' }).notNull().default(false),
  emailConsentAt: integer('email_consent_at', { mode: 'timestamp_ms' }),
  closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('leads_phone_idx').on(table.phone),
  index('leads_email_idx').on(table.email),
  index('leads_status_idx').on(table.status),
  index('leads_program_id_idx').on(table.programId),
  index('leads_campaign_id_idx').on(table.campaignId),
  check(
    'leads_phone_or_email_check',
    sql`(phone IS NOT NULL AND phone != '') OR (email IS NOT NULL AND email != '')`,
  ),
])

export const leadLines = sqliteTable('lead_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  relationship: text('relationship').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp_ms' }),
  age: integer('age'),
  programId: integer('program_id').notNull().references(() => programs.id),
  experienceLevel: text('experience_level').notNull().default('UNKNOWN'),
  notes: text('notes'),
  status: text('status').notNull().default('NEW'),
  membershipOfferingId: integer('membership_offering_id').references(() => membershipOfferings.id),
  monthlyOverrideCents: integer('monthly_override_cents'),
  discountReason: text('discount_reason'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('lead_lines_lead_id_idx').on(table.leadId),
  index('lead_lines_status_idx').on(table.status),
  index('lead_lines_program_id_idx').on(table.programId),
])

export const acquisitionEventRegistrations = sqliteTable('acquisition_event_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => acquisitionEvents.id),
  contactFirstName: text('contact_first_name').notNull(),
  contactLastName: text('contact_last_name'),
  phone: text('phone'),
  email: text('email'),
  source: text('source'),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  campaignTrackingLinkId: integer('campaign_tracking_link_id').references(() => campaignTrackingLinks.id),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  staffCreated: integer('staff_created', { mode: 'boolean' }).notNull().default(false),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  excludeFromProcessing: integer('exclude_from_processing', { mode: 'boolean' }).notNull().default(false),
  processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
  leadId: integer('lead_id').references(() => leads.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('acquisition_event_registrations_event_id_idx').on(table.eventId),
  index('acquisition_event_registrations_lead_id_idx').on(table.leadId),
  index('acquisition_event_registrations_phone_idx').on(table.phone),
])

export const acquisitionEventRegistrationLines = sqliteTable('acquisition_event_registration_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  registrationId: integer('registration_id').notNull().references(() => acquisitionEventRegistrations.id),
  sessionId: integer('session_id').notNull().references(() => acquisitionEventSessions.id),
  relationship: text('relationship').notNull().default('CHILD'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  age: integer('age'),
  attendance: text('attendance').notNull().default('REGISTERED'),
  notes: text('notes'),
  leadLineId: integer('lead_line_id').references(() => leadLines.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('acquisition_event_registration_lines_registration_id_idx').on(table.registrationId),
  index('acquisition_event_registration_lines_session_id_idx').on(table.sessionId),
  index('acquisition_event_registration_lines_lead_line_id_idx').on(table.leadLineId),
])

export const acquisitionEventQuestionAnswers = sqliteTable('acquisition_event_question_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  registrationId: integer('registration_id').notNull().references(() => acquisitionEventRegistrations.id),
  questionId: integer('question_id').notNull().references(() => acquisitionEventQuestions.id),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('acquisition_event_question_answers_pair_unique').on(table.registrationId, table.questionId),
  index('acquisition_event_question_answers_registration_id_idx').on(table.registrationId),
])

export const acquisitionEventRegistrationHistory = sqliteTable('acquisition_event_registration_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  registrationId: integer('registration_id').notNull().references(() => acquisitionEventRegistrations.id),
  actorUserId: integer('actor_user_id').references(() => users.id),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('acquisition_event_registration_history_registration_id_idx').on(table.registrationId),
])

export const acquisitionEventCommunicationIntents = sqliteTable('acquisition_event_communication_intents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  registrationId: integer('registration_id').notNull().references(() => acquisitionEventRegistrations.id),
  kind: text('kind').notNull(),
  channel: text('channel').notNull(),
  status: text('status').notNull().default('RECORDED_INTENT'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('acquisition_event_communication_intents_registration_id_idx').on(table.registrationId),
])

export const leadLineStatusHistory = sqliteTable('lead_line_status_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadLineId: integer('lead_line_id').notNull().references(() => leadLines.id),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedByUserId: integer('changed_by_user_id').references(() => users.id),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('lead_line_status_history_lead_line_id_idx').on(table.leadLineId),
  index('lead_line_status_history_lead_id_idx').on(table.leadId),
])

export const leadStatusHistory = sqliteTable('lead_status_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedByUserId: integer('changed_by_user_id').references(() => users.id),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('lead_status_history_lead_id_idx').on(table.leadId),
])

export const leadNotes = sqliteTable('lead_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  body: text('body').notNull(),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('lead_notes_lead_id_idx').on(table.leadId),
])

export const publicBookingSubmissions = sqliteTable('public_booking_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  idempotencyKey: text('idempotency_key').notNull(),
  leadId: integer('lead_id').references(() => leads.id),
  resultJson: text('result_json'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('public_booking_submissions_key_unique').on(table.idempotencyKey),
  index('public_booking_submissions_lead_id_idx').on(table.leadId),
])

export const leadPossibleDuplicates = sqliteTable('lead_possible_duplicates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  matchedLeadId: integer('matched_lead_id').notNull().references(() => leads.id),
  matchKind: text('match_kind').notNull(),
  matchedDisplayName: text('matched_display_name').notNull(),
  detectedAt: integer('detected_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('lead_possible_duplicates_lead_id_idx').on(table.leadId),
  index('lead_possible_duplicates_matched_lead_id_idx').on(table.matchedLeadId),
])

export const trials = sqliteTable('trials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  leadLineId: integer('lead_line_id').references(() => leadLines.id),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
  label: text('label'),
  status: text('status').notNull().default('SCHEDULED'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('trials_lead_id_idx').on(table.leadId),
  index('trials_lead_line_id_idx').on(table.leadLineId),
  index('trials_scheduled_at_idx').on(table.scheduledAt),
])

export const introAvailabilityRules = sqliteTable('intro_availability_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seedKey: text('seed_key').notNull(),
  programId: integer('program_id').notNull().references(() => programs.id),
  weekday: integer('weekday').notNull(),
  startMinute: integer('start_minute').notNull(),
  endMinute: integer('end_minute'),
  name: text('name').notNull(),
  ageMin: integer('age_min'),
  ageMax: integer('age_max'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('intro_availability_rules_seed_key_unique').on(table.seedKey),
  index('intro_availability_rules_program_id_idx').on(table.programId),
  index('intro_availability_rules_weekday_idx').on(table.weekday),
])

export const introExceptions = sqliteTable('intro_exceptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  onDate: text('on_date').notNull(),
  kind: text('kind').notNull(),
  ruleId: integer('rule_id').references(() => introAvailabilityRules.id),
  programId: integer('program_id').references(() => programs.id),
  name: text('name'),
  startMinute: integer('start_minute'),
  endMinute: integer('end_minute'),
  ageMin: integer('age_min'),
  ageMax: integer('age_max'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('intro_exceptions_on_date_idx').on(table.onDate),
  index('intro_exceptions_rule_id_idx').on(table.ruleId),
])

export const followUpTasks = sqliteTable('follow_up_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  trialId: integer('trial_id').references(() => trials.id),
  sourceEventId: integer('source_event_id').references(() => acquisitionEvents.id),
  type: text('type').notNull().default('PHONE_CALL'),
  purpose: text('purpose').notNull().default('MANUAL'),
  dueAt: integer('due_at', { mode: 'timestamp_ms' }).notNull(),
  status: text('status').notNull().default('PENDING'),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  completedByUserId: integer('completed_by_user_id').references(() => users.id),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  outcome: text('outcome'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('follow_up_tasks_lead_id_idx').on(table.leadId),
  index('follow_up_tasks_trial_id_idx').on(table.trialId),
  index('follow_up_tasks_due_at_idx').on(table.dueAt),
  index('follow_up_tasks_status_idx').on(table.status),
  uniqueIndex('follow_up_tasks_pending_initial_unique').on(table.trialId).where(sql`
    ${table.purpose} = 'INITIAL_SCHEDULE'
    AND ${table.status} = 'PENDING'
    AND ${table.trialId} IS NOT NULL
  `),
  uniqueIndex('follow_up_tasks_event_household_unique').on(table.leadId, table.sourceEventId).where(sql`
    ${table.purpose} = 'EVENT_FOLLOW_UP'
    AND ${table.sourceEventId} IS NOT NULL
  `),
])

export const followUpTaskLines = sqliteTable('follow_up_task_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().references(() => followUpTasks.id),
  leadLineId: integer('lead_line_id').notNull().references(() => leadLines.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('follow_up_task_lines_task_line_unique').on(table.taskId, table.leadLineId),
  index('follow_up_task_lines_task_id_idx').on(table.taskId),
  index('follow_up_task_lines_lead_line_id_idx').on(table.leadLineId),
])

export const leadSources = sqliteTable('lead_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('lead_sources_code_unique').on(table.code),
])

export const lostReasons = sqliteTable('lost_reasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('lost_reasons_code_unique').on(table.code),
])

export const membershipOfferings = sqliteTable('membership_offerings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  programId: integer('program_id').notNull().references(() => programs.id),
  monthlyCents: integer('monthly_cents').notNull(),
  enrollmentCents: integer('enrollment_cents').notNull().default(0),
  description: text('description'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('membership_offerings_program_id_idx').on(table.programId),
])

export const householdPricingRules = sqliteTable('household_pricing_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  programId: integer('program_id').notNull().references(() => programs.id),
  firstMonthlyCents: integer('first_monthly_cents').notNull(),
  additionalMonthlyCents: integer('additional_monthly_cents').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('household_pricing_rules_program_id_unique').on(table.programId),
])

export const conversions = sqliteTable('conversions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadLineId: integer('lead_line_id').notNull().references(() => leadLines.id),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  programId: integer('program_id').notNull().references(() => programs.id),
  membershipOfferingId: integer('membership_offering_id').references(() => membershipOfferings.id),
  offeringName: text('offering_name'),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull(),
  monthlyCents: integer('monthly_cents').notNull(),
  enrollmentCents: integer('enrollment_cents').notNull().default(0),
  discountReason: text('discount_reason'),
  overridden: integer('overridden', { mode: 'boolean' }).notNull().default(false),
  note: text('note'),
  convertedByUserId: integer('converted_by_user_id').references(() => users.id),
  reversedAt: integer('reversed_at', { mode: 'timestamp_ms' }),
  reversedByUserId: integer('reversed_by_user_id').references(() => users.id),
  reverseNote: text('reverse_note'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('conversions_lead_line_id_idx').on(table.leadLineId),
  index('conversions_lead_id_idx').on(table.leadId),
  uniqueIndex('conversions_active_lead_line_unique').on(table.leadLineId).where(sql`${table.reversedAt} is null`),
])

export const compensationAttributions = sqliteTable('compensation_attributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadLineId: integer('lead_line_id').notNull().references(() => leadLines.id),
  creditedUserId: integer('credited_user_id').references(() => users.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  campaignTrackingLinkId: integer('campaign_tracking_link_id').references(() => campaignTrackingLinks.id),
  eventId: integer('event_id').references(() => acquisitionEvents.id),
  establishedAt: integer('established_at', { mode: 'timestamp_ms' }).notNull(),
  method: text('method').notNull(),
  origin: text('origin').notNull(),
  eligibility: text('eligibility').notNull().default('UNASSIGNED'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('compensation_attributions_lead_line_id_unique').on(table.leadLineId),
  index('compensation_attributions_credited_user_id_idx').on(table.creditedUserId),
])

export const compensationAttributionHistory = sqliteTable('compensation_attribution_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadLineId: integer('lead_line_id').notNull().references(() => leadLines.id),
  attributionId: integer('attribution_id').references(() => compensationAttributions.id),
  creditedUserId: integer('credited_user_id').references(() => users.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  campaignTrackingLinkId: integer('campaign_tracking_link_id').references(() => campaignTrackingLinks.id),
  eventId: integer('event_id').references(() => acquisitionEvents.id),
  method: text('method').notNull(),
  origin: text('origin').notNull(),
  eligibility: text('eligibility').notNull(),
  reason: text('reason'),
  actorUserId: integer('actor_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  index('compensation_attribution_history_lead_line_id_idx').on(table.leadLineId),
])

export const compensationEarned = sqliteTable('compensation_earned', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadLineId: integer('lead_line_id').notNull().references(() => leadLines.id),
  conversionId: integer('conversion_id').notNull().references(() => conversions.id),
  creditedUserId: integer('credited_user_id').notNull().references(() => users.id),
  campaignId: integer('campaign_id'),
  campaignTrackingLinkId: integer('campaign_tracking_link_id'),
  eventId: integer('event_id'),
  offeringName: text('offering_name'),
  monthlyCents: integer('monthly_cents').notNull(),
  basis: text('basis').notNull(),
  basisBps: integer('basis_bps').notNull(),
  amountCents: integer('amount_cents').notNull(),
  earnedAt: integer('earned_at', { mode: 'timestamp_ms' }).notNull(),
  paymentStatus: text('payment_status').notNull().default('UNPAID'),
  paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
  paidByUserId: integer('paid_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('compensation_earned_conversion_id_unique').on(table.conversionId),
  index('compensation_earned_credited_user_id_idx').on(table.creditedUserId),
  index('compensation_earned_payment_status_idx').on(table.paymentStatus),
])

export const leadLineLostOutcomes = sqliteTable('lead_line_lost_outcomes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadLineId: integer('lead_line_id').notNull().references(() => leadLines.id),
  leadId: integer('lead_id').notNull().references(() => leads.id),
  lostReasonId: integer('lost_reason_id').notNull().references(() => lostReasons.id),
  note: text('note'),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  reopenedAt: integer('reopened_at', { mode: 'timestamp_ms' }),
  reopenedByUserId: integer('reopened_by_user_id').references(() => users.id),
}, table => [
  index('lead_line_lost_outcomes_lead_line_id_idx').on(table.leadLineId),
  index('lead_line_lost_outcomes_lead_id_idx').on(table.leadId),
])

export const usersRelations = relations(users, ({ one, many }) => ({
  userType: one(userTypes, {
    fields: [users.userTypeId],
    references: [userTypes.id],
  }),
  assignedTasks: many(followUpTasks, { relationName: 'followUpAssignedUser' }),
  completedTasks: many(followUpTasks, { relationName: 'followUpCompletedBy' }),
  statusChanges: many(leadStatusHistory),
  notes: many(leadNotes),
  securityEventsAsActor: many(securityEvents, { relationName: 'securityEventActor' }),
  securityEventsAsTarget: many(securityEvents, { relationName: 'securityEventTarget' }),
  appSettingsUpdates: many(appSettings),
  extraRoleAssignments: many(userRoleAssignments, { relationName: 'userRoleAssignmentUser' }),
}))

export const userTypesRelations = relations(userTypes, ({ many }) => ({
  users: many(users),
  typeRoles: many(userTypeRoles),
}))

export const userRolesRelations = relations(userRoles, ({ many }) => ({
  typeRoles: many(userTypeRoles),
  accessRights: many(userRoleAccessRights),
  assignments: many(userRoleAssignments),
}))

export const userTypeRolesRelations = relations(userTypeRoles, ({ one }) => ({
  userType: one(userTypes, {
    fields: [userTypeRoles.userTypeId],
    references: [userTypes.id],
  }),
  userRole: one(userRoles, {
    fields: [userTypeRoles.userRoleId],
    references: [userRoles.id],
  }),
}))

export const userRoleAccessRightsRelations = relations(userRoleAccessRights, ({ one }) => ({
  userRole: one(userRoles, {
    fields: [userRoleAccessRights.userRoleId],
    references: [userRoles.id],
  }),
}))

export const userRoleAssignmentsRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userRoleAssignments.userId],
    references: [users.id],
    relationName: 'userRoleAssignmentUser',
  }),
  userRole: one(userRoles, {
    fields: [userRoleAssignments.userRoleId],
    references: [userRoles.id],
  }),
  createdBy: one(users, {
    fields: [userRoleAssignments.createdByUserId],
    references: [users.id],
    relationName: 'userRoleAssignmentCreatedBy',
  }),
}))

export const programsRelations = relations(programs, ({ many }) => ({
  leads: many(leads),
  leadLines: many(leadLines),
  introRules: many(introAvailabilityRules),
  membershipOfferings: many(membershipOfferings),
  householdPricingRules: many(householdPricingRules),
}))

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  owner: one(users, {
    fields: [campaigns.ownerUserId],
    references: [users.id],
    relationName: 'campaignOwner',
  }),
  leads: many(leads),
  trackingLinks: many(campaignTrackingLinks),
  metaMaps: many(campaignMetaMaps),
  collaborators: many(campaignCollaborators),
  programs: many(campaignPrograms),
}))

export const campaignCollaboratorsRelations = relations(campaignCollaborators, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignCollaborators.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [campaignCollaborators.userId],
    references: [users.id],
  }),
}))

export const campaignProgramsRelations = relations(campaignPrograms, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignPrograms.campaignId],
    references: [campaigns.id],
  }),
  program: one(programs, {
    fields: [campaignPrograms.programId],
    references: [programs.id],
  }),
}))

export const marketingTasksRelations = relations(marketingTasks, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [marketingTasks.campaignId],
    references: [campaigns.id],
  }),
  contentItem: one(contentItems, {
    fields: [marketingTasks.contentItemId],
    references: [contentItems.id],
  }),
  asset: one(assets, {
    fields: [marketingTasks.assetId],
    references: [assets.id],
  }),
  event: one(acquisitionEvents, {
    fields: [marketingTasks.eventId],
    references: [acquisitionEvents.id],
  }),
  assignee: one(users, {
    fields: [marketingTasks.assigneeUserId],
    references: [users.id],
    relationName: 'marketingTaskAssignee',
  }),
  createdBy: one(users, {
    fields: [marketingTasks.createdByUserId],
    references: [users.id],
    relationName: 'marketingTaskCreatedBy',
  }),
  completedBy: one(users, {
    fields: [marketingTasks.completedByUserId],
    references: [users.id],
    relationName: 'marketingTaskCompletedBy',
  }),
}))

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [contentItems.campaignId],
    references: [campaigns.id],
  }),
  publisher: one(users, {
    fields: [contentItems.publisherUserId],
    references: [users.id],
    relationName: 'contentPublisher',
  }),
  approvedBy: one(users, {
    fields: [contentItems.approvedByUserId],
    references: [users.id],
    relationName: 'contentApprover',
  }),
  channels: many(contentItemChannels),
  publications: many(contentPublications),
}))

export const contentItemChannelsRelations = relations(contentItemChannels, ({ one }) => ({
  contentItem: one(contentItems, {
    fields: [contentItemChannels.contentItemId],
    references: [contentItems.id],
  }),
}))

export const contentPublicationsRelations = relations(contentPublications, ({ one }) => ({
  contentItem: one(contentItems, {
    fields: [contentPublications.contentItemId],
    references: [contentItems.id],
  }),
  recordedBy: one(users, {
    fields: [contentPublications.recordedByUserId],
    references: [users.id],
  }),
}))

export const assetsRelations = relations(assets, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [assets.uploadedByUserId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [assets.campaignId],
    references: [campaigns.id],
  }),
  contentItem: one(contentItems, {
    fields: [assets.contentItemId],
    references: [contentItems.id],
  }),
  usages: many(assetUsages),
}))

export const assetUsagesRelations = relations(assetUsages, ({ one }) => ({
  asset: one(assets, {
    fields: [assetUsages.assetId],
    references: [assets.id],
  }),
  contentItem: one(contentItems, {
    fields: [assetUsages.contentItemId],
    references: [contentItems.id],
  }),
  campaign: one(campaigns, {
    fields: [assetUsages.campaignId],
    references: [campaigns.id],
  }),
}))

export const acquisitionEventsRelations = relations(acquisitionEvents, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [acquisitionEvents.campaignId],
    references: [campaigns.id],
  }),
  program: one(programs, {
    fields: [acquisitionEvents.programId],
    references: [programs.id],
  }),
  createdBy: one(users, {
    fields: [acquisitionEvents.createdByUserId],
    references: [users.id],
  }),
  sessions: many(acquisitionEventSessions),
  questions: many(acquisitionEventQuestions),
  registrations: many(acquisitionEventRegistrations),
}))

export const acquisitionEventSessionsRelations = relations(acquisitionEventSessions, ({ one, many }) => ({
  event: one(acquisitionEvents, {
    fields: [acquisitionEventSessions.eventId],
    references: [acquisitionEvents.id],
  }),
  program: one(programs, {
    fields: [acquisitionEventSessions.programId],
    references: [programs.id],
  }),
  lines: many(acquisitionEventRegistrationLines),
}))

export const acquisitionEventQuestionsRelations = relations(acquisitionEventQuestions, ({ one, many }) => ({
  event: one(acquisitionEvents, {
    fields: [acquisitionEventQuestions.eventId],
    references: [acquisitionEvents.id],
  }),
  answers: many(acquisitionEventQuestionAnswers),
}))

export const acquisitionEventRegistrationsRelations = relations(acquisitionEventRegistrations, ({ one, many }) => ({
  event: one(acquisitionEvents, {
    fields: [acquisitionEventRegistrations.eventId],
    references: [acquisitionEvents.id],
  }),
  campaign: one(campaigns, {
    fields: [acquisitionEventRegistrations.campaignId],
    references: [campaigns.id],
  }),
  trackingLink: one(campaignTrackingLinks, {
    fields: [acquisitionEventRegistrations.campaignTrackingLinkId],
    references: [campaignTrackingLinks.id],
  }),
  lead: one(leads, {
    fields: [acquisitionEventRegistrations.leadId],
    references: [leads.id],
  }),
  createdBy: one(users, {
    fields: [acquisitionEventRegistrations.createdByUserId],
    references: [users.id],
  }),
  lines: many(acquisitionEventRegistrationLines),
  answers: many(acquisitionEventQuestionAnswers),
  history: many(acquisitionEventRegistrationHistory),
  communicationIntents: many(acquisitionEventCommunicationIntents),
}))

export const acquisitionEventRegistrationLinesRelations = relations(acquisitionEventRegistrationLines, ({ one }) => ({
  registration: one(acquisitionEventRegistrations, {
    fields: [acquisitionEventRegistrationLines.registrationId],
    references: [acquisitionEventRegistrations.id],
  }),
  session: one(acquisitionEventSessions, {
    fields: [acquisitionEventRegistrationLines.sessionId],
    references: [acquisitionEventSessions.id],
  }),
  leadLine: one(leadLines, {
    fields: [acquisitionEventRegistrationLines.leadLineId],
    references: [leadLines.id],
  }),
}))

export const acquisitionEventQuestionAnswersRelations = relations(acquisitionEventQuestionAnswers, ({ one }) => ({
  registration: one(acquisitionEventRegistrations, {
    fields: [acquisitionEventQuestionAnswers.registrationId],
    references: [acquisitionEventRegistrations.id],
  }),
  question: one(acquisitionEventQuestions, {
    fields: [acquisitionEventQuestionAnswers.questionId],
    references: [acquisitionEventQuestions.id],
  }),
}))

export const acquisitionEventRegistrationHistoryRelations = relations(acquisitionEventRegistrationHistory, ({ one }) => ({
  registration: one(acquisitionEventRegistrations, {
    fields: [acquisitionEventRegistrationHistory.registrationId],
    references: [acquisitionEventRegistrations.id],
  }),
  actor: one(users, {
    fields: [acquisitionEventRegistrationHistory.actorUserId],
    references: [users.id],
  }),
}))

export const acquisitionEventCommunicationIntentsRelations = relations(acquisitionEventCommunicationIntents, ({ one }) => ({
  registration: one(acquisitionEventRegistrations, {
    fields: [acquisitionEventCommunicationIntents.registrationId],
    references: [acquisitionEventRegistrations.id],
  }),
}))

export const campaignTrackingLinksRelations = relations(campaignTrackingLinks, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [campaignTrackingLinks.campaignId],
    references: [campaigns.id],
  }),
  leads: many(leads),
}))

export const leadsRelations = relations(leads, ({ one, many }) => ({
  program: one(programs, {
    fields: [leads.programId],
    references: [programs.id],
  }),
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id],
  }),
  trackingLink: one(campaignTrackingLinks, {
    fields: [leads.campaignTrackingLinkId],
    references: [campaignTrackingLinks.id],
  }),
  statusHistory: many(leadStatusHistory),
  notes: many(leadNotes),
  lines: many(leadLines),
  trials: many(trials),
  followUpTasks: many(followUpTasks),
  possibleDuplicates: many(leadPossibleDuplicates, {
    relationName: 'leadPossibleDuplicatesSource',
  }),
  publicBookingSubmissions: many(publicBookingSubmissions),
  eventRegistrations: many(acquisitionEventRegistrations),
}))

export const publicBookingSubmissionsRelations = relations(publicBookingSubmissions, ({ one }) => ({
  lead: one(leads, {
    fields: [publicBookingSubmissions.leadId],
    references: [leads.id],
  }),
}))

export const leadPossibleDuplicatesRelations = relations(leadPossibleDuplicates, ({ one }) => ({
  lead: one(leads, {
    fields: [leadPossibleDuplicates.leadId],
    references: [leads.id],
    relationName: 'leadPossibleDuplicatesSource',
  }),
  matchedLead: one(leads, {
    fields: [leadPossibleDuplicates.matchedLeadId],
    references: [leads.id],
    relationName: 'leadPossibleDuplicatesMatched',
  }),
}))

export const leadLinesRelations = relations(leadLines, ({ one, many }) => ({
  lead: one(leads, {
    fields: [leadLines.leadId],
    references: [leads.id],
  }),
  program: one(programs, {
    fields: [leadLines.programId],
    references: [programs.id],
  }),
  membershipOffering: one(membershipOfferings, {
    fields: [leadLines.membershipOfferingId],
    references: [membershipOfferings.id],
  }),
  trials: many(trials),
  statusHistory: many(leadLineStatusHistory),
  followUpTaskLines: many(followUpTaskLines),
  conversions: many(conversions),
  lostOutcomes: many(leadLineLostOutcomes),
  eventRegistrationLines: many(acquisitionEventRegistrationLines),
}))

export const leadLineStatusHistoryRelations = relations(leadLineStatusHistory, ({ one }) => ({
  line: one(leadLines, {
    fields: [leadLineStatusHistory.leadLineId],
    references: [leadLines.id],
  }),
  lead: one(leads, {
    fields: [leadLineStatusHistory.leadId],
    references: [leads.id],
  }),
  changedBy: one(users, {
    fields: [leadLineStatusHistory.changedByUserId],
    references: [users.id],
  }),
}))

export const leadStatusHistoryRelations = relations(leadStatusHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [leadStatusHistory.leadId],
    references: [leads.id],
  }),
  changedBy: one(users, {
    fields: [leadStatusHistory.changedByUserId],
    references: [users.id],
  }),
}))

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, {
    fields: [leadNotes.leadId],
    references: [leads.id],
  }),
  createdBy: one(users, {
    fields: [leadNotes.createdByUserId],
    references: [users.id],
  }),
}))

export const trialsRelations = relations(trials, ({ one, many }) => ({
  lead: one(leads, {
    fields: [trials.leadId],
    references: [leads.id],
  }),
  leadLine: one(leadLines, {
    fields: [trials.leadLineId],
    references: [leadLines.id],
  }),
  followUpTasks: many(followUpTasks),
}))

export const followUpTasksRelations = relations(followUpTasks, ({ one, many }) => ({
  lead: one(leads, {
    fields: [followUpTasks.leadId],
    references: [leads.id],
  }),
  trial: one(trials, {
    fields: [followUpTasks.trialId],
    references: [trials.id],
  }),
  sourceEvent: one(acquisitionEvents, {
    fields: [followUpTasks.sourceEventId],
    references: [acquisitionEvents.id],
  }),
  assignedUser: one(users, {
    fields: [followUpTasks.assignedUserId],
    references: [users.id],
    relationName: 'followUpAssignedUser',
  }),
  completedBy: one(users, {
    fields: [followUpTasks.completedByUserId],
    references: [users.id],
    relationName: 'followUpCompletedBy',
  }),
  lineLinks: many(followUpTaskLines),
}))

export const followUpTaskLinesRelations = relations(followUpTaskLines, ({ one }) => ({
  task: one(followUpTasks, {
    fields: [followUpTaskLines.taskId],
    references: [followUpTasks.id],
  }),
  leadLine: one(leadLines, {
    fields: [followUpTaskLines.leadLineId],
    references: [leadLines.id],
  }),
}))

export const introAvailabilityRulesRelations = relations(introAvailabilityRules, ({ one, many }) => ({
  program: one(programs, {
    fields: [introAvailabilityRules.programId],
    references: [programs.id],
  }),
  exceptions: many(introExceptions),
}))

export const introExceptionsRelations = relations(introExceptions, ({ one }) => ({
  rule: one(introAvailabilityRules, {
    fields: [introExceptions.ruleId],
    references: [introAvailabilityRules.id],
  }),
  program: one(programs, {
    fields: [introExceptions.programId],
    references: [programs.id],
  }),
}))

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  actor: one(users, {
    fields: [securityEvents.actorUserId],
    references: [users.id],
    relationName: 'securityEventActor',
  }),
  target: one(users, {
    fields: [securityEvents.targetUserId],
    references: [users.id],
    relationName: 'securityEventTarget',
  }),
}))

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
  updatedBy: one(users, {
    fields: [appSettings.updatedByUserId],
    references: [users.id],
  }),
}))

export const membershipOfferingsRelations = relations(membershipOfferings, ({ one, many }) => ({
  program: one(programs, {
    fields: [membershipOfferings.programId],
    references: [programs.id],
  }),
  leadLines: many(leadLines),
  conversions: many(conversions),
}))

export const conversionsRelations = relations(conversions, ({ one }) => ({
  leadLine: one(leadLines, {
    fields: [conversions.leadLineId],
    references: [leadLines.id],
  }),
  lead: one(leads, {
    fields: [conversions.leadId],
    references: [leads.id],
  }),
  program: one(programs, {
    fields: [conversions.programId],
    references: [programs.id],
  }),
  membershipOffering: one(membershipOfferings, {
    fields: [conversions.membershipOfferingId],
    references: [membershipOfferings.id],
  }),
  convertedBy: one(users, {
    fields: [conversions.convertedByUserId],
    references: [users.id],
    relationName: 'conversionConvertedBy',
  }),
  reversedBy: one(users, {
    fields: [conversions.reversedByUserId],
    references: [users.id],
    relationName: 'conversionReversedBy',
  }),
}))

export const compensationAttributionsRelations = relations(compensationAttributions, ({ one, many }) => ({
  leadLine: one(leadLines, {
    fields: [compensationAttributions.leadLineId],
    references: [leadLines.id],
  }),
  creditedUser: one(users, {
    fields: [compensationAttributions.creditedUserId],
    references: [users.id],
    relationName: 'compensationCreditedUser',
  }),
  campaign: one(campaigns, {
    fields: [compensationAttributions.campaignId],
    references: [campaigns.id],
  }),
  event: one(acquisitionEvents, {
    fields: [compensationAttributions.eventId],
    references: [acquisitionEvents.id],
  }),
  history: many(compensationAttributionHistory),
}))

export const compensationAttributionHistoryRelations = relations(compensationAttributionHistory, ({ one }) => ({
  attribution: one(compensationAttributions, {
    fields: [compensationAttributionHistory.attributionId],
    references: [compensationAttributions.id],
  }),
  actor: one(users, {
    fields: [compensationAttributionHistory.actorUserId],
    references: [users.id],
  }),
}))

export const compensationEarnedRelations = relations(compensationEarned, ({ one }) => ({
  leadLine: one(leadLines, {
    fields: [compensationEarned.leadLineId],
    references: [leadLines.id],
  }),
  conversion: one(conversions, {
    fields: [compensationEarned.conversionId],
    references: [conversions.id],
  }),
  creditedUser: one(users, {
    fields: [compensationEarned.creditedUserId],
    references: [users.id],
    relationName: 'compensationEarnedUser',
  }),
}))

export const leadLineLostOutcomesRelations = relations(leadLineLostOutcomes, ({ one }) => ({
  leadLine: one(leadLines, {
    fields: [leadLineLostOutcomes.leadLineId],
    references: [leadLines.id],
  }),
  lead: one(leads, {
    fields: [leadLineLostOutcomes.leadId],
    references: [leads.id],
  }),
  lostReason: one(lostReasons, {
    fields: [leadLineLostOutcomes.lostReasonId],
    references: [lostReasons.id],
  }),
  createdBy: one(users, {
    fields: [leadLineLostOutcomes.createdByUserId],
    references: [users.id],
    relationName: 'lostOutcomeCreatedBy',
  }),
  reopenedBy: one(users, {
    fields: [leadLineLostOutcomes.reopenedByUserId],
    references: [users.id],
    relationName: 'lostOutcomeReopenedBy',
  }),
}))

export const lostReasonsRelations = relations(lostReasons, ({ many }) => ({
  outcomes: many(leadLineLostOutcomes),
}))

export const householdPricingRulesRelations = relations(householdPricingRules, ({ one }) => ({
  program: one(programs, {
    fields: [householdPricingRules.programId],
    references: [programs.id],
  }),
}))

export const metaAdAccounts = sqliteTable('meta_ad_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  externalId: text('external_id').notNull(),
  name: text('name'),
  currency: text('currency'),
  timezoneName: text('timezone_name'),
  accountStatus: integer('account_status'),
  rawJson: text('raw_json'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('meta_ad_accounts_external_id_unique').on(table.externalId),
])

export const metaCampaigns = sqliteTable('meta_campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adAccountId: integer('ad_account_id').notNull().references(() => metaAdAccounts.id),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
  status: text('status'),
  effectiveStatus: text('effective_status'),
  objective: text('objective'),
  rawJson: text('raw_json'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('meta_campaigns_external_id_unique').on(table.externalId),
  index('meta_campaigns_ad_account_id_idx').on(table.adAccountId),
])

export const metaAdSets = sqliteTable('meta_ad_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  metaCampaignId: integer('meta_campaign_id').notNull().references(() => metaCampaigns.id),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
  status: text('status'),
  effectiveStatus: text('effective_status'),
  rawJson: text('raw_json'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('meta_ad_sets_external_id_unique').on(table.externalId),
  index('meta_ad_sets_meta_campaign_id_idx').on(table.metaCampaignId),
])

export const metaAds = sqliteTable('meta_ads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  metaAdSetId: integer('meta_ad_set_id').notNull().references(() => metaAdSets.id),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
  status: text('status'),
  effectiveStatus: text('effective_status'),
  rawJson: text('raw_json'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('meta_ads_external_id_unique').on(table.externalId),
  index('meta_ads_meta_ad_set_id_idx').on(table.metaAdSetId),
])

export const metaDailyMetrics = sqliteTable('meta_daily_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityExternalId: text('entity_external_id').notNull(),
  metricDate: text('metric_date').notNull(),
  spendCents: integer('spend_cents').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  reach: integer('reach').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  ctr: text('ctr'),
  cpc: text('cpc'),
  cpm: text('cpm'),
  leadsCount: integer('leads_count').notNull().default(0),
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('meta_daily_metrics_entity_date_unique').on(table.entityType, table.entityExternalId, table.metricDate),
  index('meta_daily_metrics_entity_idx').on(table.entityType, table.entityExternalId),
])

export const metaSyncRuns = sqliteTable('meta_sync_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull().default('META'),
  status: text('status').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  recordsFetched: integer('records_fetched').notNull().default(0),
  recordsInserted: integer('records_inserted').notNull().default(0),
  recordsUpdated: integer('records_updated').notNull().default(0),
  errorSummary: text('error_summary'),
  triggeredByUserId: integer('triggered_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const campaignMetaMaps = sqliteTable('campaign_meta_maps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id),
  metaCampaignId: integer('meta_campaign_id').notNull().references(() => metaCampaigns.id),
  createdByUserId: integer('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('campaign_meta_maps_pair_unique').on(table.campaignId, table.metaCampaignId),
  index('campaign_meta_maps_campaign_id_idx').on(table.campaignId),
  index('campaign_meta_maps_meta_campaign_id_idx').on(table.metaCampaignId),
])

export const metaAdAccountsRelations = relations(metaAdAccounts, ({ many }) => ({
  campaigns: many(metaCampaigns),
}))

export const metaCampaignsRelations = relations(metaCampaigns, ({ one, many }) => ({
  adAccount: one(metaAdAccounts, {
    fields: [metaCampaigns.adAccountId],
    references: [metaAdAccounts.id],
  }),
  adSets: many(metaAdSets),
  maps: many(campaignMetaMaps),
}))

export const metaAdSetsRelations = relations(metaAdSets, ({ one, many }) => ({
  campaign: one(metaCampaigns, {
    fields: [metaAdSets.metaCampaignId],
    references: [metaCampaigns.id],
  }),
  ads: many(metaAds),
}))

export const metaAdsRelations = relations(metaAds, ({ one }) => ({
  adSet: one(metaAdSets, {
    fields: [metaAds.metaAdSetId],
    references: [metaAdSets.id],
  }),
}))

export const campaignMetaMapsRelations = relations(campaignMetaMaps, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignMetaMaps.campaignId],
    references: [campaigns.id],
  }),
  metaCampaign: one(metaCampaigns, {
    fields: [campaignMetaMaps.metaCampaignId],
    references: [metaCampaigns.id],
  }),
}))
