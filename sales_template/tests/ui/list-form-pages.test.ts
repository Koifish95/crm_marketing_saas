import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const forms = ['activities/index', 'companies/index', 'contacts/index', 'leads/index', 'offers/index', 'opportunities/index', 'campaigns/index', 'prospects/index']

describe('Sales UI cleanup 4/4: new-record forms', () => {
  it.each([...forms, 'users'])('%s uses a two-column grid, never three', (page) => {
    const src = read(`app/pages/${page}.vue`)
    expect(src).not.toContain('grid-cols-3')
    expect(src).not.toContain('col-span-3')
  })

  it.each([...forms, 'users'])('%s puts the submit button in a full-width form-actions row', (page) => {
    const src = read(`app/pages/${page}.vue`)
    expect(src).toContain('sm:grid-cols-2')
    expect(src).toMatch(/sm:col-span-2 form-actions/)
  })

  it('prospects discovery keeps the submit button out of the field row', () => {
    const src = read('app/pages/prospects/index.vue')
    expect(src).not.toContain('items-end')
    expect(src).toMatch(/<form\s+class="grid gap-4 sm:grid-cols-2"\s+@submit\.prevent="discover"/)
  })

  it('form-actions adds 8px on top of the 16px grid gap (24px total)', () => {
    expect(read('app/assets/css/main.css')).toMatch(/\.form-actions\s*\{\s*@apply pt-2;/)
  })
})

describe('dry-run stumbles: approval scope and intake switch', () => {
  it('prospect detail and list explain the three-touch scope before approving', () => {
    const detail = read('app/pages/prospects/[id].vue')
    expect(detail).toContain('Approval covers all three touches')
    expect(detail).toContain('confirmingApprove')
    expect(detail).toContain('prospect.firstEmail')
    expect(read('app/pages/prospects/index.vue')).toContain('Approval covers all three touches')
  })

  it('the intake switch says it controls only /inquire', () => {
    expect(read('app/pages/settings/intake.vue')).toContain('controls only the public /inquire page')
  })
})
