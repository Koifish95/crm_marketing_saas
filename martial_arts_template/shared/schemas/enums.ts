import { z } from 'zod'

export const experienceLevelSchema = z.enum([
  'NONE',
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'UNKNOWN',
])

export const leadSourceSchema = z.enum([
  'INSTAGRAM',
  'FACEBOOK',
  'WALK_IN',
  'REFERRAL',
  'WEBSITE',
  'PHONE',
  'OTHER',
])

export const leadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'RESPONDED',
  'TRIAL_SCHEDULED',
  'TRIAL_ATTENDED',
  'NO_SHOW',
  'JOINED',
  'LOST',
])

export const householdStatusFilterSchema = z.enum([
  'NEW',
  'CONTACTED',
  'RESPONDED',
  'TRIAL_SCHEDULED',
  'TRIAL_ATTENDED',
  'NO_SHOW',
  'JOINED',
  'LOST',
  'ACTIVE',
  'ACTIVE_MIXED',
  'CLOSED_MIXED',
])

export const trialStatusSchema = z.enum([
  'SCHEDULED',
  'ATTENDED',
  'NO_SHOW',
  'CANCELLED',
])

export const followUpTaskTypeSchema = z.enum(['PHONE_CALL'])

export const followUpTaskStatusSchema = z.enum([
  'PENDING',
  'COMPLETED',
  'CANCELLED',
])

export const followUpTaskPurposeSchema = z.enum([
  'INITIAL_SCHEDULE',
  'EVENT_FOLLOW_UP',
  'MANUAL',
])

export const acquisitionEventStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'COMPLETED',
  'CANCELLED',
])

export const eventAttendanceSchema = z.enum([
  'REGISTERED',
  'ATTENDED',
  'NO_SHOW',
  'CANCELLED',
])

export const eventQuestionFieldTypeSchema = z.enum([
  'SHORT_TEXT',
  'YES_NO',
  'SINGLE_CHOICE',
])

export const followUpCallOutcomeSchema = z.enum([
  'REACHED',
  'NO_ANSWER',
  'LEFT_VOICEMAIL',
  'WRONG_NUMBER',
  'OTHER',
])

export const userRoleSchema = z.enum(['ADMIN', 'STAFF', 'VIEWER'])

export const campaignStatusSchema = z.enum([
  'DRAFT',
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
])

export const marketingTaskTypeSchema = z.enum([
  'ASSET_REQUEST',
  'DRAFT_CAPTION',
  'PREPARE_CREATIVE',
  'CREATE_TRACKING_LINK',
  'REVIEW',
  'PUBLISH',
  'REVIEW_PERFORMANCE',
  'WEEKLY_SUMMARY',
  'OTHER',
])

export const marketingTaskStatusSchema = z.enum([
  'PENDING',
  'COMPLETED',
  'CANCELLED',
])

export const contentStatusSchema = z.enum([
  'IDEA',
  'NEEDS_ASSETS',
  'DRAFT',
  'NEEDS_REVIEW',
  'APPROVED',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'CANCELLED',
])

export const contentChannelSchema = z.enum(['FACEBOOK', 'INSTAGRAM', 'OTHER'])

export const assetMarketingUseSchema = z.enum([
  'UNKNOWN',
  'APPROVED',
  'RESTRICTED',
  'DO_NOT_USE',
])

export const accessRightSchema = z.enum([
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
])

export const leadLineRelationshipSchema = z.enum([
  'SELF',
  'CHILD',
  'SPOUSE',
  'OTHER',
])

export const contactMatchKindSchema = z.enum(['PHONE', 'EMAIL', 'BOTH'])

export type ExperienceLevel = z.infer<typeof experienceLevelSchema>
export type LeadSource = z.infer<typeof leadSourceSchema>
export type LeadStatus = z.infer<typeof leadStatusSchema>
export type HouseholdStatusFilter = z.infer<typeof householdStatusFilterSchema>
export type TrialStatus = z.infer<typeof trialStatusSchema>
export type FollowUpTaskType = z.infer<typeof followUpTaskTypeSchema>
export type FollowUpTaskStatus = z.infer<typeof followUpTaskStatusSchema>
export type FollowUpTaskPurpose = z.infer<typeof followUpTaskPurposeSchema>
export type AcquisitionEventStatus = z.infer<typeof acquisitionEventStatusSchema>
export type EventAttendance = z.infer<typeof eventAttendanceSchema>
export type EventQuestionFieldType = z.infer<typeof eventQuestionFieldTypeSchema>

export const compensationMethodSchema = z.enum([
  'TRACKING_LINK',
  'CAMPAIGN',
  'EVENT',
  'MANUAL',
])

export const compensationOriginSchema = z.enum(['SYSTEM', 'MANUAL'])

export const compensationEligibilitySchema = z.enum([
  'UNASSIGNED',
  'ELIGIBLE',
  'INELIGIBLE',
])

export const compensationPaymentStatusSchema = z.enum(['UNPAID', 'PAID'])
export type FollowUpCallOutcome = z.infer<typeof followUpCallOutcomeSchema>
export type UserRole = z.infer<typeof userRoleSchema>
export type CampaignStatus = z.infer<typeof campaignStatusSchema>
export type MarketingTaskType = z.infer<typeof marketingTaskTypeSchema>
export type MarketingTaskStatus = z.infer<typeof marketingTaskStatusSchema>
export type ContentStatus = z.infer<typeof contentStatusSchema>
export type ContentChannel = z.infer<typeof contentChannelSchema>
export type AssetMarketingUse = z.infer<typeof assetMarketingUseSchema>
export type AccessRight = z.infer<typeof accessRightSchema>
export type LeadLineRelationship = z.infer<typeof leadLineRelationshipSchema>
export type ContactMatchKind = z.infer<typeof contactMatchKindSchema>
export type CompensationMethod = z.infer<typeof compensationMethodSchema>
export type CompensationOrigin = z.infer<typeof compensationOriginSchema>
export type CompensationEligibility = z.infer<typeof compensationEligibilitySchema>
export type CompensationPaymentStatus = z.infer<typeof compensationPaymentStatusSchema>
