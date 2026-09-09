import { and, desc, eq, inArray } from 'drizzle-orm'
import type { Database } from '../database'
import { followUpTasks, followUpTaskLines, leadLines, leads, trials, users } from '../database/schema'
import type { FollowUpCallOutcome, FollowUpTaskStatus } from '../../shared/schemas/enums'
import type { FollowUpTaskView } from '../../shared/schemas/follow-up-task'
import { dueStateRank, followUpDueAt, followUpDueState, matchesFollowUpTimeView } from '../../shared/utils/follow-up'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import { isTerminalLineStatus } from './lead-lines'

function publicUser(user: { id: number, displayName: string, role: string } | null | undefined) {
  if (!user) {
    return null
  }
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
  }
}

type FollowUpLineLink = {
  leadLine?: {
    id: number
    firstName: string
    lastName: string | null
    program?: { name?: string } | null
    trials?: Array<{
      id: number
      status: string
      scheduledAt: Date
      label: string | null
    }>
  } | null
}

function confirmationIntrosFromRow(row: {
  purpose?: string
  trial?: { id: number, label: string | null, scheduledAt: Date, status: string } | null
  lineLinks?: FollowUpLineLink[]
}) {
  if (row.purpose === 'EVENT_FOLLOW_UP') {
    return []
  }
  const intros: Array<{
    trialId: number
    leadLineId: number | null
    firstName: string | null
    lastName: string | null
    programName: string | null
    scheduledAt: Date
    label: string | null
  }> = []
  const seen = new Set<number>()
  for (const link of row.lineLinks ?? []) {
    const line = link.leadLine
    if (!line) {
      continue
    }
    const scheduled = (line.trials ?? [])
      .filter(trial => trial.status === 'SCHEDULED')
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    for (const trial of scheduled) {
      if (seen.has(trial.id)) {
        continue
      }
      seen.add(trial.id)
      intros.push({
        trialId: trial.id,
        leadLineId: line.id,
        firstName: line.firstName,
        lastName: line.lastName,
        programName: line.program?.name ?? null,
        scheduledAt: trial.scheduledAt,
        label: trial.label,
      })
    }
  }
  if (!intros.length && row.trial && row.trial.status === 'SCHEDULED') {
    intros.push({
      trialId: row.trial.id,
      leadLineId: null,
      firstName: null,
      lastName: null,
      programName: null,
      scheduledAt: row.trial.scheduledAt,
      label: row.trial.label,
    })
  }
  return intros.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}

export function presentFollowUpTask(row: {
  id: number
  leadId: number
  trialId: number | null
  type: string
  purpose: string
  dueAt: Date
  status: string
  assignedUserId: number | null
  completedByUserId: number | null
  completedAt: Date | null
  outcome: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  lead?: {
    id: number
    firstName: string
    lastName: string | null
    phone: string | null
  } | null
  trial?: {
    id: number
    label: string | null
    scheduledAt: Date
    status: string
  } | null
  assignedUser?: { id: number, displayName: string, role: string } | null
  completedBy?: { id: number, displayName: string, role: string } | null
  lineLinks?: FollowUpLineLink[]
}, nowMs: number) {
  const pending = row.status === 'PENDING'
  const dueState = pending ? followUpDueState(row.dueAt.getTime(), nowMs) : null
  const linkedLines = (row.lineLinks ?? [])
    .map(link => link.leadLine)
    .filter((line): line is NonNullable<FollowUpLineLink['leadLine']> => Boolean(line))
    .map(line => ({
      id: line.id,
      firstName: line.firstName,
      lastName: line.lastName,
    }))
  return {
    id: row.id,
    leadId: row.leadId,
    trialId: row.trialId,
    type: row.type,
    purpose: row.purpose,
    dueAt: row.dueAt,
    status: row.status,
    assignedUserId: row.assignedUserId,
    completedByUserId: row.completedByUserId,
    completedAt: row.completedAt,
    outcome: row.outcome,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dueState,
    overdue: dueState === 'OVERDUE',
    lead: row.lead
      ? {
          id: row.lead.id,
          firstName: row.lead.firstName,
          lastName: row.lead.lastName,
          phone: row.lead.phone,
        }
      : null,
    trial: row.trial
      ? {
          id: row.trial.id,
          label: row.trial.label,
          scheduledAt: row.trial.scheduledAt,
          status: row.trial.status,
        }
      : null,
    assignedUser: publicUser(row.assignedUser),
    completedBy: publicUser(row.completedBy),
    linkedLines,
    confirmationIntros: confirmationIntrosFromRow(row),
  }
}

