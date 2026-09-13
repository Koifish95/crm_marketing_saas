import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isPublicPath } from '../../server/services/authorization'
import {
  addOpportunityLine,
  createOffer,
  updateOffer,
} from '../../server/services/commercial'
import {
  defaultProposalLetterhead,
  readProposalLetterhead,
  writeProposalLetterhead,
} from '../../server/services/proposal-letterhead'
import {
  acceptProposal,
  createDraftProposal,
  createProposalRevision,
  declineProposal,
  getOrRegeneratePdf,
  getProposalBundle,
  getProposalByOpportunity,
  getProposalDocument,
  issueProposal,
  markProposalSent,
  updateDraftProposal,
  uploadSignedPdf,
} from '../../server/services/proposals'
import { salesDashboard } from '../../server/services/reporting'
import {
  createCompany,
  createContact,
  createOpportunity,
  getOpportunity,
  listNotes,
  markOpportunityWon,
  updateContact,
} from '../../server/services/sales'
import { users } from '../../server/database/schema'
import { openTestDatabase } from '../helpers/db'
import { PROPOSAL_LETTERHEAD_SETTING_KEY } from '../../shared/utils/proposals'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined
let artifactDir: string | undefined

beforeEach(() => {
  artifactDir = mkdtempSync(join(tmpdir(), 'sales-proposals-'))
  process.env.SALES_PROPOSALS_DIR = artifactDir
})

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
  if (artifactDir) {
    rmSync(artifactDir, { recursive: true, force: true })
    artifactDir = undefined
  }
  delete process.env.SALES_PROPOSALS_DIR
})

async function ownerId() {
  const [admin] = await dbHandle!.db.select().from(users).limit(1)
  return admin!.id
}

async function seededOpportunity() {
  const actor = await ownerId()
  const company = await createCompany(dbHandle!.db, { name: 'Acme Manufacturing' })
  const contact = await createContact(dbHandle!.db, {
    accountId: company.id,
    firstName: 'Pat',
    lastName: 'Lee',
    email: 'pat@acme.test',
    phone: '555-0100',
    title: 'IT Manager',
  })
  const opportunity = await createOpportunity(dbHandle!.db, {
    accountId: company.id,
    primaryContactId: contact.id,
    name: 'Managed IT',
    ownerUserId: actor,
  })
  const offer = await createOffer(dbHandle!.db, {
    name: 'Managed workstation',
    pricingType: 'monthly',
    defaultUnitPriceCents: 5000,
  })
  await addOpportunityLine(dbHandle!.db, {
    opportunityId: opportunity.id,
    offerId: offer.id,
    quantity: 10,
  })
  return { actor, company, contact, opportunity, offer }
}

