import { describe, expect, it } from 'vitest'
import { environmentProvisionGuard, imageBuildArgs, imageInspectArgs, provisionUpCommand, selectEnvironmentsToProvision } from '../../server/services/provision-runtime'
import { PROVISIONED_IMAGE } from '../../server/services/provision-contract'

describe('S4 provision runtime commands', () => {
  it('builds the local s4 image and ups without -v', () => {
    expect(imageInspectArgs()).toEqual(['image', 'inspect', PROVISIONED_IMAGE])
    expect(imageBuildArgs()).toEqual(['build', '-t', PROVISIONED_IMAGE, '-f', 'martial_arts_template/Dockerfile', '.'])
    const command = provisionUpCommand({
      envFileLocal: 'C:/tmp/missing.env',
      envFileExample: 'C:/tmp/missing.env',
      composeFile: 'docker-compose.provisioned.yml',
      composeProject: 'strategic-insights-prod',
      root: 'C:/tmp/missing-template',
    })
    expect(command.args).toEqual([
      'compose',
      '--env-file',
      'C:/tmp/missing.env',
      '-f',
      'docker-compose.provisioned.yml',
      '-p',
      'strategic-insights-prod',
      'up',
      '-d',
      '--no-deps',
      'app',
    ])
    expect(command.args.join(' ')).not.toMatch(/-v|prune|down/)
  })

  it('refuses decommissioned environment retry and limits provision to onlyIds', () => {
    expect(environmentProvisionGuard(null)).toEqual({
      statusCode: 404,
      statusMessage: 'Environment not registered.',
    })
    expect(environmentProvisionGuard({ lifecycleStatus: 'decommissioned' })).toEqual({
      statusCode: 409,
      statusMessage: 'Decommissioned environments cannot be retried.',
    })
    expect(environmentProvisionGuard({ lifecycleStatus: 'failed' })).toBeNull()

    const rows = [
      { id: 'prod', customerId: 'c1', lifecycleStatus: 'failed' },
      { id: 'dev', customerId: 'c1', lifecycleStatus: 'provisioning' },
      { id: 'gone', customerId: 'c1', lifecycleStatus: 'decommissioned' },
      { id: 'other', customerId: 'c2', lifecycleStatus: 'failed' },
    ]
    expect(selectEnvironmentsToProvision(rows, 'c1').map(row => row.id)).toEqual(['prod', 'dev'])
    expect(selectEnvironmentsToProvision(rows, 'c1', ['dev']).map(row => row.id)).toEqual(['dev'])
    expect(selectEnvironmentsToProvision(rows, 'c1', ['gone'])).toEqual([])
  })
})
