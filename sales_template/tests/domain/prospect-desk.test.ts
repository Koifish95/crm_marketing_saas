import { afterEach, describe, expect, it, vi } from 'vitest'
import { salesProspectMessages, salesProspects, users } from '../../server/database/schema'
import { writeProspectDeskConfig } from '../../server/services/prospect-desk-settings'
import { createFixtureMailbox } from '../../server/services/prospect-mailbox'
import { listDeskProspects, prospectDeskSummary, runProspectTick } from '../../server/services/prospect-outreach'
import { storeQualifiedProspects } from '../../server/services/prospect-runs'
import { approveProspect, approveProspects, createManualProspect, markProspectDoNotContact, promoteProspect, skipProspect } from '../../server/services/prospects'
import {
  classifyProspectReply,
  qualificationFailure,
  withinSendWindow,
} from '../../shared/utils/prospect-desk'
import { eq } from 'drizzle-orm'
import { openTestDatabase } from '../helpers/db'

vi.mock('../../server/database', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/database')>()),
  useDb: () => dbHandle!.db,
}))

vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  readBody: async (event: { _body?: unknown }) => event._body,
}))

const MONDAY = Date.parse('2026-10-05T16:00:00.000Z')
const SUNDAY = Date.parse('2026-10-04T18:00:00.000Z')

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
})

async function ownerId() {
  const [admin] = await dbHandle!.db.select().from(users).limit(1)
  return admin!.id
}

async function approveByName(name: string) {
  const [row] = await dbHandle!.db.select().from(salesProspects).where(eq(salesProspects.name, name))
  await approveProspect(dbHandle!.db, row!.id, await ownerId())
  return row!.id
}

async function enableDesk(dailyCap = 5, bouncePauseLine = 2) {
  return writeProspectDeskConfig(dbHandle!.db, {
    enabled: true,
    postalAddress: '1 Main St, Columbus, OH 43085',
    unsubscribeLine: 'Reply stop and I will not email you again.',
    smtpHost: 'smtp.example.com',
    imapHost: 'imap.example.com',
    mailboxUsername: 'scott@example.com',
    mailboxPassword: 'secret-value',
    fromName: 'Scott',
    dailyCap,
    minutesBetweenSends: 15,
    bouncePauseLine,
  }, null)
}

function academy(name: string, host: string) {
  return {
    name,
    website: `https://${host}`,
    city: 'Columbus',
    state: 'OH',
    email: `info@${host}`,
    source: 'openstreetmap',
    externalId: `node/${name}`,
  }
}

describe('prospect desk rules', () => {
  it('rejects thin rows, social sites, and Utah', () => {
    expect(qualificationFailure({
      name: 'Columbus Dojo',
      city: 'Columbus',
      state: 'OH',
      website: 'https://facebook.com/columbus-dojo',
      email: 'info@columbus-dojo.example',
    })).toBe('missing_website')
    expect(qualificationFailure({
      name: 'Columbus Dojo',
      city: 'Columbus',
      state: 'UT',
      website: 'https://columbus-dojo.example',
      email: 'info@columbus-dojo.example',
    })).toBe('excluded_state')
    expect(qualificationFailure({
      name: 'Columbus Dojo',
      city: 'Columbus',
      state: 'OH',
      website: 'https://columbus-dojo.example',
      email: 'owner@gmail.com',
    })).toBe('email_not_on_site')
    expect(qualificationFailure({
      name: 'Columbus Dojo',
      city: 'Columbus',
      state: 'OH',
      website: 'https://columbus-dojo.example',
      email: 'info@columbus-dojo.example',
    })).toBeNull()
  })

  it('sorts replies without treating an open as a reason to write again', () => {
    expect(classifyProspectReply('Re: hello', 'Please unsubscribe me')).toBe('unsubscribe')
    expect(classifyProspectReply('Mail delivery failed', 'Address not found')).toBe('bounce')
    expect(classifyProspectReply('Automatic reply', 'I am out of office until Monday')).toBe('out_of_office')
    expect(classifyProspectReply('Re: hello', 'Can you show me how it works?')).toBe('needs_you')
    expect(withinSendWindow({ sendStartHour: 9, sendEndHour: 17 } as never, SUNDAY)).toBe(false)
    expect(withinSendWindow({ sendStartHour: 9, sendEndHour: 17 } as never, MONDAY)).toBe(true)
  })
})

