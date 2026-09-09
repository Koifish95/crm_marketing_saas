import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import {
  campaignMetaMaps,
  metaAdSets,
  metaAds,
  metaCampaigns,
  metaDailyMetrics,
  metaSyncRuns,
  users,
} from '../../server/database/schema'
import { createCampaign } from '../../server/services/campaigns'
import type { SessionUser } from '../../server/services/authorization'
import { DomainError } from '../../server/services/errors'
import {
  mapInternalCampaign,
  metaPerformanceReport,
  metaStatus,
  syncMetaData,
} from '../../server/services/meta'
import { MetaApiError, type MetaGraphClient } from '../../server/services/meta-client'
import { reportCsv } from '../../server/services/reports'
import { openTestDatabase } from '../helpers/db'

const RANGE = { fromYmd: '2026-08-01', toYmd: '2026-08-31' }

function adminFrom(row: { id: number, email: string, displayName: string, role: string }): SessionUser {
  return { id: row.id, email: row.email, displayName: row.displayName, role: row.role as SessionUser['role'] }
}

function fixtureClient(options?: {
  campaignName?: string
  spend?: string
  fail?: 'token' | 'permission' | 'rate_limit' | 'network' | 'malformed'
}): MetaGraphClient {
  return {
    async getJson(path, query = {}) {
      if (options?.fail === 'token') {
        throw new MetaApiError('Meta access token is invalid or expired.', 401, 190, 'token')
      }
      if (options?.fail === 'permission') {
        throw new MetaApiError('Meta API permission was denied. ads_read is required for read-only sync.', 403, 200, 'permission')
      }
      if (options?.fail === 'rate_limit') {
        throw new MetaApiError('Meta API rate limit was reached.', 429, 17, 'rate_limit')
      }
      if (options?.fail === 'network') {
        throw new MetaApiError('Could not reach the Meta Graph API.', 502, undefined, 'network')
      }
      const normalized = path.split('?')[0] ?? path
      if (options?.fail === 'malformed' && normalized.endsWith('/insights')) {
        return { data: 'not-an-array' }
      }
      if (/^act_[^/]+$/.test(normalized)) {
        return {
          id: 'act_123',
          name: 'Lab Academy Ads',
          account_id: '123',
          currency: 'USD',
          account_status: 1,
          timezone_name: 'America/Denver',
        }
      }
      if (normalized.endsWith('/campaigns')) {
        return {
          data: [{
            id: '1201',
            name: options?.campaignName ?? 'Kids Wrestling Boot Camp',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            objective: 'OUTCOME_LEADS',
          }],
        }
      }
      if (normalized.endsWith('/adsets')) {
        return {
          data: [{
            id: '2201',
            name: 'Parents 25-44',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            campaign_id: '1201',
          }],
        }
      }
      if (normalized.endsWith('/ads')) {
        return {
          data: [{
            id: '3201',
            name: 'Trial creative A',
            status: 'ACTIVE',
            effective_status: 'ACTIVE',
            adset_id: '2201',
            campaign_id: '1201',
          }],
        }
      }
      if (normalized.endsWith('/insights')) {
        const level = query.level
        const idField = level === 'adset' ? 'adset_id' : level === 'ad' ? 'ad_id' : 'campaign_id'
        const entityId = level === 'adset' ? '2201' : level === 'ad' ? '3201' : '1201'
        return {
          data: [{
            [idField]: entityId,
            spend: options?.spend ?? '12.50',
            impressions: '1000',
            reach: '800',
            clicks: '40',
            ctr: '4',
            cpc: '0.3125',
            cpm: '12.5',
            actions: [{ action_type: 'lead', value: '3' }],
            date_start: '2026-08-15',
          }],
        }
      }
      throw new MetaApiError('Unexpected fixture path.', 502, undefined, 'malformed')
    },
  }
}

