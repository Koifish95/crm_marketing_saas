import { describe, expect, it } from 'vitest'
import { DEFAULT_EXTRA_ENVIRONMENT_FORM, DEFAULT_PROVISION_FORM, customerNeedsRetry, extraEnvironmentRequestBody, isRetryableLifecycle, provisionRequestBody } from '../../shared/utils/provision'

describe('S4 provision payload', () => {
  it('still sends display name, slug, timezone, and admin email', () => {
    const body = provisionRequestBody({
      displayName: 'Strategic Insights Consulting, LLC',
      slug: 'strategic-insights',
      timezone: 'America/Denver',
      adminEmail: 'admin@strategic-insights.local',
    })
    expect(Object.keys(body).sort()).toEqual(['adminEmail', 'displayName', 'slug', 'timezone'])
    expect(body).not.toHaveProperty('industryTemplate')
    expect(body).not.toHaveProperty('hostname')
    expect(DEFAULT_PROVISION_FORM.timezone).toBe('America/Denver')
  })

  it('sends only non-PROD type and display name for extras', () => {
    const body = extraEnvironmentRequestBody({
      type: 'DEV',
      displayName: 'DEV-JOHN',
    })
    expect(Object.keys(body).sort()).toEqual(['displayName', 'type'])
    expect(body).not.toHaveProperty('hostname')
    expect(DEFAULT_EXTRA_ENVIRONMENT_FORM.type).toBe('DEV')
  })

  it('treats failed and provisioning as retryable, not ready or decommissioned', () => {
    expect(isRetryableLifecycle('failed')).toBe(true)
    expect(isRetryableLifecycle('provisioning')).toBe(true)
    expect(isRetryableLifecycle('ready')).toBe(false)
    expect(isRetryableLifecycle('decommissioned')).toBe(false)
    expect(customerNeedsRetry([
      { lifecycleStatus: 'ready' },
      { lifecycleStatus: 'failed' },
    ])).toBe(true)
    expect(customerNeedsRetry([
      { lifecycleStatus: 'ready' },
      { lifecycleStatus: 'decommissioned' },
    ])).toBe(false)
  })
})
