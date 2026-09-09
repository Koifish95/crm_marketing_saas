export interface LeadRecord {
  id: number
  firstName: string
  lastName: string | null
  phone?: string | null
  email?: string | null
  programId: number
  experienceLevel: string
  source: string
  status: string
  participantFirstName?: string | null
  participantLastName?: string | null
  participantAge?: number | null
  guardianRelationship?: string | null
  campaignId?: number | null
  campaignTrackingLinkId?: number | null
  utmSource?: string | null
  utmMedium?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  joinedAt?: string | Date | null
  monthlyRateCents?: number | null
  closedAt?: string | Date | null
  createdAt?: string | Date
  program?: { id: number, code: string, name: string }
  campaign?: { id: number, name: string } | null
  trackingLink?: { id: number, label: string } | null
  acquisitionEvents?: Array<{
    id: number
    title: string
    sessions: Array<{ id: number, name: string }>
  }>
  lines?: Array<{
    id: number
    leadId: number
    relationship: string
    firstName: string
    lastName?: string | null
    age?: number | null
    programId: number
    experienceLevel: string
    notes?: string | null
    status: string
    membershipOfferingId?: number | null
    monthlyOverrideCents?: number | null
    discountReason?: string | null
    program?: { id: number, code: string, name: string }
    membershipOffering?: { id: number, name: string, monthlyCents: number, enrollmentCents: number, active: boolean } | null
    conversions?: Array<{
      id: number
      monthlyCents: number
      enrollmentCents: number
      offeringName?: string | null
      joinedAt: string | Date
      reversedAt?: string | Date | null
      discountReason?: string | null
      overridden?: boolean
    }>
    lostOutcomes?: Array<{
      id: number
      note?: string | null
      createdAt: string | Date
      reopenedAt?: string | Date | null
      lostReason?: { id: number, name: string } | null
    }>
    trials?: Array<{
      id: number
      status: string
      scheduledAt: string | Date
      label?: string | null
      canRecordTrialOutcome?: boolean
    }>
    compensationAttribution?: {
      id: number
      creditedUserId: number | null
      method: string
      origin: string
      eligibility: string
      establishedAt: string | Date
      creditedUser?: { id: number, displayName: string, role: string } | null
      campaign?: { id: number, name: string } | null
      event?: { id: number, title: string } | null
      history?: Array<{
        id: number
        creditedUserId: number | null
        method: string
        origin: string
        eligibility: string
        reason?: string | null
        createdAt: string | Date
        actor?: { id: number, displayName: string, role: string } | null
      }>
    } | null
    compensationEarned?: Array<{
      id: number
      amountCents: number
      monthlyCents: number
      basisBps: number
      offeringName?: string | null
      paymentStatus: 'UNPAID' | 'PAID'
      earnedAt: string | Date
      paidAt?: string | Date | null
    }>
  }>
  nextTrial?: { scheduledAt: string | Date, personName?: string | null } | null
  trials?: Array<{
    id: number
    status: string
    scheduledAt: string | Date
    label?: string | null
    leadLineId?: number | null
    canRecordTrialOutcome?: boolean
  }>
  notes?: Array<{ id: number, body: string, createdAt: string | Date }>
  statusHistory?: Array<{ id: number, fromStatus?: string | null, toStatus: string, note?: string | null }>
  followUpTasks?: Array<{
    id: number
    type: string
    purpose?: string
    status: string
    dueAt: string | Date
    outcome?: string | null
    notes?: string | null
    completedAt?: string | Date | null
    dueState?: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | null
    overdue?: boolean
    lead?: { id: number, firstName: string, lastName: string | null, phone: string | null } | null
    trial?: { id: number, label: string | null, scheduledAt: string | Date, status: string } | null
    assignedUser?: { id: number, displayName: string, role: string } | null
    completedBy?: { id: number, displayName: string, role: string } | null
    linkedLines?: Array<{ id: number, firstName: string, lastName: string | null }>
    confirmationIntros?: Array<{
      trialId: number
      leadLineId: number | null
      firstName: string | null
      lastName: string | null
      programName: string | null
      scheduledAt: string | Date
      label: string | null
    }>
  }>
  duplicates?: Array<{ id: number, firstName: string, lastName?: string | null, matchKind?: 'PHONE' | 'EMAIL' | 'BOTH' }>
  possibleDuplicateMatches?: Array<{
    id: number
    leadId: number
    matchedLeadId: number
    matchKind: 'PHONE' | 'EMAIL' | 'BOTH'
    matchedDisplayName: string
    detectedAt: string | Date
  }>
}
