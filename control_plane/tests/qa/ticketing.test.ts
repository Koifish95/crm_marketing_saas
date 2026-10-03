import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { qaFindings } from '../../server/database/schema'
import { createTicket, addTicketComment, getTicketDetail, listTickets, updateTicket } from '../../server/services/tickets'
import {
  assertSafeQaEnvironment,
  completeQaRun,
  createQaFinding,
  createQaRun,
  getQaRunDetail,
  recordQaWorkflow,
  reviewFinding,
  storeQaEvidence,
} from '../../server/services/qa'
import { ticketCreateSchema, ticketUpdateSchema } from '../../shared/schemas/ticketing'
import { readQaCredentialsFromEnvironmentFile, selectQaEnvironment } from '../../server/services/qa-runner-config'

const roots: string[] = []
const originalEvidenceRoot = process.env.QA_EVIDENCE_ROOT

afterEach(() => {
  process.env.QA_EVIDENCE_ROOT = originalEvidenceRoot
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // ignore temp cleanup races on Windows
    }
  }
})

async function openDatabase() {
  const root = join(tmpdir(), `cp-qa-${randomUUID()}`)
  mkdirSync(root, { recursive: true })
  roots.push(root)
  const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
  await migrateDatabase(url)
  await seedRegistry(url)
  const opened = createDb(url)
  return { ...opened, root }
}

describe('ticket persistence and lifecycle', () => {
  it('persists normalized comments and activity and enforces terminal resolution', async () => {
    const { client, db } = await openDatabase()
    try {
      const ticket = await createTicket(db, {
        title: 'Navigation fails on mobile',
        description: 'The primary navigation cannot be opened.',
        source: 'MANUAL',
        category: 'UI',
        priority: 'HIGH',
      })
      await addTicketComment(db, ticket.id, { author: 'Scott', body: 'Confirmed in DEV.', visibility: 'INTERNAL' })
      await updateTicket(db, ticket.id, { status: 'TRIAGED' })
      await updateTicket(db, ticket.id, { status: 'READY' })
      await updateTicket(db, ticket.id, { status: 'IN_PROGRESS' })
      await updateTicket(db, ticket.id, { status: 'REVIEW' })
      await expect(updateTicket(db, ticket.id, { status: 'DONE' })).rejects.toMatchObject({ statusCode: 400 })
      await updateTicket(db, ticket.id, { status: 'DONE', resolution: 'Navigation button now exposes and opens the menu.' })
      const detail = await getTicketDetail(db, ticket.id)
      expect(detail?.ticket.status).toBe('DONE')
      expect(detail?.comments).toHaveLength(1)
      expect(detail?.activity.map(item => item.action)).toContain('ticket.status_changed')
      expect(detail?.ticket.resolvedAt).toBeTruthy()
      const list = await listTickets(db, { query: 'mobile', status: 'DONE' })
      expect(list.total).toBe(1)
      expect(list.tickets[0]?.key).toMatch(/^TKT-/)
    } finally {
      client.close()
    }
  })

  it('validates API payload contracts', () => {
    expect(ticketCreateSchema.safeParse({ title: 'x', description: '', category: 'OTHER' }).success).toBe(false)
    expect(ticketCreateSchema.safeParse({ title: 'Valid ticket', description: 'Details', category: 'BUG' }).success).toBe(true)
    expect(ticketUpdateSchema.safeParse({}).success).toBe(false)
    expect(ticketUpdateSchema.safeParse({ priority: 'URGENT' }).success).toBe(true)
  })
})

