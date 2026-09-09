import { describe, expect, it } from 'vitest'

describe('S4 provision payload', () => {
  it('still sends display name, slug, timezone, and admin email', () => {
    const body = {
      displayName: 'Strategic Insights Consulting, LLC',
      slug: 'strategic-insights',
      timezone: 'America/Denver',
      adminEmail: 'admin@strategic-insights.local',
    }
    expect(Object.keys(body).sort()).toEqual(['adminEmail', 'displayName', 'slug', 'timezone'])
    expect(body).not.toHaveProperty('industryTemplate')
    expect(body).not.toHaveProperty('hostname')
  })
})
