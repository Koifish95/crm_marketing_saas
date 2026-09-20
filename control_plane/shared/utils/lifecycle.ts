export const ACCOUNT_ACTIVE = 'active'
export const ACCOUNT_INACTIVE = 'inactive'
export const ARCHIVE_CONFIRM_PHRASE = 'ARCHIVE AND DELETE'
export const BACKUP_STALE_MS = 7 * 24 * 60 * 60 * 1000

export function isActiveStatus(status?: string | null) {
  return (status || ACCOUNT_ACTIVE) !== ACCOUNT_INACTIVE
}

export function isArchivedLifecycle(lifecycleStatus?: string | null) {
  return lifecycleStatus === 'archived'
}

export function isRetiredLifecycle(lifecycleStatus?: string | null) {
  return lifecycleStatus === 'decommissioned' || lifecycleStatus === 'archived'
}

export function retiredRuntimeMessage(lifecycleStatus: string | null | undefined, verb: 'started' | 'stopped' | 'relaunched') {
  if (lifecycleStatus === 'archived') {
    return `Archived environments cannot be ${verb}.`
  }
  if (lifecycleStatus === 'decommissioned') {
    return `Decommissioned environments cannot be ${verb}.`
  }
  return null
}

export function inactiveAccountMessage(customerStatus?: string | null, productStatus?: string | null) {
  if (!isActiveStatus(customerStatus)) {
    return 'Reactivate the customer before starting this environment.'
  }
  if (!isActiveStatus(productStatus)) {
    return 'Reactivate the product instance before starting this environment.'
  }
  return null
}

export function archiveConfirmationError(input: {
  slug: string
  confirmSlug?: string
  confirmPhrase?: string
}) {
  if ((input.confirmSlug || '').trim() !== input.slug) {
    return 'Type the exact environment slug to archive and delete.'
  }
  if ((input.confirmPhrase || '').trim() !== ARCHIVE_CONFIRM_PHRASE) {
    return `Type ${ARCHIVE_CONFIRM_PHRASE} to confirm final retirement.`
  }
  return null
}

export function backupIsStale(createdAt?: string | null, now = Date.now()) {
  if (!createdAt) {
    return true
  }
  const at = Date.parse(createdAt)
  if (!Number.isFinite(at)) {
    return true
  }
  return now - at > BACKUP_STALE_MS
}