describe('QA findings and review', () => {
  it('preserves a finding and evidence when an operator converts it to a ticket', async () => {
    const { client, db, root } = await openDatabase()
    process.env.QA_EVIDENCE_ROOT = join(root, 'evidence')
    try {
      const run = await createQaRun(db, { productId: 'martial-arts', environmentType: 'DEV', baseUrl: 'http://127.0.0.1:5020', buildVersion: 'qa-build' })
      await recordQaWorkflow(db, { qaRunId: run.id, name: 'lead create', status: 'FAILED', startedAt: run.startedAt, completedAt: new Date().toISOString(), routes: ['/leads/new'] })
      const finding = await createQaFinding(db, run, {
        route: '/leads/new',
        workflow: 'lead create',
        category: 'BUG',
        severity: 'HIGH',
        title: 'Lead creation does not finish',
        observation: 'The submit action returned HTTP 500.',
        expectedBehavior: 'A disposable lead should be created.',
        reproductionSteps: ['Open New lead', 'Submit valid data'],
        suggestedRemediation: 'Inspect the server error and preserve transactional behavior.',
        detectionMethod: 'PLAYWRIGHT_ASSERTION',
        confidence: 'HIGH',
      })
      const evidence = await storeQaEvidence(db, { qaRunId: run.id, findingId: finding.id, kind: 'SCREENSHOT', fileName: 'failure.png', mimeType: 'image/png', bytes: Buffer.from('png-evidence'), route: '/leads/new' })
      await completeQaRun(db, run.id, { status: 'COMPLETED_WITH_FINDINGS' })
      const converted = await reviewFinding(db, finding.id, { action: 'create_ticket', priority: 'HIGH' })
      expect(converted.status).toBe('TICKETED')
      const ticket = await getTicketDetail(db, converted.ticketId!)
      expect(ticket?.ticket.source).toBe('QA_AGENT')
      expect(ticket?.findings[0]?.id).toBe(finding.id)
      expect(ticket?.attachments[0]?.evidence?.id).toBe(evidence.id)
      const runDetail = await getQaRunDetail(db, run.id)
      expect(runDetail?.findings[0]?.status).toBe('TICKETED')
      expect(runDetail?.findings[0]?.reproductionSteps).toEqual(['Open New lead', 'Submit valid data'])
    } finally {
      client.close()
    }
  })

  it('dismisses and marks duplicates without deleting findings', async () => {
    const { client, db } = await openDatabase()
    try {
      const run = await createQaRun(db, { productId: 'martial-arts', environmentType: 'DEV', baseUrl: 'http://127.0.0.1:5020' })
      const first = await createQaFinding(db, run, { category: 'UX', severity: 'LOW', title: 'Unclear action', observation: 'Action wording may be unclear.', detectionMethod: 'STRUCTURED_REVIEW', confidence: 'MEDIUM', rationale: 'Requires operator judgment.' })
      const second = await createQaFinding(db, run, { category: 'UX', severity: 'LOW', title: 'Same unclear action', observation: 'The same wording appears again.', detectionMethod: 'STRUCTURED_REVIEW', confidence: 'MEDIUM', rationale: 'Requires operator judgment.' })
      const third = await createQaFinding(db, run, { category: 'UI', severity: 'INFO', title: 'Benign alignment', observation: 'Alignment is intentional.', detectionMethod: 'STRUCTURED_REVIEW' })
      await reviewFinding(db, second.id, { action: 'duplicate', duplicateOfFindingId: first.id })
      await reviewFinding(db, third.id, { action: 'dismiss', note: 'Intentional design.' })
      const rows = await db.select().from(qaFindings)
      expect(rows).toHaveLength(3)
      expect(rows.find(item => item.id === second.id)).toMatchObject({ status: 'DUPLICATE', duplicateOfFindingId: first.id })
      expect(rows.find(item => item.id === third.id)).toMatchObject({ status: 'DISMISSED', reviewNote: 'Intentional design.' })
    } finally {
      client.close()
    }
  })
})

describe('QA safety', () => {
  it('refuses production before browser execution', () => {
    expect(() => assertSafeQaEnvironment({ type: 'PROD', lifecycleStatus: 'ready', productInstance: { productId: 'martial-arts' } })).toThrow(/refuses PROD/)
    expect(() => assertSafeQaEnvironment({ type: 'DEV', lifecycleStatus: 'ready', productInstance: { productId: 'sales' } })).toThrow(/only supports Martial Arts/)
    expect(() => assertSafeQaEnvironment({ type: 'DEV', lifecycleStatus: 'ready', productInstance: { productId: 'martial-arts' } })).not.toThrow()
  })

  it('selects registered environments by slug or id without fuzzy matching', () => {
    const rows = [{ id: 'env-1', slug: 'lab-acme-dev', envFileLocal: '.env.dev' }]
    expect(selectQaEnvironment(rows, 'lab-acme-dev').id).toBe('env-1')
    expect(selectQaEnvironment(rows, 'env-1').slug).toBe('lab-acme-dev')
    expect(() => selectQaEnvironment(rows, 'acme')).toThrow(/not found/)
  })

  it('reads runner credentials from a registered local env file without returning unrelated values', () => {
    const root = join(tmpdir(), `cp-qa-env-${randomUUID()}`)
    mkdirSync(root, { recursive: true })
    roots.push(root)
    writeFileSync(join(root, '.env.dev'), 'NUXT_AUTH_USERNAME="qa-operator"\nNUXT_AUTH_PASSWORD="not-logged"\nNUXT_SESSION_PASSWORD="unrelated"\n')
    expect(readQaCredentialsFromEnvironmentFile({ id: 'env-1', slug: 'lab-acme-dev', envFileLocal: '.env.dev' }, root)).toEqual({ username: 'qa-operator', password: 'not-logged' })
  })
})
