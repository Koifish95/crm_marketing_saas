import { afterEach, describe, expect, it } from 'vitest'
import {
  parseAppEnv,
  readAppEnv,
  sessionCookieSecure,
  APP_ENV_HOST_PORTS,
  APP_ENV_PUBLIC_HOSTS,
  appEnvForHostPort,
  appEnvForHostname,
  currentAppEnvFromLocation,
  environmentSwitcherHref,
  environmentSwitcherUrl,
  impliedHostPort,
  isRenzoPublicHostname,
  publicHostnameForEnv,
} from '../../shared/utils/app-env'
import { BOOTSTRAP_PASSWORD_REQUIRED, getBootstrapAdmin } from '../../drizzle/seed'

const original = {
  APP_ENV: process.env.APP_ENV,
  NODE_ENV: process.env.NODE_ENV,
  NUXT_AUTH_PASSWORD: process.env.NUXT_AUTH_PASSWORD,
}

afterEach(() => {
  if (original.APP_ENV === undefined) {
    delete process.env.APP_ENV
  } else {
    process.env.APP_ENV = original.APP_ENV
  }
  if (original.NODE_ENV === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = original.NODE_ENV
  }
  if (original.NUXT_AUTH_PASSWORD === undefined) {
    delete process.env.NUXT_AUTH_PASSWORD
  } else {
    process.env.NUXT_AUTH_PASSWORD = original.NUXT_AUTH_PASSWORD
  }
})

describe('M10A application environment identity', () => {
  it('accepts explicit DEV, STAGE, and PRODUCTION values', () => {
    expect(parseAppEnv('dev')).toBe('dev')
    expect(parseAppEnv('stage')).toBe('stage')
    expect(parseAppEnv('production')).toBe('production')
    expect(parseAppEnv(' DEV ')).toBe('dev')
  })

  it('defaults missing APP_ENV from NODE_ENV rather than guessing production from an unknown value', () => {
    expect(parseAppEnv(undefined, 'development')).toBe('dev')
    expect(parseAppEnv(undefined, 'test')).toBe('dev')
    expect(parseAppEnv(undefined, 'production')).toBe('production')
    expect(parseAppEnv('', 'production')).toBe('production')
  })

  it('rejects invalid identity instead of treating it as production', () => {
    expect(() => parseAppEnv('prod')).toThrow(/Invalid APP_ENV/)
    expect(() => parseAppEnv('local')).toThrow(/Invalid APP_ENV/)
    expect(() => readAppEnv({ APP_ENV: 'staging' })).toThrow(/Invalid APP_ENV/)
  })

  it('keeps session cookies insecure on local HTTP unless production or an explicit override', () => {
    expect(sessionCookieSecure('dev')).toBe(false)
    expect(sessionCookieSecure('stage')).toBe(false)
    expect(sessionCookieSecure('production')).toBe(true)
    expect(sessionCookieSecure('production', 'false')).toBe(false)
    expect(sessionCookieSecure('dev', 'true')).toBe(true)
  })
})

describe('M10A environment switcher URLs', () => {
  it('maps Docker host ports to PRODUCTION, STAGE, and DEV', () => {
    expect(APP_ENV_HOST_PORTS.production).toBe(5000)
    expect(APP_ENV_HOST_PORTS.stage).toBe(5010)
    expect(APP_ENV_HOST_PORTS.dev).toBe(5020)
    expect(appEnvForHostPort(5000)).toBe('production')
    expect(appEnvForHostPort('5010')).toBe('stage')
    expect(appEnvForHostPort(5020)).toBe('dev')
    expect(appEnvForHostPort(5030)).toBeNull()
    expect(appEnvForHostPort('')).toBeNull()
  })

  it('treats missing http/https ports as 80/443', () => {
    expect(impliedHostPort('http:', '')).toBe(80)
    expect(impliedHostPort('https:', null)).toBe(443)
    expect(impliedHostPort('http:', '5020')).toBe(5020)
  })

  it('builds the other environment URL from the current host and path', () => {
    expect(environmentSwitcherUrl({
      protocol: 'http:',
      hostname: 'localhost',
      port: 5010,
      pathname: '/leads/3',
      search: '?tab=follow-up',
      hash: '#notes',
    })).toBe('http://localhost:5010/leads/3?tab=follow-up#notes')
    expect(environmentSwitcherUrl({
      protocol: 'http',
      hostname: '127.0.0.1',
      port: 5000,
      pathname: '/login',
    })).toBe('http://127.0.0.1:5000/login')
  })
})

