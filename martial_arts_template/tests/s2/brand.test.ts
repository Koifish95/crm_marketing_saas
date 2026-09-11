import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_NAME, publicBrand } from '@crm/core/shared/utils/brand'

describe('S2 public brand', () => {
  it('defaults to a generic martial-arts name, not Renzo', () => {
    const brand = publicBrand({})
    expect(brand.appName).toBe(DEFAULT_APP_NAME)
    expect(brand.appName).not.toMatch(/Renzo|Kaysville/i)
    expect(brand.brandName).not.toMatch(/Renzo|Kaysville/i)
    expect(brand.publicTagline).toBe('')
  })

  it('reads display strings from env', () => {
    const brand = publicBrand({
      NUXT_PUBLIC_APP_NAME: 'Acme BJJ Acquisition',
      NUXT_PUBLIC_BRAND_NAME: 'Acme BJJ',
      NUXT_PUBLIC_BRAND_LOCATION: 'Lab PROD',
      NUXT_PUBLIC_PUBLIC_TAGLINE: 'Lab academy',
    })
    expect(brand.appName).toBe('Acme BJJ Acquisition')
    expect(brand.brandName).toBe('Acme BJJ')
    expect(brand.brandLocation).toBe('Lab PROD')
    expect(brand.publicTagline).toBe('Lab academy')
  })
})
