import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const forms = ['activities/index', 'companies/index', 'contacts/index', 'leads/index', 'offers/index', 'opportunities/index', 'campaigns/index']

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

  it('form-actions adds 8px on top of the 16px grid gap (24px total)', () => {
    expect(read('app/assets/css/main.css')).toMatch(/\.form-actions\s*\{\s*@apply pt-2;/)
  })
})
