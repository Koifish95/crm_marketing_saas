import { randomBytes } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import { salesProspectMessages, salesProspects } from '../database/schema'
import {
  classifyProspectReply,
  mailboxReady,
  nextSequenceStep,
  publicProspectDeskConfig,
  renderProspectTemplate,
  senderBlockReason,
  touchDueAt,
  type ProspectDeskConfig,
} from '../../shared/utils/prospect-desk'
import { denverYmd, utcNowMs } from '../../shared/utils/time'
import { readProspectDeskConfig, saveProspectDeskInternal } from './prospect-desk-settings'
import { createSmtpImapMailbox, type InboundMail, type ProspectMailbox } from './prospect-mailbox'
import { markProspectDoNotContact } from './prospects'

function nowDate(nowMs: number) {
  return new Date(nowMs)
}

function messageIdFor(prospectId: number, step: number) {
  return `<p${prospectId}.s${step}.${randomBytes(6).toString('hex')}@prospects.nuxxion.local>`
}

function excerpt(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.slice(0, 500)
}

export async function pauseProspect(db: Database, id: number) {
  const [prospect] = await db.select().from(salesProspects).where(eq(salesProspects.id, id)).limit(1)
  if (!prospect) {
    throw new DomainError('Prospect not found.', 404)
  }
  if (prospect.status === 'promoted' || prospect.status === 'do_not_contact') {
    throw new DomainError('This academy is no longer in the sending queue.')
  }
  await db.update(salesProspects).set({
    outreachStatus: 'paused',
    nextTouchAt: null,
    updatedAt: nowDate(utcNowMs()),
  }).where(eq(salesProspects.id, id))
}

export async function resumeProspectSending(db: Database, actorUserId: number | null) {
  const config = await readProspectDeskConfig(db)
  return saveProspectDeskInternal(db, {
    ...config,
    senderPaused: false,
    senderPausedReason: null,
  }, actorUserId)
}

export async function recordProspectOpen(db: Database, token: string) {
  const config = await readProspectDeskConfig(db)
  if (!config.publicBaseUrl) {
    return false
  }
  const [message] = await db.select().from(salesProspectMessages)
    .where(eq(salesProspectMessages.openToken, token))
    .limit(1)
  if (!message || message.openedAt) {
    return Boolean(message)
  }
  await db.update(salesProspectMessages).set({
    openedAt: nowDate(utcNowMs()),
  }).where(eq(salesProspectMessages.id, message.id))
  return true
}

export async function runProspectTick(db: Database, options: {
  nowMs?: number
  mailbox?: ProspectMailbox
} = {}) {
  const nowMs = options.nowMs ?? utcNowMs()
  const config = await readProspectDeskConfig(db)
  if (!config.enabled) {
    return { sent: 0, polled: 0, blockReason: 'Prospects are turned off.' }
  }
  const mailbox = options.mailbox ?? (mailboxReady(config) ? createSmtpImapMailbox(config) : null)
  const polled = mailbox ? await applyInbound(db, await mailbox.poll(), nowMs) : 0
  const refreshed = await readProspectDeskConfig(db)
  const messages = await db.select().from(salesProspectMessages)
  const sentToday = messages.filter(row => row.sentAt && denverYmd(row.sentAt.getTime()) === denverYmd(nowMs)).length
  const bouncedToday = messages.filter(row => row.bouncedAt && denverYmd(row.bouncedAt.getTime()) === denverYmd(nowMs)).length
  let activeConfig = refreshed
  if (!refreshed.senderPaused && bouncedToday >= refreshed.bouncePauseLine) {
    activeConfig = await saveProspectDeskInternal(db, {
      ...refreshed,
      senderPaused: true,
      senderPausedReason: `${bouncedToday} bounces today reached the pause line.`,
    }, null)
  }
  const lastSentAtMs = messages.reduce((latest, row) => {
    const ms = row.sentAt?.getTime() ?? 0
    return ms > latest ? ms : latest
  }, 0) || null
  const blockReason = senderBlockReason(activeConfig, nowMs, sentToday, lastSentAtMs)
  if (blockReason || !mailbox) {
    return { sent: 0, polled, blockReason: blockReason || 'Connect the mailbox and add the postal address before anything sends.' }
  }
  const prospect = await nextSendable(db, activeConfig, nowMs)
  if (!prospect) {
    return { sent: 0, polled, blockReason: null }
  }
  try {
    await sendTouch(db, mailbox, activeConfig, prospect, nowMs)
  } catch (error) {
    return {
      sent: 0,
      polled,
      blockReason: error instanceof Error ? error.message : 'The message was not accepted.',
    }
  }
  return { sent: 1, polled, blockReason: null }
}