describe('prospect desk queue', () => {
  it('stores a qualified academy and does not store Utah or a directory page', async () => {
    dbHandle = await openTestDatabase()
    const result = await storeQualifiedProspects(dbHandle.db, [
      academy('Columbus Dojo', 'columbus-dojo.example'),
      {
        ...academy('Lehi Dojo', 'lehi-dojo.example'),
        city: 'Lehi',
        state: 'UT',
        email: 'info@lehi-dojo.example',
      },
      {
        ...academy('Social Dojo', 'social-dojo.example'),
        website: 'https://instagram.com/social-dojo',
        email: 'info@social-dojo.example',
      },
    ])
    expect(result).toEqual({ stored: 1, rejected: 2 })
    const rows = await dbHandle.db.select().from(salesProspects)
    expect(rows.map(row => row.name)).toEqual(['Columbus Dojo'])
    expect(rows[0]?.outreachStatus).toBe('awaiting_approval')
  })

  it('does not return the mailbox password', async () => {
    dbHandle = await openTestDatabase()
    const saved = await enableDesk()
    expect(saved.passwordSet).toBe(true)
    expect(JSON.stringify(saved)).not.toContain('secret-value')
    expect(saved).not.toHaveProperty('mailboxPassword')
  })

  it('sends one touch inside the window and stops at the daily cap', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk(1)
    await createManualProspect(dbHandle.db, academy('First Dojo', 'first-dojo.example'))
    await createManualProspect(dbHandle.db, academy('Second Dojo', 'second-dojo.example'))
    await approveByName('First Dojo')
    await approveByName('Second Dojo')
    const mailbox = createFixtureMailbox()
    const first = await runProspectTick(dbHandle.db, { nowMs: MONDAY, mailbox })
    expect(first.sent).toBe(1)
    expect(mailbox.sent).toHaveLength(1)
    const second = await runProspectTick(dbHandle.db, { nowMs: MONDAY + 60_000, mailbox })
    expect(second.sent).toBe(0)
    expect(second.blockReason).toMatch(/cap/i)
    const waiting = await dbHandle.db.select().from(salesProspects).where(eq(salesProspects.name, 'Second Dojo'))
    expect(waiting[0]?.outreachStatus).toBe('ready')
  })

  it('does not send on Sunday', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk()
    await createManualProspect(dbHandle.db, academy('Sunday Dojo', 'sunday-dojo.example'))
    await approveByName('Sunday Dojo')
    const result = await runProspectTick(dbHandle.db, { nowMs: SUNDAY, mailbox: createFixtureMailbox() })
    expect(result.sent).toBe(0)
    expect(result.blockReason).toMatch(/window/i)
  })

  it('pauses sending when the bounce line is reached and flags needs you', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk(5, 1)
    await createManualProspect(dbHandle.db, academy('Bounce Dojo', 'bounce-dojo.example'))
    await createManualProspect(dbHandle.db, academy('Later Dojo', 'later-dojo.example'))
    await approveByName('Bounce Dojo')
    await approveByName('Later Dojo')
    const mailbox = createFixtureMailbox()
    await runProspectTick(dbHandle.db, { nowMs: MONDAY, mailbox })
    mailbox.pushInbound({
      messageId: '<bounce@example>',
      inReplyTo: mailbox.sent[0]!.messageId,
      subject: 'Mail delivery failed',
      text: 'Address not found',
    })
    const paused = await runProspectTick(dbHandle.db, { nowMs: MONDAY + 20 * 60_000, mailbox })
    expect(paused.sent).toBe(0)
    const summary = await prospectDeskSummary(dbHandle.db, MONDAY + 20 * 60_000)
    expect(summary.senderPaused).toBe(true)
    expect(summary.needsYou).toBeGreaterThan(0)
    const later = await dbHandle.db.select().from(salesProspects).where(eq(salesProspects.name, 'Later Dojo'))
    expect(later[0]?.outreachStatus).toBe('ready')
  })

  it('parks a human reply in needs you and does not send the follow-up', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk()
    const created = await createManualProspect(dbHandle.db, academy('Reply Dojo', 'reply-dojo.example'))
    await approveByName('Reply Dojo')
    const mailbox = createFixtureMailbox()
    await runProspectTick(dbHandle.db, { nowMs: MONDAY, mailbox })
    mailbox.pushInbound({
      messageId: '<reply@example>',
      inReplyTo: mailbox.sent[0]!.messageId,
      subject: 'Re: A note',
      text: 'Can you show me how it works?',
    })
    await runProspectTick(dbHandle.db, { nowMs: MONDAY + 20 * 60_000, mailbox })
    const [row] = await dbHandle.db.select().from(salesProspects).where(eq(salesProspects.id, created.prospect.id))
    expect(row?.outreachStatus).toBe('needs_you')
    const followUp = await runProspectTick(dbHandle.db, { nowMs: MONDAY + 12 * 86_400_000, mailbox })
    expect(followUp.sent).toBe(0)
    expect(mailbox.sent).toHaveLength(1)
  })

  it('promote does not send a message', async () => {
    dbHandle = await openTestDatabase()
    const created = await createManualProspect(dbHandle.db, academy('Promote Dojo', 'promote-dojo.example'))
    await promoteProspect(dbHandle.db, created.prospect.id, await ownerId())
    const messages = await dbHandle.db.select().from(salesProspectMessages)
    expect(messages).toHaveLength(0)
    const [row] = await dbHandle.db.select().from(salesProspects).where(eq(salesProspects.id, created.prospect.id))
    expect(row?.status).toBe('promoted')
    expect(row?.outreachStatus).toBe('stopped')
  })
})

