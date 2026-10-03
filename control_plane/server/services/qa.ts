import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, normalize, resolve } from 'node:path'
import { and, asc, desc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import type { Database } from '../database'
import {
  findingTicketLinks,
  qaEvidence,
  qaFindings,
  qaRunWorkflows,
  qaRuns,
} from '../database/schema'
import { createStableId } from '../../shared/utils/ids'
import { attachEvidenceToTicket, createTicket, getTicketDetail } from './tickets'

export type QaFindingInput = {
  route?: string | null
  workflow?: string | null
  category: string
  severity: string
  title: string
  observation: string
  expectedBehavior?: string | null
  reproductionSteps?: string[]
  suggestedRemediation?: string | null
  detectionMethod: string
  confidence?: string | null
  rationale?: string | null
  consoleContext?: unknown
  networkContext?: unknown
}

function json(value: unknown) {
  return value === undefined || value === null ? null : JSON.stringify(value)
}

function parseJson(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function assertSafeQaEnvironment(environment: { type: string, lifecycleStatus?: string, productInstance?: { productId?: string } }) {
  if (environment.type.toUpperCase() === 'PROD') {
    throw createError({ statusCode: 400, statusMessage: 'QA refuses PROD environments.' })
  }
  if (environment.lifecycleStatus && environment.lifecycleStatus !== 'ready') {
    throw createError({ statusCode: 409, statusMessage: 'QA requires a ready environment.' })
  }
  if (environment.productInstance?.productId && environment.productInstance.productId !== 'martial-arts') {
    throw createError({ statusCode: 400, statusMessage: 'This runner only supports Martial Arts.' })
  }
}

export async function createQaRun(db: Database, input: {
  productId: string
  productInstanceId?: string | null
  environmentId?: string | null
  environmentType: string
  baseUrl: string
  buildVersion?: string | null
  trigger?: string
  browser?: string | null
  viewport?: string | null
}) {
  if (input.environmentType.toUpperCase() === 'PROD') {
    throw createError({ statusCode: 400, statusMessage: 'QA refuses PROD environments.' })
  }
  const id = createStableId()
  const now = new Date().toISOString()
  const row = { id, ...input, trigger: input.trigger || 'manual', status: 'RUNNING', startedAt: now, completedAt: null, errorSummary: null, createdAt: now }
  await db.insert(qaRuns).values(row)
  return row
}

export async function completeQaRun(db: Database, id: string, input: { status: string, errorSummary?: string | null }) {
  await db.update(qaRuns).set({ status: input.status, errorSummary: input.errorSummary ?? null, completedAt: new Date().toISOString() }).where(eq(qaRuns.id, id))
}

export async function recordQaWorkflow(db: Database, input: {
  qaRunId: string
  name: string
  status: string
  startedAt: string
  completedAt?: string | null
  errorSummary?: string | null
  routes?: string[]
}) {
  const row = { id: createStableId(), ...input, routes: json(input.routes) }
  await db.insert(qaRunWorkflows).values(row)
  return row
}

export async function createQaFinding(db: Database, run: { id: string, productId: string, environmentId?: string | null }, input: QaFindingInput) {
  const id = createStableId()
  const now = new Date().toISOString()
  const row = {
    id,
    qaRunId: run.id,
    productId: run.productId,
    environmentId: run.environmentId ?? null,
    route: input.route ?? null,
    workflow: input.workflow ?? null,
    category: input.category,
    severity: input.severity,
    status: 'NEW',
    title: input.title,
    observation: input.observation,
    expectedBehavior: input.expectedBehavior ?? null,
    reproductionSteps: json(input.reproductionSteps),
    suggestedRemediation: input.suggestedRemediation ?? null,
    detectionMethod: input.detectionMethod,
    confidence: input.confidence ?? null,
    rationale: input.rationale ?? null,
    consoleContext: json(input.consoleContext),
    networkContext: json(input.networkContext),
    duplicateOfFindingId: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(qaFindings).values(row)
  return row
}

export function qaEvidenceRoot() {
  return resolve(process.env.QA_EVIDENCE_ROOT || join(process.cwd(), 'data', 'qa-evidence'))
}

export async function storeQaEvidence(db: Database, input: {
  qaRunId: string
  findingId?: string | null
  kind: string
  fileName: string
  mimeType: string
  bytes: Uint8Array
  route?: string | null
  metadata?: unknown
}) {
  const id = createStableId()
  const safeName = basename(input.fileName).replace(/[^a-zA-Z0-9._-]/g, '_') || 'evidence.bin'
  const storageKey = `${input.qaRunId}/${id}-${safeName}`
  const root = qaEvidenceRoot()
  const target = resolve(root, normalize(storageKey))
  if (!target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid evidence path.' })
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, input.bytes)
  const row = {
    id,
    qaRunId: input.qaRunId,
    findingId: input.findingId ?? null,
    kind: input.kind,
    storageKey,
    fileName: safeName,
    mimeType: input.mimeType,
    bytes: input.bytes.byteLength,
    sha256: createHash('sha256').update(input.bytes).digest('hex'),
    route: input.route ?? null,
    metadata: json(input.metadata),
    createdAt: new Date().toISOString(),
  }
  await db.insert(qaEvidence).values(row)
  return row
}

export async function readQaEvidence(db: Database, id: string) {
  const [row] = await db.select().from(qaEvidence).where(eq(qaEvidence.id, id)).limit(1)
  if (!row) return null
  const root = qaEvidenceRoot()
  const target = resolve(root, normalize(row.storageKey))
  if (!target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    throw createError({ statusCode: 500, statusMessage: 'Evidence path escaped its root.' })
  }
  return { row, bytes: await readFile(target) }
}

export async function listQaRuns(db: Database, limit = 50) {
  return db.select().from(qaRuns).orderBy(desc(qaRuns.startedAt)).limit(Math.min(Math.max(limit, 1), 200))
}

export async function getQaRunDetail(db: Database, id: string) {
  const [run] = await db.select().from(qaRuns).where(eq(qaRuns.id, id)).limit(1)
  if (!run) return null
  const [workflows, findings, evidence] = await Promise.all([
    db.select().from(qaRunWorkflows).where(eq(qaRunWorkflows.qaRunId, id)).orderBy(asc(qaRunWorkflows.startedAt)),
    db.select().from(qaFindings).where(eq(qaFindings.qaRunId, id)).orderBy(desc(qaFindings.createdAt)),
    db.select().from(qaEvidence).where(eq(qaEvidence.qaRunId, id)).orderBy(asc(qaEvidence.createdAt)),
  ])
  return {
    run,
    workflows: workflows.map(row => ({ ...row, routes: parseJson(row.routes) })),
    findings: findings.map(row => ({ ...row, reproductionSteps: parseJson(row.reproductionSteps), consoleContext: parseJson(row.consoleContext), networkContext: parseJson(row.networkContext) })),
    evidence: evidence.map(row => ({ ...row, metadata: parseJson(row.metadata) })),
  }
}

export async function reviewFinding(db: Database, findingId: string, review:
  | { action: 'dismiss', note: string }
  | { action: 'duplicate', duplicateOfFindingId: string, note?: string }
  | { action: 'link', ticketId: string, note?: string }
  | { action: 'create_ticket', priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', assignee?: string }, actor = 'Operator') {
  const [finding] = await db.select().from(qaFindings).where(eq(qaFindings.id, findingId)).limit(1)
  if (!finding) throw createError({ statusCode: 404, statusMessage: 'Finding not found.' })
  if (finding.status !== 'NEW' && finding.status !== 'REVIEWED') {
    throw createError({ statusCode: 409, statusMessage: `Finding is already ${finding.status}.` })
  }
  const now = new Date().toISOString()
  if (review.action === 'dismiss') {
    await db.update(qaFindings).set({ status: 'DISMISSED', reviewedAt: now, reviewNote: review.note, updatedAt: now }).where(eq(qaFindings.id, finding.id))
    return { findingId, status: 'DISMISSED' }
  }
  if (review.action === 'duplicate') {
    const [duplicate] = await db.select({ id: qaFindings.id }).from(qaFindings).where(and(eq(qaFindings.id, review.duplicateOfFindingId), eq(qaFindings.qaRunId, finding.qaRunId))).limit(1)
    if (!duplicate || duplicate.id === finding.id) throw createError({ statusCode: 400, statusMessage: 'Duplicate target must be another finding in this run.' })
    await db.update(qaFindings).set({ status: 'DUPLICATE', duplicateOfFindingId: duplicate.id, reviewedAt: now, reviewNote: review.note ?? null, updatedAt: now }).where(eq(qaFindings.id, finding.id))
    return { findingId, status: 'DUPLICATE' }
  }
  let ticketId: string
  let linkType: string
  if (review.action === 'link') {
    const ticket = await getTicketDetail(db, review.ticketId)
    if (!ticket) throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' })
    ticketId = ticket.ticket.id
    linkType = 'EXISTING'
  } else {
    const [run] = await db.select().from(qaRuns).where(eq(qaRuns.id, finding.qaRunId)).limit(1)
    const ticket = await createTicket(db, {
      title: finding.title,
      description: `${finding.observation}${finding.expectedBehavior ? `\n\nExpected: ${finding.expectedBehavior}` : ''}${finding.suggestedRemediation ? `\n\nSuggested improvement: ${finding.suggestedRemediation}` : ''}`,
      source: 'QA_AGENT',
      category: finding.category as 'BUG',
      priority: review.priority,
      severity: finding.severity as 'MEDIUM',
      assignee: review.assignee,
      productId: finding.productId,
      productInstanceId: run?.productInstanceId,
      environmentId: finding.environmentId,
    }, actor)
    ticketId = ticket.id
    linkType = 'CREATED'
  }
  await db.insert(findingTicketLinks).values({ id: createStableId(), findingId: finding.id, ticketId, linkType, createdAt: now })
  const evidence = await db.select().from(qaEvidence).where(eq(qaEvidence.findingId, finding.id))
  for (const item of evidence) await attachEvidenceToTicket(db, ticketId, item.id)
  await db.update(qaFindings).set({ status: linkType === 'CREATED' ? 'TICKETED' : 'LINKED', reviewedAt: now, reviewNote: review.action === 'link' ? review.note ?? null : null, updatedAt: now }).where(eq(qaFindings.id, finding.id))
  return { findingId, status: linkType === 'CREATED' ? 'TICKETED' : 'LINKED', ticketId }
}