export type FollowUpTaskRecord = ReturnType<typeof presentFollowUpTask>

function sortQueue(a: FollowUpTaskRecord, b: FollowUpTaskRecord) {
  if (a.status === 'PENDING' && b.status === 'PENDING') {
    const aRank = a.dueState ? dueStateRank(a.dueState) : 3
    const bRank = b.dueState ? dueStateRank(b.dueState) : 3
    if (aRank !== bRank) {
      return aRank - bRank
    }
    return a.dueAt.getTime() - b.dueAt.getTime()
  }
  if (a.status === 'PENDING') {
    return -1
  }
  if (b.status === 'PENDING') {
    return 1
  }
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

const taskWith = {
  lead: true,
  trial: true,
  assignedUser: true,
  completedBy: true,
  lineLinks: {
    with: {
      leadLine: {
        with: {
          program: true,
          trials: true,
        },
      },
    },
  },
} as const

async function loadTask(db: Database, id: number, nowMs = utcNowMs()) {
  const row = await db.query.followUpTasks.findFirst({
    where: eq(followUpTasks.id, id),
    with: taskWith,
  })
  if (!row) {
    throw new DomainError('Follow-up task not found.', 404)
  }
  return presentFollowUpTask(row, nowMs)
}

async function linkFollowUpLine(
  db: Database,
  taskId: number,
  leadLineId: number,
  now: Date,
) {
  const [existing] = await db.select().from(followUpTaskLines).where(and(
    eq(followUpTaskLines.taskId, taskId),
    eq(followUpTaskLines.leadLineId, leadLineId),
  )).limit(1)
  if (existing) {
    return
  }
  await db.insert(followUpTaskLines).values({
    taskId,
    leadLineId,
    createdAt: now,
  })
}

async function pendingInitialTasks(db: Database, leadId: number) {
  return db.select().from(followUpTasks).where(and(
    eq(followUpTasks.leadId, leadId),
    eq(followUpTasks.purpose, 'INITIAL_SCHEDULE'),
    eq(followUpTasks.status, 'PENDING'),
  ))
}

async function pendingAcquisitionCallTasks(db: Database, leadId: number) {
  return db.select().from(followUpTasks).where(and(
    eq(followUpTasks.leadId, leadId),
    eq(followUpTasks.status, 'PENDING'),
    inArray(followUpTasks.purpose, ['INITIAL_SCHEDULE', 'EVENT_FOLLOW_UP']),
  ))
}

async function cancelExtraAcquisitionCalls(
  db: Database,
  extras: Array<{ id: number, notes: string | null }>,
  keepId: number,
  now: Date,
) {
  for (const extra of extras) {
    await db.update(followUpTasks).set({
      status: 'CANCELLED',
      notes: extra.notes
        ? `${extra.notes}\nConsolidated into household confirmation ${keepId}.`
        : `Consolidated into household confirmation ${keepId}.`,
      updatedAt: now,
    }).where(eq(followUpTasks.id, extra.id))
  }
}

async function retargetKeepToIntro(
  db: Database,
  keep: typeof followUpTasks.$inferSelect,
  input: { trialId: number, leadLineId?: number | null },
  now: Date,
) {
  const patch: Partial<typeof followUpTasks.$inferInsert> = {
    updatedAt: now,
  }
  if (keep.purpose === 'EVENT_FOLLOW_UP') {
    patch.purpose = 'INITIAL_SCHEDULE'
    patch.trialId = input.trialId
    const superseded = 'Intro confirmation superseded event follow-up.'
    patch.notes = keep.notes?.includes(superseded)
      ? keep.notes
      : keep.notes
        ? `${keep.notes}\n${superseded}`
        : superseded
  } else if (keep.trialId) {
    const [current] = await db.select().from(trials).where(eq(trials.id, keep.trialId)).limit(1)
    if (!current || current.status !== 'SCHEDULED') {
      patch.trialId = input.trialId
    }
  } else {
    patch.trialId = input.trialId
  }
  await db.update(followUpTasks).set(patch).where(eq(followUpTasks.id, keep.id))
  if (input.leadLineId) {
    await linkFollowUpLine(db, keep.id, input.leadLineId, now)
  }
  return {
    ...keep,
    ...patch,
    trialId: patch.trialId ?? keep.trialId,
    purpose: patch.purpose ?? keep.purpose,
  }
}

async function remainingConfirmationTrials(
  db: Database,
  leadId: number,
  options?: { excludeTrialId?: number, excludeLineId?: number },
) {
  const householdLines = await db.select().from(leadLines).where(eq(leadLines.leadId, leadId))
  const scheduled = await db.select().from(trials).where(and(
    eq(trials.leadId, leadId),
    eq(trials.status, 'SCHEDULED'),
  ))
  return scheduled.filter((trial) => {
    if (options?.excludeTrialId && trial.id === options.excludeTrialId) {
      return false
    }
    const line = householdLines.find(item => item.id === trial.leadLineId)
    if (!line || isTerminalLineStatus(line.status)) {
      return false
    }
    if (options?.excludeLineId && line.id === options.excludeLineId) {
      return false
    }
    return true
  })
}

export async function ensureInitialFollowUpTask(
  db: Database,
  input: { leadId: number, trialId: number, leadLineId?: number | null },
  nowMs = utcNowMs(),
) {
  const now = new Date(nowMs)
  const pending = await pendingAcquisitionCallTasks(db, input.leadId)
  const keep = pending.find(task => task.purpose === 'INITIAL_SCHEDULE') ?? pending[0]
  if (keep) {
    await cancelExtraAcquisitionCalls(db, pending.filter(task => task.id !== keep.id), keep.id, now)
    return retargetKeepToIntro(db, keep, input, now)
  }

  try {
    const [row] = await db.insert(followUpTasks).values({
      leadId: input.leadId,
      trialId: input.trialId,
      type: 'PHONE_CALL',
      purpose: 'INITIAL_SCHEDULE',
      dueAt: followUpDueAt(nowMs),
      status: 'PENDING',
      assignedUserId: null,
      createdAt: now,
      updatedAt: now,
    }).returning()
    if (row && input.leadLineId) {
      await linkFollowUpLine(db, row.id, input.leadLineId, now)
    }
    return row!
  } catch {
    const raced = await pendingAcquisitionCallTasks(db, input.leadId)
    const keepRaced = raced.find(task => task.purpose === 'INITIAL_SCHEDULE') ?? raced[0]
    if (keepRaced) {
      await cancelExtraAcquisitionCalls(db, raced.filter(task => task.id !== keepRaced.id), keepRaced.id, now)
      return retargetKeepToIntro(db, keepRaced, input, now)
    }
    throw new DomainError('Could not create the follow-up call task.', 500)
  }
}

export async function ensureEventFollowUpTask(
  db: Database,
  input: { leadId: number, eventId: number, leadLineIds: number[], notes?: string | null },
  nowMs = utcNowMs(),
) {
  const now = new Date(nowMs)
  const pendingHousehold = await pendingAcquisitionCallTasks(db, input.leadId)
  const pendingIntro = pendingHousehold.find(task => task.purpose === 'INITIAL_SCHEDULE')
  if (pendingIntro) {
    await cancelExtraAcquisitionCalls(
      db,
      pendingHousehold.filter(task => task.id !== pendingIntro.id),
      pendingIntro.id,
      now,
    )
    for (const lineId of input.leadLineIds) {
      await linkFollowUpLine(db, pendingIntro.id, lineId, now)
    }
    return pendingIntro
  }

  const existing = await db.select().from(followUpTasks).where(and(
    eq(followUpTasks.leadId, input.leadId),
    eq(followUpTasks.purpose, 'EVENT_FOLLOW_UP'),
    eq(followUpTasks.sourceEventId, input.eventId),
  ))
  const keep = existing[0]
  if (keep) {
    for (const lineId of input.leadLineIds) {
      await linkFollowUpLine(db, keep.id, lineId, now)
    }
    return keep
  }

  try {
    const [row] = await db.insert(followUpTasks).values({
      leadId: input.leadId,
      sourceEventId: input.eventId,
      type: 'PHONE_CALL',
      purpose: 'EVENT_FOLLOW_UP',
      dueAt: followUpDueAt(nowMs),
      status: 'PENDING',
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    }).returning()
    if (row) {
      for (const lineId of input.leadLineIds) {
        await linkFollowUpLine(db, row.id, lineId, now)
      }
    }
    return row!
  } catch {
    const raced = await db.select().from(followUpTasks).where(and(
      eq(followUpTasks.leadId, input.leadId),
      eq(followUpTasks.purpose, 'EVENT_FOLLOW_UP'),
      eq(followUpTasks.sourceEventId, input.eventId),
    )).limit(1)
    if (raced[0]) {
      for (const lineId of input.leadLineIds) {
        await linkFollowUpLine(db, raced[0].id, lineId, now)
      }
      return raced[0]
    }
    throw new DomainError('Could not create the event follow-up call.', 500)
  }
}

export async function cancelPendingInitialFollowUp(db: Database, trialId: number, nowMs = utcNowMs()) {
  const [trial] = await db.select().from(trials).where(eq(trials.id, trialId)).limit(1)
  if (!trial) {
    return
  }

  const remaining = await remainingConfirmationTrials(db, trial.leadId, { excludeTrialId: trialId })
  const pending = await pendingInitialTasks(db, trial.leadId)
  const now = new Date(nowMs)

  if (remaining.length) {
    const keep = pending[0]
    if (keep) {
      if (trial.leadLineId) {
        const lineStillNeeded = remaining.some(item => item.leadLineId === trial.leadLineId)
        if (!lineStillNeeded) {
          await db.delete(followUpTaskLines).where(and(
            eq(followUpTaskLines.taskId, keep.id),
            eq(followUpTaskLines.leadLineId, trial.leadLineId),
          ))
        }
      }
      if (keep.trialId === trialId || keep.trialId == null) {
        await db.update(followUpTasks).set({
          trialId: remaining[0]!.id,
          updatedAt: now,
        }).where(eq(followUpTasks.id, keep.id))
      }
      for (const extra of pending.slice(1)) {
        await db.update(followUpTasks).set({
          status: 'CANCELLED',
          updatedAt: now,
        }).where(eq(followUpTasks.id, extra.id))
      }
    }
    return
  }

  for (const task of pending) {
    await db.update(followUpTasks).set({
      status: 'CANCELLED',
      updatedAt: now,
    }).where(eq(followUpTasks.id, task.id))
  }
}

export async function listFollowUpTasks(
  db: Database,
  view: FollowUpTaskView = 'open',
  nowMs = utcNowMs(),
) {
  const statusFilter: FollowUpTaskStatus = view === 'completed'
    ? 'COMPLETED'
    : view === 'cancelled'
      ? 'CANCELLED'
      : 'PENDING'

  const rows = await db.query.followUpTasks.findMany({
    where: eq(followUpTasks.status, statusFilter),
    with: taskWith,
    orderBy: [desc(followUpTasks.dueAt)],
  })

  const mapped = rows.map(row => presentFollowUpTask(row, nowMs))
  const filtered = mapped.filter((task) => {
    if (view === 'overdue' || view === 'due_today' || view === 'upcoming') {
      return matchesFollowUpTimeView(task.dueState, view)
    }
    return true
  })

  return filtered.sort(sortQueue)
}

export async function followUpDashboard(db: Database, nowMs = utcNowMs()) {
  const open = await listFollowUpTasks(db, 'open', nowMs)
  const overdue = open.filter(task => matchesFollowUpTimeView(task.dueState, 'overdue'))
  const dueToday = open.filter(task => matchesFollowUpTimeView(task.dueState, 'due_today'))
  const upcoming = open.filter(task => matchesFollowUpTimeView(task.dueState, 'upcoming'))
  return {
    overdue: overdue.length,
    dueToday: dueToday.length,
    upcoming: upcoming.length,
    priority: open.slice(0, 8),
    overdueTasks: overdue,
  }
}

async function requireActiveAssignee(db: Database, assignedUserId: number | null | undefined) {
  if (assignedUserId == null) {
    return null
  }
  const [user] = await db.select().from(users).where(eq(users.id, assignedUserId)).limit(1)
  if (!user || !user.active) {
    throw new DomainError('Assignee must be an active staff user.')
  }
  return user.id
}

export async function createManualFollowUpTask(
  db: Database,
  input: {
    leadId: number
    trialId?: number | null
    dueAt: Date
    assignedUserId?: number | null
    notes?: string
    leadLineIds?: number[]
  },
) {
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, input.leadId) })
  if (!lead) {
    throw new DomainError('Lead not found.', 404)
  }

  if (input.trialId) {
    const trial = await db.query.trials.findFirst({ where: eq(trials.id, input.trialId) })
    if (!trial || trial.leadId !== input.leadId) {
      throw new DomainError('That intro visit does not belong to this lead.')
    }
  }

  const assignedUserId = await requireActiveAssignee(db, input.assignedUserId)
  const now = new Date(utcNowMs())
  const [row] = await db.insert(followUpTasks).values({
    leadId: input.leadId,
    trialId: input.trialId ?? null,
    type: 'PHONE_CALL',
    purpose: 'MANUAL',
    dueAt: input.dueAt,
    status: 'PENDING',
    assignedUserId,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  }).returning()

  for (const leadLineId of input.leadLineIds ?? []) {
    await db.insert(followUpTaskLines).values({
      taskId: row!.id,
      leadLineId,
      createdAt: now,
    })
  }

  return loadTask(db, row!.id)
}

