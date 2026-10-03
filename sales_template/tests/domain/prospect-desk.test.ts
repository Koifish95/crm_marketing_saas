import { afterEach, describe, expect, it } from 'vitest'
import { salesProspectMessages, salesProspects, users } from '../../server/database/schema'
import { writeProspectDeskConfig } from '../../server/services/prospect-desk-settings'
import { createFixtureMailbox } from '../../server/services/prospect-mailbox'
import { prospectDeskSummary, runProspectTick } from '../../server/services/prospect-outreach'
import { storeQualifiedProspects } from '../../server/services/prospect-runs'
import { createManualProspect, promoteProspect } from '../../server/services/prospects'
import {
  classifyProspectReply,
  qualificationFailure,
  withinSendWindow,
} from '../../shared/utils/prospect-desk'
import { eq } from 'drizzle-orm'
import { openTestDatabase } from '../helpers/db'

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
    expect(rows[0]?.outreachStatus).toBe('ready')
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
    const result = await runProspectTick(dbHandle.db, { nowMs: SUNDAY, mailbox: createFixtureMailbox() })
    expect(result.sent).toBe(0)
    expect(result.blockReason).toMatch(/window/i)
  })

  it('pauses sending when the bounce line is reached and flags needs you', async () => {
    dbHandle = await openTestDatabase()
    await enableDesk(5, 1)
    await createManualProspect(dbHandle.db, academy('Bounce Dojo', 'bounce-dojo.example'))
    await createManualProspect(dbHandle.db, academy('Later Dojo', 'later-dojo.example'))
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
