import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync(new URL('../../app/pages/users.vue', import.meta.url), 'utf8')

describe('Users directory', () => {
  it('keeps creation and account actions off the list', () => {
    expect(page).toContain('Search name or email')
    expect(page).toContain('All roles')
    expect(page).toContain('Locked')
    expect(page).toContain('class="directory-dialog"')
    expect(page).toContain('class="directory-drawer"')
    expect(page).not.toContain('title="Create user"')
  })

  it('keeps password setting and a required change as separate actions', () => {
    expect(page).toContain('Save password')
    expect(page).toContain('Require password change')
    expect(page).toContain('password-reset')
    expect(page).toContain('require-password-change')
    expect(page).toContain('It is not shown again')
  })

  it('refuses self-service lock and password changes from this page', () => {
    expect(page).toContain('managingSelf')
    expect(page).toContain('You cannot lock it or change its password from here')
  })
})
