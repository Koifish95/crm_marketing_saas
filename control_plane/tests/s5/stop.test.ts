import { describe, expect, it } from 'vitest'
import { combineStatus } from '../../server/services/health'
import { relaunchCommand, startCommand, stopCommand } from '../../server/services/docker-relaunch'

describe('environment stop contract', () => {
  it('targets one compose project and keeps the relaunch start path', () => {
    const input = {
      slug: 'lab-acme-dev',
      composeFile: 'docker-compose.lab-acme-dev.yml',
      envFileLocal: '.env.lab-acme-dev',
      envFileExample: '.env.lab-acme-dev.example',
      composeProject: 'lab-acme-dev',
      root: 'C:/tmp/missing-template',
    }
    const stop = stopCommand(input)
    expect(stop.args.at(-2)).toBe('stop')
    expect(stop.args.at(-1)).toBe('app')
    expect(stop.args).toContain('lab-acme-dev')
    expect(stop.args).not.toContain('lab-acme-prod')
    expect(stop.args.join(' ')).not.toMatch(/-v|prune|down|\brm\b/)
    const start = startCommand(input)
    expect(start.args.at(-2)).toBe('start')
    expect(start.args.at(-1)).toBe('app')
    expect(start.args.join(' ')).not.toMatch(/-v|prune|down|\brm\b|force-recreate/)
    expect(start.args.join(' ')).not.toMatch(/sqlite|assets/)
    expect(relaunchCommand(input).args).toEqual(expect.arrayContaining(['up', '-d', '--force-recreate', '--no-deps', 'app']))
  })

  it('reconciles a stopped container as stopped, not missing or decommissioned', () => {
    expect(combineStatus('stopped', null)).toBe('stopped')
    expect(combineStatus('stopped', false)).toBe('stopped')
    expect(combineStatus('missing', null)).toBe('missing')
  })
})