async function nextSendable(db: Database, config: ProspectDeskConfig, nowMs: number) {
  const rows = await db.select().from(salesProspects).orderBy(asc(salesProspects.id))
  const messages = await db.select().from(salesProspectMessages)
  for (const row of rows) {
    if (row.status === 'promoted' || row.status === 'do_not_contact') {
      continue
    }
    if (row.outreachStatus !== 'ready' && row.outreachStatus !== 'active' && row.outreachStatus !== 'queued') {
      continue
    }
    const own = messages.filter(message => message.prospectId === row.id)
    if (own.some(message => message.replyAt || message.bouncedAt)) {
      continue
    }
    const step = nextSequenceStep({
      sentSteps: own.filter(message => message.sentAt).map(message => message.step),
      sequenceStartedAtMs: row.sequenceStartedAt?.getTime() ?? null,
      nowMs,
      secondTouchDays: config.secondTouchDays,
      thirdTouchDays: config.thirdTouchDays,
    })
    if (!step) {
      continue
    }
    if (step > 1 && row.nextTouchAt && row.nextTouchAt.getTime() > nowMs) {
      continue
    }
    return { row, step }
  }
  return null
}

async function sendTouch(
  db: Database,
  mailbox: ProspectMailbox,
  config: ProspectDeskConfig,
  target: { row: typeof salesProspects.$inferSelect, step: number },
  nowMs: number,
) {
  const template = config.templates[target.step - 1]
  if (!template || !target.row.email) {
    return
  }
  const values = {
    academy: target.row.name,
    city: target.row.city ?? '',
    address: config.postalAddress,
    unsubscribe: config.unsubscribeLine,
  }
  const subject = renderProspectTemplate(template.subject, values)
  const text = renderProspectTemplate(template.body, values)
  const providerMessageId = messageIdFor(target.row.id, target.step)
  const openToken = randomBytes(12).toString('hex')
  const html = config.publicBaseUrl
    ? `<p>${text.replaceAll('\n', '<br>')}</p><img src="${config.publicBaseUrl}/api/public/outreach/${openToken}" alt="" width="1" height="1">`
    : null
  const createdAt = nowDate(nowMs)
  await db.insert(salesProspectMessages).values({
    prospectId: target.row.id,
    step: target.step,
    subject,
    body: text,
    delivery: 'queued',
    providerMessageId,
    openToken,
    createdAt,
  })
  try {
    await mailbox.send({
      messageId: providerMessageId,
      fromName: config.fromName,
      fromAddress: config.mailboxUsername,
      to: target.row.email,
      subject,
      text,
      html,
    })
  } catch (error) {
    await db.update(salesProspectMessages).set({
      delivery: 'bounced',
      bouncedAt: createdAt,
    }).where(eq(salesProspectMessages.providerMessageId, providerMessageId))
    await db.update(salesProspects).set({
      outreachStatus: 'bounced',
      nextTouchAt: null,
      updatedAt: createdAt,
    }).where(eq(salesProspects.id, target.row.id))
    throw error
  }
  const sequenceStartedAt = target.row.sequenceStartedAt ?? createdAt
  await db.update(salesProspectMessages).set({
    delivery: 'sent',
    sentAt: createdAt,
  }).where(eq(salesProspectMessages.providerMessageId, providerMessageId))
  await db.update(salesProspects).set({
    outreachStatus: target.step === 3 ? 'stopped' : 'active',
    sequenceStartedAt,
    nextTouchAt: nextTouchFor(config, sequenceStartedAt.getTime(), target.step),
    updatedAt: createdAt,
  }).where(eq(salesProspects.id, target.row.id))
}

function nextTouchFor(config: ProspectDeskConfig, sequenceStartedAtMs: number, stepJustSent: number) {
  if (stepJustSent === 1) {
    return new Date(touchDueAt(sequenceStartedAtMs, config.secondTouchDays))
  }
  if (stepJustSent === 2) {
    return new Date(touchDueAt(sequenceStartedAtMs, config.thirdTouchDays))
  }
  return null
}

