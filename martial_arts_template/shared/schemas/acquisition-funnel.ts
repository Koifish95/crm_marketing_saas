import { z } from 'zod'
import {
  AGE_BANDS,
  BOOKING_FAILURE_CATEGORIES,
  FUNNEL_PROGRAMS,
  PARTICIPANT_PATHS,
} from '../utils/acquisition-funnel'

const attributionFields = {
  campaign: z.string().trim().max(80).optional(),
  trackingCode: z.string().trim().max(32).optional(),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmContent: z.string().trim().max(80).optional(),
  utmTerm: z.string().trim().max(80).optional(),
  route: z.string().trim().max(80).optional(),
}

const emptyMetadata = z.strictObject({}).optional()

export const publicAcquisitionEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('trial_page_viewed'),
    metadata: emptyMetadata,
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('booking_started'),
    metadata: emptyMetadata,
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('participant_path_selected'),
    metadata: z.strictObject({
      path: z.enum(PARTICIPANT_PATHS),
    }),
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('program_selected'),
    metadata: z.strictObject({
      program: z.enum(FUNNEL_PROGRAMS),
    }),
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('availability_result'),
    metadata: z.strictObject({
      program: z.enum(FUNNEL_PROGRAMS),
      ageBand: z.enum(AGE_BANDS),
      outcome: z.literal('ERROR'),
    }),
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('class_time_selected'),
    metadata: z.strictObject({
      slotId: z.string().regex(/^(?:rule:\d+:\d{4}-\d{2}-\d{2}|exception:\d+)$/),
      program: z.enum(FUNNEL_PROGRAMS),
      weekday: z.number().int().min(0).max(6),
      timeBucket: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
      startMinute: z.number().int().min(0).max(1439),
      daysAhead: z.number().int().min(0).max(30),
    }),
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('contact_step_reached'),
    metadata: emptyMetadata,
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('booking_submit_attempted'),
    metadata: z.strictObject({
      idempotencyKey: z.string().uuid(),
    }),
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('booking_failed'),
    metadata: z.strictObject({
      category: z.enum(BOOKING_FAILURE_CATEGORIES),
      idempotencyKey: z.string().uuid().optional(),
    }),
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('phone_clicked'),
    metadata: z.strictObject({
      placement: z.enum(['supporting', 'confirmation']),
    }),
    ...attributionFields,
  }),
  z.strictObject({
    type: z.literal('directions_clicked'),
    metadata: z.strictObject({
      placement: z.enum(['supporting', 'confirmation']),
    }),
    ...attributionFields,
  }),
])

export type PublicAcquisitionEvent = z.infer<typeof publicAcquisitionEventSchema>

export const acquisitionFunnelRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