export async function completeFollowUpTask(
  db: Database,
  id: number,
  input: { outcome: FollowUpCallOutcome, notes?: string },
  actor: SessionUser,
) {
  const task = await db.query.followUpTasks.findFirst({ where: eq(followUpTasks.id, id) })
  if (!task) {
    throw new DomainError('Follow-up task not found.', 404)
  }
  if (task.status !== 'PENDING') {
    throw new DomainError('Only open follow-up tasks can be completed.')
  }

  const now = new Date(utcNowMs())
  await db.update(followUpTasks).set({
    status: 'COMPLETED',
    outcome: input.outcome,
    notes: input.notes?.trim() || task.notes,
    completedAt: now,
    completedByUserId: actor.id,
    updatedAt: now,
  }).where(eq(followUpTasks.id, id))

  return loadTask(db, id)
}

export async function cancelFollowUpTask(
  db: Database,
  id: number,
  input?: { notes?: string },
) {
  const task = await db.query.followUpTasks.findFirst({ where: eq(followUpTasks.id, id) })
  if (!task) {
    throw new DomainError('Follow-up task not found.', 404)
  }
  if (task.status !== 'PENDING') {
    throw new DomainError('Only open follow-up tasks can be cancelled.')
  }

  const now = new Date(utcNowMs())
  await db.update(followUpTasks).set({
    status: 'CANCELLED',
    notes: input?.notes?.trim() || task.notes,
    updatedAt: now,
  }).where(eq(followUpTasks.id, id))

  return loadTask(db, id)
}

