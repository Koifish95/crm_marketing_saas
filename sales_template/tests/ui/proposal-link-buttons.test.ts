import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync(new URL('../../app/pages/opportunities/[id].vue', import.meta.url), 'utf8')
const appButton = readFileSync(new URL('../../app/components/AppButton.vue', import.meta.url), 'utf8')

describe('proposal links styled as buttons', () => {
  it('AppButton applies btn plus the variant class', () => {
    expect(appButton).toContain('class="btn"')
    expect(appButton).toContain('secondary: \'btn-secondary\'')
  })
  it('every NuxtLink or anchor with a variant class also carries btn', () => {
    const tags = page.match(/<(NuxtLink|a)\b[^>]*>/g) ?? []
    const variantTags = tags.filter(t => /btn-(primary|secondary|ghost|danger)/.test(t))
    expect(variantTags.length).toBeGreaterThanOrEqual(4)
    for (const tag of variantTags) expect(tag).toMatch(/class="btn btn-/)
  })
})
