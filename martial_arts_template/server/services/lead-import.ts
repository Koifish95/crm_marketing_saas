import { randomUUID } from 'node:crypto'
import type { Database } from '../database'
import { programs } from '../database/schema'
import type { LeadLineRelationship, LeadSource } from '../../shared/schemas/enums'
import { leadLineRelationshipSchema, leadSourceSchema } from '../../shared/schemas/enums'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import { createStaffHousehold } from './staff-household'

export const LEAD_IMPORT_COLUMNS = [
  'householdKey',
  'guardianFirstName',
  'guardianLastName',
  'phone',
  'email',
  'source',
  'memberRelationship',
  'memberFirstName',
  'memberLastName',
  'memberAge',
  'programCode',
  'notes',
] as const

export type LeadImportRow = Record<(typeof LEAD_IMPORT_COLUMNS)[number], string>
export type LeadImportIssue = { row: number, message: string }
export type LeadImportResult = {
  received: number
  importedHouseholds: number
  importedMembers: number
  skipped: number
  errors: LeadImportIssue[]
  leadIds: number[]
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        current += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ',') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export function parseLeadImportCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  if (!lines.length) {
    throw new DomainError('CSV is empty.')
  }
  const header = splitCsvLine(lines[0]!).map(value => value.trim())
  const index = new Map(header.map((name, i) => [name, i]))
  for (const required of ['guardianFirstName', 'source', 'memberFirstName', 'programCode'] as const) {
    if (!index.has(required)) {
      throw new DomainError(`CSV is missing required column: ${required}.`)
    }
  }
  const rows: { rowNumber: number, values: LeadImportRow }[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]!)
    const values = {} as LeadImportRow
    for (const column of LEAD_IMPORT_COLUMNS) {
      values[column] = (cells[index.get(column) ?? -1] || '').trim()
    }
    rows.push({ rowNumber: i + 1, values })
  }
  return rows
}

function parseSource(raw: string, row: number, errors: LeadImportIssue[]) {
  const parsed = leadSourceSchema.safeParse(raw.trim().toUpperCase().replaceAll(' ', '_') || 'OTHER')
  if (!parsed.success) {
    errors.push({ row, message: `Invalid source "${raw}". Use INSTAGRAM, FACEBOOK, WALK_IN, REFERRAL, WEBSITE, PHONE, or OTHER.` })
    return null
  }
  return parsed.data as LeadSource
}

function parseRelationship(raw: string, row: number, errors: LeadImportIssue[]) {
  const value = (raw.trim().toUpperCase() || 'SELF')
  const parsed = leadLineRelationshipSchema.safeParse(value)
  if (!parsed.success) {
    errors.push({ row, message: `Invalid memberRelationship "${raw}". Use SELF, CHILD, SPOUSE, or OTHER.` })
    return null
  }
  return parsed.data as LeadLineRelationship
}

export async function importLeadsFromCsv(
  db: Database,
  csv: string,
  actor: SessionUser,
): Promise<LeadImportResult> {
  const parsedRows = parseLeadImportCsv(csv)
  const errors: LeadImportIssue[] = []
  const programRows = await db.select().from(programs)
  const programByCode = new Map(programRows.map(row => [row.code.toUpperCase(), row]))

  type HouseholdDraft = {
    key: string
    rowNumber: number
    guardianFirstName: string
    guardianLastName?: string
    phone?: string
    email?: string
    source: LeadSource | null
    notes?: string
    members: Array<{
      relationship: LeadLineRelationship
      firstName: string
      lastName?: string
      age?: number
      programId: number
    }>
  }

  const households = new Map<string, HouseholdDraft>()
  for (const item of parsedRows) {
    const values = item.values
    if (!values.guardianFirstName && !values.memberFirstName && !values.phone && !values.email) {
      continue
    }
    const source = parseSource(values.source, item.rowNumber, errors)
    const relationship = parseRelationship(values.memberRelationship, item.rowNumber, errors)
    const program = programByCode.get(values.programCode.toUpperCase())
    if (!program) {
      errors.push({ row: item.rowNumber, message: `Unknown programCode "${values.programCode}".` })
    }
    if (!values.guardianFirstName) {
      errors.push({ row: item.rowNumber, message: 'guardianFirstName is required.' })
    }
    if (!values.memberFirstName) {
      errors.push({ row: item.rowNumber, message: 'memberFirstName is required.' })
    }
    if (!values.phone && !values.email) {
      errors.push({ row: item.rowNumber, message: 'phone or email is required.' })
    }
    if (!source || !relationship || !program || !values.guardianFirstName || !values.memberFirstName) {
      continue
    }
    const key = values.householdKey || `row-${item.rowNumber}`
    const existing = households.get(key) || {
      key,
      rowNumber: item.rowNumber,
      guardianFirstName: values.guardianFirstName,
      guardianLastName: values.guardianLastName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      source,
      notes: values.notes || undefined,
      members: [],
    }
    existing.members.push({
      relationship,
      firstName: values.memberFirstName,
      lastName: values.memberLastName || undefined,
      age: values.memberAge ? Number.parseInt(values.memberAge, 10) : undefined,
      programId: program.id,
    })
    households.set(key, existing)
  }

  const leadIds: number[] = []
  let importedMembers = 0
  for (const draft of households.values()) {
    if (!draft.source) {
      continue
    }
    try {
      const created = await createStaffHousehold(db, {
        firstName: draft.guardianFirstName,
        lastName: draft.guardianLastName,
        phone: draft.phone,
        email: draft.email,
        source: draft.source,
        notes: draft.notes,
        members: draft.members,
        idempotencyKey: randomUUID(),
      }, actor)
      leadIds.push(created.lead.id)
      importedMembers += draft.members.length
    } catch (error) {
      errors.push({
        row: draft.rowNumber,
        message: error instanceof DomainError ? error.message : 'Could not import household.',
      })
    }
  }

  return {
    received: parsedRows.length,
    importedHouseholds: leadIds.length,
    importedMembers,
    skipped: parsedRows.length - importedMembers,
    errors,
    leadIds,
  }
}

export function leadImportTemplateCsv() {
  return `${LEAD_IMPORT_COLUMNS.join(',')}
smith-family,Jordan,Smith,5551112222,jordan@example.com,WALK_IN,SELF,Jordan,Smith,,ADULT_BJJ,Existing walk-in
smith-family,Jordan,Smith,5551112222,jordan@example.com,WALK_IN,CHILD,Avery,Smith,8,KIDS_BJJ,
`
}
