import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { switcherEntries } from '@crm/core/shared/utils/app-env'

const location = {
  protocol: 'https:',
  hostname: 'top-tier-hauling.nuxxion.com',
  port: '',
  pathname: '/companies/4',
  search: '',
  hash: '',
}

describe('Sales environment switcher', () => {
  it('shows Production and Dev from configured origins and keeps the path', () => {
    const entries = switcherEntries({
      mode: 'origins',
      appEnv: 'production',
      origins: {
        production: 'https://top-tier-hauling.nuxxion.com',
        dev: 'https://dev-top-tier-hauling.nuxxion.com/',
      },
      location,
    })
    expect(entries.map(entry => entry.env)).toEqual(['production', 'dev'])
    expect(entries[0]).toMatchObject({ current: true, href: null })
    expect(entries[1]?.href).toBe('https://dev-top-tier-hauling.nuxxion.com/companies/4')
  })

  it('omits a side that has no origin and never falls back to laptop ports', () => {
    const entries = switcherEntries({
      mode: 'origins',
      appEnv: 'dev',
      origins: { production: '', dev: '' },
      location: { ...location, hostname: 'localhost', port: '5040', protocol: 'http:' },
    })
    expect(entries).toEqual([{ env: 'dev', current: true, href: null }])
    expect(JSON.stringify(entries)).not.toMatch(/:50(00|10|20)/)
  })

  it('leaves the three-port switcher for an image that does not opt into origins', () => {
    const entries = switcherEntries({
      mode: '',
      appEnv: 'production',
      location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5000',
        pathname: '/households',
      },
    })
    expect(entries.map(entry => [entry.env, entry.href])).toEqual([
      ['production', null],
      ['stage', 'http://localhost:5010/households'],
      ['dev', 'http://localhost:5020/households'],
    ])
  })

  it('Sales runtime config and compose carry the two origins', () => {
    const nuxtConfig = readFileSync(join(process.cwd(), 'nuxt.config.ts'), 'utf8')
    const compose = readFileSync(join(process.cwd(), 'docker-compose.provisioned.yml'), 'utf8')
    expect(nuxtConfig).toMatch(/envSwitcherMode:\s*'origins'/)
    expect(nuxtConfig).toMatch(/NUXT_PUBLIC_PRODUCTION_ORIGIN/)
    expect(nuxtConfig).toMatch(/NUXT_PUBLIC_DEV_ORIGIN/)
    expect(compose).toMatch(/NUXT_PUBLIC_PRODUCTION_ORIGIN/)
    expect(compose).toMatch(/NUXT_PUBLIC_DEV_ORIGIN/)
  })
})
