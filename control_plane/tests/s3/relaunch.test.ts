import { describe, expect, it } from 'vitest'
import { assertSafeRelaunch, relaunchCommand } from '../../server/services/docker-relaunch'

describe('safe relaunch', () => {
  it('uses compose recreate without down or -v', () => {
    const command = relaunchCommand({
      slug: 'lab-acme-prod',
      composeFile: 'docker-compose.lab-acme-prod.yml',
      envFileLocal: '.env.lab-acme-prod',
      envFileExample: '.env.lab-acme-prod.example',
      root: 'C:/tmp/missing-template',
    })
    expect(command.args).toEqual([
      'compose',
      '--env-file',
      '.env.lab-acme-prod.example',
      '-f',
      'docker-compose.lab-acme-prod.yml',
      'up',
      '-d',
      '--force-recreate',
      '--no-deps',
      'app',
    ])
    expect(command.args.join(' ')).not.toMatch(/-v|prune|down/)
  })

  it('refuses unknown slugs and compose files', () => {
    expect(() => assertSafeRelaunch({
      slug: 'renzo-prod',
      composeFile: 'docker-compose.prod.yml',
    })).toThrow(/lab-acme/)
    expect(() => assertSafeRelaunch({
      slug: 'lab-acme-prod',
      composeFile: 'docker-compose.prod.yml',
    })).toThrow(/compose file/)
  })
})
