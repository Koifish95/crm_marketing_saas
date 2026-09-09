import { desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import {
  campaignMetaMaps,
  campaigns,
  conversions,
  leadLines,
  leads,
  metaAdAccounts,
  metaAdSets,
  metaAds,
  metaCampaigns,
  metaDailyMetrics,
  metaSyncRuns,
} from '../database/schema'
import { denverYmd, utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import {
  createMetaGraphClient,
  metaEnv,
  MetaApiError,
  type MetaGraphClient,
} from './meta-client'

export { META_GRAPH_API_VERSION, metaEnv } from './meta-client'

const LEAD_ACTION_TYPES = new Set([
  'lead',
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
])

function nowDate(nowMs: number) {
  return new Date(nowMs)
}

function spendToCents(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return Math.round(amount * 100)
}

function intMetric(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return Math.round(amount)
}

function leadCount(actions: unknown) {
  if (!Array.isArray(actions)) {
    return 0
  }
  return actions.reduce((sum, item) => {
    const row = item as { action_type?: string, value?: string }
    if (!row.action_type || !LEAD_ACTION_TYPES.has(row.action_type)) {
      return sum
    }
    return sum + intMetric(row.value)
  }, 0)
}

async function pagedData(client: MetaGraphClient, path: string, query: Record<string, string>) {
  const rows: unknown[] = []
  let nextPath: string | null = path
  let nextQuery: Record<string, string> | undefined = query
  while (nextPath) {
    const payload = await client.getJson(nextPath, nextQuery) as {
      data?: unknown[]
      paging?: { next?: string }
    }
    if (!Array.isArray(payload.data)) {
      throw new MetaApiError('Meta returned a malformed payload.', 502, undefined, 'malformed')
    }
    rows.push(...payload.data)
    nextPath = payload.paging?.next ?? null
    nextQuery = undefined
  }
  return rows
}

async function upsertAccount(db: Database, row: Record<string, unknown>, now: Date) {
  const externalId = String(row.id || row.account_id || '')
  if (!externalId) {
    throw new MetaApiError('Meta returned a malformed payload.', 502, undefined, 'malformed')
  }
  const [existing] = await db.select().from(metaAdAccounts).where(eq(metaAdAccounts.externalId, externalId)).limit(1)
  const values = {
    externalId,
    name: row.name ? String(row.name) : null,
    currency: row.currency ? String(row.currency) : null,
    timezoneName: row.timezone_name ? String(row.timezone_name) : null,
    accountStatus: row.account_status == null ? null : Number(row.account_status),
    rawJson: JSON.stringify(row),
    updatedAt: now,
  }
  if (existing) {
    await db.update(metaAdAccounts).set(values).where(eq(metaAdAccounts.id, existing.id))
    return { id: existing.id, inserted: false }
  }
  const [created] = await db.insert(metaAdAccounts).values({ ...values, createdAt: now }).returning()
  return { id: created!.id, inserted: true }
}

async function upsertNamed(
  db: Database,
  table: typeof metaCampaigns | typeof metaAdSets | typeof metaAds,
  lookup: { externalId: string },
  values: Record<string, unknown>,
  now: Date,
) {
  const [existing] = await db.select().from(table).where(eq(table.externalId, lookup.externalId)).limit(1)
  if (existing) {
    await db.update(table).set({ ...values, updatedAt: now }).where(eq(table.id, existing.id))
    return { id: existing.id, inserted: false }
  }
  const [created] = await db.insert(table).values({ ...values, createdAt: now, updatedAt: now } as never).returning()
  return { id: (created as { id: number }).id, inserted: true }
}

async function upsertMetric(
  db: Database,
  row: {
    entityType: string
    entityExternalId: string
    metricDate: string
    spendCents: number
    impressions: number
    reach: number
    clicks: number
    ctr: string | null
    cpc: string | null
    cpm: string | null
    leadsCount: number
  },
  now: Date,
) {
  const matches = await db.select().from(metaDailyMetrics).where(eq(metaDailyMetrics.entityExternalId, row.entityExternalId))
  const existing = matches.find(item => item.entityType === row.entityType && item.metricDate === row.metricDate)
  if (existing) {
    await db.update(metaDailyMetrics).set({
      ...row,
      fetchedAt: now,
      updatedAt: now,
    }).where(eq(metaDailyMetrics.id, existing.id))
    return false
  }
  await db.insert(metaDailyMetrics).values({
    ...row,
    fetchedAt: now,
    createdAt: now,
    updatedAt: now,
  })
  return true
}

export function metaStatus() {
  const env = metaEnv()
  return {
    configured: env.configured,
    graphApiVersion: env.version,
    adAccountId: env.configured ? env.adAccountId : null,
    permission: 'ads_read',
    notes: [
      'Read-only Marketing API v25.0. Official docs: https://developers.facebook.com/docs/marketing-api/',
      'Reach is stored daily and is not summed across days or entities.',
      'CTR/CPC/CPM on range totals are recomputed from summed spend, impressions, and clicks.',
      'Internal campaigns are never mapped by name.',
    ],
  }
}

export async function listMetaSyncRuns(db: Database, limit = 20) {
  return db.select().from(metaSyncRuns).orderBy(desc(metaSyncRuns.startedAt)).limit(limit)
}

export async function listStoredMetaCampaigns(db: Database) {
  const rows = await db.query.metaCampaigns.findMany({
    with: { maps: { with: { campaign: true } }, adSets: { with: { ads: true } } },
    orderBy: (table, { asc }) => [asc(table.name)],
  })
  return rows.map(row => ({
    id: row.id,
    externalId: row.externalId,
    name: row.name,
    status: row.status,
    effectiveStatus: row.effectiveStatus,
    objective: row.objective,
    mappedCampaigns: row.maps.map(map => ({
      id: map.campaignId,
      name: map.campaign?.name ?? '',
    })),
    adSetCount: row.adSets.length,
    adCount: row.adSets.reduce((sum, set) => sum + set.ads.length, 0),
  }))
}

export async function mapInternalCampaign(
  db: Database,
  input: { campaignId: number, metaCampaignId: number },
  actor: SessionUser,
) {
  const [internal] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1)
  if (!internal) {
    throw new DomainError('Campaign not found.', 404)
  }
  const [meta] = await db.select().from(metaCampaigns).where(eq(metaCampaigns.id, input.metaCampaignId)).limit(1)
  if (!meta) {
    throw new DomainError('Meta campaign not found.', 404)
  }
  const [existing] = await db.select().from(campaignMetaMaps).where(eq(campaignMetaMaps.campaignId, input.campaignId)).limit(1)
  const now = nowDate(utcNowMs())
  if (existing) {
    await db.update(campaignMetaMaps).set({
      metaCampaignId: input.metaCampaignId,
    }).where(eq(campaignMetaMaps.id, existing.id))
    return db.select().from(campaignMetaMaps).where(eq(campaignMetaMaps.id, existing.id)).then(rows => rows[0]!)
  }
  const [created] = await db.insert(campaignMetaMaps).values({
    campaignId: input.campaignId,
    metaCampaignId: input.metaCampaignId,
    createdByUserId: actor.id,
    createdAt: now,
  }).returning()
  return created!
}

export async function unmapInternalCampaign(db: Database, campaignId: number) {
  await db.delete(campaignMetaMaps).where(eq(campaignMetaMaps.campaignId, campaignId))
}

export async function syncMetaData(
  db: Database,
  actor: SessionUser,
  options?: { client?: MetaGraphClient, nowMs?: number, sinceYmd?: string, untilYmd?: string },
) {
  const nowMs = options?.nowMs ?? utcNowMs()
  const now = nowDate(nowMs)
  const env = metaEnv()
  const [run] = await db.insert(metaSyncRuns).values({
    status: 'RUNNING',
    startedAt: now,
    triggeredByUserId: actor.id,
    createdAt: now,
  }).returning()

  const finish = async (status: 'SUCCESS' | 'FAILED', counts: { fetched: number, inserted: number, updated: number }, errorSummary: string | null) => {
    await db.update(metaSyncRuns).set({
      status,
      completedAt: nowDate(utcNowMs()),
      recordsFetched: counts.fetched,
      recordsInserted: counts.inserted,
      recordsUpdated: counts.updated,
      errorSummary,
    }).where(eq(metaSyncRuns.id, run!.id))
    const [stored] = await db.select().from(metaSyncRuns).where(eq(metaSyncRuns.id, run!.id)).limit(1)
    return stored!
  }

  if (!env.configured && !options?.client) {
    const failed = await finish('FAILED', { fetched: 0, inserted: 0, updated: 0 }, 'Meta is not configured. Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.')
    throw Object.assign(new DomainError(failed.errorSummary || 'Meta is not configured.', 400), { syncRun: failed })
  }

  const client = options?.client ?? createMetaGraphClient()
  const untilYmd = options?.untilYmd ?? denverYmd(nowMs)
  const sinceYmd = options?.sinceYmd ?? denverYmd(nowMs - 29 * 86_400_000)
  let fetched = 0
  let inserted = 0
  let updated = 0

  try {
    const accountPath = env.adAccountId || 'act_test'
    const accountPayload = await client.getJson(accountPath, {
      fields: 'id,name,account_id,currency,account_status,timezone_name',
    }) as Record<string, unknown>
    fetched += 1
    const account = await upsertAccount(db, accountPayload, now)
    if (account.inserted) {
      inserted += 1
    } else {
      updated += 1
    }

    const campaignRows = await pagedData(client, `${accountPath}/campaigns`, {
      fields: 'id,name,status,effective_status,objective',
      limit: '100',
    })
    fetched += campaignRows.length
    for (const raw of campaignRows) {
      const row = raw as Record<string, unknown>
      if (!row.id || !row.name) {
        continue
      }
      const result = await upsertNamed(db, metaCampaigns, { externalId: String(row.id) }, {
        adAccountId: account.id,
        externalId: String(row.id),
        name: String(row.name),
        status: row.status ? String(row.status) : null,
        effectiveStatus: row.effective_status ? String(row.effective_status) : null,
        objective: row.objective ? String(row.objective) : null,
        rawJson: JSON.stringify(row),
      }, now)
      if (result.inserted) {
        inserted += 1
      } else {
        updated += 1
      }
    }

    const adSetRows = await pagedData(client, `${accountPath}/adsets`, {
      fields: 'id,name,status,effective_status,campaign_id',
      limit: '100',
    })
    fetched += adSetRows.length
    const campaignByExternal = new Map(
      (await db.select().from(metaCampaigns)).map(row => [row.externalId, row.id]),
    )
    for (const raw of adSetRows) {
      const row = raw as Record<string, unknown>
      const parentId = campaignByExternal.get(String(row.campaign_id || ''))
      if (!row.id || !row.name || !parentId) {
        continue
      }
      const result = await upsertNamed(db, metaAdSets, { externalId: String(row.id) }, {
        metaCampaignId: parentId,
        externalId: String(row.id),
        name: String(row.name),
        status: row.status ? String(row.status) : null,
        effectiveStatus: row.effective_status ? String(row.effective_status) : null,
        rawJson: JSON.stringify(row),
      }, now)
      if (result.inserted) {
        inserted += 1
      } else {
        updated += 1
      }
    }

    const adRows = await pagedData(client, `${accountPath}/ads`, {
      fields: 'id,name,status,effective_status,adset_id,campaign_id',
      limit: '100',
    })
    fetched += adRows.length
    const adSetByExternal = new Map(
      (await db.select().from(metaAdSets)).map(row => [row.externalId, row.id]),
    )
    for (const raw of adRows) {
      const row = raw as Record<string, unknown>
      const parentId = adSetByExternal.get(String(row.adset_id || ''))
      if (!row.id || !row.name || !parentId) {
        continue
      }
      const result = await upsertNamed(db, metaAds, { externalId: String(row.id) }, {
        metaAdSetId: parentId,
        externalId: String(row.id),
        name: String(row.name),
        status: row.status ? String(row.status) : null,
        effectiveStatus: row.effective_status ? String(row.effective_status) : null,
        rawJson: JSON.stringify(row),
      }, now)
      if (result.inserted) {
        inserted += 1
      } else {
        updated += 1
      }
    }

    const insightLevels: Array<{ level: 'campaign' | 'adset' | 'ad', idField: string }> = [
      { level: 'campaign', idField: 'campaign_id' },
      { level: 'adset', idField: 'adset_id' },
      { level: 'ad', idField: 'ad_id' },
    ]
    for (const spec of insightLevels) {
      const insights = await pagedData(client, `${accountPath}/insights`, {
        fields: `${spec.idField},spend,impressions,reach,clicks,ctr,cpc,cpm,actions,date_start`,
        level: spec.level,
        time_increment: '1',
        time_range: JSON.stringify({ since: sinceYmd, until: untilYmd }),
        limit: '100',
      })
      fetched += insights.length
      for (const raw of insights) {
        const row = raw as Record<string, unknown>
        const entityExternalId = String(row[spec.idField] || '')
        const metricDate = String(row.date_start || '')
        if (!entityExternalId || !/^\d{4}-\d{2}-\d{2}$/.test(metricDate)) {
          continue
        }
        const insertedMetric = await upsertMetric(db, {
          entityType: spec.level.toUpperCase(),
          entityExternalId,
          metricDate,
          spendCents: spendToCents(row.spend),
          impressions: intMetric(row.impressions),
          reach: intMetric(row.reach),
          clicks: intMetric(row.clicks),
          ctr: row.ctr == null ? null : String(row.ctr),
          cpc: row.cpc == null ? null : String(row.cpc),
          cpm: row.cpm == null ? null : String(row.cpm),
          leadsCount: leadCount(row.actions),
        }, now)
        if (insertedMetric) {
          inserted += 1
        } else {
          updated += 1
        }
      }
    }

    return finish('SUCCESS', { fetched, inserted, updated }, null)
  } catch (error) {
    const summary = error instanceof MetaApiError
      ? error.message
      : error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Meta sync failed.'
    const failed = await finish('FAILED', { fetched, inserted, updated }, summary)
    if (error instanceof MetaApiError) {
      throw Object.assign(new DomainError(summary, error.statusCode), { syncRun: failed })
    }
    throw Object.assign(new DomainError(summary, 502), { syncRun: failed })
  }
}

function rate(numerator: number, denominator: number) {
  if (!denominator) {
    return 0
  }
  return Math.round((numerator / denominator) * 1000) / 1000
}

export async function metaPerformanceReport(db: Database, filters: { fromYmd: string, toYmd: string }) {
  const stored = await listStoredMetaCampaigns(db)
  const metrics = await db.select().from(metaDailyMetrics)
  const maps = await db.select().from(campaignMetaMaps)
  const internalCampaigns = await db.select().from(campaigns)
  const headerRows = await db.select().from(leads)
  const lineRows = await db.select().from(leadLines)
  const conversionRows = await db.select().from(conversions)

  const inRange = (ymd: string) => ymd >= filters.fromYmd && ymd <= filters.toYmd

  const rows = stored.map((campaign) => {
    const daily = metrics.filter(row =>
      row.entityType === 'CAMPAIGN'
      && row.entityExternalId === campaign.externalId
      && inRange(row.metricDate),
    )
    const spendCents = daily.reduce((sum, row) => sum + row.spendCents, 0)
    const impressions = daily.reduce((sum, row) => sum + row.impressions, 0)
    const clicks = daily.reduce((sum, row) => sum + row.clicks, 0)
    const leadsCount = daily.reduce((sum, row) => sum + row.leadsCount, 0)
    const mapped = maps.filter(map => map.metaCampaignId === campaign.id)
    const mappedInternal = mapped.map(map => internalCampaigns.find(item => item.id === map.campaignId)).filter(Boolean)
    const mappedIds = new Set(mappedInternal.map(item => item!.id))
    const households = headerRows.filter(lead =>
      lead.campaignId != null
      && mappedIds.has(lead.campaignId)
      && denverYmd(lead.createdAt.getTime()) >= filters.fromYmd
      && denverYmd(lead.createdAt.getTime()) <= filters.toYmd,
    )
    const householdIds = new Set(households.map(lead => lead.id))
    const people = lineRows.filter(line => householdIds.has(line.leadId))
    const converted = conversionRows.filter(row =>
      !row.reversedAt
      && householdIds.has(row.leadId)
      && denverYmd(row.joinedAt.getTime()) >= filters.fromYmd
      && denverYmd(row.joinedAt.getTime()) <= filters.toYmd,
    )
    const newMrrCents = converted.reduce((sum, row) => sum + row.monthlyCents, 0)
    return {
      metaCampaignId: campaign.id,
      externalId: campaign.externalId,
      name: campaign.name,
      status: campaign.effectiveStatus || campaign.status,
      mapped: mappedInternal.map(item => ({ id: item!.id, name: item!.name })),
      metaReported: {
        spendCents,
        impressions,
        clicks,
        leadsCount,
        ctr: impressions ? rate(clicks, impressions) : 0,
        cpcCents: clicks ? Math.round(spendCents / clicks) : 0,
        cpmCents: impressions ? Math.round((spendCents / impressions) * 1000) : 0,
        reachNotSummed: true,
      },
      internalMapped: {
        households: households.length,
        prospectiveMembers: people.length,
        conversions: converted.length,
        newMrrCents,
      },
    }
  })

  return {
    filters,
    graphApiVersion: metaEnv().version,
    notes: {
      spend: 'Meta-reported estimated spend in integer USD cents. Not invoices or cash collected.',
      reach: 'Reach is not additive. Daily reach is stored but not summed in this report.',
      mapping: 'Internal outcomes appear only for ADMIN-mapped campaigns. Names are never auto-matched.',
      mrr: 'Forecasted conversion snapshots, not revenue.',
    },
    campaigns: rows,
  }
}