describe('B2 proposal system', () => {
  it('allows only one Proposal chain per Opportunity', async () => {
    dbHandle = await openTestDatabase()
    const { actor, opportunity } = await seededOpportunity()
    const first = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    const again = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    expect(again.proposal.id).toBe(first.proposal.id)
    expect(await getProposalByOpportunity(dbHandle.db, opportunity.id)).toMatchObject({
      id: first.proposal.id,
    })
    await issueProposal(dbHandle.db, first.proposal.id, actor)
    await expect(createDraftProposal(dbHandle.db, opportunity.id, actor)).rejects.toThrow(/already has a Proposal/)
  })

  it('snapshots Opportunity commercial lines at Issue and ignores later Opportunity and Offer edits', async () => {
    dbHandle = await openTestDatabase()
    const { actor, opportunity, offer } = await seededOpportunity()
    const bundle = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    const issued = await issueProposal(dbHandle.db, bundle.proposal.id, actor)
    expect(issued.snapshotLines).toHaveLength(1)
    expect(issued.snapshotLines[0]?.quantity).toBe(10)
    expect(issued.snapshotLines[0]?.mrrCents).toBe(50000)
    expect(issued.current.mrrCents).toBe(50000)

    await addOpportunityLine(dbHandle.db, {
      opportunityId: opportunity.id,
      description: 'Onsite visit',
      pricingType: 'one_time',
      quantity: 1,
      unitPriceCents: 25000,
    })
    await updateOffer(dbHandle.db, offer.id, { name: 'Renamed offer', defaultUnitPriceCents: 1 })

    const after = await getProposalBundle(dbHandle.db, bundle.proposal.id)
    expect(after.snapshotLines).toHaveLength(1)
    expect(after.snapshotLines[0]?.quantity).toBe(10)
    expect(after.snapshotLines[0]?.offerName).toBe('Managed workstation')
    expect(after.current.mrrCents).toBe(50000)
    expect(after.current.amountCents).toBe(0)
  })

  it('snapshots recipient Contact at Issue and rejects a different Company', async () => {
    dbHandle = await openTestDatabase()
    const { actor, company, contact, opportunity } = await seededOpportunity()
    const otherCompany = await createCompany(dbHandle.db, { name: 'Other Co' })
    const outsider = await createContact(dbHandle.db, {
      accountId: otherCompany.id,
      firstName: 'Out',
      lastName: 'Sider',
    })
    const alt = await createContact(dbHandle.db, {
      accountId: company.id,
      firstName: 'Alex',
      lastName: 'Kim',
      email: 'alex@acme.test',
      title: 'CFO',
    })
    const draft = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    expect(draft.current.recipientContactId).toBe(contact.id)
    await expect(updateDraftProposal(dbHandle.db, draft.proposal.id, {
      recipientContactId: outsider.id,
    })).rejects.toThrow(/same company/)
    await updateDraftProposal(dbHandle.db, draft.proposal.id, { recipientContactId: alt.id })
    const issued = await issueProposal(dbHandle.db, draft.proposal.id, actor)
    expect(issued.current.recipientFirstName).toBe('Alex')
    expect(issued.current.recipientEmail).toBe('alex@acme.test')
    await updateContact(dbHandle.db, alt.id, { email: 'changed@acme.test' })
    const after = await getProposalBundle(dbHandle.db, draft.proposal.id)
    expect(after.current.recipientEmail).toBe('alex@acme.test')
  })

  it('preserves a prior revision as Superseded when a new revision is issued', async () => {
    dbHandle = await openTestDatabase()
    const { actor, opportunity } = await seededOpportunity()
    const draft = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    await issueProposal(dbHandle.db, draft.proposal.id, actor)
    const revised = await createProposalRevision(dbHandle.db, draft.proposal.id, actor)
    expect(revised.current.status).toBe('draft')
    expect(revised.revisions.some(row => row.status === 'issued' && row.revision === 1)).toBe(true)
    const issued2 = await issueProposal(dbHandle.db, draft.proposal.id, actor)
    const first = issued2.revisions.find(row => row.revision === 1)
    expect(first?.status).toBe('superseded')
    expect(issued2.current.revision).toBe(2)
    expect(issued2.current.status).toBe('issued')
  })

  it('records sent_at without sending email and does not auto-expire or auto-Won', async () => {
    dbHandle = await openTestDatabase()
    const { actor, opportunity } = await seededOpportunity()
    const draft = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    await updateDraftProposal(dbHandle.db, draft.proposal.id, { validThrough: '2020-01-01' })
    await issueProposal(dbHandle.db, draft.proposal.id, actor)
    const sent = await markProposalSent(dbHandle.db, draft.proposal.id, actor)
    expect(sent.current.sentAt).toBeTruthy()
    expect(sent.current.status).toBe('issued')
    expect(sent.pastValidThrough).toBe(true)
    const accepted = await acceptProposal(dbHandle.db, draft.proposal.id, actor)
    expect(accepted.current.status).toBe('accepted')
    const opportunityAfter = await getOpportunity(dbHandle.db, opportunity.id)
    expect(opportunityAfter.stage).toBe('proposal_quote')
    const notes = await listNotes(dbHandle.db, 'opportunity', opportunity.id)
    expect(notes.some(row => row.body.includes('No email was sent from the CRM'))).toBe(true)
    expect(notes.some(row => row.body.includes('Opportunity Won was not changed'))).toBe(true)
  })

  it('keeps generated and signed PDFs distinct and regenerates a missing generated file from the snapshot', async () => {
    dbHandle = await openTestDatabase()
    const { actor, opportunity } = await seededOpportunity()
    const draft = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    const issued = await issueProposal(dbHandle.db, draft.proposal.id, actor)
    const generated = await getOrRegeneratePdf(dbHandle.db, issued.proposal.id, issued.current.id)
    expect(generated.bytes.subarray(0, 5).toString('utf8')).toBe('%PDF-')

    const signedBytes = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('signed-artifact')])
    await uploadSignedPdf(dbHandle.db, issued.proposal.id, actor, {
      filename: 'signed.pdf',
      type: 'application/pdf',
      data: signedBytes,
    }, issued.current.id)
    const withSigned = await getProposalBundle(dbHandle.db, issued.proposal.id)
    expect(withSigned.current.signedPdfPath).toContain('signed.pdf')

    unlinkSync(join(artifactDir!, String(issued.proposal.id), String(issued.current.revision), 'generated.pdf'))
    const regenerated = await getOrRegeneratePdf(dbHandle.db, issued.proposal.id, issued.current.id)
    expect(regenerated.bytes.subarray(0, 5).toString('utf8')).toBe('%PDF-')
    const after = await getProposalBundle(dbHandle.db, issued.proposal.id)
    expect(after.current.signedPdfPath).toContain('signed.pdf')
    expect(after.current.generatedPdfPath).toContain('generated.pdf')
  })

  it('uses instance letterhead configuration and does not hardcode Strategic Insights', async () => {
    dbHandle = await openTestDatabase()
    const actor = await ownerId()
    const defaults = defaultProposalLetterhead()
    expect(JSON.stringify(defaults)).not.toMatch(/Strategic Insights/i)
    expect(PROPOSAL_LETTERHEAD_SETTING_KEY).toBe('sales.proposal_letterhead')
    const saved = await writeProposalLetterhead(dbHandle.db, {
      businessName: 'Generic MSP LLC',
      address: '1 Main St',
      footer: 'This is not an invoice.',
    }, actor)
    const loaded = await readProposalLetterhead(dbHandle.db)
    expect(loaded.businessName).toBe('Generic MSP LLC')
    expect(loaded.footer).toBe('This is not an invoice.')
    expect(saved.businessName).not.toMatch(/Strategic Insights/i)
  })

  it('does not expose proposal routes as public and includes proposal counts on the dashboard', async () => {
    dbHandle = await openTestDatabase()
    const { actor, opportunity } = await seededOpportunity()
    expect(isPublicPath('/proposals')).toBe(false)
    expect(isPublicPath('/api/proposals')).toBe(false)
    expect(isPublicPath('/settings/proposals')).toBe(false)
    const draft = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    const report = await salesDashboard(dbHandle.db, { preset: 'this_year' })
    expect(report.proposals.draft).toBe(1)
    await issueProposal(dbHandle.db, draft.proposal.id, actor)
    const after = await salesDashboard(dbHandle.db, { preset: 'this_year' })
    expect(after.proposals.issued).toBe(1)
    expect(after.proposals.draft).toBe(0)
    const document = await getProposalDocument(dbHandle.db, draft.proposal.id)
    expect(document.lines[0]?.quantity).toBe(10)
  })

  it('lets staff decline an issued proposal without changing Opportunity stage', async () => {
    dbHandle = await openTestDatabase()
    const { actor, opportunity } = await seededOpportunity()
    const draft = await createDraftProposal(dbHandle.db, opportunity.id, actor)
    await issueProposal(dbHandle.db, draft.proposal.id, actor)
    await declineProposal(dbHandle.db, draft.proposal.id, actor)
    const bundle = await getProposalBundle(dbHandle.db, draft.proposal.id)
    expect(bundle.current.status).toBe('declined')
    expect((await getOpportunity(dbHandle.db, opportunity.id)).stage).toBe('proposal_quote')
    await markOpportunityWon(dbHandle.db, opportunity.id)
    expect((await getOpportunity(dbHandle.db, opportunity.id)).stage).toBe('won')
  })
})
