import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderProvisionedEnv } from '../../server/services/provision-env'

describe('S4 provisioned env and compose', () => {
  it('writes admin/setup, force-change, and unique volume names without renzo', () => {
    const env = renderProvisionedEnv({
      composeProject: 'strategic-insights-prod',
      containerName: 'strategic-insights-prod-app',
      hostPort: 52210,
      sqliteVolume: 'strategic-insights-prod-sqlite',
      assetsVolume: 'strategic-insights-prod-assets',
      expectedImage: 'martial-arts-acquisition:s4',
      type: 'PROD',
      displayName: 'Strategic Insights Consulting, LLC',
      adminEmail: 'admin@strategic-insights.local',
      timezone: 'America/Denver',
      sessionPassword: 'test-session-password-32-characters',
      authPassword: 'UniquePass1!',
    })
    expect(env.contents).toMatch(/NUXT_AUTH_PASSWORD="UniquePass1!"/)
    expect(env.contents).toMatch(/NUXT_AUTH_USERNAME="admin"/)
    expect(env.contents).toMatch(/NUXT_AUTH_MUST_CHANGE_PASSWORD="true"/)
    expect(env.contents).toMatch(/NUXT_PUBLIC_APP_NAME="Strategic Insights Consulting, LLC Acquisition"/)
    expect(env.contents).toMatch(/SQLITE_VOLUME="strategic-insights-prod-sqlite"/)
    expect(env.contents).not.toMatch(/renzo/i)
    expect(env.contents).not.toMatch(/webhosting/i)
    expect(env.contents).not.toMatch(/m10a/)
    expect(env.authPassword).toBe('UniquePass1!')
  })

  it('uses admin/setup when no password is supplied', () => {
    const first = renderProvisionedEnv({
      composeProject: 'nova-bjj-prod',
      containerName: 'nova-bjj-prod-app',
      hostPort: 52211,
      sqliteVolume: 'nova-bjj-prod-sqlite',
      assetsVolume: 'nova-bjj-prod-assets',
      expectedImage: 'martial-arts-acquisition:s4',
      type: 'PROD',
      displayName: 'Nova BJJ',
      adminEmail: 'admin@nova.local',
      timezone: 'America/Denver',
      sessionPassword: 'test-session-password-32-characters',
    })
    const second = renderProvisionedEnv({
      composeProject: 'nova-bjj-dev',
      containerName: 'nova-bjj-dev-app',
      hostPort: 52212,
      sqliteVolume: 'nova-bjj-dev-sqlite',
      assetsVolume: 'nova-bjj-dev-assets',
      expectedImage: 'martial-arts-acquisition:s4',
      type: 'DEV',
      displayName: 'Nova BJJ',
      adminEmail: 'admin@nova.local',
      timezone: 'America/Denver',
      sessionPassword: 'test-session-password-32-characters',
    })
    expect(first.authPassword).toBe('setup')
    expect(second.authPassword).toBe('setup')
    expect(first.contents).toContain('NUXT_AUTH_PASSWORD="setup"')
    expect(first.contents).toContain('NUXT_AUTH_MUST_CHANGE_PASSWORD="true"')
  })

  it('uses a plain app name and Sales proposal dir for the Sales product', () => {
    const env = renderProvisionedEnv({
      composeProject: 'c2-proof-sales-prod',
      containerName: 'c2-proof-sales-prod-app',
      hostPort: 52220,
      sqliteVolume: 'c2-proof-sales-prod-sqlite',
      assetsVolume: 'c2-proof-sales-prod-assets',
      expectedImage: 'crm-sales:c2',
      type: 'PROD',
      displayName: 'C2 Proof',
      adminEmail: 'admin@c2-proof.local',
      timezone: 'America/Denver',
      sessionPassword: 'test-session-password-32-characters',
      authPassword: 'UniquePass1!',
      product: {
        appNameTemplate: 'plain',
        extraEnv: { SALES_PROPOSALS_DIR: '/app/data/uploads/proposals' },
      },
    })
    expect(env.contents).toMatch(/NUXT_PUBLIC_APP_NAME="C2 Proof"/)
    expect(env.contents).not.toMatch(/Acquisition/)
    expect(env.contents).toMatch(/SALES_PROPOSALS_DIR="\/app\/data\/uploads\/proposals"/)
    expect(env.contents).toMatch(/EXPECTED_IMAGE="crm-sales:c2"/)
    const salesCompose = readFileSync(
      join(process.cwd(), '..', 'sales_template', 'docker-compose.provisioned.yml'),
      'utf8',
    )
    expect(salesCompose).toMatch(/NUXT_PUBLIC_ORIGIN/)
    expect(salesCompose).toMatch(/TRUSTED_PROXY_IPS/)
  })

  it('keeps the generic compose file parameterized and free of Renzo names', () => {
    const compose = readFileSync(
      join(process.cwd(), '..', 'martial_arts_template', 'docker-compose.provisioned.yml'),
      'utf8',
    )
    expect(compose).toMatch(/\$\{CONTAINER_NAME\}/)
    expect(compose).toMatch(/\$\{HOST_BIND:-0.0.0.0\}:\$\{HOST_PORT\}:5000/)
    expect(compose).toMatch(/\$\{SQLITE_VOLUME\}/)
    expect(compose).toMatch(/NUXT_AUTH_MUST_CHANGE_PASSWORD/)
    expect(compose).toMatch(/NUXT_PUBLIC_ORIGIN/)
    expect(compose).toMatch(/TRUSTED_PROXY_IPS/)
    expect(compose).not.toMatch(/:-setup/)
    expect(compose).not.toMatch(/renzo/i)
    expect(compose).not.toMatch(/lab-acme/)
  })
})
