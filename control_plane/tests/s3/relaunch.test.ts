import { describe, expect, it } from 'vitest'
import { assertSafeRelaunch, decommissionCommand, relaunchCommand } from '../../server/services/docker-relaunch'

describe('safe relaunch', () => {
  it('uses compose recreate without down or -v', () => {
    const command = relaunchCommand({
      slug: 'lab-acme-prod',
      composeFile: 'docker-compose.lab-acme-prod.yml',
      envFileLocal: '.env.lab-acme-prod',
      envFileExample: '.env.lab-acme-prod.example',
      composeProject: 'lab-acme-prod',
      root: 'C:/tmp/missing-template',
    })
    expect(command.args).toEqual([
      'compose',
      '--env-file',
      '.env.lab-acme-prod.example',
      '-f',
      'docker-compose.lab-acme-prod.yml',
      '-p',
      'lab-acme-prod',
      'up',
      '-d',
      '--force-recreate',
      '--no-deps',
      'app',
    ])
    expect(command.args.join(' ')).not.toMatch(/-v|prune|down/)
  })

  it('allows a registered provisioned compose file and refuses reserved names', () => {
    const command = relaunchCommand({
      slug: 'strategic-insights-prod',
      composeFile: 'docker-compose.provisioned.yml',
      envFileLocal: 'C:/tmp/provisioned/env.env',
      envFileExample: 'C:/tmp/provisioned/env.env',
      composeProject: 'strategic-insights-prod',
      root: 'C:/tmp/missing-template',
    })
    expect(command.args).toContain('docker-compose.provisioned.yml')
    expect(command.args).toContain('-p')
    expect(() => assertSafeRelaunch({
      slug: 'renzo-prod',
      composeFile: 'docker-compose.prod.yml',
    })).toThrow(/reserved|compose file|Refusing/)
    expect(() => assertSafeRelaunch({
      slug: 'lab-acme-prod',
      composeFile: 'docker-compose.prod.yml',
    })).toThrow(/compose file/)
  })

  it('decommissions with compose rm --stop and never -v', () => {
    const command = decommissionCommand({
      slug: 'strategic-insights-prod',
      composeFile: 'docker-compose.provisioned.yml',
      envFileLocal: 'C:/tmp/provisioned/env.env',
      envFileExample: 'C:/tmp/provisioned/env.env',
      composeProject: 'strategic-insights-prod',
      root: 'C:/tmp/missing-template',
    })
    expect(command.args).toEqual([
      'compose',
      '--env-file',
      'C:/tmp/provisioned/env.env',
      '-f',
      'docker-compose.provisioned.yml',
      '-p',
      'strategic-insights-prod',
      'rm',
      '-f',
      '--stop',
      'app',
    ])
    expect(command.args.join(' ')).not.toMatch(/-v|prune|down/)
  })
})
