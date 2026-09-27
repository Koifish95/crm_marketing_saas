import { describe, expect, it } from 'vitest'
import { demoRequestFieldNames, demoRequestSchema } from '../shared/demo-request'

const valid = {
  name: 'Avery Chen',
  academy: 'Northshore Martial Arts',
  email: 'avery@northshore.example',
  phone: '8015550142',
  attribution: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'spring-intros',
    utm_content: 'story',
    utm_term: 'kids bjj',
    referrer: 'https://instagram.com/',
    landing_page: '/demo?utm_source=instagram',
  },
}

describe('demo request', () => {
  it('requires name, academy, email, and phone', () => {
    expect(demoRequestFieldNames).toEqual(['name', 'academy', 'email', 'phone'])
    expect(demoRequestSchema.safeParse(valid).success).toBe(true)
    expect(demoRequestSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false)
    expect(demoRequestSchema.safeParse({ ...valid, academy: '' }).success).toBe(false)
    expect(demoRequestSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
    expect(demoRequestSchema.safeParse({ ...valid, phone: '12' }).success).toBe(false)
  })

  it('does not accept a website field', () => {
    const parsed = demoRequestSchema.safeParse({ ...valid, website: 'https://academy.example' })
    expect(parsed.success).toBe(false)
  })
})