describe('M8 Meta V1', () => {
  const previousToken = process.env.META_ACCESS_TOKEN
  const previousAccount = process.env.META_AD_ACCOUNT_ID

  afterEach(() => {
    process.env.META_ACCESS_TOKEN = previousToken
    process.env.META_AD_ACCOUNT_ID = previousAccount
  })

  it('reports missing configuration without calling Meta', async () => {
    delete process.env.META_ACCESS_TOKEN
    delete process.env.META_AD_ACCOUNT_ID
    expect(metaStatus().configured).toBe(false)
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      await expect(syncMetaData(testDb.db, adminFrom(admin!))).rejects.toBeInstanceOf(DomainError)
      const runs = await testDb.db.select().from(metaSyncRuns)
      expect(runs).toHaveLength(1)
      expect(runs[0]?.status).toBe('FAILED')
      expect(runs[0]?.errorSummary).toMatch(/not configured/i)
      expect(JSON.stringify(runs[0])).not.toMatch(/EAA/)
    } finally {
      await testDb.close()
    }
  })

  it('syncs hierarchy, daily metrics, and stays idempotent', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = adminFrom(admin!)
      process.env.META_AD_ACCOUNT_ID = 'act_123'
      const first = await syncMetaData(testDb.db, actor, { client: fixtureClient() })
      expect(first.status).toBe('SUCCESS')
      expect(first.errorSummary).toBeNull()
      const campaigns = await testDb.db.select().from(metaCampaigns)
      const sets = await testDb.db.select().from(metaAdSets)
      const ads = await testDb.db.select().from(metaAds)
      expect(campaigns).toHaveLength(1)
      expect(sets).toHaveLength(1)
      expect(ads).toHaveLength(1)
      expect(sets[0]?.metaCampaignId).toBe(campaigns[0]?.id)
      expect(ads[0]?.metaAdSetId).toBe(sets[0]?.id)

      const metrics = await testDb.db.select().from(metaDailyMetrics)
      expect(metrics.filter(row => row.entityType === 'CAMPAIGN')).toHaveLength(1)
      expect(metrics.find(row => row.entityType === 'CAMPAIGN')?.spendCents).toBe(1250)
      expect(metrics.find(row => row.entityType === 'CAMPAIGN')?.leadsCount).toBe(3)

      const renamed = await syncMetaData(testDb.db, actor, {
        client: fixtureClient({ campaignName: 'Kids Wrestling Boot Camp — Updated', spend: '20.00' }),
      })
      expect(renamed.status).toBe('SUCCESS')
      const after = await testDb.db.select().from(metaCampaigns)
      expect(after).toHaveLength(1)
      expect(after[0]?.name).toContain('Updated')
      const campaignMetrics = await testDb.db.select().from(metaDailyMetrics).where(eq(metaDailyMetrics.entityType, 'CAMPAIGN'))
      expect(campaignMetrics).toHaveLength(1)
      expect(campaignMetrics[0]?.spendCents).toBe(2000)

      const unchanged = await syncMetaData(testDb.db, actor, {
        client: fixtureClient({ campaignName: 'Kids Wrestling Boot Camp — Updated', spend: '20.00' }),
      })
      expect(unchanged.recordsInserted).toBe(0)
      expect((await testDb.db.select().from(metaCampaigns))).toHaveLength(1)
      expect((await testDb.db.select().from(metaSyncRuns))).toHaveLength(3)
    } finally {
      await testDb.close()
    }
  })

  it('maps internally without name matching and keeps unmapped campaigns valid', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = adminFrom(admin!)
      await syncMetaData(testDb.db, actor, { client: fixtureClient() })
      const [metaCampaign] = await testDb.db.select().from(metaCampaigns)
      const internal = await createCampaign(testDb.db, { name: 'Completely Different Name' })
      expect(internal.name).not.toBe(metaCampaign!.name)
      expect(await testDb.db.select().from(campaignMetaMaps)).toHaveLength(0)

      await mapInternalCampaign(testDb.db, {
        campaignId: internal.id,
        metaCampaignId: metaCampaign!.id,
      }, actor)
      expect((await testDb.db.select().from(campaignMetaMaps))).toHaveLength(1)

      const report = await metaPerformanceReport(testDb.db, RANGE)
      const row = report.campaigns[0]!
      expect(row.mapped[0]?.name).toBe(internal.name)
      expect(row.metaReported.spendCents).toBe(1250)
      expect(row.metaReported.reachNotSummed).toBe(true)
      expect(row.metaReported.ctr).toBe(0.04)
      const csv = await reportCsv(testDb.db, RANGE, 'meta', true)
      expect(csv).toContain('Kids Wrestling Boot Camp')
      expect(csv).toContain('Completely Different Name')
    } finally {
      await testDb.close()
    }
  })

  it('records token, permission, rate-limit, network, and malformed failures without leaking secrets', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = adminFrom(admin!)
      process.env.META_ACCESS_TOKEN = 'EAA-secret-should-not-leak'
      process.env.META_AD_ACCOUNT_ID = 'act_123'
      for (const fail of ['token', 'permission', 'rate_limit', 'network', 'malformed'] as const) {
        await expect(syncMetaData(testDb.db, actor, { client: fixtureClient({ fail }) })).rejects.toBeInstanceOf(DomainError)
      }
      const runs = await testDb.db.select().from(metaSyncRuns)
      expect(runs).toHaveLength(5)
      expect(runs.every(run => run.status === 'FAILED')).toBe(true)
      expect(JSON.stringify(runs)).not.toContain('EAA-secret-should-not-leak')
    } finally {
      await testDb.close()
    }
  })
})