describe('M10 public hostname switcher', () => {
  it('maps the three public hosts only, and never www variants or the parent apex', () => {
    expect(APP_ENV_PUBLIC_HOSTS.production).toBe('app.renzogracieutah.com')
    expect(APP_ENV_PUBLIC_HOSTS.stage).toBe('stage.app.renzogracieutah.com')
    expect(APP_ENV_PUBLIC_HOSTS.dev).toBe('dev.app.renzogracieutah.com')
    expect(appEnvForHostname('app.renzogracieutah.com')).toBe('production')
    expect(appEnvForHostname('STAGE.APP.RENZOGRACIEUTAH.COM')).toBe('stage')
    expect(appEnvForHostname('dev.app.renzogracieutah.com')).toBe('dev')
    expect(appEnvForHostname('www.app.renzogracieutah.com')).toBeNull()
    expect(appEnvForHostname('www.stage.app.renzogracieutah.com')).toBeNull()
    expect(appEnvForHostname('www.dev.app.renzogracieutah.com')).toBeNull()
    expect(appEnvForHostname('renzogracieutah.com')).toBeNull()
    expect(appEnvForHostname('www.renzogracieutah.com')).toBeNull()
    expect(isRenzoPublicHostname('localhost')).toBe(false)
  })

  it('builds hostname-mode URLs without laptop ports or www variants', () => {
    expect(environmentSwitcherHref({
      protocol: 'https:',
      hostname: 'app.renzogracieutah.com',
      port: '',
      pathname: '/leads/3',
      search: '?tab=follow-up',
      hash: '#notes',
      targetEnv: 'stage',
    })).toBe('https://stage.app.renzogracieutah.com/leads/3?tab=follow-up#notes')
    expect(environmentSwitcherHref({
      protocol: 'https:',
      hostname: 'stage.app.renzogracieutah.com',
      targetEnv: 'dev',
      pathname: '/login',
    })).toBe('https://dev.app.renzogracieutah.com/login')
    expect(publicHostnameForEnv('production')).toBe('app.renzogracieutah.com')
    const publicHref = environmentSwitcherHref({
      protocol: 'https:',
      hostname: 'dev.app.renzogracieutah.com',
      targetEnv: 'production',
    })
    expect(publicHref).not.toMatch(/:5000|:5010|:5020/)
    expect(publicHref).not.toContain('www.')
    expect(publicHref).toBe('https://app.renzogracieutah.com/')
    expect(publicHref).not.toMatch(/^https:\/\/(www\.)?renzogracieutah\.com(\/|$)/)
  })

  it('keeps hostname-mode protocol so M10C HTTP and M10D HTTPS both work', () => {
    expect(environmentSwitcherHref({
      protocol: 'http:',
      hostname: 'app.renzogracieutah.com',
      pathname: '/login',
      targetEnv: 'stage',
    })).toBe('http://stage.app.renzogracieutah.com/login')
    expect(environmentSwitcherHref({
      protocol: 'https:',
      hostname: 'dev.app.renzogracieutah.com',
      pathname: '/settings',
      targetEnv: 'production',
    })).toBe('https://app.renzogracieutah.com/settings')
  })

  it('keeps laptop port mode on localhost and treats :5030 as none of the three', () => {
    expect(currentAppEnvFromLocation({
      protocol: 'http:',
      hostname: 'localhost',
      port: 5030,
    })).toBeNull()
    expect(currentAppEnvFromLocation({
      protocol: 'http:',
      hostname: 'localhost',
      port: 5000,
    })).toBe('production')
    expect(environmentSwitcherHref({
      protocol: 'http:',
      hostname: 'localhost',
      port: 5000,
      pathname: '/households',
      targetEnv: 'dev',
    })).toBe('http://localhost:5020/households')
  })
})

describe('M10A bootstrap password defaults', () => {
  it('requires NUXT_AUTH_PASSWORD for DEV, STAGE, and PRODUCTION', () => {
    delete process.env.NUXT_AUTH_PASSWORD
    process.env.APP_ENV = 'dev'
    expect(() => getBootstrapAdmin()).toThrow(BOOTSTRAP_PASSWORD_REQUIRED)

    process.env.APP_ENV = 'stage'
    expect(() => getBootstrapAdmin()).toThrow(BOOTSTRAP_PASSWORD_REQUIRED)

    process.env.APP_ENV = 'production'
    expect(() => getBootstrapAdmin()).toThrow(BOOTSTRAP_PASSWORD_REQUIRED)
  })

  it('still requires a password in production when NODE_ENV is development', () => {
    delete process.env.NUXT_AUTH_PASSWORD
    process.env.APP_ENV = 'production'
    process.env.NODE_ENV = 'development'
    expect(() => getBootstrapAdmin()).toThrow(BOOTSTRAP_PASSWORD_REQUIRED)
  })

  it('uses an explicit password in every environment', () => {
    process.env.NUXT_AUTH_PASSWORD = 'StagePass1!'
    process.env.APP_ENV = 'stage'
    expect(getBootstrapAdmin().password).toBe('StagePass1!')
  })
})