describe('prospect desk owner approval', () => {
  it('lands a new qualifying prospect in awaiting approval and the tick sends nothing to it', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk()
    const created = await createManualProspect(dbHandle.db, academy('Gate Dojo', 'gate-dojo.example'))
    expect(created.prospect.outreachStatus).toBe('awaiting_approval')
    const mailbox = createFixtureMailbox()
    const result = await runProspectTick(dbHandle.db, { nowMs: MONDAY, mailbox })
    expect(result.sent).toBe(0)
    expect(mailbox.sent).toHaveLength(0)
    const summary = await prospectDeskSummary(dbHandle.db, MONDAY)
    expect(summary.awaitingApproval).toBe(1)
    expect(summary.ready).toBe(0)
  })

  it('shows the first email filled in for that academy', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk()
    await createManualProspect(dbHandle.db, academy('Preview Dojo', 'preview-dojo.example'))
    const items = await listDeskProspects(dbHandle.db, 'awaiting_approval')
    expect(items).toHaveLength(1)
    expect(items[0]?.firstEmail?.subject).toBe('A note for Preview Dojo')
    expect(items[0]?.firstEmail?.body).toContain('Preview Dojo in Columbus')
    expect(items[0]?.firstEmail?.body).not.toContain('{{')
  })

  it('sends touch 1 after approval, then touches 2 and 3 without a new approval', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk()
    const created = await createManualProspect(dbHandle.db, academy('Sequence Dojo', 'sequence-dojo.example'))
    const owner = await ownerId()
    const mailbox = createFixtureMailbox()
    await approveProspect(dbHandle.db, created.prospect.id, owner)
    const [approved] = await dbHandle.db.select().from(salesProspects).where(eq(salesProspects.id, created.prospect.id))
    expect(approved?.outreachStatus).toBe('ready')
    expect(approved?.approvedByUserId).toBe(owner)
    expect(approved?.approvedAt).toBeInstanceOf(Date)
    expect((await runProspectTick(dbHandle.db, { nowMs: MONDAY, mailbox })).sent).toBe(1)
    const day = 86_400_000
    expect((await runProspectTick(dbHandle.db, { nowMs: MONDAY + 4 * day, mailbox })).sent).toBe(1)
    expect((await runProspectTick(dbHandle.db, { nowMs: MONDAY + 11 * day, mailbox })).sent).toBe(1)
    const steps = await dbHandle.db.select().from(salesProspectMessages)
    expect(steps.map(row => row.step).sort()).toEqual([1, 2, 3])
  })

  it('lets Skip and Do not contact work from awaiting approval, and then refuses approval', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk()
    const skipped = await createManualProspect(dbHandle.db, academy('Skip Dojo', 'skip-dojo.example'))
    const blocked = await createManualProspect(dbHandle.db, academy('Blocked Dojo', 'blocked-dojo.example'))
    await skipProspect(dbHandle.db, skipped.prospect.id)
    await markProspectDoNotContact(dbHandle.db, blocked.prospect.id)
    const rows = await dbHandle.db.select().from(salesProspects)
    expect(rows.map(row => [row.name, row.status, row.outreachStatus]).sort()).toEqual([
      ['Blocked Dojo', 'do_not_contact', 'stopped'],
      ['Skip Dojo', 'skipped', 'stopped'],
    ])
    const result = await approveProspects(dbHandle.db, [skipped.prospect.id, blocked.prospect.id], await ownerId())
    expect(result.approved).toEqual([])
    const mailbox = createFixtureMailbox()
    expect((await runProspectTick(dbHandle.db, { nowMs: MONDAY, mailbox })).sent).toBe(0)
  })

  it('bulk approves only what is awaiting approval', async () => {
    dbHandle = await openTestDatabase()
    const one = await createManualProspect(dbHandle.db, academy('One Dojo', 'one-dojo.example'))
    const two = await createManualProspect(dbHandle.db, academy('Two Dojo', 'two-dojo.example'))
    await skipProspect(dbHandle.db, two.prospect.id)
    const result = await approveProspects(dbHandle.db, [one.prospect.id, two.prospect.id, one.prospect.id], await ownerId())
    expect(result).toEqual({ approved: [one.prospect.id], skipped: [two.prospect.id] })
  })

  it('migration 0007 moves an unsent ready prospect and leaves an active one alone', async () => {
    dbHandle = await openTestDatabase()
    const idle = await createManualProspect(dbHandle.db, academy('Idle Dojo', 'idle-dojo.example'))
    const active = await createManualProspect(dbHandle.db, academy('Active Dojo', 'active-dojo.example'))
    const queued = await createManualProspect(dbHandle.db, academy('Queued Dojo', 'queued-dojo.example'))
    const sentReady = await createManualProspect(dbHandle.db, academy('Sent Dojo', 'sent-dojo.example'))
    await dbHandle.client.execute('UPDATE sales_prospects SET outreach_status = \'ready\' WHERE name IN (\'Idle Dojo\', \'Sent Dojo\')')
    await dbHandle.client.execute('UPDATE sales_prospects SET outreach_status = \'active\' WHERE name = \'Active Dojo\'')
    await dbHandle.client.execute('UPDATE sales_prospects SET outreach_status = \'queued\' WHERE name = \'Queued Dojo\'')
    await dbHandle.db.insert(salesProspectMessages).values({
      prospectId: sentReady.prospect.id, step: 1, subject: 's', body: 'b', delivery: 'sent', sentAt: new Date(MONDAY), createdAt: new Date(MONDAY),
    })
    const { readFileSync } = await import('node:fs')
    const sql = readFileSync(new URL('../../drizzle/migrations/0007_sales_prospect_approval.sql', import.meta.url), 'utf8')
    const statements = sql.split('--> statement-breakpoint').map(part => part.trim()).filter(Boolean)
    // Columns already exist on the migrated test database; run only the data move.
    await dbHandle.client.execute(statements[2]!)
    const rows = await dbHandle.db.select().from(salesProspects)
    const byId = new Map(rows.map(row => [row.id, row.outreachStatus]))
    expect(byId.get(idle.prospect.id)).toBe('awaiting_approval')
    expect(byId.get(active.prospect.id)).toBe('active')
    expect(byId.get(queued.prospect.id)).toBe('queued')
    expect(byId.get(sentReady.prospect.id)).toBe('ready')
  })

  it('refuses approval without MANAGE_SALES on both endpoints', async () => {
    dbHandle = await openTestDatabase()
    const created = await createManualProspect(dbHandle.db, academy('Auth Dojo', 'auth-dojo.example'))
    const stamp = new Date(MONDAY)
    const [viewer] = await dbHandle.db.insert(users).values({
      email: 'viewer@local', username: 'viewer', displayName: 'Viewer', role: 'STAFF', createdAt: stamp, updatedAt: stamp,
    }).returning()
    vi.stubGlobal('getRouterParam', () => String(created.prospect.id))
    const single = (await import('../../server/api/prospects/[id]/approve.post')).default
    const bulk = (await import('../../server/api/prospects/approve.post')).default
    const event = { context: { authUser: { id: viewer!.id } }, path: '/api/prospects/approve', _body: { ids: [created.prospect.id] } }
    await expect(single(event as never)).rejects.toMatchObject({ statusCode: 403 })
    await expect(bulk(event as never)).rejects.toMatchObject({ statusCode: 403 })
    const [row] = await dbHandle.db.select().from(salesProspects).where(eq(salesProspects.id, created.prospect.id))
    expect(row?.outreachStatus).toBe('awaiting_approval')
    vi.unstubAllGlobals()
  })
})
