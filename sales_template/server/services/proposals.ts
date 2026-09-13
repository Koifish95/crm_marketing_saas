import { and, desc, eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import {
  salesAccounts,
  salesOffers,
  salesOpportunities,
  salesProposalLines,
  salesProposalRevisions,
  salesProposals,
} from '../database/schema'
import { lineMrrCents, lineOneTimeCents } from '../../shared/utils/catalog'
import {
  formatProposalLabel,
  isPastValidThrough,
  type ProposalStatus,
} from '../../shared/utils/proposals'
import { denverYmd, toBusinessDate, utcNowMs } from '../../shared/utils/time'
import { listOpportunityLines } from './commercial'
import { letterheadLogoAbsolute, readProposalLetterhead, type ProposalLetterhead } from './proposal-letterhead'
import { renderProposalPdf, type ProposalDocument, type ProposalDocumentLine } from './proposal-pdf'
import {
  absoluteArtifactPath,
  copyIntoRevision,
  isPdfPayload,
  readArtifactBytes,
  writeGeneratedPdf,
  writeSignedPdf,
} from './proposal-storage'
import { createNote, getCompany, getContact, getOpportunity } from './sales'

function now() {
  return new Date(utcNowMs())
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function ymdOrNull(value: string | null | undefined) {
  const trimmed = blankToNull(value)
  if (!trimmed) {
    return null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new DomainError('Valid-through must be a YYYY-MM-DD date.')
  }
  return trimmed
}

function contactName(contact: { firstName: string, lastName: string } | null | undefined) {
  if (!contact) {
    return null
  }
  return `${contact.firstName} ${contact.lastName}`.trim()
}

function decorateProposalLine(line: typeof salesProposalLines.$inferSelect) {
  return {
    ...line,
    oneTimeCents: lineOneTimeCents(line.pricingType, line.quantity, line.unitPriceCents),
    mrrCents: lineMrrCents(line.pricingType, line.quantity, line.unitPriceCents),
  }
}

async function nextProposalNumber(db: Database) {
  const year = denverYmd(utcNowMs()).slice(0, 4)
  const prefix = `P-${year}-`
  const rows = await db.select({ proposalNumber: salesProposals.proposalNumber }).from(salesProposals)
  const max = rows
    .map(row => row.proposalNumber)
    .filter(value => value.startsWith(prefix))
    .map(value => Number(value.slice(prefix.length)))
    .filter(value => Number.isInteger(value) && value > 0)
    .reduce((highest, value) => Math.max(highest, value), 0)
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

async function requireProposal(db: Database, id: number) {
  const [row] = await db.select().from(salesProposals).where(eq(salesProposals.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Proposal not found.', 404)
  }
  return row
}

async function requireRevision(db: Database, id: number) {
  const [row] = await db.select().from(salesProposalRevisions).where(eq(salesProposalRevisions.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Proposal revision not found.', 404)
  }
  return row
}

async function currentRevision(db: Database, proposal: typeof salesProposals.$inferSelect) {
  if (proposal.currentRevisionId) {
    return requireRevision(db, proposal.currentRevisionId)
  }
  const [row] = await db.select().from(salesProposalRevisions)
    .where(eq(salesProposalRevisions.proposalId, proposal.id))
    .orderBy(desc(salesProposalRevisions.revision))
    .limit(1)
  if (!row) {
    throw new DomainError('Proposal revision not found.', 404)
  }
  return row
}

async function listRevisions(db: Database, proposalId: number) {
  return db.select().from(salesProposalRevisions)
    .where(eq(salesProposalRevisions.proposalId, proposalId))
    .orderBy(desc(salesProposalRevisions.revision))
}

async function listRevisionLines(db: Database, revisionId: number) {
  const rows = await db.select().from(salesProposalLines)
    .where(eq(salesProposalLines.revisionId, revisionId))
    .orderBy(salesProposalLines.id)
  return rows.map(decorateProposalLine)
}

async function writeHistory(db: Database, opportunityId: number, body: string, actorUserId: number) {
  await createNote(db, {
    recordKind: 'opportunity',
    recordId: opportunityId,
    body,
    authorUserId: actorUserId,
  })
}

async function assertSameCompanyContact(
  db: Database,
  contactId: number | null | undefined,
  accountId: number,
) {
  if (contactId == null) {
    return null
  }
  const contact = await getContact(db, contactId)
  if (contact.accountId !== accountId) {
    throw new DomainError('Recipient must belong to the same company.')
  }
  return contact
}

export async function getProposalByOpportunity(db: Database, opportunityId: number) {
  const [row] = await db.select().from(salesProposals)
    .where(eq(salesProposals.opportunityId, opportunityId))
    .limit(1)
  return row ?? null
}

async function insertDraftRevision(db: Database, input: {
  proposalId: number
  revision: number
  title: string
  intro?: string | null
  terms?: string | null
  notes?: string | null
  validThrough?: string | null
  recipientContactId?: number | null
}) {
  const createdAt = now()
  await db.insert(salesProposalRevisions).values({
    proposalId: input.proposalId,
    revision: input.revision,
    status: 'draft',
    title: input.title,
    intro: blankToNull(input.intro),
    terms: blankToNull(input.terms),
    notes: blankToNull(input.notes),
    validThrough: ymdOrNull(input.validThrough),
    recipientContactId: input.recipientContactId ?? null,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesProposalRevisions)
    .where(and(
      eq(salesProposalRevisions.proposalId, input.proposalId),
      eq(salesProposalRevisions.revision, input.revision),
    ))
    .limit(1)
  return created!
}

export async function createDraftProposal(db: Database, opportunityId: number, actorUserId: number) {
  const existing = await getProposalByOpportunity(db, opportunityId)
  if (existing) {
    const current = await currentRevision(db, existing)
    if (current.status === 'draft') {
      return getProposalBundle(db, existing.id)
    }
    throw new DomainError('This Opportunity already has a Proposal. Create a new revision instead.')
  }
  const opportunity = await getOpportunity(db, opportunityId)
  const company = await getCompany(db, opportunity.accountId)
  const letterhead = await readProposalLetterhead(db)
  const createdAt = now()
  const proposalNumber = await nextProposalNumber(db)
  await db.insert(salesProposals).values({
    opportunityId,
    proposalNumber,
    createdAt,
    updatedAt: createdAt,
  })
  const [proposal] = await db.select().from(salesProposals)
    .where(eq(salesProposals.opportunityId, opportunityId))
    .limit(1)
  const revision = await insertDraftRevision(db, {
    proposalId: proposal!.id,
    revision: 1,
    title: opportunity.name,
    terms: letterhead.footer,
    recipientContactId: opportunity.primaryContactId,
  })
  await db.update(salesProposals).set({
    currentRevisionId: revision.id,
    updatedAt: now(),
  }).where(eq(salesProposals.id, proposal!.id))
  await writeHistory(
    db,
    opportunityId,
    `Proposal ${formatProposalLabel(proposalNumber, 1)} created as Draft for ${company.name}.`,
    actorUserId,
  )
  return getProposalBundle(db, proposal!.id)
}

export async function createProposalRevision(db: Database, proposalId: number, actorUserId: number) {
  const proposal = await requireProposal(db, proposalId)
  const current = await currentRevision(db, proposal)
  if (current.status === 'draft') {
    throw new DomainError('Finish or keep editing the current Draft before creating another revision.')
  }
  const nextRevision = current.revision + 1
  const created = await insertDraftRevision(db, {
    proposalId: proposal.id,
    revision: nextRevision,
    title: current.title,
    intro: current.intro,
    terms: current.terms,
    notes: current.notes,
    validThrough: current.validThrough,
    recipientContactId: current.recipientContactId,
  })
  await db.update(salesProposals).set({
    currentRevisionId: created.id,
    updatedAt: now(),
  }).where(eq(salesProposals.id, proposal.id))
  await writeHistory(
    db,
    proposal.opportunityId,
    `Proposal ${formatProposalLabel(proposal.proposalNumber, nextRevision)} opened as a Draft revision.`,
    actorUserId,
  )
  return getProposalBundle(db, proposal.id)
}

export async function updateDraftProposal(db: Database, proposalId: number, input: {
  title?: string
  intro?: string | null
  terms?: string | null
  notes?: string | null
  validThrough?: string | null
  recipientContactId?: number | null
}) {
  const proposal = await requireProposal(db, proposalId)
  const current = await currentRevision(db, proposal)
  if (current.status !== 'draft') {
    throw new DomainError('Issued Proposal revisions cannot be edited. Create a new revision.')
  }
  const opportunity = await getOpportunity(db, proposal.opportunityId)
  const patch: Partial<typeof salesProposalRevisions.$inferInsert> = { updatedAt: now() }
  if (input.title !== undefined) {
    const title = input.title.trim()
    if (!title) {
      throw new DomainError('Proposal title is required.')
    }
    patch.title = title
  }
  if (input.intro !== undefined) {
    patch.intro = blankToNull(input.intro)
  }
  if (input.terms !== undefined) {
    patch.terms = blankToNull(input.terms)
  }
  if (input.notes !== undefined) {
    patch.notes = blankToNull(input.notes)
  }
  if (input.validThrough !== undefined) {
    patch.validThrough = ymdOrNull(input.validThrough)
  }
  if (input.recipientContactId !== undefined) {
    await assertSameCompanyContact(db, input.recipientContactId, opportunity.accountId)
    patch.recipientContactId = input.recipientContactId
  }
  await db.update(salesProposalRevisions).set(patch).where(eq(salesProposalRevisions.id, current.id))
  return getProposalBundle(db, proposal.id)
}

async function snapshotRecipient(
  db: Database,
  opportunity: typeof salesOpportunities.$inferSelect,
  recipientContactId: number | null,
) {
  const contact = await assertSameCompanyContact(db, recipientContactId, opportunity.accountId)
  const company = await getCompany(db, opportunity.accountId)
  return {
    companyName: company.name,
    recipientContactId: contact?.id ?? null,
    recipientFirstName: contact?.firstName ?? null,
    recipientLastName: contact?.lastName ?? null,
    recipientTitle: contact?.title ?? null,
    recipientEmail: contact?.email ?? null,
    recipientPhone: contact?.phone ?? null,
  }
}

async function snapshotLetterhead(proposalId: number, revision: number, letterhead: ProposalLetterhead) {
  let logoPath: string | null = null
  const liveLogo = letterheadLogoAbsolute(letterhead.logoFilename)
  if (liveLogo && letterhead.logoFilename) {
    const ext = letterhead.logoFilename.toLowerCase().endsWith('.jpg') ? '.jpg' : '.png'
    logoPath = copyIntoRevision(proposalId, revision, liveLogo, `letterhead-logo${ext}`)
  }
  return {
    letterheadName: blankToNull(letterhead.businessName),
    letterheadAddress: blankToNull(letterhead.address),
    letterheadPhone: blankToNull(letterhead.phone),
    letterheadEmail: blankToNull(letterhead.email),
    letterheadWebsite: blankToNull(letterhead.website),
    letterheadFooter: blankToNull(letterhead.footer),
    letterheadLogoPath: logoPath,
  }
}

async function snapshotCommercialLines(db: Database, revisionId: number, opportunityId: number) {
  const lines = await listOpportunityLines(db, opportunityId)
  const createdAt = now()
  for (const item of lines) {
    let offerName: string | null = null
    if (item.offerId) {
      const [offer] = await db.select().from(salesOffers).where(eq(salesOffers.id, item.offerId)).limit(1)
      offerName = offer?.name ?? null
    }
    await db.insert(salesProposalLines).values({
      revisionId,
      offerId: item.offerId,
      offerName,
      description: item.description,
      quantity: item.quantity,
      pricingType: item.pricingType,
      unitPriceCents: item.unitPriceCents,
      createdAt,
    })
  }
  return listRevisionLines(db, revisionId)
}

function documentLinesFromProposal(lines: ReturnType<typeof decorateProposalLine>[]): ProposalDocumentLine[] {
  return lines.map(line => ({
    description: line.description,
    quantity: line.quantity,
    pricingType: line.pricingType,
    unitPriceCents: line.unitPriceCents,
    offerName: line.offerName ?? null,
    oneTimeCents: line.oneTimeCents,
    mrrCents: line.mrrCents,
  }))
}

function documentLinesFromOpportunity(lines: Awaited<ReturnType<typeof listOpportunityLines>>): ProposalDocumentLine[] {
  return lines.map(line => ({
    description: line.description,
    quantity: line.quantity,
    pricingType: line.pricingType,
    unitPriceCents: line.unitPriceCents,
    offerName: null,
    oneTimeCents: line.oneTimeCents,
    mrrCents: line.mrrCents,
  }))
}

async function buildDocument(
  db: Database,
  proposal: typeof salesProposals.$inferSelect,
  revision: typeof salesProposalRevisions.$inferSelect,
): Promise<ProposalDocument> {
  const today = denverYmd(utcNowMs())
  const opportunity = await getOpportunity(db, proposal.opportunityId)
  if (revision.status === 'draft') {
    const letterhead = await readProposalLetterhead(db)
    const company = await getCompany(db, opportunity.accountId)
    const contact = revision.recipientContactId
      ? await assertSameCompanyContact(db, revision.recipientContactId, opportunity.accountId)
      : null
    const liveLines = await listOpportunityLines(db, opportunity.id)
    return {
      opportunityId: opportunity.id,
      proposalNumber: proposal.proposalNumber,
      revision: revision.revision,
      status: revision.status,
      title: revision.title,
      intro: revision.intro,
      terms: revision.terms,
      notes: revision.notes,
      validThrough: revision.validThrough,
      issuedAtLabel: null,
      companyName: company.name,
      recipientName: contactName(contact),
      recipientTitle: contact?.title ?? null,
      recipientEmail: contact?.email ?? null,
      recipientPhone: contact?.phone ?? null,
      letterheadName: letterhead.businessName,
      letterheadAddress: blankToNull(letterhead.address),
      letterheadPhone: blankToNull(letterhead.phone),
      letterheadEmail: blankToNull(letterhead.email),
      letterheadWebsite: blankToNull(letterhead.website),
      letterheadFooter: blankToNull(letterhead.footer),
      logoAbsolutePath: letterheadLogoAbsolute(letterhead.logoFilename),
      hasLogo: Boolean(letterheadLogoAbsolute(letterhead.logoFilename)),
      lines: documentLinesFromOpportunity(liveLines),
      amountCents: liveLines.reduce((sum, line) => sum + line.oneTimeCents, 0),
      mrrCents: liveLines.reduce((sum, line) => sum + line.mrrCents, 0),
      pastValidThrough: isPastValidThrough(revision.validThrough, today),
    }
  }
  const lines = await listRevisionLines(db, revision.id)
  return {
    opportunityId: opportunity.id,
    proposalNumber: proposal.proposalNumber,
    revision: revision.revision,
    status: revision.status,
    title: revision.title,
    intro: revision.intro,
    terms: revision.terms,
    notes: revision.notes,
    validThrough: revision.validThrough,
    issuedAtLabel: revision.issuedAt ? toBusinessDate(revision.issuedAt instanceof Date ? revision.issuedAt.getTime() : revision.issuedAt) : null,
    companyName: revision.companyName,
    recipientName: (revision.recipientFirstName || revision.recipientLastName)
      ? contactName({
          firstName: revision.recipientFirstName || '',
          lastName: revision.recipientLastName || '',
        })
      : null,
    recipientTitle: revision.recipientTitle,
    recipientEmail: revision.recipientEmail,
    recipientPhone: revision.recipientPhone,
    letterheadName: revision.letterheadName,
    letterheadAddress: revision.letterheadAddress,
    letterheadPhone: revision.letterheadPhone,
    letterheadEmail: revision.letterheadEmail,
    letterheadWebsite: revision.letterheadWebsite,
    letterheadFooter: revision.letterheadFooter,
    logoAbsolutePath: revision.letterheadLogoPath
      ? absoluteArtifactPath(revision.letterheadLogoPath)
      : null,
    hasLogo: Boolean(revision.letterheadLogoPath),
    lines: documentLinesFromProposal(lines),
    amountCents: revision.amountCents,
    mrrCents: revision.mrrCents,
    pastValidThrough: isPastValidThrough(revision.validThrough, today),
  }
}

async function persistGeneratedPdf(
  proposal: typeof salesProposals.$inferSelect,
  revision: typeof salesProposalRevisions.$inferSelect,
  document: ProposalDocument,
) {
  const bytes = await renderProposalPdf(document)
  const relativePath = writeGeneratedPdf(proposal.id, revision.revision, bytes)
  return { bytes, relativePath }
}

export async function issueProposal(db: Database, proposalId: number, actorUserId: number) {
  const proposal = await requireProposal(db, proposalId)
  const current = await currentRevision(db, proposal)
  if (current.status !== 'draft') {
    throw new DomainError('Only a Draft revision can be issued.')
  }
  const opportunity = await getOpportunity(db, proposal.opportunityId)
  const letterhead = await readProposalLetterhead(db)
  const recipient = await snapshotRecipient(db, opportunity, current.recipientContactId)
  const letterheadSnap = await snapshotLetterhead(proposal.id, current.revision, letterhead)
  const lines = await snapshotCommercialLines(db, current.id, opportunity.id)
  const amountCents = lines.reduce((sum, line) => sum + line.oneTimeCents, 0)
  const mrrCents = lines.reduce((sum, line) => sum + line.mrrCents, 0)
  const issuedAt = now()
  await db.update(salesProposalRevisions).set({
    status: 'issued',
    issuedAt,
    ...recipient,
    ...letterheadSnap,
    amountCents,
    mrrCents,
    updatedAt: issuedAt,
  }).where(eq(salesProposalRevisions.id, current.id))
  const previous = await listRevisions(db, proposal.id)
  for (const row of previous) {
    if (row.id !== current.id && row.status !== 'draft' && row.status !== 'superseded') {
      await db.update(salesProposalRevisions).set({
        status: 'superseded',
        updatedAt: issuedAt,
      }).where(eq(salesProposalRevisions.id, row.id))
      await writeHistory(
        db,
        proposal.opportunityId,
        `Proposal ${formatProposalLabel(proposal.proposalNumber, row.revision)} superseded by r${current.revision}.`,
        actorUserId,
      )
    }
  }
  const issued = await requireRevision(db, current.id)
  const document = await buildDocument(db, proposal, issued)
  const pdf = await persistGeneratedPdf(proposal, issued, document)
  await db.update(salesProposalRevisions).set({
    generatedPdfPath: pdf.relativePath,
    updatedAt: now(),
  }).where(eq(salesProposalRevisions.id, issued.id))
  await db.update(salesProposals).set({
    currentRevisionId: issued.id,
    updatedAt: now(),
  }).where(eq(salesProposals.id, proposal.id))
  await writeHistory(
    db,
    proposal.opportunityId,
    `Proposal ${formatProposalLabel(proposal.proposalNumber, issued.revision)} issued.`,
    actorUserId,
  )
  return getProposalBundle(db, proposal.id)
}

export async function markProposalSent(db: Database, proposalId: number, actorUserId: number) {
  const proposal = await requireProposal(db, proposalId)
  const current = await currentRevision(db, proposal)
  if (current.status === 'draft' || current.status === 'superseded') {
    throw new DomainError('Issue the Proposal before marking it Sent.')
  }
  if (current.sentAt) {
    return getProposalBundle(db, proposal.id)
  }
  await db.update(salesProposalRevisions).set({
    sentAt: now(),
    updatedAt: now(),
  }).where(eq(salesProposalRevisions.id, current.id))
  await writeHistory(
    db,
    proposal.opportunityId,
    `Proposal ${formatProposalLabel(proposal.proposalNumber, current.revision)} marked Sent. No email was sent from the CRM.`,
    actorUserId,
  )
  return getProposalBundle(db, proposal.id)
}

export async function acceptProposal(db: Database, proposalId: number, actorUserId: number) {
  const proposal = await requireProposal(db, proposalId)
  const current = await currentRevision(db, proposal)
  if (current.status !== 'issued') {
    throw new DomainError('Only an Issued Proposal can be accepted.')
  }
  await db.update(salesProposalRevisions).set({
    status: 'accepted',
    acceptedAt: now(),
    updatedAt: now(),
  }).where(eq(salesProposalRevisions.id, current.id))
  await writeHistory(
    db,
    proposal.opportunityId,
    `Proposal ${formatProposalLabel(proposal.proposalNumber, current.revision)} accepted. Opportunity Won was not changed.`,
    actorUserId,
  )
  return getProposalBundle(db, proposal.id)
}

export async function declineProposal(db: Database, proposalId: number, actorUserId: number) {
  const proposal = await requireProposal(db, proposalId)
  const current = await currentRevision(db, proposal)
  if (current.status !== 'issued') {
    throw new DomainError('Only an Issued Proposal can be declined.')
  }
  await db.update(salesProposalRevisions).set({
    status: 'declined',
    declinedAt: now(),
    updatedAt: now(),
  }).where(eq(salesProposalRevisions.id, current.id))
  await writeHistory(
    db,
    proposal.opportunityId,
    `Proposal ${formatProposalLabel(proposal.proposalNumber, current.revision)} declined.`,
    actorUserId,
  )
  return getProposalBundle(db, proposal.id)
}

export async function getProposalDocument(
  db: Database,
  proposalId: number,
  revisionId?: number,
) {
  const proposal = await requireProposal(db, proposalId)
  const revision = revisionId ? await requireRevision(db, revisionId) : await currentRevision(db, proposal)
  if (revision.proposalId !== proposal.id) {
    throw new DomainError('Proposal revision not found.', 404)
  }
  return buildDocument(db, proposal, revision)
}

export async function getOrRegeneratePdf(db: Database, proposalId: number, revisionId?: number) {
  const proposal = await requireProposal(db, proposalId)
  const revision = revisionId ? await requireRevision(db, revisionId) : await currentRevision(db, proposal)
  if (revision.proposalId !== proposal.id) {
    throw new DomainError('Proposal revision not found.', 404)
  }
  if (revision.status === 'draft') {
    throw new DomainError('Issue the Proposal before downloading a PDF.')
  }
  if (revision.generatedPdfPath) {
    const existing = readArtifactBytes(revision.generatedPdfPath)
    if (existing) {
      return {
        bytes: existing,
        filename: `${proposal.proposalNumber}-r${revision.revision}.pdf`,
        signedPath: revision.signedPdfPath,
      }
    }
  }
  const document = await buildDocument(db, proposal, revision)
  const pdf = await persistGeneratedPdf(proposal, revision, document)
  await db.update(salesProposalRevisions).set({
    generatedPdfPath: pdf.relativePath,
    updatedAt: now(),
  }).where(eq(salesProposalRevisions.id, revision.id))
  return {
    bytes: pdf.bytes,
    filename: `${proposal.proposalNumber}-r${revision.revision}.pdf`,
    signedPath: revision.signedPdfPath,
  }
}

export async function uploadSignedPdf(
  db: Database,
  proposalId: number,
  actorUserId: number,
  file: { filename?: string, type?: string, data: Buffer },
  revisionId?: number,
) {
  const proposal = await requireProposal(db, proposalId)
  const revision = revisionId ? await requireRevision(db, revisionId) : await currentRevision(db, proposal)
  if (revision.proposalId !== proposal.id) {
    throw new DomainError('Proposal revision not found.', 404)
  }
  if (revision.status === 'draft') {
    throw new DomainError('Issue the Proposal before uploading a signed copy.')
  }
  if (!isPdfPayload(file.filename, file.type, file.data)) {
    throw new DomainError('Signed copy must be a PDF file.')
  }
  const relativePath = writeSignedPdf(proposal.id, revision.revision, file.data)
  await db.update(salesProposalRevisions).set({
    signedPdfPath: relativePath,
    signedPdfOriginalName: file.filename?.trim() || 'signed.pdf',
    updatedAt: now(),
  }).where(eq(salesProposalRevisions.id, revision.id))
  await writeHistory(
    db,
    proposal.opportunityId,
    `Signed PDF uploaded for ${formatProposalLabel(proposal.proposalNumber, revision.revision)}.`,
    actorUserId,
  )
  return getProposalBundle(db, proposal.id)
}

export async function readSignedPdf(db: Database, proposalId: number, revisionId?: number) {
  const proposal = await requireProposal(db, proposalId)
  const revision = revisionId ? await requireRevision(db, revisionId) : await currentRevision(db, proposal)
  if (revision.proposalId !== proposal.id || !revision.signedPdfPath) {
    throw new DomainError('Signed PDF not found.', 404)
  }
  const bytes = readArtifactBytes(revision.signedPdfPath)
  if (!bytes) {
    throw new DomainError('Signed PDF not found.', 404)
  }
  return {
    bytes,
    filename: revision.signedPdfOriginalName || `${proposal.proposalNumber}-r${revision.revision}-signed.pdf`,
  }
}

export async function getProposalBundle(db: Database, proposalId: number) {
  const proposal = await requireProposal(db, proposalId)
  const revisions = await listRevisions(db, proposal.id)
  const current = await currentRevision(db, proposal)
  const opportunity = await getOpportunity(db, proposal.opportunityId)
  const liveLines = current.status === 'draft' ? await listOpportunityLines(db, opportunity.id) : []
  const snapshotLines = current.status === 'draft' ? [] : await listRevisionLines(db, current.id)
  const today = denverYmd(utcNowMs())
  return {
    proposal,
    current,
    revisions,
    liveLines,
    snapshotLines,
    pastValidThrough: isPastValidThrough(current.validThrough, today),
    label: formatProposalLabel(proposal.proposalNumber, current.revision),
  }
}

export async function getOpportunityProposalBundle(db: Database, opportunityId: number) {
  await getOpportunity(db, opportunityId)
  const proposal = await getProposalByOpportunity(db, opportunityId)
  if (!proposal) {
    return null
  }
  return getProposalBundle(db, proposal.id)
}

export async function listProposalSummaries(db: Database) {
  const proposals = await db.select().from(salesProposals).orderBy(desc(salesProposals.updatedAt))
  const revisions = await db.select().from(salesProposalRevisions)
  const opportunities = await db.select().from(salesOpportunities)
  const companies = await db.select().from(salesAccounts)
  const today = denverYmd(utcNowMs())
  return proposals.map((proposal) => {
    const current = revisions.find(row => row.id === proposal.currentRevisionId)
      ?? revisions.filter(row => row.proposalId === proposal.id).sort((a, b) => b.revision - a.revision)[0]
    const opportunity = opportunities.find(row => row.id === proposal.opportunityId)
    const company = companies.find(row => row.id === opportunity?.accountId)
    const status = current?.status ?? 'draft'
    return {
      id: proposal.id,
      opportunityId: proposal.opportunityId,
      opportunityName: opportunity?.name ?? 'Opportunity',
      companyName: company?.name ?? '',
      proposalNumber: proposal.proposalNumber,
      revision: current?.revision ?? 1,
      status,
      sentAt: current?.sentAt ?? null,
      validThrough: current?.validThrough ?? null,
      pastValidThrough: isPastValidThrough(current?.validThrough, today),
      amountCents: current?.amountCents ?? 0,
      mrrCents: current?.mrrCents ?? 0,
      label: formatProposalLabel(proposal.proposalNumber, current?.revision ?? 1),
    }
  })
}

export function proposalDashboardCounts(summaries: Awaited<ReturnType<typeof listProposalSummaries>>) {
  const current = summaries.filter(row => row.status !== 'superseded')
  return {
    draft: current.filter(row => row.status === 'draft').length,
    issued: current.filter(row => row.status === 'issued' && !row.sentAt).length,
    sent: current.filter(row => row.status !== 'draft' && Boolean(row.sentAt)).length,
    accepted: current.filter(row => row.status === 'accepted').length,
    declined: current.filter(row => row.status === 'declined').length,
    pastValidThrough: current.filter(row => row.pastValidThrough).length,
  }
}

export type { ProposalStatus }
