export const PROPOSAL_STATUSES = ['draft', 'issued', 'accepted', 'declined', 'superseded'] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  accepted: 'Accepted',
  declined: 'Declined',
  superseded: 'Superseded',
}

export const PROPOSAL_LETTERHEAD_SETTING_KEY = 'sales.proposal_letterhead'
export const SIGNATURE_ACCEPTANCE_COPY = 'Accepted by ____________________________    Date ____________    Name ____________________________'

export function isProposalStatus(value: string): value is ProposalStatus {
  return (PROPOSAL_STATUSES as readonly string[]).includes(value)
}

export function proposalStatusLabel(status: string) {
  return isProposalStatus(status) ? PROPOSAL_STATUS_LABELS[status] : status
}

export function proposalStatusDisplay(status: string, sentAt: string | Date | null | undefined) {
  const label = proposalStatusLabel(status)
  return sentAt ? `${label} · Sent` : label
}

export function formatProposalLabel(proposalNumber: string, revision: number) {
  return `${proposalNumber} r${revision}`
}

export function resolveSelectedProposalRevision<T extends { id: number }>(
  revisions: T[],
  selectedId: number | null | undefined,
  current: T,
): T {
  return revisions.find(row => row.id === selectedId) ?? current
}

export function canCreateProposalRevision(currentStatus: string) {
  return currentStatus !== 'draft'
}

export function canUploadSignedProposal(status: string) {
  return status !== 'draft'
}

export function canRecordIssuedProposalActions(status: string, selectedId: number, currentId: number) {
  return selectedId === currentId && status === 'issued'
}

export function isPastValidThrough(validThrough: string | null | undefined, todayYmd: string) {
  if (!validThrough) {
    return false
  }
  return validThrough < todayYmd
}
