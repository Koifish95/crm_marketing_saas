import { leads, leadLines, trials, followUpTasks, conversions } from '../database/schema'
import type { Database } from '../database'

export async function exportCustomerRecords(db: Database) {
  const [households, members, trialRows, tasks, conversionRows] = await Promise.all([
    db.select().from(leads),
    db.select().from(leadLines),
    db.select().from(trials),
    db.select().from(followUpTasks),
    db.select().from(conversions),
  ])
  return {
    exportedAt: new Date().toISOString(),
    product: 'martial-arts',
    counts: {
      households: households.length,
      members: members.length,
      trials: trialRows.length,
      followUps: tasks.length,
      conversions: conversionRows.length,
    },
    households,
    members,
    trials: trialRows,
    followUps: tasks,
    conversions: conversionRows,
  }
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function householdsToCsv(rows: Awaited<ReturnType<typeof exportCustomerRecords>>['households']) {
  const header = ['id', 'firstName', 'lastName', 'phone', 'email', 'source', 'status', 'createdAt']
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push([
      row.id,
      csvEscape(row.firstName),
      csvEscape(row.lastName),
      csvEscape(row.phone),
      csvEscape(row.email),
      csvEscape(row.source),
      csvEscape(row.status),
      csvEscape(row.createdAt),
    ].join(','))
  }
  return `${lines.join('\n')}\n`
}