async function applyInbound(db: Database, inbound: InboundMail[], nowMs: number) {
  let applied = 0
  const messages = await db.select().from(salesProspectMessages)
  for (const item of inbound) {
    const match = messages.find((message) => {
      if (!message.providerMessageId) {
        return false
      }
      const replyTo = `${item.inReplyTo ?? ''} ${item.subject}`
      return replyTo.includes(message.providerMessageId)
    })
    if (!match) {
      continue
    }
    const kind = classifyProspectReply(item.subject, item.text)
    const stamp = nowDate(nowMs)
    if (kind === 'bounce') {
      await db.update(salesProspectMessages).set({
        delivery: 'bounced',
        bouncedAt: stamp,
        replyExcerpt: excerpt(item.text),
      }).where(eq(salesProspectMessages.id, match.id))
      await db.update(salesProspects).set({
        outreachStatus: 'bounced',
        nextTouchAt: null,
        updatedAt: stamp,
      }).where(eq(salesProspects.id, match.prospectId))
    } else if (kind === 'unsubscribe') {
      await db.update(salesProspectMessages).set({
        replyExcerpt: excerpt(item.text),
        replyAt: stamp,
      }).where(eq(salesProspectMessages.id, match.id))
      await markProspectDoNotContact(db, match.prospectId)
    } else if (kind === 'out_of_office') {
      const [prospect] = await db.select().from(salesProspects).where(eq(salesProspects.id, match.prospectId)).limit(1)
      const base = prospect?.nextTouchAt?.getTime() ?? nowMs
      await db.update(salesProspects).set({
        nextTouchAt: new Date(base + 7 * 86_400_000),
        updatedAt: stamp,
      }).where(eq(salesProspects.id, match.prospectId))
    } else {
      await db.update(salesProspectMessages).set({
        replyExcerpt: excerpt(item.text),
        replyAt: stamp,
      }).where(eq(salesProspectMessages.id, match.id))
      await db.update(salesProspects).set({
        outreachStatus: 'needs_you',
        nextTouchAt: null,
        updatedAt: stamp,
      }).where(eq(salesProspects.id, match.prospectId))
    }
    applied += 1
  }
  return applied
}

export async function prospectDeskSummary(db: Database, nowMs = utcNowMs()) {
  const config = await readProspectDeskConfig(db)
  const prospects = await db.select().from(salesProspects)
  const messages = await db.select().from(salesProspectMessages)
  const today = denverYmd(nowMs)
  const sentToday = messages.filter(row => row.sentAt && denverYmd(row.sentAt.getTime()) === today).length
  const needsYouRows = prospects.filter(row => row.outreachStatus === 'needs_you' || row.outreachStatus === 'bounced')
  return {
    config: publicProspectDeskConfig(config),
    stored: prospects.length,
    ready: prospects.filter(row => row.outreachStatus === 'ready' && row.status !== 'do_not_contact' && row.status !== 'promoted').length,
    sendingToday: sentToday,
    sendingCap: config.dailyCap,
    needsYou: needsYouRows.length + (config.senderPaused ? 1 : 0),
    senderPaused: config.senderPaused,
    senderPausedReason: config.senderPausedReason,
    mailboxReady: mailboxReady(config),
    capReached: sentToday >= config.dailyCap,
    blockReason: senderBlockReason(config, nowMs, sentToday, null),
  }
}

export async function listDeskProspects(db: Database, view: 'needs_you' | 'ready' | 'sending') {
  const prospects = await db.select().from(salesProspects).orderBy(asc(salesProspects.updatedAt))
  const messages = await db.select().from(salesProspectMessages).orderBy(asc(salesProspectMessages.step))
  return prospects.filter((row) => {
    if (view === 'ready') {
      return row.outreachStatus === 'ready' && row.status !== 'do_not_contact' && row.status !== 'promoted'
    }
    if (view === 'sending') {
      return row.outreachStatus === 'active' || row.outreachStatus === 'queued'
    }
    return row.outreachStatus === 'needs_you' || row.outreachStatus === 'bounced'
  }).map((row) => {
    const own = messages.filter(message => message.prospectId === row.id)
    const latest = own.at(-1)
    const why = row.outreachStatus === 'bounced'
      ? 'Bounced'
      : (latest?.replyExcerpt || 'Reply needs a look')
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      email: row.email,
      website: row.website,
      outreachStatus: row.outreachStatus,
      status: row.status,
      why: view === 'needs_you' ? why : null,
      step: latest?.step ?? null,
      subject: latest?.subject ?? null,
    }
  })
}
