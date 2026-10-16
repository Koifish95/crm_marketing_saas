import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), 'utf8')

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? vueFiles(full) : full.endsWith('.vue') ? [full] : []
  })
}

describe('Sales UI cleanup 2/4: panels, fields, buttons and tables', () => {
  it('AppPanel pads its body by default', () => {
    const panel = read('app/components/AppPanel.vue')
    expect(panel).toMatch(/padded:\s*true/)
    expect(panel).not.toContain('!p-0')
  })

  it('AppField puts the hint under the control, not beside the label', () => {
    const field = read('app/components/AppField.vue')
    expect(field.indexOf('<slot')).toBeLessThan(field.indexOf('{{ hint }}'))
    expect(field).not.toContain('justify-between')
  })

  it('data tables scroll inside a wrapper with a minimum width', () => {
    const css = read('app/assets/css/main.css')
    expect(css).toMatch(/\.table-wrap\s*\{[^}]*overflow-x-auto/)
    expect(css).toMatch(/\.data-table\s*\{[^}]*min-w-\[40rem\]/)
    for (const file of vueFiles(join(root, 'app'))) {
      const src = readFileSync(file, 'utf8')
      if (src.includes('class="data-table"')) {
        expect(src, file).toContain('table-wrap')
      }
    }
  })

  it('metrics sit in one divided grid, not one card per number', () => {
    for (const page of ['app/pages/dashboard.vue', 'app/pages/prospects/index.vue']) {
      const src = read(page)
      expect(src, page).toContain('stat-grid')
      expect(src, page).not.toMatch(/class="panel p-4/)
    }
  })

  it('does not draw bordered boxes inside panels', () => {
    const boxed = /rounded-(md|lg)[^"']*border|border[^"']*rounded-(md|lg)/
    for (const page of [
      'app/pages/campaigns/[id].vue',
      'app/pages/opportunities/[id].vue',
      'app/pages/settings/intake.vue',
      'app/pages/dashboard.vue',
      'app/pages/prospects/index.vue',
      'app/components/SalesActivityComplete.vue',
    ]) {
      expect(read(page), page).not.toMatch(boxed)
    }
  })
})
