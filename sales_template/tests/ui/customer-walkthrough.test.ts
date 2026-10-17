import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const doc = readFileSync(resolve(__dirname, '../../../docs/customer/top-tier-sales-walkthrough.md'), 'utf8')
const lead = readFileSync(resolve(__dirname, '../../app/pages/leads/[id].vue'), 'utf8')

describe('Top Tier sales walkthrough', () => {
  it('stays about one page and has no technical source map', () => {
    expect(doc.split(/\s+/).length).toBeLessThan(500)
    expect(doc).not.toMatch(/\.vue|\.ts\b|Source map|Control Plane|intake key/i)
  })

  it('does not claim converted leads cannot be edited', () => {
    expect(doc).not.toMatch(/can no longer be edited/i)
    // source/campaign/owner fields are not disabled when converted
    expect(lead).toMatch(/v-model="ownerUserId"/)
    expect(lead).toMatch(/v-model="displayName"[\s\S]{0,120}:disabled="converted"/)
  })
})
