import { existsSync } from 'node:fs'
import { publicBrand } from '@crm/core/shared/utils/brand'
import { ensureAppSettings, readAppSetting, upsertAppSetting } from '@crm/core/server/services/app-settings'
import type { Database } from '../database'
import { PROPOSAL_LETTERHEAD_SETTING_KEY } from '../../shared/utils/proposals'
import { deleteLetterheadLogo, letterheadLogoPath } from './proposal-storage'

export type ProposalLetterhead = {
  businessName: string
  address: string
  phone: string
  email: string
  website: string
  footer: string
  logoFilename: string | null
}

function blank(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : ''
}

export function defaultProposalLetterhead(): ProposalLetterhead {
  const brand = publicBrand()
  return {
    businessName: brand.brandName,
    address: '',
    phone: '',
    email: '',
    website: '',
    footer: '',
    logoFilename: null,
  }
}

function normalizeLetterhead(raw: unknown): ProposalLetterhead {
  const source = (raw && typeof raw === 'object') ? raw as Partial<ProposalLetterhead> : {}
  const defaults = defaultProposalLetterhead()
  const logoFilename = blank(source.logoFilename) || null
  return {
    businessName: blank(source.businessName) || defaults.businessName,
    address: blank(source.address),
    phone: blank(source.phone),
    email: blank(source.email),
    website: blank(source.website),
    footer: blank(source.footer),
    logoFilename,
  }
}

export async function ensureProposalLetterhead(db: Database) {
  await ensureAppSettings(db, [{
    key: PROPOSAL_LETTERHEAD_SETTING_KEY,
    value: JSON.stringify(defaultProposalLetterhead()),
  }])
}

export async function readProposalLetterhead(db: Database): Promise<ProposalLetterhead> {
  await ensureProposalLetterhead(db)
  const row = await readAppSetting(db, PROPOSAL_LETTERHEAD_SETTING_KEY)
  try {
    return normalizeLetterhead(row ? JSON.parse(row.value) : defaultProposalLetterhead())
  } catch {
    return defaultProposalLetterhead()
  }
}

export async function writeProposalLetterhead(
  db: Database,
  patch: Partial<ProposalLetterhead>,
  actorUserId: number,
) {
  const current = await readProposalLetterhead(db)
  const next = normalizeLetterhead({ ...current, ...patch })
  await upsertAppSetting(db, PROPOSAL_LETTERHEAD_SETTING_KEY, JSON.stringify(next), actorUserId)
  return next
}

export async function setProposalLetterheadLogo(db: Database, filename: string, actorUserId: number) {
  const current = await readProposalLetterhead(db)
  if (current.logoFilename && current.logoFilename !== filename) {
    deleteLetterheadLogo(current.logoFilename)
  }
  return writeProposalLetterhead(db, { logoFilename: filename }, actorUserId)
}

export async function clearProposalLetterheadLogo(db: Database, actorUserId: number) {
  const current = await readProposalLetterhead(db)
  deleteLetterheadLogo(current.logoFilename)
  return writeProposalLetterhead(db, { logoFilename: null }, actorUserId)
}

export function letterheadLogoAbsolute(filename: string | null | undefined) {
  if (!filename) {
    return null
  }
  const abs = letterheadLogoPath(filename)
  return existsSync(abs) ? abs : null
}
