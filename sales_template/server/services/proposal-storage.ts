import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { DomainError } from '@crm/core/server/services/errors'

export const MAX_SIGNED_PDF_BYTES = 10 * 1024 * 1024
export const MAX_LETTERHEAD_LOGO_BYTES = 2 * 1024 * 1024

export function proposalsRoot() {
  return resolve(process.env.SALES_PROPOSALS_DIR || join(process.cwd(), 'data', 'proposals'))
}

export function letterheadDirectory() {
  return join(proposalsRoot(), '_letterhead')
}

function ensureInsideRoot(absPath: string) {
  const root = proposalsRoot()
  const abs = resolve(absPath)
  const prefix = root.endsWith(sep) ? root : root + sep
  if (abs !== root && !abs.startsWith(prefix)) {
    throw new DomainError('Invalid proposal artifact path.')
  }
  return abs
}

export function relativeArtifactPath(absPath: string) {
  return relative(proposalsRoot(), ensureInsideRoot(absPath)).replaceAll('\\', '/')
}

export function absoluteArtifactPath(relativePath: string) {
  return ensureInsideRoot(join(proposalsRoot(), relativePath))
}

export function revisionDirectory(proposalId: number, revision: number) {
  return join(proposalsRoot(), String(proposalId), String(revision))
}

export function ensureRevisionDirectory(proposalId: number, revision: number) {
  const dir = revisionDirectory(proposalId, revision)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function generatedPdfRelative(proposalId: number, revision: number) {
  return `${proposalId}/${revision}/generated.pdf`
}

export function signedPdfRelative(proposalId: number, revision: number) {
  return `${proposalId}/${revision}/signed.pdf`
}

export function writeGeneratedPdf(proposalId: number, revision: number, bytes: Buffer) {
  const relativePath = generatedPdfRelative(proposalId, revision)
  const abs = absoluteArtifactPath(relativePath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  return relativePath
}

export function readArtifactBytes(relativePath: string) {
  const abs = absoluteArtifactPath(relativePath)
  if (!existsSync(abs)) {
    return null
  }
  return readFileSync(abs)
}

export function writeSignedPdf(proposalId: number, revision: number, bytes: Buffer) {
  if (bytes.length > MAX_SIGNED_PDF_BYTES) {
    throw new DomainError('Signed PDF must be 10 MB or smaller.')
  }
  const relativePath = signedPdfRelative(proposalId, revision)
  const abs = absoluteArtifactPath(relativePath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  return relativePath
}

export function copyIntoRevision(proposalId: number, revision: number, sourceAbs: string, filename: string) {
  const dest = join(ensureRevisionDirectory(proposalId, revision), filename)
  copyFileSync(sourceAbs, dest)
  return relativeArtifactPath(dest)
}

export function letterheadLogoPath(filename: string) {
  return join(letterheadDirectory(), filename)
}

export function saveLetterheadLogo(originalName: string, bytes: Buffer) {
  if (bytes.length > MAX_LETTERHEAD_LOGO_BYTES) {
    throw new DomainError('Logo must be 2 MB or smaller.')
  }
  const ext = extname(originalName).toLowerCase()
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    throw new DomainError('Logo must be a PNG or JPEG file.')
  }
  mkdirSync(letterheadDirectory(), { recursive: true })
  const filename = `logo${ext === '.jpeg' ? '.jpg' : ext}`
  writeFileSync(join(letterheadDirectory(), filename), bytes)
  return filename
}

export function deleteLetterheadLogo(filename: string | null | undefined) {
  if (!filename) {
    return
  }
  const abs = letterheadLogoPath(filename)
  if (existsSync(abs)) {
    unlinkSync(abs)
  }
}

export function isPdfPayload(filename: string | undefined, mime: string | undefined, bytes: Buffer) {
  const name = filename?.toLowerCase() ?? ''
  const type = mime?.toLowerCase() ?? ''
  if (type && type !== 'application/pdf' && type !== 'application/octet-stream') {
    return false
  }
  if (name && !name.endsWith('.pdf')) {
    return false
  }
  return bytes.subarray(0, 5).toString('utf8') === '%PDF-'
}
