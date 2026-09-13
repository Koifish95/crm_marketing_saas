import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import PDFDocument from 'pdfkit'
import { formatUsdFromCents } from '../../shared/utils/money'
import { offerPricingTypeLabel } from '../../shared/utils/catalog'
import { SIGNATURE_ACCEPTANCE_COPY } from '../../shared/utils/proposals'

export type ProposalDocumentLine = {
  description: string
  quantity: number
  pricingType: string
  unitPriceCents: number
  offerName: string | null
  oneTimeCents: number
  mrrCents: number
}

export type ProposalDocument = {
  opportunityId: number
  proposalNumber: string
  revision: number
  status: string
  title: string
  intro: string | null
  terms: string | null
  notes: string | null
  validThrough: string | null
  issuedAtLabel: string | null
  companyName: string | null
  recipientName: string | null
  recipientTitle: string | null
  recipientEmail: string | null
  recipientPhone: string | null
  letterheadName: string | null
  letterheadAddress: string | null
  letterheadPhone: string | null
  letterheadEmail: string | null
  letterheadWebsite: string | null
  letterheadFooter: string | null
  logoAbsolutePath: string | null
  hasLogo: boolean
  lines: ProposalDocumentLine[]
  amountCents: number
  mrrCents: number
  pastValidThrough: boolean
}

function line(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  if (!text) {
    return
  }
  doc.text(text, options)
}

export async function renderProposalPdf(document: ProposalDocument): Promise<Buffer> {
  const pdf = new PDFDocument({ size: 'LETTER', margin: 54, bufferPages: true })
  const chunks: Buffer[] = []
  pdf.on('data', (chunk: Buffer) => {
    chunks.push(chunk)
  })
  const finished = new Promise<Buffer>((resolve, reject) => {
    pdf.on('end', () => resolve(Buffer.concat(chunks)))
    pdf.on('error', reject)
  })

  if (document.logoAbsolutePath && existsSync(document.logoAbsolutePath)) {
    try {
      pdf.image(document.logoAbsolutePath, { height: 42 })
      pdf.moveDown(0.4)
    } catch {
      // Text-only remains valid if the logo file cannot be embedded.
    }
  }

  pdf.fontSize(16).font('Helvetica-Bold')
  line(pdf, document.letterheadName || 'Proposal')
  pdf.fontSize(10).font('Helvetica')
  line(pdf, document.letterheadAddress || '')
  const contactLine = [document.letterheadPhone, document.letterheadEmail, document.letterheadWebsite]
    .filter(Boolean)
    .join('  ·  ')
  line(pdf, contactLine)
  pdf.moveDown()

  pdf.fontSize(18).font('Helvetica-Bold')
  line(pdf, document.title)
  pdf.fontSize(10).font('Helvetica')
  line(pdf, `${document.proposalNumber}  r${document.revision}`)
  if (document.issuedAtLabel) {
    line(pdf, `Issued ${document.issuedAtLabel}`)
  }
  if (document.validThrough) {
    line(pdf, `Valid through ${document.validThrough}${document.pastValidThrough ? ' (past valid-through)' : ''}`)
  }
  pdf.moveDown()

  line(pdf, document.companyName ? `Prepared for ${document.companyName}` : '')
  if (document.recipientName) {
    const recipientBits = [document.recipientName, document.recipientTitle].filter(Boolean).join(', ')
    line(pdf, recipientBits)
    line(pdf, [document.recipientEmail, document.recipientPhone].filter(Boolean).join('  ·  '))
  }
  pdf.moveDown()

  if (document.intro) {
    pdf.font('Helvetica-Bold').text('Scope')
    pdf.font('Helvetica').text(document.intro)
    pdf.moveDown()
  }

  pdf.font('Helvetica-Bold').text('Commercial offer')
  pdf.moveDown(0.3)
  pdf.font('Helvetica').fontSize(9)
  for (const item of document.lines) {
    const priceLabel = item.pricingType === 'monthly'
      ? `${formatUsdFromCents(item.mrrCents)} MRR`
      : formatUsdFromCents(item.oneTimeCents)
    const offer = item.offerName ? ` (${item.offerName})` : ''
    pdf.text(
      `${item.quantity} × ${item.description}${offer}  ·  ${offerPricingTypeLabel(item.pricingType)}  ·  ${formatUsdFromCents(item.unitPriceCents)} each  ·  ${priceLabel}`,
      { width: 504 },
    )
  }
  if (!document.lines.length) {
    pdf.text('No commercial lines.')
  }
  pdf.moveDown()
  pdf.fontSize(11).font('Helvetica-Bold')
  pdf.text(`One-time total  ${formatUsdFromCents(document.amountCents)}`)
  pdf.text(`Monthly recurring (MRR)  ${formatUsdFromCents(document.mrrCents)}`)
  pdf.moveDown()
  pdf.fontSize(10).font('Helvetica')

  if (document.terms) {
    pdf.font('Helvetica-Bold').text('Terms')
    pdf.font('Helvetica').text(document.terms, { width: 504 })
    pdf.moveDown()
  }
  if (document.notes) {
    pdf.font('Helvetica-Bold').text('Notes')
    pdf.font('Helvetica').text(document.notes, { width: 504 })
    pdf.moveDown()
  }
  if (document.letterheadFooter) {
    pdf.fontSize(9).fillColor('#444444').text(document.letterheadFooter, { width: 504 })
    pdf.fillColor('#000000')
    pdf.moveDown()
  }

  pdf.fontSize(10).font('Helvetica')
  pdf.text('Acceptance')
  pdf.moveDown(0.3)
  pdf.text(SIGNATURE_ACCEPTANCE_COPY, { width: 504 })

  pdf.end()
  return finished
}

export async function writeProposalPdfFile(absPath: string, document: ProposalDocument) {
  mkdirSync(dirname(absPath), { recursive: true })
  const bytes = await renderProposalPdf(document)
  writeFileSync(absPath, bytes)
  return bytes
}