export async function cancelObsoleteFollowUpForLine(
  db: Database,
  leadId: number,
  lineId: number,
  reason: string,
) {
  const pending = await db.select().from(followUpTasks).where(and(
    eq(followUpTasks.leadId, leadId),
    eq(followUpTasks.status, 'PENDING'),
  ))
  const householdLines = await db.select().from(leadLines).where(eq(leadLines.leadId, leadId))
  const otherActive = householdLines.filter(line => line.id !== lineId && !isTerminalLineStatus(line.status))

  const remaining = await remainingConfirmationTrials(db, leadId, { excludeLineId: lineId })

  for (const task of pending) {
    if (task.purpose === 'INITIAL_SCHEDULE') {
      if (remaining.length) {
        if (task.trialId) {
          const [trial] = await db.select().from(trials).where(eq(trials.id, task.trialId)).limit(1)
          if (!trial || trial.leadLineId === lineId || trial.status !== 'SCHEDULED') {
            await db.update(followUpTasks).set({
              trialId: remaining[0]!.id,
              updatedAt: new Date(utcNowMs()),
            }).where(eq(followUpTasks.id, task.id))
          }
        }
        await db.delete(followUpTaskLines).where(and(
          eq(followUpTaskLines.taskId, task.id),
          eq(followUpTaskLines.leadLineId, lineId),
        ))
        continue
      }
      await cancelFollowUpTask(db, task.id, { notes: reason })
      continue
    }

    if (task.trialId) {
      const [trial] = await db.select().from(trials).where(eq(trials.id, task.trialId)).limit(1)
      if (trial?.leadLineId === lineId) {
        await cancelFollowUpTask(db, task.id, { notes: reason })
        continue
      }
    }

    const links = await db.select().from(followUpTaskLines).where(eq(followUpTaskLines.taskId, task.id))
    if (links.length === 0) {
      if (otherActive.length === 0) {
        await cancelFollowUpTask(db, task.id, { notes: reason })
      }
      continue
    }

    const stillRelevant = links.some((link) => {
      if (link.leadLineId === lineId) {
        return false
      }
      const sibling = householdLines.find(line => line.id === link.leadLineId)
      return Boolean(sibling && !isTerminalLineStatus(sibling.status))
    })
    if (!stillRelevant) {
      await cancelFollowUpTask(db, task.id, { notes: reason })
    }
  }
}

export async function assignFollowUpTask(
  db: Database,
  id: number,
  assignedUserId: number | null,
) {
  const task = await db.query.followUpTasks.findFirst({ where: eq(followUpTasks.id, id) })
  if (!task) {
    throw new DomainError('Follow-up task not found.', 404)
  }
  if (task.status !== 'PENDING') {
    throw new DomainError('Only open follow-up tasks can be assigned.')
  }

  const nextAssignee = await requireActiveAssignee(db, assignedUserId)
  const now = new Date(utcNowMs())
  await db.update(followUpTasks).set({
    assignedUserId: nextAssignee,
    updatedAt: now,
  }).where(eq(followUpTasks.id, id))

  return loadTask(db, id)
}

export async function listActiveStaffUsers(db: Database) {
  const rows = await db.select({
    id: users.id,
    displayName: users.displayName,
    role: users.role,
  }).from(users).where(eq(users.active, true)).orderBy(users.displayName)

  return rows
}
