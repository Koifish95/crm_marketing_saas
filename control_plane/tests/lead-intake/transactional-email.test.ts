import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { renderProvisionedEnv, readEnvValue } from '../../server/services/provision-env'
import { MARTIAL_ARTS_PRODUCT, SALES_PRODUCT } from '../../server/products/catalog'
import { redactDeep, redactLeadIntakeKey } from '../../server/services/lead-intake-key'
import { transactionalEmailEnv, withTransactionalEmail } from '../../server/services/transactional-email'

const KEY = 're_test_only_not_a_real_key'
const controlPlaneEnv = { RESEND_API_KEY: KEY, NOTIFY_FROM: 'Nuxxion <notifications@nuxxion.com>' }

const base = {
  composeProject: 'top-tier-prod',
  containerName: 'top-tier-prod-app',
  hostPort: 52230,
  sqliteVolume: 'top-tier-prod-sqlite',
  assetsVolume: 'top-tier-prod-assets',
  expectedImage: 'crm-sales:c2',
  type: 'PROD',
  displayName: 'Top Tier Hauling',
  adminEmail: 'admin@top-tier.local',
  timezone: 'America/Denver',
  sessionPassword: 'test-session-password-32-characters',
}

describe('transactional email sender', () => {
  it('is empty when the Control Plane has no key', () => {
    expect(transactionalEmailEnv({})).toEqual({})
    expect(transactionalEmailEnv({ NOTIFY_FROM: 'x <x@nuxxion.com>' })).toEqual({})
    expect(transactionalEmailEnv({ RESEND_API_KEY: KEY })).toEqual({ RESEND_API_KEY: KEY })
  })

  it('reaches a new Sales environment, never a Martial Arts one', () => {
    const sales = renderProvisionedEnv({ ...base, product: SALES_PRODUCT, controlPlaneEnv })
    expect(readEnvValue(sales.contents, 'RESEND_API_KEY')).toBe(KEY)
    expect(readEnvValue(sales.contents, 'NOTIFY_FROM')).toBe('Nuxxion <notifications@nuxxion.com>')
    const ma = renderProvisionedEnv({ ...base, expectedImage: 'martial-arts-acquisition:s4', product: MARTIAL_ARTS_PRODUCT, controlPlaneEnv })
    expect(ma.contents).not.toContain('RESEND_API_KEY')
  })

  it('leaves a new Sales environment without email when the Control Plane has no key', () => {
    const sales = renderProvisionedEnv({ ...base, product: SALES_PRODUCT, controlPlaneEnv: {} })
    expect(sales.contents).not.toContain('RESEND_API_KEY')
  })

  it('on upgrade, adds or replaces the key and keeps the rest of the file', () => {
    const env = 'HOST_PORT="52230"\nRESEND_API_KEY="re_old"\n'
    const result = withTransactionalEmail(env, controlPlaneEnv)
    expect(result.changed).toBe(true)
    expect(readEnvValue(result.contents, 'RESEND_API_KEY')).toBe(KEY)
    expect(readEnvValue(result.contents, 'NOTIFY_FROM')).toBe('Nuxxion <notifications@nuxxion.com>')
    expect(result.contents).toContain('HOST_PORT="52230"')
    expect(withTransactionalEmail(result.contents, controlPlaneEnv)).toEqual({ contents: result.contents, changed: false })
  })

  it('on upgrade, leaves the file alone when the Control Plane has no key', () => {
    const env = 'HOST_PORT="52230"\nRESEND_API_KEY="re_keep"\n'
    expect(withTransactionalEmail(env, {})).toEqual({ contents: env, changed: false })
  })

  it('passes the settings through the Sales compose file only', () => {
    const compose = readFileSync(join(__dirname, '../../../sales_template/docker-compose.provisioned.yml'), 'utf8')
    expect(compose).toContain('RESEND_API_KEY: ${RESEND_API_KEY:-}')
    expect(compose).toContain('NOTIFY_FROM: ${NOTIFY_FROM:-}')
    const ma = readFileSync(join(__dirname, '../../../martial_arts_template/docker-compose.provisioned.yml'), 'utf8')
    expect(ma).not.toContain('RESEND_API_KEY')
  })

  it('redacts the key from logs, errors and events', () => {
    expect(redactLeadIntakeKey(`failed: RESEND_API_KEY=${KEY} exit 1`)).not.toContain(KEY)
    expect(JSON.stringify(redactDeep({ RESEND_API_KEY: KEY, nested: [`RESEND_API_KEY="${KEY}"`] }))).not.toContain(KEY)
  })
})
