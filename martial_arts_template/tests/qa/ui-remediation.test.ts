import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

describe('QA audit remediation contracts', () => {
  it('turns dashboard pipeline counts and empty follow-up states into next actions', () => {
    const dashboard = source('app/pages/dashboard.vue')
    const tasks = source('app/pages/tasks.vue')

    expect(dashboard).toContain('to: { path: \'/leads\', query: { status } }')
    expect(dashboard).toContain('Open ${item.label} leads')
    expect(tasks).toContain('Find a lead')
    expect(tasks).toContain('to="/leads/new"')
  })

  it('renders follow-up counters as static NuxtLinks, never an unresolved dynamic component', () => {
    const dashboard = source('app/pages/dashboard.vue')

    expect(dashboard).not.toContain('resolveComponent')
    expect(dashboard).not.toMatch(/:is="[^"]*NuxtLink/)
    expect(dashboard).toMatch(/<NuxtLink\s+v-if="canUseCrm"\s+:to="item\.to"\s+class="stat"/)
  })

  it('keeps lead creation saveable from a mobile sticky action', () => {
    const page = source('app/pages/leads/new.vue')

    expect(page).toContain('fixed inset-x-0 bottom-0')
    expect(page).toContain('sm:hidden')
    expect(page.match(/type="submit"/g)).toHaveLength(2)
  })

  it('keeps host operations out of the academy settings surface', () => {
    const settings = source('app/pages/settings/index.vue')
    const registry = source('lib/register-ma-shell.ts')
    const environment = source('app/pages/settings/environment.vue')

    expect(settings).not.toContain('Restart application')
    expect(settings).not.toContain('Shutdown application')
    expect(settings).not.toContain('/api/admin/system/status')
    expect(registry).not.toContain('/settings/environment')
    expect(environment).toContain('await navigateTo(\'/settings\', { replace: true })')
  })

  it('renders a useful public state when intro booking is unpublished', () => {
    const home = source('app/pages/index.vue')
    const booking = source('app/pages/trial.vue')

    expect(home).toContain('Online booking is temporarily unavailable')
    expect(booking).toContain('v-if="!trialPublished"')
    expect(booking).not.toContain('throw createError({ statusCode: 404')
    expect(booking).toContain('Back to academy home')
  })

  it('uses intro language in visible workflow copy while preserving Trial domain names', () => {
    const lead = source('app/pages/leads/[id].vue')
    const reports = source('app/pages/reports/index.vue')
    const labels = source('shared/utils/labels.ts')

    expect(lead).toContain('Schedule intro')
    expect(lead).not.toContain('Schedule trial')
    expect(reports).toContain('Intro scheduled')
    expect(labels).toContain('TRIAL_SCHEDULED: \'Intro scheduled\'')
  })

  it('exposes the record identity as the semantic page heading', () => {
    const selector = source('app/components/AppRecordSelector.vue')

    expect(selector).toContain('<h1 class="record-identity-name">')
    expect(selector).toContain('{{ displayLabel }}')
  })
})
