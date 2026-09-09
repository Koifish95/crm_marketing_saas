import type { LeadStatus } from '../../shared/schemas/enums'
import { DomainError } from './errors'

const PIPELINE: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'RESPONDED',
  'TRIAL_SCHEDULED',
  'TRIAL_ATTENDED',
  'JOINED',
]

export function isStatusCorrection(fromStatus: LeadStatus, toStatus: LeadStatus): boolean {
  if (fromStatus === toStatus) {
    return false
  }
  if (fromStatus === 'JOINED' && toStatus !== 'JOINED') {
    return true
  }
  if (fromStatus === 'LOST' && toStatus !== 'LOST') {
    return true
  }

  const fromIndex = PIPELINE.indexOf(fromStatus)
  const toIndex = PIPELINE.indexOf(toStatus)
  if (fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex) {
    return true
  }

  return false
}

export function assertStatusChange(fromStatus: LeadStatus, toStatus: LeadStatus, note?: string) {
  if (fromStatus === toStatus) {
    throw new DomainError('The lead is already in that status.')
  }

  if (isStatusCorrection(fromStatus, toStatus) && !note?.trim()) {
    throw new DomainError('Corrective or backward status changes require a note.')
  }
}
