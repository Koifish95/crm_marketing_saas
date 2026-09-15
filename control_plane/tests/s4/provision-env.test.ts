import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderProvisionedEnv } from '../../server/services/provision-env'

describe('S4 provisioned env and compose', () => {
  it('writes setup, force-change, and unique volume names without renzo', () => {
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
    })
    expect(env).toMatch(/NUXT_AUTH_PASSWORD="setup"/)
    expect(env).toMatch(/NUXT_AUTH_MUST_CHANGE_PASSWORD="true"/)
    expect(env).toMatch(/NUXT_PUBLIC_APP_NAME="Strategic Insights Consulting, LLC Acquisition"/)
    expect(env).toMatch(/SQLITE_VOLUME="strategic-insights-prod-sqlite"/)
    expect(env).not.toMatch(/renzo/i)
    expect(env).not.toMatch(/webhosting/i)
    expect(env).not.toMatch(/m10a/)
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
      product: {
        appNameTemplate: 'plain',
        extraEnv: { SALES_PROPOSALS_DIR: '/app/data/uploads/proposals' },
      },
    })
    expect(env).toMatch(/NUXT_PUBLIC_APP_NAME="C2 Proof"/)
    expect(env).not.toMatch(/Acquisition/)
    expect(env).toMatch(/SALES_PROPOSALS_DIR="\/app\/data\/uploads\/proposals"/)
    expect(env).toMatch(/EXPECTED_IMAGE="crm-sales:c2"/)
  })

  it('keeps the generic compose file parameterized and free of Renzo names', () => {
    const compose = readFileSync(
      join(process.cwd(), '..', 'martial_arts_template', 'docker-compose.provisioned.yml'),
      'utf8',
    )
    expect(compose).toMatch(/\$\{CONTAINER_NAME\}/)
    expect(compose).toMatch(/\$\{HOST_PORT\}:5000/)
    expect(compose).toMatch(/\$\{SQLITE_VOLUME\}/)
    expect(compose).toMatch(/NUXT_AUTH_MUST_CHANGE_PASSWORD/)
    expect(compose).not.toMatch(/renzo/i)
    expect(compose).not.toMatch(/lab-acme/)
  })
})
